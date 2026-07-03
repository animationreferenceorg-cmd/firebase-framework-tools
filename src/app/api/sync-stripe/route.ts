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
        const adminApp = getAdminApp();
        const db = getFirestore(adminApp);
        
        let customerIdsToTry = new Set<string>();

        // 1. Try to get stripeId from customers/{uid}
        try {
            const customerDoc = await db.collection('customers').doc(userId).get();
            if (customerDoc.exists && customerDoc.data()?.stripeId) {
                customerIdsToTry.add(customerDoc.data()!.stripeId);
            }
        } catch (e) {}

        // 2. Try to get stripeCustomerId from users/{uid}
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists && userDoc.data()?.stripeCustomerId) {
                customerIdsToTry.add(userDoc.data()!.stripeCustomerId);
            }
        } catch (e) {}

        // 3. Search Stripe by firebaseUID metadata
        try {
            const searchResult = await stripe.customers.search({
                query: `metadata['firebaseUID']:'${userId}'`,
                limit: 5
            });
            searchResult.data.forEach(c => customerIdsToTry.add(c.id));
        } catch (e) {
            console.log("[Sync Stripe API] Search by metadata failed or not supported", e);
        }

        // 4. Search Stripe by email
        try {
            const emailCustomers = await stripe.customers.list({
                email: email,
                limit: 5,
            });
            emailCustomers.data.forEach(c => customerIdsToTry.add(c.id));
        } catch (e) {}

        if (customerIdsToTry.size === 0) {
            console.log(`[Sync Stripe API] No customer found in Stripe for ${email} or ${userId}`);
            return NextResponse.json({ 
                success: false, 
                message: 'No Stripe customer found. Make sure you completed the checkout process.' 
            });
        }

        // Search through customers for an active or trialing subscription
        let activeSub = null;
        let customerId = '';

        for (const cid of Array.from(customerIdsToTry)) {
            console.log(`[Sync Stripe API] Checking subscriptions for customer: ${cid}`);
            try {
                const subscriptions = await stripe.subscriptions.list({
                    customer: cid,
                    status: 'all', // Fetch all to filter manually
                    limit: 10,
                });

                // Find an active or trialing subscription
                const foundSub = subscriptions.data.find(sub => 
                    sub.status === 'active' || sub.status === 'trialing'
                );

                if (foundSub) {
                    activeSub = foundSub;
                    customerId = cid;
                    console.log(`[Sync Stripe API] Found ${foundSub.status} subscription: ${foundSub.id}`);
                    break;
                }
            } catch (e) {
                console.log(`[Sync Stripe API] Failed to fetch subs for ${cid}`, e);
            }
        }

        if (!activeSub) {
            console.log(`[Sync Stripe API] No active or trialing subscriptions found in Stripe for ${email}. Deactivating premium status.`);
            // Update Firestore to clear premium status
            await db.collection('users').doc(userId).set({
                isPremium: false,
                tier: null,
                subscriptionStatus: 'canceled',
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            return NextResponse.json({ 
                success: false, 
                message: 'No active subscription found. Your subscription status has been synced as inactive.' 
            });
        }

        const priceId = activeSub.items.data[0].price.id;
        console.log(`[Sync Stripe API] Syncing subscription with PriceId: ${priceId}`);

        // Map price ID to tier (Matching the IDs in .env.local)
        let tier = 'tier1';
        if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
        else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
        else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';

        // 3. Update Firestore users collection using Admin SDK
        // (db is already initialized above)
        
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
