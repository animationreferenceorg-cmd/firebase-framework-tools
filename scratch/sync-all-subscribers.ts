import { config } from 'dotenv';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

config({ path: '.env.local' });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!projectId || !clientEmail || !privateKey || !stripeSecretKey) {
  console.error("Missing Firebase or Stripe credentials in environment");
  process.exit(1);
}

// Format private key
const formattedKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey: formattedKey,
  })
});
const db = admin.firestore();

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any
});

async function run() {
  console.log("Starting full database subscription audit and synchronization...\n");

  const usersSnapshot = await db.collection('users').get();
  console.log(`Total users in Firestore: ${usersSnapshot.size}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let correctCount = 0;

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const email = data.email;
    const userId = doc.id;
    const currentIsPremium = data.isPremium || false;
    const currentTier = data.tier || 'free';
    const currentCustomerId = data.stripeCustomerId || '';

    if (!email) {
      console.log(`User ${userId} has no email address. Skipping.`);
      skippedCount++;
      continue;
    }

    // Find customers in Stripe matching this email
    let stripeCustomerId = currentCustomerId;
    let activeSub = null;

    try {
      // 1. If we have a stored customer ID, check it first
      if (stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: stripeCustomerId,
          status: 'all',
          limit: 10
        });
        activeSub = subscriptions.data.find(sub => 
          sub.status === 'active' || sub.status === 'trialing'
        );
      }

      // 2. If no active sub found yet, search Stripe by email
      if (!activeSub) {
        const customers = await stripe.customers.list({
          email: email,
          limit: 5
        });

        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all',
            limit: 10
          });
          const foundSub = subscriptions.data.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
          );
          if (foundSub) {
            activeSub = foundSub;
            stripeCustomerId = customer.id;
            break;
          }
        }
      }

      // 3. Resolve correct tier and update Firestore
      if (activeSub) {
        const priceId = activeSub.items.data[0].price.id;
        let targetTier = 'tier1';
        if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') targetTier = 'tier2';
        else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') targetTier = 'tier5';
        else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') targetTier = 'tier1';

        const needsUpdate = 
          !currentIsPremium || 
          currentTier !== targetTier || 
          currentCustomerId !== stripeCustomerId ||
          data.subscriptionStatus !== activeSub.status;

        if (needsUpdate) {
          console.log(`[UPDATE] ${email} (${userId}): Upgrading to ${targetTier} (Stripe Customer: ${stripeCustomerId}, Sub: ${activeSub.id})`);
          await doc.ref.update({
            isPremium: true,
            tier: targetTier,
            stripeCustomerId: stripeCustomerId,
            subscriptionStatus: activeSub.status,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        } else {
          correctCount++;
        }
      } else {
        // No active subscription found in Stripe. Check if Firestore thinks they are premium.
        if (currentIsPremium) {
          console.log(`[UPDATE] ${email} (${userId}): Deactivating premium (has no active subscription in Stripe, previously marked ${currentTier})`);
          await doc.ref.update({
            isPremium: false,
            tier: null,
            subscriptionStatus: 'canceled',
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
        } else {
          correctCount++;
        }
      }
    } catch (err) {
      console.error(`Error auditing user ${email}:`, err);
    }
  }

  console.log(`\n--- Audit Summary ---`);
  console.log(`Total verified/synced correctly: ${correctCount}`);
  console.log(`Total updated:                    ${updatedCount}`);
  console.log(`Total skipped (no email):         ${skippedCount}`);
  console.log(`Total audited users:             ${usersSnapshot.size}`);
}

run().catch(console.error);
