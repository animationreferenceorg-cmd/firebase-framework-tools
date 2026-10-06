const { Storage } = require('@google-cloud/storage');
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

async function listAllPrefixes() {
  const bucket = storage.bucket('aniamtion-reference.firebasestorage.app');
  console.log('Listing all top-level prefixes in aniamtion-reference.firebasestorage.app...');
  const [files, nextQuery, apiResponse] = await bucket.getFiles({ delimiter: '/' });
  console.log('Prefixes (folders):', apiResponse.prefixes);
  console.log('Root files count:', files.length);
  files.forEach(f => console.log('  -', f.name));
}

listAllPrefixes().then(() => process.exit(0)).catch(console.error);
