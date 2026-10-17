const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId
    });
  }
}

async function main() {
  const db = admin.firestore();
  console.log('Querying users collection...');
  const usersSnap = await db.collection('users').get();
  console.log('Total users in Firestore:', usersSnap.size);

  let totalUsers = usersSnap.size;
  let paidUsers = 0;
  let quotaHitUsers = 0;
  let usersWithUnlockedRefs = 0;
  let totalUnlockedRefsCount = 0;
  let maxUnlockedByUser = 0;
  let paidWhoHitQuota = 0;
  const tiersCount = {};

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.isPremium || data.plan === 'pro_monthly' || data.plan === 'pro_annual' || data.tier === 'tier5' || data.tier === 'tier1' || data.tier === 'tier2') {
      paidUsers++;
      const tierKey = data.plan || data.tier || 'pro';
      tiersCount[tierKey] = (tiersCount[tierKey] || 0) + 1;
    }
    if (data.lastQuotaHitAt) {
      quotaHitUsers++;
      if (data.isPremium || data.plan === 'pro_monthly' || data.plan === 'pro_annual' || data.tier === 'tier5') {
        paidWhoHitQuota++;
      }
    }
    if (Array.isArray(data.unlockedReferences) && data.unlockedReferences.length > 0) {
      usersWithUnlockedRefs++;
      totalUnlockedRefsCount += data.unlockedReferences.length;
      if (data.unlockedReferences.length > maxUnlockedByUser) {
        maxUnlockedByUser = data.unlockedReferences.length;
      }
    }
  }

  console.log('\n--- User & Quota Statistics ---');
  console.log(`Total Users registered: ${totalUsers}`);
  console.log(`Paid / Pro / Supporter Users: ${paidUsers}`, tiersCount);
  console.log(`Users with recorded quota hit (lastQuotaHitAt): ${quotaHitUsers}`);
  console.log(`Users with unlockedReferences tracked in Firestore profile: ${usersWithUnlockedRefs}`);
  console.log(`Total unlocked reference interactions tracked: ${totalUnlockedRefsCount}`);
  console.log(`Max references unlocked by any single user: ${maxUnlockedByUser}`);
  console.log(`Paid users who have a quota hit recorded: ${paidWhoHitQuota}`);
}

main().catch(console.error);
