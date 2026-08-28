import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';
import { apiErrorResponse, requireFirebaseUser } from '@/lib/api-auth';


export async function POST(req: NextRequest) {
    try {
        const identity = await requireFirebaseUser(req);
        const { returnUrl } = await req.json();
        const userId = identity.uid;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const adminApp = getAdminApp(); // Initialize Firebase Admin
        const db = getFirestore(adminApp);

        // Get the user's Stripe Customer ID from Firestore
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data() || {};
        let stripeCustomerId = userData.stripeCustomerId;

        // FALLBACK: If stripeCustomerId is missing, search Stripe by user's email
        if (!stripeCustomerId && userData.email) {
            const email = userData.email;
            console.log(`[Portal] stripeCustomerId missing for user ${userId}. Searching Stripe by email: ${email}`);
            try {
                const stripe = getStripe();
                const customers = await stripe.customers.list({
                    email: email,
                    limit: 1,
                });
                if (customers.data.length > 0) {
                    stripeCustomerId = customers.data[0].id;
                    // Proactively link the stripeCustomerId in Firestore
                    await db.collection('users').doc(userId).update({
                        stripeCustomerId: stripeCustomerId
                    });
                    console.log(`[Portal] Proactively linked stripeCustomerId ${stripeCustomerId} to user ${userId}`);
                }
            } catch (err) {
                console.error('[Portal] Error searching Stripe customer by email:', err);
            }
        }

        if (!stripeCustomerId) {
            return NextResponse.json({ error: 'No subscription found for this user. Make sure you are subscribed.' }, { status: 404 });
        }

        // Create a Billing Portal session
        const stripe = getStripe();
        const origin = req.nextUrl.origin;
        const safeReturnUrl = typeof returnUrl === 'string' && new URL(returnUrl, origin).origin === origin ? new URL(returnUrl, origin).toString() : `${origin}/profile`;
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: safeReturnUrl,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        if (error?.status) return apiErrorResponse(error);
        console.error('Error creating portal session:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
