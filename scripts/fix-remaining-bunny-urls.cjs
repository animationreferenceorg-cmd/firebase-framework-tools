#!/usr/bin/env node

/**
 * Fix Remaining Bunny URLs & Polish Titles for all Sakugabooru References
 * 
 * Ensures 100% of Sakugabooru references in Firestore:
 * - Use direct, high-speed CDN MP4s (https://www.sakugabooru.com/data/...)
 * - Have proper formatted titles and tags
 * - No 403 Forbidden errors
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
  const cmd = `${curlCmd} -s -L --max-time 15 -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}"`;
  const output = execSync(cmd, { maxBuffer: 20 * 1024 * 1024, timeout: 20000 }).toString();
  return JSON.parse(output);
}

async function run() {
  console.log('--- Scanning Firestore for un-repaired Sakugabooru clips ---');
  const db = initDb();

  const snap = await db.collection('videos').where('importSource', '==', 'sakugabooru').get();
  console.log(`Total Sakugabooru docs in Firestore: ${snap.size}`);

  const brokenDocs = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const vUrl = data.videoUrl || '';
    const isBunny = vUrl.includes('b-cdn.net');
    const isDirect = vUrl.startsWith('https://www.sakugabooru.com/data/');
    const isRawTitle = /^#[0-9]+/i.test(data.title || '') || /^https?:\/\//i.test(data.title || '');

    if (isBunny || !isDirect || isRawTitle) {
      brokenDocs.push(doc);
    }
  }

  console.log(`Found ${brokenDocs.length} clips needing CDN MP4 repair or title fixes.`);
  if (brokenDocs.length === 0) {
    console.log('✅ All clips are already healthy and formatted!');
    return;
  }

  const idToDocRef = new Map(brokenDocs.map(d => [d.id.replace('sakugabooru-', ''), d.ref]));
  const ids = Array.from(idToDocRef.keys());

  const CHUNK_SIZE = 40;
  let fixedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunkIds = ids.slice(i, i + CHUNK_SIZE);
    const queryUrl = `https://www.sakugabooru.com/post.json?limit=100&tags=id:${chunkIds.join(',')}`;

    try {
      const posts = fetchJson(queryUrl);
      const batch = db.batch();

      for (const p of posts) {
        const docRef = idToDocRef.get(String(p.id));
        if (!docRef) continue;

        if (!p.file_url || !['mp4', 'webm', 'mkv'].includes((p.file_ext || '').toLowerCase())) {
          // If not a valid video file, mark draft
          batch.update(docRef, { status: 'draft', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          skippedCount++;
          continue;
        }

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
        fixedCount++;
      }

      await batch.commit();
      process.stdout.write(`\r  🛠️ Repaired ${fixedCount} of ${ids.length}...`);
    } catch (err) {
      console.warn(`\n  Warning on chunk ${i}: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 350));
  }

  console.log(`\n\n✅ Finished cleanup: ${fixedCount} repaired, ${skippedCount} skipped/drafted.`);
  console.log('🔄 Exporting fresh snapshot...');
  execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
  console.log('🎉 Done!');
}

run().catch(console.error);
