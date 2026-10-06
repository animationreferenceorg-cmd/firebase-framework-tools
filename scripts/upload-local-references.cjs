#!/usr/bin/env node

/**
 * Uploads local animation references from OneDrive/Videos/Ani_References
 * to Bunny Stream CDN and imports them directly into Firestore.
 * 
 * Usage:
 *   node scripts/upload-local-references.cjs [--limit <number>] [--dir <path>]
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const apiKey = process.env.BUNNY_API_KEY;
const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-cdfeb679-25c.b-cdn.net';

// Parse command line arguments
const args = process.argv.slice(2);
let limit = Infinity;
let targetDir = 'c:/Users/micha/OneDrive/Videos/Ani_References';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit') {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--dir') {
    targetDir = args[++i];
  }
}

if (!apiKey || !libraryId) {
  console.error('ERROR: Missing BUNNY_API_KEY or BUNNY_LIBRARY_ID in .env.local');
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  console.error(`ERROR: Target directory not found: ${targetDir}`);
  process.exit(1);
}

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

async function uploadToBunny(filePath, title) {
  // 1. Create video entry
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
    throw new Error(`Failed to create video on Bunny: ${createRes.statusText} (${text})`);
  }

  const { guid } = await createRes.json();

  // 2. Upload video binary
  const fileBuffer = fs.readFileSync(filePath);
  const uploadRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileBuffer.length.toString()
    },
    body: fileBuffer
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Failed to upload binary: ${uploadRes.statusText} (${text})`);
  }

  return guid;
}

function formatTitle(filename) {
  const base = path.basename(filename, path.extname(filename));
  // e.g. "AnimationRef_ (12)" -> "Animation Reference #12"
  const match = base.match(/AnimationRef[_\s]*\((\d+)\)/i);
  if (match) {
    return `Animation Reference #${match[1]}`;
  }
  return base.replace(/[_-]+/g, ' ').trim();
}

async function main() {
  console.log(`Starting Local Animation Reference Ingestion:`);
  console.log(` - Source Folder: ${targetDir}`);
  console.log(` - Bunny Library: ${libraryId} (${bunnyHost})`);
  console.log(` - Limit: ${limit === Infinity ? 'All files' : limit}\n`);

  const db = initDb();

  const allFiles = fs.readdirSync(targetDir)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.mp4', '.mov', '.webm'].includes(ext);
    })
    .sort((a, b) => {
      // Natural sort by reference number
      const numA = parseInt((a.match(/\d+/) || [0])[0], 10);
      const numB = parseInt((b.match(/\d+/) || [0])[0], 10);
      return numA - numB;
    });

  const filesToProcess = allFiles.slice(0, limit);
  console.log(`Found ${filesToProcess.length} videos to process.\n`);

  // Ensure "Local References" folder exists
  let folderId = null;
  const folderSnap = await db.collection('folders').where('name', '==', 'Local References').limit(1).get();
  if (!folderSnap.empty) {
    folderId = folderSnap.docs[0].id;
  } else {
    const newFolder = await db.collection('folders').add({
      name: 'Local References',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    folderId = newFolder.id;
  }

  let uploadedCount = 0;
  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i];
    const fullPath = path.join(targetDir, filename);
    const title = formatTitle(filename);
    const docId = `local-ref-${path.basename(filename, path.extname(filename)).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    console.log(`[${i + 1}/${filesToProcess.length}] Uploading "${filename}" (${(fs.statSync(fullPath).size / (1024 * 1024)).toFixed(1)} MB)...`);

    try {
      // Check if already in Firestore
      const existing = await db.collection('videos').doc(docId).get();
      if (existing.exists && existing.data().status === 'published') {
        console.log(` -> Already exists in Firestore (${docId}), skipping.`);
        continue;
      }

      const guid = await uploadToBunny(fullPath, title);
      const videoUrl = `https://${bunnyHost}/${guid}/playlist.m3u8`;
      const thumbnailUrl = `https://${bunnyHost}/${guid}/thumbnail.jpg`;

      const videoData = {
        type: 'video',
        title,
        description: `High-resolution studio animation reference: ${title}. Master study for animators.`,
        thumbnailUrl,
        posterUrl: thumbnailUrl,
        videoUrl,
        tags: ['animation-reference', 'body-mechanics', 'acting', 'study', 'locomotion'],
        categoryIds: [
          'azUEkxAG1UGy9VUe7U56', // Body Mechanics
          '00YSaHyKCqexOMjP3qx5', // 2D Animation
          '7GjU9a66aYCz7Rz1tblf', // Acting
        ],
        isShort: false,
        status: 'published',
        folderId,
        importSource: 'local-ani-references',
        externalBunnyId: guid,
        filename,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('videos').doc(docId).set(videoData, { merge: true });
      uploadedCount++;
      console.log(` -> Uploaded & Saved: ${guid}`);
    } catch (err) {
      console.error(` -> Failed to process ${filename}:`, err.message);
    }
  }

  console.log(`\n🎉 Upload completed! Processed ${uploadedCount} videos into Bunny Stream and Firestore.`);

  console.log('Regenerating static video snapshot...');
  const { execSync } = require('child_process');
  execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
  console.log('✅ Static video snapshot regenerated.');
}

main().catch(err => {
  console.error('\nFatal error in upload-local-references:', err);
  process.exit(1);
});
