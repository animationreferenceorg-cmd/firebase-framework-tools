import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from '@/lib/firebase-admin';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { syncUserFromStripe } from '@/lib/stripe-sync';

/**
 * Called before checkout to avoid double-subscribing: if the caller already
 * has a subscription that grants access, the client sends them to the
 * billing portal instead. Also refreshes their stored plan as a side effect.
 */
export async function POST(req: NextRequest) {
    try {
        const identity = await requireFirebaseUser(req);
        const verifiedEmail = identity.email_verified ? identity.email ?? null : null;

        const { billing, customerId } = await syncUserFromStripe(getStripe(), getFirestore(), identity.uid, { verifiedEmail });

        if (billing.isPremium) {
            return NextResponse.json({ hasActiveSubscription: true, customerId, plan: billing.plan, tier: billing.tier });
        }
        return NextResponse.json({ hasActiveSubscription: false });
    } catch (error: any) {
        if (error?.status) return apiErrorResponse(error);
        console.error('Error checking subscription:', error);
        return NextResponse.json({ error: 'Could not check your subscription.' }, { status: 500 });
    }
}
