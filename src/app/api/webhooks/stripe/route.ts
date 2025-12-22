import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase-admin';


// Helper to get raw body for signature verification
async function getRawBody(request: Request): Promise<Buffer> {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];

    if (!reader) {
        throw new Error('No body reader available');
    }

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error('STRIPE_WEBHOOK_SECRET is missing');
        return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
    }

    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }


    let event: Stripe.Event;

    try {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const adminApp = getAdminApp(); // Initialize Firebase Admin
    const db = getFirestore(adminApp);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.client_reference_id || session.metadata?.userId;
                const customerId = session.customer as string;

                if (userId && customerId) {
                    console.log(`Linking Stripe Customer ${customerId} to User ${userId}`);
                    await db.collection('users').doc(userId).set({
                        stripeCustomerId: customerId,
                        isPremium: true,
                        subscriptionStatus: 'active', // You might want to get actual status from subscription object
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                // We need to find the user with this customer ID
                const customerId = subscription.customer as string;

                const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();

                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            isPremium: false,
                            subscriptionStatus: 'canceled',
                            updatedAt: new Date().toISOString()
                        });
                    });
                    await batch.commit();
                    console.log(`Marked user(s) with customer ${customerId} as canceled`);
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('Error handling webhook event:', error);
        return NextResponse.json(
            { error: 'Webhook handler failed' },
            { status: 500 }
        );
    }
}
