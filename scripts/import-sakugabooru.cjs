#!/usr/bin/env node

/**
 * Sakugabooru Bulk Video Importer (Bunny.net Stream Edition)
 * 
 * Scrapes video posts from https://www.sakugabooru.com using its Moebooru-compatible API
 * and imports them into Firestore. If --download is enabled, it uploads the video
 * to your Bunny Stream video library and references the global Bunny CDN.
 * 
 * Usage:
 *   node scripts/import-sakugabooru.cjs [options]
 * 
 * Options:
 *   --limit <number>       Limit the number of videos to fetch (default: 50)
 *   --tags <tags>          Space-separated tags to query (e.g. "effects order:score")
 *   --page <number>        Start page (default: 1)
 *   --download             Download video files and upload to Bunny.net Stream (extremely cost efficient)
 *                          If omitted, direct Sakugabooru CDN URLs will be referenced instead ($0/month).
 *   --folder <name>        The name of the Firestore folder under which videos will be filed (default: "Sakugabooru")
 *   --status <status>      Set imported video status: "published" or "draft" (default: "published")
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Setup Bunny configurations from environment
const apiKey = process.env.BUNNY_API_KEY;
const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-79893c7f-720.b-cdn.net';

// Setup configurations from command-line arguments
const args = process.argv.slice(2);
let limit = 50;
let tags = '';
let page = 1;
let download = false;
let folderName = 'Sakugabooru';
let status = 'published';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--limit') {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--tags') {
    tags = args[++i];
  } else if (args[i] === '--page') {
    page = parseInt(args[++i], 10);
  } else if (args[i] === '--download') {
    download = true;
  } else if (args[i] === '--folder') {
    folderName = args[++i];
  } else if (args[i] === '--status') {
    status = args[++i];
  }
}

// Validation for Bunny configurations if download is enabled
if (download && (!apiKey || !libraryId)) {
  console.error('ERROR: Missing Bunny.net configuration (BUNNY_API_KEY or BUNNY_LIBRARY_ID) in environment variables.');
  console.log('Please add them to your .env.local file to use the --download option.');
  process.exit(1);
}

// Helpers using curl to bypass Cloudflare blocks
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    try {
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const cmd = `${curlCmd} -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
      const output = execSync(cmd, { maxBuffer: 10 * 1024 * 1024 }).toString();
      resolve(JSON.parse(output));
    } catch (e) {
      reject(e);
    }
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    try {
      const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
      const cmd = `${curlCmd} -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" -o "${dest}" "${url}"`;
      execSync(cmd);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
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

// CLI Interactive Progress Bar Helper
function drawProgressBar(current, total, label = 'Importing') {
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
    // Fallback for non-interactive output logs
    if (current === 0 || current === total || current % Math.max(1, Math.floor(total / 10)) === 0) {
      console.log(`[${label}] ${current}/${total} (${percentage}%)`);
    }
  }
}

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    console.error('Missing FIREBASE_* credentials in environment files (.env.local or .env)');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      storageBucket
    });
  }

  return admin.firestore();
}

(async () => {
  console.log(`Starting Sakugabooru importer (using curl wrapper):`);
  console.log(` - Limit: ${limit} videos`);
  console.log(` - Tags: "${tags || '(none)'}"`);
  console.log(` - Start Page: ${page}`);
  console.log(` - Download to Bunny.net: ${download}`);
  console.log(` - Firestore Folder: "${folderName}"`);
  console.log(` - Status: "${status}"\n`);

  const db = initDb();

  // 1. Collect video posts from Sakugabooru API (handling pagination)
  let videoPosts = [];
  let currentPage = page;

  drawProgressBar(0, limit, 'Gathering video posts');

  while (videoPosts.length < limit) {
    const fetchLimit = Math.min(100, limit - videoPosts.length + 20);
    const queryUrl = `https://www.sakugabooru.com/post.json?limit=${fetchLimit}&page=${currentPage}${tags ? `&tags=${encodeURIComponent(tags)}` : ''}`;
    
    let posts;
    try {
      posts = await fetchJson(queryUrl);
    } catch (err) {
      console.error(`\nError querying API: ${err.message}`);
      break;
    }

    if (!posts || posts.length === 0) {
      break;
    }

    const pageVideos = posts.filter(p => ['mp4', 'webm', 'mkv'].includes((p.file_ext || '').toLowerCase()));
    videoPosts.push(...pageVideos);
    currentPage++;

    drawProgressBar(Math.min(limit, videoPosts.length), limit, 'Gathering video posts');

    if (videoPosts.length >= limit) {
      videoPosts = videoPosts.slice(0, limit);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Draw final gathering complete state
  drawProgressBar(videoPosts.length, videoPosts.length, 'Gathering video posts');

  if (videoPosts.length === 0) {
    console.log('No video posts to import. Exiting.');
    process.exit(0);
  }

  console.log(`\nGathered ${videoPosts.length} video posts from Sakugabooru.`);

  // 2. Ensure the destination folder exists
  let folderId = null;
  const existingFolders = await db.collection('folders').where('name', '==', folderName).limit(1).get();
  if (!existingFolders.empty) {
    folderId = existingFolders.docs[0].id;
    console.log(`Folder "${folderName}" exists (${folderId})`);
  } else {
    const newFolderRef = await db.collection('folders').add({
      name: folderName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    folderId = newFolderRef.id;
    console.log(`Created folder "${folderName}" (${folderId})`);
  }

  // 3. Process each video post
  const processedVideos = [];
  const allFinalTags = new Set();

  console.log('\nProcessing and preparing metadata...');
  drawProgressBar(0, videoPosts.length, 'Processing videos');

  for (let i = 0; i < videoPosts.length; i++) {
    const post = videoPosts[i];
    const docId = `sakugabooru-${post.id}`;
    
    // Update progress bar with active post details
    drawProgressBar(i, videoPosts.length, `Downloading #${post.id}`);

    let videoUrl = post.file_url;
    let thumbnailUrl = post.preview_url;
    let externalBunnyId = null;

    if (download) {
      const tempFilePath = path.join(os.tmpdir(), `${docId}.mp4`);
      try {
        await downloadFile(post.file_url, tempFilePath);

        drawProgressBar(i, videoPosts.length, `Uploading #${post.id} to Bunny`);
        const guid = await uploadToBunny(tempFilePath, post.source || `Sakugabooru #${post.id}`);

        videoUrl = `https://${bunnyHost}/${guid}/playlist.m3u8`;
        thumbnailUrl = `https://${bunnyHost}/${guid}/thumbnail.jpg`;
        externalBunnyId = guid;

        fs.unlinkSync(tempFilePath);
      } catch (err) {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        console.error(`\nFailed to upload #${post.id} to Bunny: ${err.message}. Falling back to source CDN.`);
        // Fallback silently to use direct link in progress
      }
    }

    const mappedTags = post.tags
      .split(' ')
      .map(t => t.trim().toLowerCase().replace(/_/g, '-'))
      .filter(Boolean);

    mappedTags.forEach(t => allFinalTags.add(t));

    let description = `Source: ${post.source || 'Unknown'}`;
    description += `\nOriginal Sakugabooru post: https://www.sakugabooru.com/post/show/${post.id}`;
    description += `\nRating: ${post.rating}, Score: ${post.score}`;

    processedVideos.push({
      id: docId,
      data: {
        type: 'video',
        title: post.source || `Sakugabooru Post #${post.id}`,
        description,
        thumbnailUrl,
        posterUrl: thumbnailUrl,
        videoUrl,
        tags: mappedTags,
        categoryIds: [],
        isShort: false,
        status,
        folderId,
        importSource: 'sakugabooru',
        originalUrl: `https://www.sakugabooru.com/post/show/${post.id}`,
        width: post.width || 0,
        height: post.height || 0,
        createdAt: admin.firestore.Timestamp.fromMillis(post.created_at * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(externalBunnyId ? { externalBunnyId } : {})
      }
    });

    drawProgressBar(i + 1, videoPosts.length, `Processed #${post.id}`);
  }

  // 4. Batch upload video documents to Firestore
  console.log(`\nSaving video metadata to database...`);
  let vWritten = 0;
  drawProgressBar(0, processedVideos.length, 'Saving to Firestore');
  
  for (let i = 0; i < processedVideos.length; i += 400) {
    const batch = db.batch();
    const chunk = processedVideos.slice(i, i + 400);
    for (const item of chunk) {
      batch.set(db.collection('videos').doc(item.id), item.data, { merge: true });
    }
    await batch.commit();
    vWritten += chunk.length;
    drawProgressBar(vWritten, processedVideos.length, 'Saving to Firestore');
  }

  // 5. Batch upload tags to tags collection
  console.log(`\nRegistering tags in master collection...`);
  const tagList = [...allFinalTags].filter(t => t && !t.includes('/') && t !== '.' && t !== '..');
  let tWritten = 0;
  drawProgressBar(0, tagList.length, 'Registering tags');
  
  for (let i = 0; i < tagList.length; i += 400) {
    const batch = db.batch();
    const chunk = tagList.slice(i, i + 400);
    for (const tag of chunk) {
      batch.set(db.collection('tags').doc(tag), { name: tag }, { merge: true });
    }
    await batch.commit();
    tWritten += chunk.length;
    drawProgressBar(tWritten, tagList.length, 'Registering tags');
  }

  console.log(`\nImport complete! Folder "${folderName}" now contains imported videos.`);

  // 6. Automatically regenerate the static snapshot
  console.log('Regenerating static video snapshot (export-videos-snapshot.cjs)...');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
    console.log('Snapshot successfully updated!');
  } catch (err) {
    console.error('Failed to regenerate snapshot:', err.message);
  }

  process.exit(0);
})().catch(err => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
