#!/usr/bin/env node

/**
 * Archives all 7,411 broken Reflix videos in Firestore by setting status: 'archived'.
 * This hides them from the public snapshot, search results, and category grids,
 * preventing 403 Forbidden / 402 Payment Required errors for users.
 * The documents and their metadata are preserved in Firestore.
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'aniamtion-reference.firebasestorage.app';

  if (!admin.apps.length) {
    if (projectId && clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        storageBucket
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId || 'aniamtion-reference',
        storageBucket
      });
    }
  }

  return admin.firestore();
}

async function main() {
  const db = initDb();
  console.log('Querying videos in Firestore to identify Reflix hosts...');

  const snapshot = await db.collection('videos').get();
  const reflixDocs = snapshot.docs.filter(doc => {
    const data = doc.data();
    const vid = (data.videoUrl || '').toLowerCase();
    const thumb = (data.thumbnailUrl || '').toLowerCase();
    const poster = (data.posterUrl || '').toLowerCase();
    return vid.includes('reflix.dev') || thumb.includes('reflix.dev') || poster.includes('reflix.dev');
  });

  console.log(`Found ${reflixDocs.length} Reflix videos out of ${snapshot.size} total. Setting status to 'archived'...`);

  let count = 0;
  const docs = reflixDocs;
  const BATCH_SIZE = 450;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.update(doc.ref, {
        status: 'archived',
        archiveReason: 'reflix_host_offline_403',
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    count += chunk.length;
    process.stdout.write(`\rArchived ${count}/${docs.length} videos (${Math.round((count / docs.length) * 100)}%)`);
  }

  console.log('\n✅ Successfully archived broken Reflix videos in Firestore.');

  console.log('Regenerating static video snapshot...');
  const { execSync } = require('child_process');
  execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
  console.log('✅ Video snapshot regenerated.');
}

main().catch(err => {
  console.error('\nError archiving Reflix videos:', err);
  process.exit(1);
});
