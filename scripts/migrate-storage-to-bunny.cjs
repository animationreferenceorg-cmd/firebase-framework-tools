#!/usr/bin/env node

/**
 * Firebase Storage to Bunny.net Stream Migration Script
 * 
 * Downloads videos stored on Firebase Storage and uploads them to Bunny Stream.
 * Updates Firestore document references to use Bunny's CDN and HLS playlist URLs,
 * then cleans up/deletes the original files from Firebase Storage.
 * 
 * Prerequisites:
 *   Configure these variables in your .env.local:
 *   - BUNNY_API_KEY=your_bunny_api_key
 *   - BUNNY_LIBRARY_ID=your_bunny_stream_library_id
 *   - NEXT_PUBLIC_BUNNY_STREAM_HOST=your_pull_zone_hostname (e.g. vz-xxxx.b-cdn.net)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const apiKey = process.env.BUNNY_API_KEY;
const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-79893c7f-720.b-cdn.net';

if (!apiKey || !libraryId) {
  console.error('ERROR: Missing Bunny.net credentials in environment (BUNNY_API_KEY or BUNNY_LIBRARY_ID)');
  console.log('Please add them to your .env.local file first.');
  process.exit(1);
}

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket
    });
  }
  return admin.firestore();
}

// Progress Bar helper
function drawProgressBar(current, total, label = 'Migrating') {
  const percentage = Math.min(100, Math.floor((current / total) * 100));
  const barLength = 25;
  const filledLength = Math.floor((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;
  const bar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
  
  const text = `\r[${bar}] ${percentage}% | ${current}/${total} ${label}`;
  
  if (process.stdout.isTTY) {
    process.stdout.write(text.padEnd(80, ' '));
    if (current === total) {
      process.stdout.write('\n');
    }
  } else {
    if (current === 0 || current === total || current % Math.max(1, Math.floor(total / 10)) === 0) {
      console.log(`[${label}] ${current}/${total} (${percentage}%)`);
    }
  }
}

// Helper to interact with Bunny Stream API
async function uploadToBunny(localFilePath, title) {
  // 1. Create video entry on Bunny Stream
  const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: 'POST',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const text = await createRes.text();
    throw new Error(`Failed to create video on Bunny Stream: ${createRes.statusText} (${text})`);
  }

  const createData = await createRes.json();
  const guid = createData.guid;

  // 2. Upload file binary
  const fileBuffer = fs.readFileSync(localFilePath);
  const uploadRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/octet-stream'
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Failed to upload binary to Bunny Stream: ${uploadRes.statusText} (${text})`);
  }

  return guid;
}

(async () => {
  console.log('Initializing connection...');
  const db = initDb();
  const bucket = admin.storage().bucket();

  console.log('Querying videos stored in Firebase Storage...');
  const snapshot = await db.collection('videos').get();
  
  // Identify documents that point to Firebase Storage
  const migrationQueue = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const isFirebaseUrl = (data.videoUrl || '').includes('firebasestorage.googleapis.com') || 
                           (data.videoUrl || '').includes('googleusercontent.com');
    if (isFirebaseUrl && !data.externalBunnyId) {
      migrationQueue.push({ id: doc.id, data });
    }
  });

  console.log(`Found ${migrationQueue.length} videos hosted on Firebase Storage ready for migration.\n`);
  
  if (migrationQueue.length === 0) {
    console.log('No videos require migration. Exiting.');
    process.exit(0);
  }

  let migratedCount = 0;
  drawProgressBar(0, migrationQueue.length, 'Migrating videos');

  for (const item of migrationQueue) {
    const docId = item.id;
    const title = item.data.title || `Migrated video #${docId}`;
    const tempFile = path.join(os.tmpdir(), `migrate-${docId}.mp4`);

    drawProgressBar(migratedCount, migrationQueue.length, `Downloading #${docId}`);

    try {
      // 1. Resolve storage path
      // Firebase Storage URLs contain the path between /o/ and ?alt=media
      let storagePath = '';
      const match = item.data.videoUrl.match(/\/o\/(.+?)\?/);
      if (match) {
        storagePath = decodeURIComponent(match[1]);
      } else {
        // Fallback: assume default naming scheme
        storagePath = `videos/${docId}.mp4`;
      }

      // 2. Download from Firebase Storage
      const fileRef = bucket.file(storagePath);
      const exists = await fileRef.exists();
      if (!exists[0]) {
        throw new Error(`File does not exist in Firebase Storage bucket: ${storagePath}`);
      }

      await fileRef.download({ destination: tempFile });

      // 3. Upload to Bunny Stream
      drawProgressBar(migratedCount, migrationQueue.length, `Uploading #${docId}`);
      const guid = await uploadToBunny(tempFile, title);

      // 4. Update Firestore database doc
      const bunnyHlsUrl = `https://${bunnyHost}/${guid}/playlist.m3u8`;
      const bunnyThumbnailUrl = `https://${bunnyHost}/${guid}/thumbnail.jpg`;

      await db.collection('videos').doc(docId).update({
        videoUrl: bunnyHlsUrl,
        thumbnailUrl: bunnyThumbnailUrl,
        posterUrl: bunnyThumbnailUrl,
        externalBunnyId: guid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 5. Delete file from Firebase Storage
      await fileRef.delete();

      // Clean up temp file
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);

      migratedCount++;
      drawProgressBar(migratedCount, migrationQueue.length, `Completed #${docId}`);

    } catch (err) {
      console.error(`\n[ERROR] Failed to migrate video #${docId}:`, err.message);
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      // Continue with remaining videos
    }
  }

  console.log('\nMigration run completed!');
  console.log(` - Successfully migrated: ${migratedCount}/${migrationQueue.length}`);
  
  if (migratedCount > 0) {
    console.log('Regenerating static snapshot...');
    try {
      const { execSync } = require('child_process');
      execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
      console.log('Snapshot successfully updated!');
    } catch (e) {
      console.error('Failed to regenerate snapshot:', e.message);
    }
  }

  process.exit(0);
})().catch(err => {
  console.error('\nFatal migration error:', err);
  process.exit(1);
});
