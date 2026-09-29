import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from '@/lib/firebase-admin';
import { handleStripeEvent } from '@/lib/stripe-webhook';
import { createWebhookDeps } from '@/lib/stripe-sync';

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
        return NextResponse.json({
            error: 'Invalid signature',
            debug: {
                secretPrefix: rawSecret.slice(0, 8),
                secretLength: rawSecret.length,
                reason: err.message
            }
        }, { status: 400 });
    }

    try {
        const result = await handleStripeEvent(event, createWebhookDeps(stripe, getFirestore()));
        if (result.handled && result.userIds.length) {
            console.log(`[Webhook] ${event.type} synced customer ${result.customerId} -> ${result.userIds.length} user(s)`);
        }
        return NextResponse.json({ received: true });
    } catch (error) {
        // A 500 makes Stripe retry, which is what we want for transient failures.
        console.error(`Error handling webhook event ${event.type} ${event.id}:`, error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
