import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { getFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
                if (event.type === 'checkout.session.completed') {
                    const sessionObj = event.data.object as Stripe.Checkout.Session;
                    if (sessionObj?.id) {
                        try {
                            await getFirestore().collection('checkout_sessions').doc(sessionObj.id).set({
                                status: 'completed',
                                completedAt: Date.now(),
                            }, { merge: true });
                        } catch (e) {
                            console.warn('[Webhook] Could not mark checkout session completed:', e);
                        }
                    }
                }
                for (const uid of result.userIds) {
                    await analytics.setIdentity(uid, { plan: 'pro' });
                    await analytics.trackEvent(
                        'subscription_started',
                        { plan: 'pro' },
                        { userId: uid },
                    );

                    // Attribute Pro conversion to Maya/Blender plugin if user linked a plugin
                    if (event.type === 'checkout.session.completed') {
                        try {
                            const db = getFirestore();
                            const userSnap = await db.collection('users').doc(uid).get();
                            const uData = userSnap.data() || {};
                            const linkedPlugin = typeof uData.lastLinkedPlugin === 'string'
                                ? uData.lastLinkedPlugin.toLowerCase()
                                : (Array.isArray(uData.linkedPlugins) && uData.linkedPlugins.length > 0
                                    ? String(uData.linkedPlugins[uData.linkedPlugins.length - 1]).toLowerCase()
                                    : '');
                            if (linkedPlugin === 'maya' || linkedPlugin === 'blender' || linkedPlugin === 'extension') {
                                const sessionObj = event.data.object as Stripe.Checkout.Session;
                                const amountCents = Number(sessionObj?.amount_total || 0);
                                await Promise.all([
                                    db.collection('analytics_rollups').doc('plugin_funnel').set(
                                        {
                                            pro_conversions_total: FieldValue.increment(1),
                                            [`pro_conversions_${linkedPlugin}`]: FieldValue.increment(1),
                                            pro_revenue_cents_total: FieldValue.increment(amountCents),
                                            [`pro_revenue_cents_${linkedPlugin}`]: FieldValue.increment(amountCents),
                                            updatedAt: FieldValue.serverTimestamp(),
                                        },
                                        { merge: true }
                                    ),
                                    db.collection('plugin_analytics_events').add({
                                        event: 'pro_converted',
                                        plugin: linkedPlugin,
                                        source: 'stripe_webhook',
                                        uid,
                                        amountCents,
                                        sessionId: sessionObj?.id || null,
                                        createdAt: FieldValue.serverTimestamp(),
                                    }),
                                    analytics.trackEvent(
                                        'plugin_pro_converted',
                                        { plugin: linkedPlugin, amount_cents: amountCents },
                                        { userId: uid },
                                    ),
                                ]);
                            }
                        } catch (attrErr) {
                            console.warn('[Webhook] Plugin Pro attribution failed:', attrErr);
                        }
                    }
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
