const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
} else {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
}

const db = admin.firestore();

async function checkStorageUrls() {
  const snap = await db.collection('videos').get();
  const gcsVideos = [];
  const bcdnVideos = [];
  
  for (const doc of snap.docs) {
    const data = doc.data();
    const url = data.videoUrl || '';
    if (url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com')) {
      gcsVideos.push({ id: doc.id, title: data.title, url });
    } else if (url.includes('b-cdn.net')) {
      bcdnVideos.push({ id: doc.id, title: data.title, url });
    }
  }
  
  console.log(`Found ${gcsVideos.length} GCS/FirebaseStorage videos.`);
  console.log('Sample GCS URLs:');
  gcsVideos.slice(0, 10).forEach(v => console.log('  -', v.id, v.url));
  
  console.log(`\nFound ${bcdnVideos.length} Bunny CDN videos.`);
  console.log('Sample Bunny URLs:');
  bcdnVideos.slice(0, 5).forEach(v => console.log('  -', v.id, v.url));
}

checkStorageUrls().then(() => process.exit(0)).catch(console.error);
