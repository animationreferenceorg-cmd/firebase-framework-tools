#!/usr/bin/env node

/**
 * Sakugabooru Library Repair & Bulk Ingestion Script
 * 
 * 1. Repaired all existing Sakugabooru docs in Firestore to use direct high-speed CDN MP4s
 *    (fixing the 403 playback error) and generates clean, informative titles and tags.
 * 2. Ingests remaining high-rated cuts until library reaches ~8,000 total reference clips.
 * 3. Refreshes the public static snapshot so videos are live, labeled, and playable.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require('firebase-admin');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');

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

const actionKeywords = {
  'fighting': 'Combat',
  'effects': 'VFX & Effects',
  'explosions': 'Explosions',
  'fire': 'Fire Effects',
  'liquid': 'Liquid & Water',
  'smoke': 'Smoke Effects',
  'character_acting': 'Character Acting',
  'creatures': 'Creature Animation',
  'running': 'Running Locomotion',
  'walking': 'Walk Cycle',
  'jumping': 'Jumps & Leaps',
  'flips': 'Acrobatics & Flips',
  'swordplay': 'Sword Combat',
  'martial_arts': 'Martial Arts',
  'impact_frames': 'Impact Frames',
  'impact': 'Impact',
  'smears': 'Smears',
  'hair': 'Hair Motion',
  'fabric': 'Cloth & Fabric',
  'debris': 'Debris FX',
  'sparks': 'Sparks FX',
  'lightning': 'Lightning FX',
  'facial_expressions': 'Facial Expressions',
  'crying': 'Emotional Acting',
  'background_animation': 'Background Animation'
};

const TAG_CATEGORY_MAP = [
  { match: ['effects', 'fx', 'explosions', 'fire', 'liquid', 'smoke', 'lightning', 'sparks', 'water', 'wind', 'debris'], catId: 'EeIMYpkza6ffxV97C67D' },
  { match: ['effects', 'vfx', 'cgi', 'magic', 'particles'], catId: 'JnNo18EyCB8UvqHXZvBl' },
  { match: ['fighting', 'combat', 'fight', 'swordplay', 'martial-arts', 'punch', 'kick', 'duel', 'battle', 'action'], catId: 'm0CyxY6mfwH1NA4cODUE' },
  { match: ['fighting', 'combat', 'action', 'chase', 'stunt', 'parkour'], catId: 'QVQEqkbOTtGgdM3U7LXh' },
  { match: ['impact', 'impact-frames'], catId: '4eM7RPaC5NpePJHlihTS' },
  { match: ['running', 'run'], catId: 'LV6GiJMlAkokTTy8KUv3' },
  { match: ['walking', 'walk'], catId: '0r59cXoM1zJD0JE73hlY' },
  { match: ['jumping', 'jump', 'leap'], catId: 'QoheetDwRPYLb3Wj23hk' },
  { match: ['flips', 'flip', 'acrobatics'], catId: 'epfOiDy6l50o4BWYE1kg' },
  { match: ['body-mechanics', 'weight', 'balance', 'athletic'], catId: 'azUEkxAG1UGy9VUe7U56' },
  { match: ['character-acting', 'acting', 'dialogue', 'performance'], catId: '7GjU9a66aYCz7Rz1tblf' },
  { match: ['facial-expressions', 'facial', 'expression', 'crying', 'laughing', 'smile', 'eyes'], catId: 'QIiVyUhM8REmxEbnT4bD' },
  { match: ['creature', 'monster', 'beast', 'dragon'], catId: '2TuH0WAoEqOP4uMii89h' },
  { match: ['animals', 'animal', 'dog', 'cat', 'bird', 'horse', 'wolf'], catId: 'AdnmZ4NrkTfuRcDbh2zV' },
  { match: ['flying', 'flight', 'wings'], catId: 'RNxV9WLXFjD7Dt3J6DYL' },
  { match: ['smears', 'smear', 'multi-limb', 'blur'], catId: 'HPh2OYR2AgyxkqBEWLy2' },
  { match: ['anime', 'japanese'], catId: 'Th5Qq4w5s3aIPqwz8VcN' },
];

function resolveCategoryIds(tags) {
  const ids = new Set();
  ids.add('00YSaHyKCqexOMjP3qx5');
  const lowerTags = tags.map(t => t.toLowerCase());
  for (const rule of TAG_CATEGORY_MAP) {
    if (rule.match.some(m => lowerTags.includes(m))) {
      ids.add(rule.catId);
    }
  }
  return Array.from(ids);
}

function formatSakugaTitleAndTags(post) {
  const rawTags = (post.tags || '').split(' ').map(t => t.trim().toLowerCase()).filter(Boolean);
  const noise = new Set(['animated', 'artist_unknown', 'artist-unknown', 'pres', 'scanned', 'wip', 'web', 'genga', 'douga', 'settei']);

  const detectedActions = [];
  const otherTags = [];
  const cleanTags = [];

  for (const tag of rawTags) {
    if (noise.has(tag)) continue;
    if (actionKeywords[tag]) {
      detectedActions.push(actionKeywords[tag]);
      cleanTags.push(actionKeywords[tag]);
    } else {
      const readable = tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      otherTags.push(readable);
      cleanTags.push(readable);
    }
  }

  let sourceClean = (post.source || '').trim();
  if (/^https?:\/\//i.test(sourceClean)) sourceClean = '';

  const actionSummary = detectedActions.slice(0, 2).join(' & ');
  const cutInfo = sourceClean ? sourceClean : `Cut #${post.id}`;

  let title = '';
  if (otherTags.length >= 2 && actionSummary) {
    title = `${otherTags[0]}: ${actionSummary} (${cutInfo} - ${otherTags[1]})`;
  } else if (otherTags.length === 1 && actionSummary) {
    title = `${otherTags[0]}: ${actionSummary} (${cutInfo})`;
  } else if (otherTags.length >= 1) {
    title = `${otherTags.slice(0, 2).join(' - ')} (${cutInfo})`;
  } else if (actionSummary) {
    title = `${actionSummary} Animation Cut (${cutInfo})`;
  } else {
    title = `Animation Cut (${cutInfo})`;
  }

  return { title, cleanTags };
}

function fetchJson(url) {
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const cmd = `${curlCmd} -s -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  const output = execSync(cmd, { maxBuffer: 20 * 1024 * 1024 }).toString();
  return JSON.parse(output);
}

async function run() {
  console.log('===========================================================');
  console.log('🛠️ Sakugabooru Library Repair & Expansion to 8,000 Clips');
  console.log('===========================================================\n');

  const db = initDb();

  // 1. Fetch all existing Sakugabooru docs to repair their video URLs & titles
  console.log('Fetching existing Sakugabooru documents from Firestore...');
  const existingDocsSnap = await db.collection('videos').where('importSource', '==', 'sakugabooru').get();
  console.log(`Found ${existingDocsSnap.size} existing Sakugabooru documents.`);

  const existingIds = existingDocsSnap.docs.map(d => d.id.replace('sakugabooru-', ''));
  const idToDocRef = new Map(existingDocsSnap.docs.map(d => [d.id.replace('sakugabooru-', ''), d.ref]));

  console.log('\n--- Phase 1: Repairing Existing Videos (Fixing 403 & Titles) ---');
  let repairedCount = 0;
  const BATCH_QUERY_SIZE = 80;

  for (let i = 0; i < existingIds.length; i += BATCH_QUERY_SIZE) {
    const chunkIds = existingIds.slice(i, i + BATCH_QUERY_SIZE);
    const queryUrl = `https://www.sakugabooru.com/post.json?tags=id:${chunkIds.join(',')}`;

    try {
      const posts = fetchJson(queryUrl);
      const batch = db.batch();

      for (const p of posts) {
        const docRef = idToDocRef.get(String(p.id));
        if (!docRef) continue;

        const { title, cleanTags } = formatSakugaTitleAndTags(p);
        const categoryIds = resolveCategoryIds(cleanTags);

        let description = `Source: ${p.source || 'Unknown'}`;
        description += `\nOriginal Sakugabooru post: https://www.sakugabooru.com/post/show/${p.id}`;
        description += `\nRating: ${p.rating}, Score: ${p.score}`;

        batch.update(docRef, {
          title,
          videoUrl: p.file_url,
          thumbnailUrl: p.preview_url,
          posterUrl: p.preview_url,
          tags: cleanTags,
          categoryIds,
          description,
          status: 'published',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      repairedCount += posts.length;
      process.stdout.write(`\r  🛠️ Repaired ${repairedCount}/${existingIds.length} existing references...`);
    } catch (err) {
      console.warn(`\n  Warning on chunk ${i}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n✅ Phase 1 Complete: Repaired ${repairedCount} existing videos.\n`);

  // Regenerate snapshot immediately so existing videos play and have titles right away
  console.log('🔄 Exporting updated snapshot with repaired URLs & titles...');
  try {
    execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
  } catch (e) {
    console.error('Snapshot export error:', e.message);
  }

  // 2. Phase 2: Ingest remaining clips up to 8,000 total
  console.log('\n--- Phase 2: Ingesting Additional High-Quality Cuts to reach 8,000 ---');
  const TARGET_TOTAL = 8000;
  let currentTotal = repairedCount;

  const QUERY_SECTIONS = [
    { name: 'Character Acting & Expressions', tags: 'character_acting order:score', max: 1200 },
    { name: 'Locomotion & Body Mechanics', tags: 'running order:score', max: 1000 },
    { name: 'Creatures & Animal Locomotion', tags: 'creatures order:score', max: 800 },
    { name: 'Smears & Multi-Limbs', tags: 'smears order:score', max: 600 },
    { name: 'High-Rank Anime Cuts', tags: 'anime order:score', max: 1500 },
  ];

  const knownDocIds = new Set(existingIds.map(id => `sakugabooru-${id}`));
  let folderId = null;
  const folderSnap = await db.collection('folders').where('name', '==', 'Sakugabooru').limit(1).get();
  if (!folderSnap.empty) folderId = folderSnap.docs[0].id;

  for (const section of QUERY_SECTIONS) {
    if (currentTotal >= TARGET_TOTAL) break;

    console.log(`\n📂 Fetching section: "${section.name}"`);
    let page = 1;
    let sectionAdded = 0;

    while (sectionAdded < section.max && currentTotal < TARGET_TOTAL) {
      const fetchLimit = Math.min(100, section.max - sectionAdded + 10);
      const queryUrl = `https://www.sakugabooru.com/post.json?limit=${fetchLimit}&page=${page}${section.tags ? `&tags=${encodeURIComponent(section.tags)}` : ''}`;

      let posts = [];
      try {
        posts = fetchJson(queryUrl);
      } catch (err) {
        console.error(`Error fetching page ${page}: ${err.message}`);
        break;
      }

      if (!posts || posts.length === 0) break;

      const validVideos = posts.filter(p => ['mp4', 'webm', 'mkv'].includes((p.file_ext || '').toLowerCase()));
      const batch = db.batch();
      let batchCount = 0;

      for (const p of validVideos) {
        if (sectionAdded >= section.max || currentTotal >= TARGET_TOTAL) break;

        const docId = `sakugabooru-${p.id}`;
        if (knownDocIds.has(docId)) continue;

        const { title, cleanTags } = formatSakugaTitleAndTags(p);
        const categoryIds = resolveCategoryIds(cleanTags);

        let description = `Source: ${p.source || 'Unknown'}`;
        description += `\nOriginal Sakugabooru post: https://www.sakugabooru.com/post/show/${p.id}`;
        description += `\nRating: ${p.rating}, Score: ${p.score}`;

        const videoData = {
          type: 'video',
          title,
          description,
          thumbnailUrl: p.preview_url,
          posterUrl: p.preview_url,
          videoUrl: p.file_url,
          tags: cleanTags,
          categoryIds,
          isShort: false,
          status: 'published',
          folderId,
          importSource: 'sakugabooru',
          originalUrl: `https://www.sakugabooru.com/post/show/${p.id}`,
          width: p.width || 0,
          height: p.height || 0,
          createdAt: admin.firestore.Timestamp.now(),
          originalCreatedAt: p.created_at ? (p.created_at * 1000) : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          importedAt: admin.firestore.Timestamp.now(),
        };

        batch.set(db.collection('videos').doc(docId), videoData, { merge: true });
        knownDocIds.add(docId);
        sectionAdded++;
        currentTotal++;
        batchCount++;
      }

      if (batchCount > 0) {
        await batch.commit();
        process.stdout.write(`\r  ✨ Ingested ${currentTotal}/${TARGET_TOTAL} references [${section.name}]`);
      }

      page++;
      await new Promise(r => setTimeout(r, 600));
    }
  }

  console.log(`\n\n🎉 Done! Total library size: ${currentTotal} Sakugabooru references.`);
  console.log('🔄 Performing final static snapshot export...');
  try {
    execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
    console.log('✅ Library updated and ready.');
  } catch (e) {
    console.error('Final export error:', e.message);
  }
}

run().catch(console.error);
