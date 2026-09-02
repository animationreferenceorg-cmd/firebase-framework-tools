#!/usr/bin/env node
/**
 * Repairs videos whose videoUrl is a Cloud Storage *signed* URL.
 *
 * Those URLs were minted with expires: '03-01-2500' — permanent-looking, but a
 * signature is only valid while the service account that produced it still
 * holds its signing key. When that account was deleted every signature became
 * invalid at once and the clips started returning SignatureDoesNotMatch.
 *
 * Reference clips are public, so the fix is to publish each object and store a
 * plain unsigned URL, which depends on no key and cannot expire.
 *
 * Auth: Application Default Credentials.
 *   gcloud auth application-default login
 *
 * Usage:
 *   node scripts/fix-signed-urls.cjs --dry-run     # report only, changes nothing
 *   node scripts/fix-signed-urls.cjs               # apply
 *   node scripts/fix-signed-urls.cjs --limit 5     # apply to the first N only
 */

const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');
const limitFlag = process.argv.indexOf('--limit');
const LIMIT = limitFlag !== -1 ? parseInt(process.argv[limitFlag + 1], 10) : Infinity;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'aniamtion-reference.firebasestorage.app';

const SIGNED = /GoogleAccessId=|X-Goog-Signature=/;

function objectPathFromUrl(url, bucketName) {
  try {
    const parsed = new URL(url);
    const raw = decodeURIComponent(parsed.pathname);
    const prefix = `/${bucketName}/`;
    if (raw.startsWith(prefix)) return raw.slice(prefix.length);
    if (parsed.hostname.startsWith(`${bucketName}.`)) return raw.replace(/^\//, '');
    return null;
  } catch {
    return null;
  }
}

function publicUrl(bucketName, objectPath) {
  const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
  return `https://storage.googleapis.com/${bucketName}/${encoded}`;
}

async function main() {
  admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: BUCKET,
    credential: admin.credential.applicationDefault(),
  });

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  console.log(`project : ${PROJECT_ID}`);
  console.log(`bucket  : ${bucket.name}`);
  console.log(`mode    : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}\n`);

  const snapshot = await db.collection('videos').get();
  const affected = snapshot.docs.filter((d) => SIGNED.test(d.data()?.videoUrl || ''));

  console.log(`scanned  : ${snapshot.size}`);
  console.log(`affected : ${affected.length}\n`);

  if (affected.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  if (DRY_RUN) {
    affected.slice(0, 5).forEach((d) => {
      const data = d.data();
      const path = data.storagePath || objectPathFromUrl(data.videoUrl || '', bucket.name);
      console.log(`  ${d.id}  ${String(data.title || '').slice(0, 40).padEnd(42)} -> ${path}`);
    });
    if (affected.length > 5) console.log(`  ... and ${affected.length - 5} more`);
    console.log('\nRe-run without --dry-run to apply.');
    return;
  }

  let published = 0;
  let updated = 0;
  const skipped = [];
  const failed = [];

  let batch = db.batch();
  let pending = 0;
  let processed = 0;

  for (const doc of affected) {
    if (processed >= LIMIT) break;
    processed += 1;

    const data = doc.data();
    const objectPath = data.storagePath || objectPathFromUrl(data.videoUrl || '', bucket.name);

    if (!objectPath) {
      skipped.push({ id: doc.id, reason: 'no object path' });
      continue;
    }

    try {
      const file = bucket.file(objectPath);
      const [exists] = await file.exists();
      if (!exists) {
        skipped.push({ id: doc.id, reason: `missing object: ${objectPath}` });
        continue;
      }

      await file.makePublic();
      published += 1;

      batch.update(doc.ref, {
        videoUrl: publicUrl(bucket.name, objectPath),
        storagePath: objectPath,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      updated += 1;
      pending += 1;

      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }

      if (updated % 25 === 0) console.log(`  ...${updated} updated`);
    } catch (error) {
      failed.push({ id: doc.id, error: error.message });
    }
  }

  if (pending > 0) await batch.commit();

  console.log(`\npublished : ${published}`);
  console.log(`updated   : ${updated}`);
  console.log(`skipped   : ${skipped.length}`);
  console.log(`failed    : ${failed.length}`);
  skipped.slice(0, 10).forEach((s) => console.log(`  skip ${s.id}: ${s.reason}`));
  failed.slice(0, 10).forEach((f) => console.log(`  fail ${f.id}: ${f.error}`));
  console.log('\nRun `npm run export:videos` to refresh the public snapshot.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
