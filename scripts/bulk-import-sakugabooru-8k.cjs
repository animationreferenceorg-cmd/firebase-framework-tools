#!/usr/bin/env node

/**
 * High-Volume Sakugabooru to Bunny Stream Importer (~8,000 reference clips)
 * 
 * Streams animation reference cuts directly into Bunny Stream CDN and Firestore,
 * then updates the static public snapshot.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const apiKey = process.env.BUNNY_API_KEY;
const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-79893c7f-720.b-cdn.net';
const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (!apiKey || !libraryId) {
  console.error('❌ ERROR: BUNNY_API_KEY or BUNNY_LIBRARY_ID missing in .env.local');
  process.exit(1);
}

function initDb() {
  if (!admin.apps.length) {
    if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
      admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey })
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId
      });
    }
  }
  return admin.firestore();
}

// Category mapping dictionary matching the curated categories in the app
const TAG_CATEGORY_MAP = [
  // 2D Effects & VFX
  { match: ['effects', 'fx', 'explosions', 'fire', 'liquid', 'smoke', 'lightning', 'sparks', 'water', 'wind', 'debris'], catId: 'EeIMYpkza6ffxV97C67D' },
  { match: ['effects', 'vfx', 'cgi', 'magic', 'particles'], catId: 'JnNo18EyCB8UvqHXZvBl' },
  // Combat & Action
  { match: ['fighting', 'combat', 'fight', 'swordplay', 'martial-arts', 'punch', 'kick', 'duel', 'battle', 'action'], catId: 'm0CyxY6mfwH1NA4cODUE' },
  { match: ['fighting', 'combat', 'action', 'chase', 'stunt', 'parkour'], catId: 'QVQEqkbOTtGgdM3U7LXh' },
  { match: ['impact', 'impact-frames'], catId: '4eM7RPaC5NpePJHlihTS' },
  // Locomotion & Body Mechanics
  { match: ['running', 'run'], catId: 'LV6GiJMlAkokTTy8KUv3' },
  { match: ['walking', 'walk'], catId: '0r59cXoM1zJD0JE73hlY' },
  { match: ['jumping', 'jump', 'leap'], catId: 'QoheetDwRPYLb3Wj23hk' },
  { match: ['flips', 'flip', 'acrobatics'], catId: 'epfOiDy6l50o4BWYE1kg' },
  { match: ['body-mechanics', 'weight', 'balance', 'athletic'], catId: 'azUEkxAG1UGy9VUe7U56' },
  // Character Acting & Expressions
  { match: ['character-acting', 'acting', 'dialogue', 'performance'], catId: '7GjU9a66aYCz7Rz1tblf' },
  { match: ['facial-expressions', 'facial', 'expression', 'crying', 'laughing', 'smile', 'eyes'], catId: 'QIiVyUhM8REmxEbnT4bD' },
  // Creatures & Animals
  { match: ['creature', 'monster', 'beast', 'dragon'], catId: '2TuH0WAoEqOP4uMii89h' },
  { match: ['animals', 'animal', 'dog', 'cat', 'bird', 'horse', 'wolf'], catId: 'AdnmZ4NrkTfuRcDbh2zV' },
  { match: ['flying', 'flight', 'wings'], catId: 'RNxV9WLXFjD7Dt3J6DYL' },
  // Smears
  { match: ['smears', 'smear', 'multi-limb', 'blur'], catId: 'HPh2OYR2AgyxkqBEWLy2' },
  // Anime
  { match: ['anime', 'japanese'], catId: 'Th5Qq4w5s3aIPqwz8VcN' },
];

function resolveCategoryIds(tags) {
  const ids = new Set();
  ids.add('00YSaHyKCqexOMjP3qx5'); // 2D Animation base
  for (const rule of TAG_CATEGORY_MAP) {
    if (rule.match.some(m => tags.includes(m))) {
      ids.add(rule.catId);
    }
  }
  return Array.from(ids);
}

function fetchJson(url) {
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const cmd = `${curlCmd} -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  const output = execSync(cmd, { maxBuffer: 20 * 1024 * 1024 }).toString();
  return JSON.parse(output);
}

async function uploadToBunny(fileUrl, title) {
  const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/fetch`, {
    method: 'POST',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: fileUrl,
      title: title || 'Animation Reference'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny fetch failed: ${res.statusText} (${text})`);
  }

  const data = await res.json();
  return data.id || data.guid;
}

async function run() {
  console.log('====================================================');
  console.log('🚀 Starting High-Volume Sakugabooru -> Bunny Ingestion');
  console.log(`Target: ~8,000 reference clips`);
  console.log(`Bunny Library: ${libraryId} (${bunnyHost})`);
  console.log('====================================================\n');

  const db = initDb();

  // Load existing IDs from snapshot to resume smoothly
  const existingDocIds = new Set();
  const snapshotPath = path.join(__dirname, '..', 'public', 'data', 'videos-snapshot.json');
  if (fs.existsSync(snapshotPath)) {
    try {
      const snap = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
      snap.forEach(v => {
        if (v.id) existingDocIds.add(v.id);
      });
      console.log(`Loaded ${existingDocIds.size} existing videos from snapshot to skip duplicates.`);
    } catch (e) {
      console.warn('Could not read existing snapshot:', e.message);
    }
  }

  // Ensure "Sakugabooru" folder exists
  let folderId = null;
  const folderSnap = await db.collection('folders').where('name', '==', 'Sakugabooru').limit(1).get();
  if (!folderSnap.empty) {
    folderId = folderSnap.docs[0].id;
  } else {
    const newF = await db.collection('folders').add({
      name: 'Sakugabooru',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    folderId = newF.id;
  }

  // Diverse tag buckets to maximize animation study variety across disciplines
  const QUERY_SECTIONS = [
    { name: 'Top Masterpieces (order:score)', tags: 'order:score', max: 1500 },
    { name: 'Fighting & Combat Choreography', tags: 'fighting order:score', max: 1200 },
    { name: 'FX & Explosions & Fluid', tags: 'effects order:score', max: 1200 },
    { name: 'Character Acting & Expressions', tags: 'character_acting order:score', max: 1200 },
    { name: 'Locomotion & Body Mechanics', tags: 'running order:score', max: 1000 },
    { name: 'Creatures & Animal Locomotion', tags: 'creatures order:score', max: 800 },
    { name: 'Smears & Multi-Limbs', tags: 'smears order:score', max: 600 },
    { name: 'General High-Rank Recent Cuts', tags: '', max: 1000 },
  ];

  let totalIngested = 0;
  const TARGET_TOTAL = 8000;
  let batchBuffer = [];
  let allTags = new Set();

  for (const section of QUERY_SECTIONS) {
    if (totalIngested >= TARGET_TOTAL) break;

    console.log(`\n📂 Processing section: "${section.name}" (Target up to ${section.max})`);
    let sectionCount = 0;
    let page = 1;

    while (sectionCount < section.max && totalIngested < TARGET_TOTAL) {
      const fetchLimit = Math.min(100, section.max - sectionCount + 10);
      const queryUrl = `https://www.sakugabooru.com/post.json?limit=${fetchLimit}&page=${page}${section.tags ? `&tags=${encodeURIComponent(section.tags)}` : ''}`;

      let posts = [];
      try {
        posts = fetchJson(queryUrl);
      } catch (err) {
        console.error(`Error fetching page ${page}: ${err.message}`);
        break;
      }

      if (!posts || posts.length === 0) {
        console.log(`Reached end of results for "${section.name}" at page ${page}.`);
        break;
      }

      const validVideos = posts.filter(p => ['mp4', 'webm', 'mkv'].includes((p.file_ext || '').toLowerCase()));

      for (const post of validVideos) {
        if (sectionCount >= section.max || totalIngested >= TARGET_TOTAL) break;

        const docId = `sakugabooru-${post.id}`;
        if (existingDocIds.has(docId)) {
          // Already imported
          continue;
        }

        // Title formatting
        const rawTitle = (post.source || '').trim();
        const displayTitle = rawTitle.length > 2 
          ? rawTitle 
          : `Sakugabooru Cut #${post.id}`;

        let videoUrl = post.file_url;
        let thumbnailUrl = post.preview_url;
        let externalBunnyId = null;

        // Ingest to Bunny Stream
        try {
          const guid = await uploadToBunny(post.file_url, displayTitle);
          videoUrl = `https://${bunnyHost}/${guid}/playlist.m3u8`;
          thumbnailUrl = `https://${bunnyHost}/${guid}/thumbnail.jpg`;
          externalBunnyId = guid;
        } catch (bErr) {
          // If Bunny fetch encounters an issue, fallback to high-speed CDN URL
          console.warn(`[#${post.id}] Bunny fetch error: ${bErr.message}, falling back to direct CDN.`);
        }

        const mappedTags = (post.tags || '')
          .split(' ')
          .map(t => t.trim().toLowerCase().replace(/_/g, '-'))
          .filter(Boolean);

        mappedTags.forEach(t => allTags.add(t));
        const categoryIds = resolveCategoryIds(mappedTags);

        let description = `Source: ${post.source || 'Unknown'}`;
        description += `\nOriginal Sakugabooru post: https://www.sakugabooru.com/post/show/${post.id}`;
        description += `\nRating: ${post.rating}, Score: ${post.score}`;

        const videoData = {
          type: 'video',
          title: displayTitle,
          description,
          thumbnailUrl,
          posterUrl: thumbnailUrl,
          videoUrl,
          tags: mappedTags,
          categoryIds,
          isShort: false,
          status: 'published',
          folderId,
          importSource: 'sakugabooru',
          originalUrl: `https://www.sakugabooru.com/post/show/${post.id}`,
          width: post.width || 0,
          height: post.height || 0,
          createdAt: admin.firestore.Timestamp.now(),
          originalCreatedAt: post.created_at ? (post.created_at * 1000) : null,
          importedAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(externalBunnyId ? { externalBunnyId } : {})
        };

        batchBuffer.push({ id: docId, data: videoData });
        existingDocIds.add(docId);
        sectionCount++;
        totalIngested++;

        if (totalIngested % 10 === 0 || totalIngested === 1) {
          process.stdout.write(`\r  ✨ Ingested ${totalIngested}/${TARGET_TOTAL} references [${section.name}]`);
        }

        // Commit batch when reaching 50 items
        if (batchBuffer.length >= 50) {
          const writeBatch = db.batch();
          for (const item of batchBuffer) {
            writeBatch.set(db.collection('videos').doc(item.id), item.data, { merge: true });
          }
          await writeBatch.commit();
          batchBuffer = [];

          // Periodically refresh the site snapshot every 250 clips so site visitors see them in real-time
          if (totalIngested % 250 === 0) {
            try {
              execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'ignore' });
              console.log(`\n  📸 Snapshot updated at ${totalIngested} videos`);
            } catch {}
          }
        }

        // Small delay to pace Bunny API & avoid rate limits
        await new Promise(r => setTimeout(r, 200));
      }

      page++;
      // Polite pacing between Sakugabooru API pages
      await new Promise(r => setTimeout(r, 600));
    }
  }

  // Commit any remaining buffer
  if (batchBuffer.length > 0) {
    const writeBatch = db.batch();
    for (const item of batchBuffer) {
      writeBatch.set(db.collection('videos').doc(item.id), item.data, { merge: true });
    }
    await writeBatch.commit();
    batchBuffer = [];
  }

  console.log(`\n\n✅ Ingestion phase complete! Total new references ingested: ${totalIngested}`);
  console.log('🔄 Regenerating static snapshot (export-videos-snapshot.cjs)...');

  try {
    execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
    console.log('🎉 Snapshot refreshed! References are live on site.');
  } catch (err) {
    console.error('Failed to export snapshot:', err.message);
  }
}

run().catch(console.error);
