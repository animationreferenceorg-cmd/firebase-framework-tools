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

async function inspectFolders() {
  const bucket = storage.bucket('aniamtion-reference.firebasestorage.app');
  const folders = [
    'reference-uploads/',
    'private-reference/',
    'thumbnails/',
    'migrated-thumbnails/',
    'Short Films/',
    'site-assets/',
    'Aimation References/',
  ];
  
  for (const f of folders) {
    const [files] = await bucket.getFiles({ prefix: f, maxResults: 10 });
    console.log(`\nFolder: "${f}" (sample size ${files.length}):`);
    files.forEach(file => console.log('  -', file.name, (file.metadata.size / 1024 / 1024).toFixed(2), 'MB'));
  }
}

inspectFolders().then(() => process.exit(0)).catch(console.error);
