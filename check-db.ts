import { getAdminApp, getFirestore } from './src/lib/firebase-admin';

async function check() {
  getAdminApp();
  const db = getFirestore();

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
