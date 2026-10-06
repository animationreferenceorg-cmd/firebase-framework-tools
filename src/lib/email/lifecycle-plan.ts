import type { LifecycleTemplate } from './lifecycle-templates';

/**
 * Decides which lifecycle email (if any) each account should get on this run.
 * Pure function so the rules are easy to test and review:
 *
 *  - Nobody gets more than one email per run, or any email within 2 days of
 *    the previous one. Opted-out and email-less accounts get nothing.
 *  - welcome / tips / offer are a new-account series and only apply to
 *    accounts created on or after `seriesStart`, so turning this on never
 *    blasts the existing user base.
 *  - quota_reset goes to free users the day after they hit the daily limit,
 *    at most once a week.
 *  - winback goes once to subscribers 14-60 days after their plan ended.
 */

const DAY = 24 * 60 * 60 * 1000;
export const MIN_GAP_MS = 2 * DAY;

export interface LifecycleAccount {
  uid: string;
  email: string | null;
  createdAt: number;
  firstName: string;
  /** Free plan (not Pro, SJSU, admin or a legacy paid tier). */
  isFree: boolean;
  introEligible: boolean;
  subscriptionStatus: string | null;
  /** When billing last changed; for a canceled plan, roughly when it ended. */
  billingUpdatedAt: number | null;
  lastQuotaHitAt: number | null;
  optedOut: boolean;
  /** Template -> last sent time (ms). */
  sent: Partial<Record<LifecycleTemplate, number>>;
}

export interface PlannedEmail {
  uid: string;
  template: LifecycleTemplate;
}

export function planLifecycleEmails(accounts: LifecycleAccount[], now: number, seriesStart: number): PlannedEmail[] {
  const out: PlannedEmail[] = [];
  for (const a of accounts) {
    const template = pick(a, now, seriesStart);
    if (template) out.push({ uid: a.uid, template });
  }
  return out;
}

function pick(a: LifecycleAccount, now: number, seriesStart: number): LifecycleTemplate | null {
  if (a.optedOut || !a.email) return null;
  const sentTimes = Object.values(a.sent).filter((t): t is number => typeof t === 'number');
  const lastSent = sentTimes.length ? Math.max(...sentTimes) : 0;
  if (lastSent && now - lastSent < MIN_GAP_MS) return null;

  const age = now - a.createdAt;
  const inSeries = a.createdAt >= seriesStart;

  // 1. Welcome: first days of a new account.
  if (inSeries && !a.sent.welcome && age < 3 * DAY) return 'welcome';

  // 2. Daily limit hit yesterday (free users), at most weekly.
  if (
    a.isFree && a.lastQuotaHitAt !== null &&
    now - a.lastQuotaHitAt >= 12 * 60 * 60 * 1000 && now - a.lastQuotaHitAt < 2 * DAY &&
    (!a.sent.quota_reset || now - a.sent.quota_reset >= 7 * DAY)
  ) return 'quota_reset';

  // 3. Offer around day 7 for free, eligible accounts.
  if (inSeries && a.isFree && a.introEligible && !a.sent.offer && age >= 7 * DAY && age < 21 * DAY) return 'offer';

  // 4. Tips around day 3, after the welcome.
  if (inSeries && a.isFree && !a.sent.tips && a.sent.welcome && age >= 3 * DAY && age < 10 * DAY) return 'tips';

  // 5. Win-back, once, 14-60 days after a subscription ended.
  if (
    a.isFree && a.subscriptionStatus === 'canceled' && a.billingUpdatedAt !== null &&
    now - a.billingUpdatedAt >= 14 * DAY && now - a.billingUpdatedAt < 60 * DAY && !a.sent.winback
  ) return 'winback';

  return null;
}
