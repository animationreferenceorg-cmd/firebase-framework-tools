import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';
import { ApiError, apiErrorResponse, getTrustedProfile, requireFirebaseUser } from '@/lib/api-auth';
import { getEntitlements } from '@/lib/plans';
import { sendAbandonedCheckoutEmail } from '@/lib/resend-service';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_DAYS_MS = 72 * 60 * 60 * 1000;

async function authorize(request: NextRequest): Promise<'cron' | 'admin'> {
    const cronSecret = process.env.CRON_SECRET?.trim();
    const header = request.headers.get('authorization') || '';
    if (cronSecret && header === `Bearer ${cronSecret}`) return 'cron';

    // Allow admin users to test or trigger the route
    const identity = await requireFirebaseUser(request).catch(() => null);
    if (identity) {
        const profile = await getTrustedProfile(identity.uid);
        if (identity.admin === true || profile.role === 'admin') return 'admin';
    }

    if (!cronSecret) {
        throw new ApiError(503, 'NOT_CONFIGURED', 'CRON_SECRET is not set, so the scheduler cannot authenticate.');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid credentials.');
}

/**
 * Checks for abandoned checkout sessions created >= 2 hours ago by users
 * who haven't completed their upgrade, and sends an automated recovery email via Resend.
 *
 * GET /api/cron/abandoned-checkout (Authorized via Bearer CRON_SECRET or Admin token)
 * Query params:
 *   ?dryRun=1 (previews who would be emailed without actually sending)
 */
export async function GET(req: NextRequest) {
    try {
        await authorize(req);
        const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';

        const db = getFirestore();
        const now = Date.now();
        const cutoffTime = now - TWO_HOURS_MS;
        const oldestTime = now - THREE_DAYS_MS;

        // Query open checkout sessions created between 2 hours and 3 days ago
        const snap = await db.collection('checkout_sessions')
            .where('status', '==', 'open')
            .where('followUpSent', '==', false)
            .get();

        const results: Array<{
            sessionId: string;
            userId: string;
            email: string;
            status: string;
            reason?: string;
        }> = [];

        let sentCount = 0;
        let skippedCount = 0;

        for (const doc of snap.docs) {
            const data = doc.data();
            const createdAt = typeof data.createdAt === 'number' ? data.createdAt : 0;

            // Only process sessions older than 2 hours and younger than 3 days
            if (createdAt > cutoffTime || createdAt < oldestTime) {
                continue;
            }

            const userId = data.userId;
            const email = data.email;
            if (!email) {
                skippedCount++;
                results.push({ sessionId: doc.id, userId, email: '', status: 'skipped', reason: 'no_email' });
                continue;
            }

            // Verify current plan of user
            let isAlreadyPro = false;
            try {
                const userDoc = await db.collection('users').doc(userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data() || {};
                    const entitlements = getEntitlements(userData);
                    if (entitlements.isPro) {
                        isAlreadyPro = true;
                    }
                }
            } catch (err) {
                console.warn(`[AbandonedCheckout] Failed to check plan for user ${userId}:`, err);
            }

            if (isAlreadyPro) {
                // User already completed upgrade on another session or device
                await doc.ref.set({ status: 'completed', completedAt: now }, { merge: true });
                skippedCount++;
                results.push({ sessionId: doc.id, userId, email, status: 'skipped', reason: 'already_pro' });
                continue;
            }

            if (dryRun) {
                results.push({ sessionId: doc.id, userId, email, status: 'would_send' });
                continue;
            }

            // Send recovery email via Resend
            const emailRes = await sendAbandonedCheckoutEmail({
                toEmail: email,
                displayName: data.displayName || undefined,
                checkoutUrl: data.checkoutUrl || undefined,
                plan: data.plan,
            });

            if (emailRes.success) {
                sentCount++;
                await doc.ref.set({
                    followUpSent: true,
                    followUpSentAt: now,
                }, { merge: true });

                results.push({ sessionId: doc.id, userId, email, status: 'sent' });
            } else {
                results.push({ sessionId: doc.id, userId, email, status: 'failed', reason: String(emailRes.message || emailRes.error) });
            }
        }

        return NextResponse.json({
            ok: true,
            dryRun,
            evaluated: snap.size,
            sent: sentCount,
            skipped: skippedCount,
            results,
        });
    } catch (err: any) {
        if (err?.status) return apiErrorResponse(err);
        console.error('[AbandonedCheckout] Error executing abandoned checkout job:', err);
        return NextResponse.json({ error: 'JOB_FAILED', message: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    return GET(req);
}

