import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getFirebaseAuth, getFirestore } from '@/lib/firebase-admin';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { syncUserFromStripe } from '@/lib/stripe-sync';
import { planLabel } from '@/lib/plans';

/**
 * Re-reads the caller's subscriptions from Stripe and updates their profile.
 * Admins may pass `userId` to sync someone else.
 */
export async function POST(req: NextRequest) {
    try {
        const identity = await requireFirebaseUser(req);
        const body = await req.json().catch(() => ({}));
        const db = getFirestore();

        let userId = identity.uid;
        let verifiedEmail = identity.email_verified ? identity.email ?? null : null;

        if (typeof body.userId === 'string' && body.userId !== identity.uid) {
            const requester = await db.collection('users').doc(identity.uid).get();
            if (requester.data()?.role !== 'admin') {
                return NextResponse.json({ error: 'FORBIDDEN', message: 'Only admins can sync another account.' }, { status: 403 });
            }
            userId = body.userId;
            // For an admin-initiated sync, trust the email Firebase Auth has verified for that user.
            const target = await getFirebaseAuth().getUser(userId).catch(() => null);
            verifiedEmail = target?.emailVerified ? target.email ?? null : null;
        }

        const { billing, customerIds } = await syncUserFromStripe(getStripe(), db, userId, { verifiedEmail });

        if (!customerIds.length) {
            return NextResponse.json({
                success: false,
                message: 'No Stripe customer found for this account. If you just paid, wait a minute and try again.',
            });
        }

        if (!billing.isPremium) {
            return NextResponse.json({
                success: false,
                status: billing.subscriptionStatus,
                message: 'No active subscription found. Your plan has been synced as inactive.',
            });
        }

        return NextResponse.json({
            success: true,
            plan: billing.plan,
            tier: billing.tier,
            status: billing.subscriptionStatus,
            message: `Synced! Your ${planLabel(billing.plan)} plan is active.`,
        });
    } catch (err: any) {
        if (err?.status) return apiErrorResponse(err);
        console.error('Sync Stripe Error:', err);
        return NextResponse.json({ error: 'Could not sync your subscription.' }, { status: 500 });
    }
}
