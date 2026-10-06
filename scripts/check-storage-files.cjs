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
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`);

async function checkStorage() {
  console.log('Inspecting bucket:', bucket.name);
  
  // Check 'Aimation References/' prefix
  const [filesAnimRef] = await bucket.getFiles({ prefix: 'Aimation References/', maxResults: 50 });
  console.log(`Files with prefix "Aimation References/" (sample of ${filesAnimRef.length}):`);
  filesAnimRef.slice(0, 10).forEach(f => console.log('  -', f.name, (f.metadata.size / 1024 / 1024).toFixed(2), 'MB'));

  // Count total files in Aimation References/
  let count = 0;
  let totalBytes = 0;
  const sampleNames = [];
  
  const stream = bucket.getFilesStream({ prefix: 'Aimation References/' });
  for await (const file of stream) {
    count++;
    totalBytes += parseInt(file.metadata.size || '0', 10);
    if (sampleNames.length < 20) sampleNames.push(file.name);
    if (count % 1000 === 0) console.log(`Counted ${count} files...`);
  }
  
  console.log(`\nTotal files in "Aimation References/": ${count}`);
  console.log(`Total size: ${(totalBytes / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log('Sample file names:');
  console.log(sampleNames.slice(0, 15));
  
  // Check if any sample names match the reflix IDs like L3TR52T22TPVR
  const [testExample] = await bucket.getFiles({ prefix: 'Aimation References/L3TR', maxResults: 10 });
  console.log('Matches for "Aimation References/L3TR":', testExample.map(f => f.name));

  // Check root files as well
  const [rootFiles] = await bucket.getFiles({ maxResults: 30, delimiter: '/' });
  console.log('Root prefixes / folders:');
  // @ts-ignore
}

checkStorage().then(() => process.exit(0)).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
