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

async function inspectReflixDoc() {
  const snap = await db.collection('videos').where('videoUrl', '>=', 'https://assets.reflix.dev').limit(5).get();
  console.log(`Found ${snap.size} reflix docs:`);
  snap.docs.forEach(doc => {
    console.log('\n--- Doc ID:', doc.id, '---');
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

inspectReflixDoc().then(() => process.exit(0)).catch(console.error);
