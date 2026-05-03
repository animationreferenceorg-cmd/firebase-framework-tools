
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getAdminApp } from '../src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function bulkSync() {
    console.log("Script execution started...");
    const adminApp = getAdminApp();
    if (!adminApp) {
        console.error("Firebase Admin not initialized. Check your credentials.");
        return;
    }
    const db = getFirestore(adminApp);
    
    console.log("Connected to Firestore. Fetching customers...");
    
    const customersSnap = await db.collection('customers').get();
    console.log(`Found ${customersSnap.size} customers in Firestore.`);
    
    let updatedCount = 0;
    
    for (const customerDoc of customersSnap.docs) {
        const uid = customerDoc.id;
        const subscriptionsSnap = await customerDoc.ref.collection('subscriptions')
            .where('status', 'in', ['active', 'trialing'])
            .get();
            
        if (!subscriptionsSnap.empty) {
            const subData = subscriptionsSnap.docs[0].data();
            const priceId = subData.items?.[0]?.price?.id || subData.price?.id;
            
            let tier = 'tier1';
            if (priceId === 'price_1SFgiV59QHehw05fc0lPRRf7') tier = 'tier2';
            else if (priceId === 'price_1SFgiq59QHehw05fy017h1gR') tier = 'tier5';
            else if (priceId === 'price_1SFgUc59QHehw05fROtqwkLN') tier = 'tier1';
            
            console.log(`Updating UID ${uid}: Tier ${tier} (Price: ${priceId})`);
            
            await db.collection('users').doc(uid).set({
                isPremium: true,
                tier: tier,
                subscriptionStatus: 'active'
            }, { merge: true });
            
            updatedCount++;
        }
    }
    
    console.log(`Bulk sync complete. Updated ${updatedCount} users.`);
}

bulkSync().catch(console.error);
