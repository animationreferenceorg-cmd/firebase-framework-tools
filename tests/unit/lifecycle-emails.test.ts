import { describe, expect, it } from 'vitest';
import { MIN_GAP_MS, planLifecycleEmails, type LifecycleAccount } from '@/lib/email/lifecycle-plan';
import { renderLifecycleEmail } from '@/lib/email/lifecycle-templates';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-20T12:00:00Z');
const SERIES_START = Date.parse('2026-10-07T00:00:00Z');

function account(over: Partial<LifecycleAccount> = {}): LifecycleAccount {
  return {
    uid: 'u1', email: 'a@example.com', createdAt: NOW - DAY, firstName: 'Sam', isFree: true, introEligible: true,
    subscriptionStatus: null, billingUpdatedAt: null, lastQuotaHitAt: null, optedOut: false, sent: {}, ...over,
  };
}
const plan1 = (a: LifecycleAccount) => planLifecycleEmails([a], NOW, SERIES_START)[0]?.template ?? null;

describe('planLifecycleEmails', () => {
  it('welcomes new accounts', () => {
    expect(plan1(account())).toBe('welcome');
  });

  it('never runs the series for accounts created before launch (no blast to existing users)', () => {
    expect(plan1(account({ createdAt: SERIES_START - DAY }))).toBeNull();
    expect(plan1(account({ createdAt: SERIES_START - 100 * DAY, sent: {} }))).toBeNull();
  });

  it('sends tips around day 3 after the welcome, then the offer around day 7', () => {
    expect(plan1(account({ createdAt: NOW - 4 * DAY, sent: { welcome: NOW - 4 * DAY } }))).toBe('tips');
    expect(plan1(account({ createdAt: NOW - 8 * DAY, sent: { welcome: NOW - 8 * DAY, tips: NOW - 4 * DAY } }))).toBe('offer');
  });

  it('only offers $1 to eligible free accounts', () => {
    expect(plan1(account({ createdAt: NOW - 8 * DAY, introEligible: false, sent: { welcome: NOW - 8 * DAY, tips: NOW - 4 * DAY } }))).toBeNull();
    expect(plan1(account({ createdAt: NOW - 8 * DAY, isFree: false, sent: { welcome: NOW - 8 * DAY } }))).toBeNull();
  });

  it('reminds free users the day after they hit the limit, at most weekly', () => {
    const hit = account({ createdAt: SERIES_START - 50 * DAY, lastQuotaHitAt: NOW - 20 * 3_600_000 });
    expect(plan1(hit)).toBe('quota_reset');
    expect(plan1({ ...hit, sent: { quota_reset: NOW - 3 * DAY } })).toBeNull();
    expect(plan1({ ...hit, lastQuotaHitAt: NOW - 2 * 3_600_000 })).toBeNull(); // too soon, same day
    expect(plan1({ ...hit, isFree: false })).toBeNull();
  });

  it('wins back canceled subscribers once, 14-60 days later', () => {
    const lapsed = account({ createdAt: SERIES_START - 200 * DAY, subscriptionStatus: 'canceled', billingUpdatedAt: NOW - 20 * DAY });
    expect(plan1(lapsed)).toBe('winback');
    expect(plan1({ ...lapsed, sent: { winback: NOW - 30 * DAY } })).toBeNull();
    expect(plan1({ ...lapsed, billingUpdatedAt: NOW - 5 * DAY })).toBeNull();
    expect(plan1({ ...lapsed, billingUpdatedAt: NOW - 90 * DAY })).toBeNull();
  });

  it('respects unsubscribes, missing emails and the 2-day gap', () => {
    expect(plan1(account({ optedOut: true }))).toBeNull();
    expect(plan1(account({ email: null }))).toBeNull();
    expect(plan1(account({ lastQuotaHitAt: NOW - 20 * 3_600_000, sent: { welcome: NOW - MIN_GAP_MS + 1000 } }))).toBeNull();
  });
});

describe('renderLifecycleEmail', () => {
  const ctx = { firstName: '<script>x</script>', unsubscribeUrl: 'https://animationreference.org/api/email/unsubscribe?u=a&t=b', postalAddress: '1 Main St, Town', introCents: 100, regularCents: 500 };

  it('includes unsubscribe link and postal address in every email', () => {
    for (const t of ['welcome', 'tips', 'offer', 'quota_reset', 'winback'] as const) {
      const e = renderLifecycleEmail(t, ctx);
      expect(e.html).toContain(ctx.unsubscribeUrl.replace(/&/g, '&amp;'));
      expect(e.html).toContain('1 Main St, Town');
      expect(e.text).toContain('Unsubscribe: ' + ctx.unsubscribeUrl);
      expect(e.subject.length).toBeGreaterThan(5);
    }
  });

  it('escapes names', () => {
    const e = renderLifecycleEmail('welcome', ctx);
    expect(e.html).not.toContain('<script>');
    expect(e.html).toContain('&lt;script&gt;');
  });

  it('states the intro price only when eligible', () => {
    expect(renderLifecycleEmail('offer', ctx).subject).toBe('Try Pro for $1');
    expect(renderLifecycleEmail('offer', { ...ctx, introCents: null }).html).not.toContain('$1');
  });
});
