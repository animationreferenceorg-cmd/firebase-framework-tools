const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId || 'aniamtion-reference',
    });
  }
  return admin.firestore();
}

async function run() {
  const db = initDb();
  const snapFile = path.join(__dirname, '..', 'public', 'data', 'videos-snapshot.json');
  const allVids = JSON.parse(fs.readFileSync(snapFile, 'utf8'));
  console.log(`Loaded ${allVids.length} snapshot videos`);

  const catSnap = await db.collection('categories').get();
  console.log(`Loaded ${catSnap.size} categories from Firestore`);

  let updated = 0;
  for (const doc of catSnap.docs) {
    const c = { id: doc.id, ...doc.data() };
    const currentImg = c.imageUrl || '';
    const isBase64 = currentImg.startsWith('data:');
    const isPlaceholder = currentImg.includes('placehold.co');
    const isReflix = currentImg.includes('reflix.dev');
    const isMissing = !currentImg;

    if (isBase64 || isPlaceholder || isReflix || isMissing) {
      // Find matching video
      const catTitleLower = (c.title || '').toLowerCase();
      const match = allVids.find(v => {
        const inCategoryIds = (v.categoryIds || []).includes(c.id);
        const inCategories = (v.categories || []).includes(c.id);
        const inCatByTitle = (v.categories || []).some(cat => (cat || '').toLowerCase() === catTitleLower);
        const inTags = (v.tags || []).some(t => {
          const tLower = (t || '').toLowerCase();
          return tLower === catTitleLower || catTitleLower.includes(tLower);
        });
        return inCategoryIds || inCategories || inCatByTitle || inTags;
      });

      const newCover = match?.thumbnailUrl || match?.posterUrl;
      if (newCover && !newCover.includes('reflix.dev') && newCover.startsWith('http')) {
        console.log(`[UPDATE] ${c.title} -> ${newCover.slice(0, 60)}...`);
        await db.collection('categories').doc(c.id).update({
          imageUrl: newCover,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updated++;
      }
    }
  }

  console.log(`Total categories updated: ${updated}`);
  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
