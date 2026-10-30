import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from '@/lib/firebase-admin';
import { handleStripeEvent } from '@/lib/stripe-webhook';
import { createWebhookDeps } from '@/lib/stripe-sync';
import { analytics } from '@heycatch/sdk';

analytics.init({ projectKey: 'hck_pk_ZH7SVbyuigr81Wgmsh7TJ9q_NaGxQyXb' });

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    const rawSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (!rawSecret) {
        console.error('STRIPE_WEBHOOK_SECRET is missing');
        return NextResponse.json({ error: 'Webhook secret missing' }, { status: 500 });
    }

    if (!signature) {
        return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    const stripe = getStripe();

    try {
        event = stripe.webhooks.constructEvent(body, signature, rawSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        const result = await handleStripeEvent(event, createWebhookDeps(stripe, getFirestore()));
        if (result.handled && result.userIds.length) {
            console.log(`[Webhook] ${event.type} synced customer ${result.customerId} -> ${result.userIds.length} user(s)`);
            if (event.type === 'checkout.session.completed' || event.type === 'customer.subscription.created') {
                for (const uid of result.userIds) {
                    await analytics.setIdentity(uid, { plan: 'pro' });
                    await analytics.trackEvent(
                        'subscription_started',
                        { plan: 'pro' },
                        { userId: uid },
                    );
                }
            } else if (event.type === 'customer.subscription.deleted') {
                for (const uid of result.userIds) {
                    await analytics.setIdentity(uid, { plan: 'free' });
                }
            }
        }
        return NextResponse.json({ received: true });
    } catch (error) {
        // A 500 makes Stripe retry, which is what we want for transient failures.
        console.error(`Error handling webhook event ${event.type} ${event.id}:`, error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
