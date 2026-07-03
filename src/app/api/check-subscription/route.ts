import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';

export async function POST(req: Request) {
    try {
        const { email, userId } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const stripe = getStripe();
        const adminApp = getAdminApp();
        const db = getFirestore(adminApp);

        console.log(`[Check Subscription API] Checking for email: ${email}`);

        // Search Stripe for customer by email
        const customers = await stripe.customers.list({
            email: email,
            limit: 5
        });

        let activeSub = null;
        let customerId = '';

        for (const customer of customers.data) {
            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'all',
                limit: 10
            });

            // Find any active or trialing subscriptions
            const foundSub = subscriptions.data.find(sub => 
                sub.status === 'active' || sub.status === 'trialing'
            );

            if (foundSub) {
                activeSub = foundSub;
                customerId = customer.id;
                console.log(`[Check Subscription API] Found active subscription ${foundSub.id} for customer ${customer.id}`);
                break;
            }
        }

        if (activeSub) {
            const priceId = activeSub.items.data[0].price.id;
            
            // Map price ID to tier
            let tier = 'tier1';
            if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
            else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
            else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';

            // Proactively update Firestore user collection to link customer and set tier
            if (userId) {
                await db.collection('users').doc(userId).set({
                    isPremium: true,
                    tier: tier,
                    stripeCustomerId: customerId,
                    subscriptionStatus: activeSub.status,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                console.log(`[Check Subscription API] Proactively linked stripeCustomerId ${customerId} and activated ${tier} for user ${userId}`);
            }

            return NextResponse.json({ 
                hasActiveSubscription: true, 
                customerId,
                tier 
            });
        }

        return NextResponse.json({ hasActiveSubscription: false });

    } catch (error: any) {
        console.error('Error checking subscription:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
