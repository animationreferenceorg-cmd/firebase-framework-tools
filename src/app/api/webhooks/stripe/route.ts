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
                let userId = session.client_reference_id || session.metadata?.userId;
                const customerId = session.customer as string;
                const subscriptionId = session.subscription as string;

                // FALLBACK: If userId is missing, try to resolve user by customer email
                if (!userId && session.customer_details?.email) {
                    const email = session.customer_details.email;
                    console.log(`[Webhook] No client_reference_id/userId found in checkout session. Trying to search user by email: ${email}`);
                    try {
                        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
                        if (!usersSnapshot.empty) {
                            userId = usersSnapshot.docs[0].id;
                            console.log(`[Webhook] Found user by email fallback: ${userId}`);
                        } else {
                            console.log(`[Webhook] No user found with email: ${email}`);
                        }
                    } catch (err) {
                        console.error('[Webhook] Error searching user by email fallback:', err);
                    }
                }

                if (userId && customerId) {
                    console.log(`Linking Stripe Customer ${customerId} to User ${userId}`);
                    
                    let tier = 'tier1';
                    if (subscriptionId) {
                        try {
                            const stripe = getStripe();
                            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                            const priceId = subscription.items.data[0].price.id;
                            
                            // Map price ID to tier
                            if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
                            else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
                            else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';
                            
                            console.log(`[Webhook] Found subscription ${subscriptionId} with price ${priceId}, assigning tier ${tier}`);
                        } catch (err) {
                            console.error('[Webhook] Error retrieving subscription details:', err);
                        }
                    }

                    await db.collection('users').doc(userId).set({
                        stripeCustomerId: customerId,
                        isPremium: true,
                        tier: tier,
                        subscriptionStatus: 'active',
                        updatedAt: new Date().toISOString(),
                    }, { merge: true });
                }
                break;
            }

            case 'customer.subscription.deleted':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                // We need to find the user with this customer ID
                const customerId = subscription.customer as string;

                let snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).get();

                // FALLBACK: If no user found by stripeCustomerId, lookup email from Stripe
                if (snapshot.empty) {
                    try {
                        const stripe = getStripe();
                        const customer = await stripe.customers.retrieve(customerId);
                        if (customer && !customer.deleted && (customer as Stripe.Customer).email) {
                            const email = (customer as Stripe.Customer).email!;
                            console.log(`[Webhook] Subscription event: User not found by stripeCustomerId ${customerId}. Searching by email fallback: ${email}`);
                            snapshot = await db.collection('users').where('email', '==', email).get();
                            
                            // Proactively link the stripeCustomerId so future hooks match directly
                            if (!snapshot.empty) {
                                const linkBatch = db.batch();
                                snapshot.forEach(doc => {
                                    linkBatch.update(doc.ref, { stripeCustomerId: customerId });
                                });
                                await linkBatch.commit();
                                console.log(`[Webhook] Proactively linked stripeCustomerId ${customerId} to user by email fallback`);
                            }
                        }
                    } catch (err) {
                        console.error('[Webhook] Error during subscription email fallback resolution:', err);
                    }
                }

                if (!snapshot.empty) {
                    const batch = db.batch();
                    const isDeleted = event.type === 'customer.subscription.deleted';
                    const isCanceled = subscription.status === 'canceled' || subscription.status === 'unpaid';
                    
                    let tier = 'tier1';
                    if (!isDeleted && !isCanceled && subscription.items.data.length > 0) {
                        const priceId = subscription.items.data[0].price.id;
                        if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
                        else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
                        else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';
                    }

                    snapshot.forEach(doc => {
                        batch.update(doc.ref, {
                            isPremium: !isDeleted && !isCanceled,
                            tier: !isDeleted && !isCanceled ? tier : null,
                            subscriptionStatus: isDeleted ? 'canceled' : subscription.status,
                            updatedAt: new Date().toISOString()
                        });
                    });
                    await batch.commit();
                    console.log(`Updated user(s) with customer ${customerId}: ${event.type}`);
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
