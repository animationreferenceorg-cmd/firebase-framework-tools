const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

const storage = new Storage({
  projectId,
  credentials: clientEmail && privateKey.includes('BEGIN PRIVATE KEY') ? {
    client_email: clientEmail,
    private_key: privateKey,
  } : undefined,
});

async function listBuckets() {
  console.log('Listing GCS buckets for project:', projectId);
  const [buckets] = await storage.getBuckets();
  console.log(`Found ${buckets.length} bucket(s):`);
  for (const b of buckets) {
    console.log(`\nBucket: ${b.name}`);
    try {
      const [files] = await b.getFiles({ maxResults: 15 });
      console.log(`  File count in sample: ${files.length}`);
      files.forEach(f => console.log(`    - ${f.name} (${(f.metadata.size / 1024 / 1024).toFixed(2)} MB)`));
    } catch (e) {
      console.log(`  Error reading files: ${e.message}`);
    }
  }
}

listBuckets().then(() => process.exit(0)).catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
