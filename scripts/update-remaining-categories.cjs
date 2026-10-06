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

  const mitchellVid = allVids.find(v => v.title.toLowerCase().includes('mitchel'));
  const communityVid = allVids.find(v => v.uploader || v.author_name);

  const aiThumb = mitchellVid?.thumbnailUrl || 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2F6LgFskhTr0NLEiTcLWuw-thumbnailUrl.jpg?alt=media';
  const spotlightThumb = communityVid?.thumbnailUrl || 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2F6aZJsxde0bMw1Xsi402i-thumbnailUrl.jpg?alt=media';

  const catSnap = await db.collection('categories').get();
  for (const doc of catSnap.docs) {
    const data = doc.data();
    if (data.title === 'Ai') {
      console.log('Setting Ai category cover:', aiThumb);
      await doc.ref.update({ imageUrl: aiThumb, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
    if (data.title === 'Community Spotlight') {
      console.log('Setting Community Spotlight category cover:', spotlightThumb);
      await doc.ref.update({ imageUrl: spotlightThumb, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    }
  }

  console.log('Done!');
  process.exit(0);
}

run().catch(console.error);
