import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getAdminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
        }

        console.log(`[Sync Stripe API] Syncing for user: ${userId}, email: ${email}`);

        const stripe = getStripe();
        
        // 1. Search for customers with this email in Stripe
        const customers = await stripe.customers.list({
            email: email,
            limit: 5, // Check a few just in case of duplicates
        });

        if (customers.data.length === 0) {
            console.log(`[Sync Stripe API] No customer found in Stripe for ${email}`);
            return NextResponse.json({ 
                success: false, 
                message: 'No Stripe customer found for this email. Make sure you used the same email for payment.' 
            });
        }

        // Search through customers for an active subscription
        let activeSub = null;
        let customerId = '';

        for (const customer of customers.data) {
            const subscriptions = await stripe.subscriptions.list({
                customer: customer.id,
                status: 'active',
            });

            if (subscriptions.data.length > 0) {
                activeSub = subscriptions.data[0];
                customerId = customer.id;
                break;
            }
        }

        if (!activeSub) {
            console.log(`[Sync Stripe API] No active subscriptions found in Stripe for ${email}`);
            return NextResponse.json({ 
                success: false, 
                message: 'No active subscriptions found in Stripe. If you just paid, it might take a minute to appear.' 
            });
        }

        const priceId = activeSub.items.data[0].price.id;
        console.log(`[Sync Stripe API] Found active subscription! PriceId: ${priceId}`);

        // Map price ID to tier (Matching the IDs in .env.local)
        let tier = 'tier1';
        if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
        else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
        else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';

        // 3. Update Firestore users collection using Admin SDK
        const adminApp = getAdminApp();
        const db = getFirestore(adminApp);
        
        await db.collection('users').doc(userId).set({
            isPremium: true,
            tier: tier,
            stripeCustomerId: customerId,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        console.log(`[Sync Stripe API] Successfully updated user ${userId} to ${tier}`);

        return NextResponse.json({ 
            success: true, 
            message: `Successfully synced! Your ${tier === 'tier1' ? 'Supporter' : tier === 'tier2' ? 'Super Fan' : 'Pro'} plan is now active.`,
            tier 
        });
    } catch (err: any) {
        console.error('Sync Stripe Error:', err);
        return NextResponse.json({ 
            error: err.message || 'Internal Server Error' 
        }, { status: 500 });
    }
}
