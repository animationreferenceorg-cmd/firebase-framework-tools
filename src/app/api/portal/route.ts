import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';


export async function POST(req: Request) {
    try {
        const { userId, returnUrl } = await req.json();

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

        const stripeCustomerId = userDoc.data()?.stripeCustomerId;

        if (!stripeCustomerId) {
            return NextResponse.json({ error: 'No subscription found for this user' }, { status: 404 });
        }

        // Create a Billing Portal session
        const stripe = getStripe();
        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: returnUrl || req.headers.get('origin') || 'http://localhost:3000',
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Error creating portal session:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
