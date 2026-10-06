import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import type { DocumentData } from 'firebase-admin/firestore';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getEntitlements, getIntroOffer, getProOffers, isIntroEligible } from '@/lib/plans';
import { planLifecycleEmails, type LifecycleAccount } from '@/lib/email/lifecycle-plan';
import { renderLifecycleEmail, type LifecycleTemplate } from '@/lib/email/lifecycle-templates';
import { resend } from '@/lib/resend-service';

/**
 * Daily lifecycle email job (welcome series, limit-reset reminder, win-back).
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (for the scheduler) or an admin
 * Firebase ID token (for previews). Refuses to run if CRON_SECRET is unset.
 *
 * Safe by default: it only previews who would get what. It sends only when
 * all of these hold: LIFECYCLE_EMAILS=on, RESEND_API_KEY and RESEND_FROM_EMAIL
 * are set, EMAIL_POSTAL_ADDRESS is set (CAN-SPAM), and the request has ?send=1.
 */

const SITE = 'https://animationreference.org';
const MAX_SENDS_PER_RUN = 300;
/** The welcome series only applies to accounts created on or after this. */
const DEFAULT_SERIES_START = '2026-10-07T00:00:00Z';

function millis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') { const t = Date.parse(value); return Number.isNaN(t) ? null : t; }
  const v = value as { toMillis?: () => number };
  return typeof v.toMillis === 'function' ? v.toMillis() : null;
}

async function authorize(request: NextRequest): Promise<'cron' | 'admin'> {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const header = request.headers.get('authorization') || '';
  if (cronSecret && header === `Bearer ${cronSecret}`) return 'cron';
  // Otherwise an admin user may run it (normally as a preview).
  const identity = await requireFirebaseUser(request).catch(() => null);
  if (identity) {
    const profile = await getTrustedProfile(identity.uid);
    if (identity.admin === true || profile.role === 'admin') return 'admin';
  }
  if (!cronSecret) throw new ApiError(503, 'NOT_CONFIGURED', 'CRON_SECRET is not set, so the scheduler cannot authenticate.');
  throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid credentials.');
}

export async function POST(request: NextRequest) {
  try {
    const caller = await authorize(request);
    const wantsSend = request.nextUrl.searchParams.get('send') === '1';

    const missing: string[] = [];
    if (process.env.LIFECYCLE_EMAILS !== 'on') missing.push('LIFECYCLE_EMAILS=on');
    if (!resend) missing.push('RESEND_API_KEY');
    if (!process.env.RESEND_FROM_EMAIL?.trim()) missing.push('RESEND_FROM_EMAIL');
    if (!process.env.EMAIL_POSTAL_ADDRESS?.trim()) missing.push('EMAIL_POSTAL_ADDRESS');
    const send = wantsSend && missing.length === 0;

    const db = getFirestore();
    const now = Date.now();
    const seriesStart = Date.parse(process.env.LIFECYCLE_SERIES_START || DEFAULT_SERIES_START);

    // Gather accounts (emails live in Firebase Auth), profiles, prefs and send log.
    const authUsers: { uid: string; email: string | null; createdAt: number; displayName: string | null }[] = [];
    let pageToken: string | undefined;
    do {
      const page = await getFirebaseAuth().listUsers(1000, pageToken);
      for (const u of page.users) authUsers.push({ uid: u.uid, email: u.email ?? null, createdAt: Date.parse(u.metadata.creationTime), displayName: u.displayName ?? null });
      pageToken = page.pageToken;
    } while (pageToken);

    const [profilesSnap, prefsSnap, logSnap] = await Promise.all([
      db.collection('users').get(),
      db.collection('email_prefs').get(),
      db.collection('email_log').get(),
    ]);
    const profiles = new Map(profilesSnap.docs.map((d) => [d.id, d.data()]));
    const prefs = new Map(prefsSnap.docs.map((d) => [d.id, d.data()]));
    const logs = new Map(logSnap.docs.map((d) => [d.id, d.data()]));
    const intro = getIntroOffer();

    const accounts: LifecycleAccount[] = authUsers.map((u) => {
      const p: DocumentData = profiles.get(u.uid) ?? {};
      const log: DocumentData = logs.get(u.uid) ?? {};
      const sent: LifecycleAccount['sent'] = {};
      for (const t of ['welcome', 'tips', 'offer', 'quota_reset', 'winback'] as LifecycleTemplate[]) {
        const ms = millis(log[t]);
        if (ms) sent[t] = ms;
      }
      // The older welcome route marked the profile; count it so nobody gets two welcomes.
      if (!sent.welcome) { const legacy = millis(p.welcomeEmailSentAt); if (legacy) sent.welcome = legacy; }
      const name = (p.displayName || u.displayName || '').toString().trim().split(/\s+/)[0] || '';
      return {
        uid: u.uid,
        email: u.email,
        createdAt: u.createdAt,
        firstName: name,
        isFree: getEntitlements(p).access === 'free',
        introEligible: Boolean(intro) && isIntroEligible(p),
        subscriptionStatus: typeof p.subscriptionStatus === 'string' ? p.subscriptionStatus : null,
        billingUpdatedAt: millis(p.billingUpdatedAt),
        lastQuotaHitAt: millis(p.lastQuotaHitAt),
        optedOut: prefs.get(u.uid)?.optOut === true,
        sent,
      };
    });

    const plan = planLifecycleEmails(accounts, now, seriesStart);
    const byTemplate: Record<string, number> = {};
    for (const p of plan) byTemplate[p.template] = (byTemplate[p.template] || 0) + 1;

    if (!send) {
      return Response.json({
        mode: 'preview',
        caller,
        wouldSend: plan.length,
        byTemplate,
        sendingBlockedBy: wantsSend ? missing : undefined,
        sample: plan.slice(0, 10).map((p) => ({ uid: `${p.uid.slice(0, 6)}…`, template: p.template })),
      });
    }

    // Live send.
    const accountByUid = new Map(accounts.map((a) => [a.uid, a]));
    const from = process.env.RESEND_FROM_EMAIL!.trim();
    const postalAddress = process.env.EMAIL_POSTAL_ADDRESS!.trim();
    const regularCents = getProOffers().pro_monthly.amountCents;
    let sentCount = 0;
    const failures: string[] = [];

    for (const item of plan.slice(0, MAX_SENDS_PER_RUN)) {
      const account = accountByUid.get(item.uid)!;
      // Per-user unsubscribe token, stored server-side only.
      const prefRef = db.collection('email_prefs').doc(item.uid);
      let token = prefs.get(item.uid)?.token as string | undefined;
      if (!token) {
        token = randomBytes(24).toString('hex');
        await prefRef.set({ token, optOut: false }, { merge: true });
      }
      const unsubscribeUrl = `${SITE}/api/email/unsubscribe?u=${encodeURIComponent(item.uid)}&t=${token}`;
      const email = renderLifecycleEmail(item.template, {
        firstName: account.firstName,
        unsubscribeUrl,
        postalAddress,
        introCents: account.introEligible && intro ? intro.amountCents : null,
        regularCents,
      });
      const result = await resend!.emails.send({
        from,
        to: [account.email!],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }).catch((err: unknown) => ({ error: { message: String(err) } }));
      if ('error' in result && result.error) {
        failures.push(`${item.uid.slice(0, 6)}…: ${result.error.message}`);
        continue;
      }
      await db.collection('email_log').doc(item.uid).set({ [item.template]: now }, { merge: true });
      sentCount++;
      await new Promise((r) => setTimeout(r, 150)); // stay well under Resend rate limits
    }

    return Response.json({ mode: 'sent', sent: sentCount, planned: plan.length, byTemplate, failures: failures.slice(0, 20) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
