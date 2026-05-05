import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

// Look for service account key or initialize with default env vars
const serviceAccountPath = './service-account.json'; // or however it's configured
let app;
try {
  app = initializeApp(); // relies on GOOGLE_APPLICATION_CREDENTIALS
} catch (e) {
  console.log("Failed to initialize default app", e);
}

const db = getFirestore();

async function check() {
  console.log("Checking users...");
  const snapshot = await db.collection('users').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`User ${doc.id}: isPremium=${data.isPremium}, tier=${data.tier}, subStatus=${data.subscriptionStatus}, stripeCustomer=${data.stripeCustomerId}`);
  });
  
  console.log("Checking customers...");
  const custSnap = await db.collection('customers').get();
  for (const doc of custSnap.docs) {
      console.log(`Customer ${doc.id}`);
      const subSnap = await db.collection('customers').doc(doc.id).collection('subscriptions').get();
      subSnap.forEach(s => {
          console.log(`  Sub ${s.id}: status=${s.data().status}, price=${s.data().items?.[0]?.price?.id}`);
      });
  }
}

check().catch(console.error);
