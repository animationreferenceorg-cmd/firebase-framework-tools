#!/usr/bin/env node

/**
 * Migration Script: Reflix.dev to Firebase Storage / Bunny Stream
 * 
 * Usage:
 *   node scripts/migrate-reflix-videos.cjs --target=firebase
 *   node scripts/migrate-reflix-videos.cjs --target=bunny
 *   node scripts/migrate-reflix-videos.cjs --test-single (tests 1 video to verify origin connectivity)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const target = process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'firebase';
const isTestSingle = process.argv.includes('--test-single');
const limitParam = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

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
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
const bucket = admin.storage().bucket(bucketName);

const bunnyApiKey = process.env.BUNNY_API_KEY;
const bunnyLibraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-79893c7f-720.b-cdn.net';

async function downloadBuffer(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AnimationReference/1.0',
      'Accept': '*/*',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToBunny(fileBuffer, title) {
  if (!bunnyApiKey || !bunnyLibraryId) {
    throw new Error('Bunny credentials missing in environment');
  }
  // 1. Create entry
  const createRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
    method: 'POST',
    headers: {
      'AccessKey': bunnyApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) {
    throw new Error(`Bunny create failed: ${createRes.statusText}`);
  }
  const { guid } = await createRes.json();

  // 2. Upload binary
  const uploadRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${guid}`, {
    method: 'PUT',
    headers: {
      'AccessKey': bunnyApiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });
  if (!uploadRes.ok) {
    throw new Error(`Bunny binary upload failed: ${uploadRes.statusText}`);
  }

  return {
    videoUrl: `https://${bunnyHost}/${guid}/playlist.m3u8`,
    thumbnailUrl: `https://${bunnyHost}/${guid}/thumbnail.jpg`,
    guid,
  };
}

async function uploadToFirebaseStorage(fileBuffer, destinationPath, contentType = 'video/mp4') {
  const file = bucket.file(destinationPath);
  await file.save(fileBuffer, {
    metadata: { contentType, cacheControl: 'public, max-age=31536000' },
  });
  try {
    await file.makePublic();
  } catch (err) {
    // Some buckets enforce uniform bucket-level access; public URLs still work via storage.googleapis.com
  }
  return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
}

async function main() {
  console.log(`=== Reflix Migration Tool ===`);
  console.log(`Target: ${target.toUpperCase()}`);
  console.log(`Storage Bucket: ${bucket.name}`);
  console.log(`Checking connection to source assets.reflix.dev...`);

  // Connectivity test
  const testUrl = 'https://assets.reflix.dev/previews/L3TR52T22TPVR.mp4';
  try {
    const probe = await fetch(testUrl, { method: 'HEAD' });
    console.log(`Probe ${testUrl} -> Status: ${probe.status} ${probe.statusText}`);
    if (probe.status === 403 || probe.status === 402) {
      console.error(`\n❌ ERROR: assets.reflix.dev is currently offline (HTTP ${probe.status}).`);
      console.error(`The source CDN is refusing connections (Cloudflare / Vercel payment required).`);
      console.error(`The files cannot be downloaded until the origin reflix deployment is reactivated.`);
      if (isTestSingle) process.exit(1);
    }
  } catch (err) {
    console.error(`Probe error: ${err.message}`);
  }

  console.log(`\nQuerying Firestore for videos with assets.reflix.dev...`);
  const snapshot = await db.collection('videos').get();
  const queue = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const url = data.videoUrl || '';
    if (url.includes('assets.reflix.dev')) {
      queue.push({ id: doc.id, data });
    }
  }

  console.log(`Found ${queue.length} videos requiring migration.`);
  if (queue.length === 0) {
    console.log('No videos found with assets.reflix.dev. Everything is already migrated!');
    process.exit(0);
  }

  const itemsToProcess = isTestSingle
    ? queue.slice(0, 1)
    : limitParam > 0
    ? queue.slice(0, limitParam)
    : queue;

  console.log(`Starting migration for ${itemsToProcess.length} item(s)...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < itemsToProcess.length; i++) {
    const item = itemsToProcess[i];
    const { id, data } = item;
    const progress = `[${i + 1}/${itemsToProcess.length}]`;

    console.log(`${progress} Migrating "${data.title || id}" (${id})...`);

    try {
      // 1. Download video binary
      console.log(`  Downloading video: ${data.videoUrl}`);
      const videoBuffer = await downloadBuffer(data.videoUrl);
      console.log(`  Downloaded video (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

      let newVideoUrl = '';
      let newThumbUrl = '';

      if (target === 'bunny') {
        const bunnyRes = await uploadToBunny(videoBuffer, data.title || id);
        newVideoUrl = bunnyRes.videoUrl;
        newThumbUrl = bunnyRes.thumbnailUrl;
      } else {
        // Firebase Storage
        const dest = `videos/${id}.mp4`;
        newVideoUrl = await uploadToFirebaseStorage(videoBuffer, dest, 'video/mp4');

        // Try downloading thumbnail as well if available
        if (data.thumbnailUrl && data.thumbnailUrl.includes('assets.reflix.dev')) {
          try {
            const thumbBuffer = await downloadBuffer(data.thumbnailUrl);
            const thumbDest = `thumbnails/${id}.webp`;
            newThumbUrl = await uploadToFirebaseStorage(thumbBuffer, thumbDest, 'image/webp');
          } catch (e) {
            console.log(`  Thumb download skipped/failed: ${e.message}`);
          }
        }
      }

      // 2. Update Firestore document
      const updateData = {
        videoUrl: newVideoUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (newThumbUrl) {
        updateData.thumbnailUrl = newThumbUrl;
        updateData.posterUrl = newThumbUrl;
      }

      await db.collection('videos').doc(id).update(updateData);
      console.log(`  ✓ Updated Firestore doc with new URL: ${newVideoUrl}`);
      successCount++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      failCount++;
      if (err.message.includes('HTTP 403') || err.message.includes('HTTP 402')) {
        console.error(`\nStopping batch: Source host assets.reflix.dev is returning 403 Forbidden.`);
        console.error(`Cannot continue until assets.reflix.dev is unblocked.`);
        break;
      }
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Remaining: ${queue.length - successCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
