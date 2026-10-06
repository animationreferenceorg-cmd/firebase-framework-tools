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

async function listCollections() {
  const collections = await db.listCollections();
  console.log(`Found ${collections.length} top-level collections in Firestore:`);
  for (const c of collections) {
    const snap = await c.limit(1).get();
    console.log(`  - ${c.id} (sample size: ${snap.size})`);
  }
}

listCollections().then(() => process.exit(0)).catch(console.error);
