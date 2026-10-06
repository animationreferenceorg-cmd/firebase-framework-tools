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

const bucket = admin.storage().bucket('aniamtion-reference.firebasestorage.app');

async function checkVideosFolder() {
  console.log('Inspecting bucket aniamtion-reference.firebasestorage.app for prefix "videos/"...');
  const [files] = await bucket.getFiles({ prefix: 'videos/', maxResults: 50 });
  console.log(`Found ${files.length} sample files with prefix "videos/":`);
  files.slice(0, 15).forEach(f => console.log('  -', f.name, (f.metadata.size / 1024 / 1024).toFixed(2), 'MB'));
  
  // Count total files in videos/
  let count = 0;
  let totalBytes = 0;
  const stream = bucket.getFilesStream({ prefix: 'videos/' });
  for await (const file of stream) {
    count++;
    totalBytes += parseInt(file.metadata.size || '0', 10);
    if (count % 500 === 0) console.log(`Counted ${count} files in videos/...`);
  }
  console.log(`\nTotal files in "videos/": ${count}`);
  console.log(`Total size: ${(totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
}

checkVideosFolder().then(() => process.exit(0)).catch(console.error);
