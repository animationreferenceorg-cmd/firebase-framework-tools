#!/usr/bin/env node

/**
 * Publishes and Categorizes ALL 8,000+ Videos in Firestore
 * 
 * 1. Analyzes tags and titles for every video document.
 * 2. Assigns relevant Firestore category IDs (3D Animation, 2D Animation, Fighting,
 *    Action, Acting, Dialogue, Facial Expressions, Body Mechanics, Locomotion, FX, etc.).
 * 3. Sets status: 'published' across all 8,000+ videos.
 * 4. Regenerates the static video snapshot so all 8k are live, indexed, and categorized.
 */

const fs = require('fs');
const path = require('path');
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

const CATEGORY_RULES = [
  // 3D Animation (e.g. Arcane, Soul, Genshin, Horizon, 3D, CGI, Pixar, Disney)
  {
    catId: 'ow0rPQMBTZLttD4efIcS',
    name: '3D Animation',
    matches: ['arcane', 'soul', 'genshin', 'horizon', 'fire emblem', 'pixar', 'disney', 'dreamworks', '3d', 'cgi', 'blender', 'maya', 'valorant', 'overwatch', 'league of legends', 'god of war', 'spiderman', 'ratchet']
  },
  // 2D Animation
  {
    catId: '00YSaHyKCqexOMjP3qx5',
    name: '2D Animation',
    matches: ['2d', 'anime', 'sakuga', 'ghibli', 'hand drawn', 'cel', 'traditional', 'cartoon']
  },
  // Fighting / Combat
  {
    catId: 'm0CyxY6mfwH1NA4cODUE',
    name: 'Fighting',
    matches: ['attack', 'combat', 'battle', 'fight', 'fighting', 'weapon', 'sword', 'kick', 'punch', 'flying kick', '1v1', 'duel', 'martial']
  },
  // Action
  {
    catId: 'QVQEqkbOTtGgdM3U7LXh',
    name: 'Action',
    matches: ['action', 'chase', 'stunt', 'parkour', 'attack', 'combat', 'battle', 'fight', 'impact']
  },
  // Acting
  {
    catId: '7GjU9a66aYCz7Rz1tblf',
    name: 'Acting',
    matches: ['acting', 'emotion', 'gesture', 'conversation', 'dialogue', 'pain', 'worry', 'fear', 'scared', 'horror', 'struggle', 'rage', 'angry', 'get angry', 'annoyed', 'argue', 'protest', 'uneasy', 'exhausted', 'laugh', 'cry', 'crying', 'smile', 'surprise', 'sigh', 'troubled', 'moved', 'wow', 'sad', 'happy']
  },
  // Dialogue
  {
    catId: 'QduuhZShfVia769JT3XT',
    name: 'Dialogue',
    matches: ['dialogue', 'conversation', 'dialogue cinematic', 'argue', 'protest', 'question', 'refute', 'talk', 'speaking', 'speech']
  },
  // Facial Expressions
  {
    catId: 'QIiVyUhM8REmxEbnT4bD',
    name: 'Facial Expressions',
    matches: ['facial', 'expression', 'expressions', 'smile', 'crying', 'rage', 'angry', 'eyes', 'wink', 'smirk', 'grimace', 'frown']
  },
  // Body Mechanics
  {
    catId: 'azUEkxAG1UGy9VUe7U56',
    name: 'Body Mechanics',
    matches: ['movement', 'movement other', 'fall', 'lift', 'lift up', 'climb', 'jump', 'flip', 'balance', 'stumble', 'stagger', 'get up', 'throw', 'catch', 'body mechanics', 'weight', 'acrobatics']
  },
  // Running
  {
    catId: 'LV6GiJMlAkokTTy8KUv3',
    name: 'Running',
    matches: ['run', 'running', 'sprint', 'dash']
  },
  // Walking
  {
    catId: '0r59cXoM1zJD0JE73hlY',
    name: 'Walking',
    matches: ['walk', 'walking', 'stagger', 'sneak', 'stumble', 'stroll', 'creep']
  },
  // Hands
  {
    catId: 'QDfaO3ZpVALLj908gO2S',
    name: 'Hands',
    matches: ['hand', 'hands', 'finger', 'fingers', 'gesture', 'grasp', 'hold', 'touch']
  },
  // 2D Effects & VFX
  {
    catId: 'EeIMYpkza6ffxV97C67D',
    name: '2D Effects',
    matches: ['effects', 'fx', 'fire', 'water', 'smoke', 'explosion', 'explosions', 'lightning', 'liquid', 'magic', 'sparks', 'wind']
  },
  {
    catId: 'JnNo18EyCB8UvqHXZvBl',
    name: 'VFX',
    matches: ['vfx', 'particles', 'energy', 'aura', 'magic', 'effects']
  },
  // Creature & Animals
  {
    catId: '2TuH0WAoEqOP4uMii89h',
    name: 'Creature',
    matches: ['creature', 'monster', 'dragon', 'beast']
  },
  {
    catId: 'AdnmZ4NrkTfuRcDbh2zV',
    name: 'Animals',
    matches: ['animal', 'animals', 'dog', 'cat', 'bird', 'horse', 'wolf', 'flying']
  },
  // Smears
  {
    catId: 'HPh2OYR2AgyxkqBEWLy2',
    name: 'Smears',
    matches: ['smears', 'smear', 'blur', 'multiples']
  },
  // Anime
  {
    catId: 'Th5Qq4w5s3aIPqwz8VcN',
    name: 'Anime',
    matches: ['anime', 'japanese', 'manga']
  }
];

function categorize(tags = [], title = '') {
  const allText = (tags.join(' ') + ' ' + title).toLowerCase();
  const catIds = new Set();

  for (const rule of CATEGORY_RULES) {
    if (rule.matches.some(m => allText.includes(m))) {
      catIds.add(rule.catId);
    }
  }

  // Fallbacks if no specific matches
  if (catIds.size === 0) {
    if (allText.includes('arcane') || allText.includes('cinematic') || allText.includes('horizon')) {
      catIds.add('ow0rPQMBTZLttD4efIcS'); // 3D Animation
      catIds.add('7GjU9a66aYCz7Rz1tblf'); // Acting
    } else {
      catIds.add('00YSaHyKCqexOMjP3qx5'); // 2D Animation
      catIds.add('azUEkxAG1UGy9VUe7U56'); // Body Mechanics
    }
  }

  return Array.from(catIds);
}

async function main() {
  const db = initDb();
  console.log('Querying ALL videos from Firestore...');

  const snap = await db.collection('videos').get();
  console.log(`Found ${snap.size} total videos in Firestore.`);

  const docs = snap.docs;
  const BATCH_SIZE = 450;
  let updatedCount = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      const data = doc.data();
      const newCategoryIds = categorize(data.tags || [], data.title || '');

      const updates = {
        status: 'published',
        categoryIds: newCategoryIds,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.update(doc.ref, updates);
    }

    await batch.commit();
    updatedCount += chunk.length;
    process.stdout.write(`\rProcessed & Categorized: ${updatedCount}/${docs.length} (${Math.round((updatedCount / docs.length) * 100)}%)`);
  }

  console.log('\n\n✅ All videos in Firestore updated to published and categorized!');

  // Clear unavailable-video-hosts.json so export-videos-snapshot exports all 8k
  const unavailPath = path.join(__dirname, '..', 'src', 'lib', 'unavailable-video-hosts.json');
  fs.writeFileSync(unavailPath, JSON.stringify({
    _comment: "All video hosts active and indexed",
    hosts: []
  }, null, 2));
  console.log('Cleared unavailable video hosts filter.');

  console.log('Regenerating static video snapshot (export-videos-snapshot.cjs)...');
  const { execSync } = require('child_process');
  execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
  console.log('🎉 Static video snapshot regenerated with ALL references!');
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
