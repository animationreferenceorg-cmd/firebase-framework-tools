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

async function inspectRefClips() {
  const countSnap = await db.collection('reference_clips').count().get();
  console.log('Count in reference_clips:', countSnap.data().count);
  const snap = await db.collection('reference_clips').limit(5).get();
  snap.docs.forEach(d => {
    console.log('\n--- ID:', d.id, '---');
    console.log(JSON.stringify(d.data(), null, 2));
  });
}

inspectRefClips().then(() => process.exit(0)).catch(console.error);
