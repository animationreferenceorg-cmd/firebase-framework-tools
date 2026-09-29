import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from '@/lib/firebase-admin';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';
import { buildCheckoutSessionParams, CheckoutPlanError, priceForCheckout } from '@/lib/checkout';

/**
 * Starts a Stripe Checkout session for `{ plan: 'pro_monthly' | 'pro_annual' }`.
 * The price is chosen here from src/lib/plans.ts — the client never sends one.
 */
export async function POST(req: NextRequest) {
    try {
        const identity = await requireFirebaseUser(req);
        const { plan, embedded } = await req.json().catch(() => ({}));
        // Validate before touching Stripe.
        priceForCheckout(plan);

        const stripe = getStripe();
        const db = getFirestore();
        const userRef = db.collection('users').doc(identity.uid);
        const profile = (await userRef.get()).data() ?? {};

        // Reuse the account's Stripe customer so every subscription lands on
        // one customer that the webhook can map back to this user.
        let customerId: string | undefined = typeof profile.stripeCustomerId === 'string' ? profile.stripeCustomerId : undefined;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: identity.email ?? undefined,
                metadata: { firebaseUID: identity.uid },
            });
            customerId = customer.id;
            await userRef.set({ stripeCustomerId: customerId }, { merge: true });
        }

        const session = await stripe.checkout.sessions.create(
            buildCheckoutSessionParams({
                plan,
                uid: identity.uid,
                customerId,
                origin: req.nextUrl.origin,
                embedded: Boolean(embedded),
            })
        );

        const responseData: Record<string, any> = { url: session.url };
        if (session.client_secret) {
            responseData.clientSecret = session.client_secret;
        }
        if (session.id) {
            responseData.sessionId = session.id;
        }
        return NextResponse.json(responseData);
    } catch (err: any) {
        if (err instanceof CheckoutPlanError) {
            return NextResponse.json({ error: err.code, message: err.message }, { status: err.code === 'INVALID_PLAN' ? 400 : 409 });
        }
        if (err?.status) return apiErrorResponse(err);
        console.error('Stripe Checkout Error:', err);
        return NextResponse.json({ error: 'CHECKOUT_FAILED', message: 'Could not start checkout.' }, { status: 500 });
    }
}
