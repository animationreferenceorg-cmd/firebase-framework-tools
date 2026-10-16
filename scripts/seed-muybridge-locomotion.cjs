#!/usr/bin/env node

/**
 * Seed Script: Eadweard Muybridge Locomotion Studies (Public Domain / CC0)
 * 
 * Ingests the classic foundational animal and human motion plates into Firestore
 * as public reference clips. These provide immediate, evergreen, copyright-free
 * reference for walk cycles, run cycles, quadruped gallops, and avian flight.
 * 
 * Usage:
 *   node scripts/seed-muybridge-locomotion.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : undefined;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp();
    }
  } catch (err) {
    admin.initializeApp();
  }
}

const db = admin.firestore();

const MUYBRIDGE_STUDIES = [
  {
    id: 'muybridge-horse-in-motion-1878',
    title: 'Eadweard Muybridge: The Horse in Motion (Gallop Cycle)',
    category: 'Creature',
    mediaType: 'gif',
    sourcePlatform: 'archive',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:The_Horse_in_Motion.gif',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/The_Horse_in_Motion-anim.gif',
    uploadedMediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/07/The_Horse_in_Motion-anim.gif',
    sourceAuthorName: 'Eadweard Muybridge',
    sourceAuthorUrl: 'https://en.wikipedia.org/wiki/Eadweard_Muybridge',
    sourceDescription: 'The historic 1878 sequential photographic study that proved all four hooves leave the ground simultaneously during an equine gallop. The foundational document of animal locomotion animation.',
    tags: ['muybridge', 'horse', 'gallop', 'quadruped', 'locomotion', 'run-cycle', 'public-domain'],
    visualTags: ['animal', 'horse', 'running', 'legs', 'timing'],
    palette: ['#000000', '#ffffff', '#888888'],
    startTime: 0,
    endTime: 1.5,
  },
  {
    id: 'muybridge-man-walking-cycle',
    title: 'Eadweard Muybridge: Human Walk Cycle & Weight Shift',
    category: 'Locomotion',
    mediaType: 'image',
    sourcePlatform: 'archive',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Muybridge_race_walking.jpg',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Muybridge_race_walking.jpg/800px-Muybridge_race_walking.jpg',
    uploadedMediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Muybridge_race_walking.jpg/1280px-Muybridge_race_walking.jpg',
    sourceAuthorName: 'Eadweard Muybridge',
    sourceAuthorUrl: 'https://en.wikipedia.org/wiki/Eadweard_Muybridge',
    sourceDescription: 'Complete sequential breakdown of human contact, down, passing, and up poses during a stride. Indispensable for timing human contact frames, hip rotation, and arm counter-swings.',
    tags: ['muybridge', 'walk-cycle', 'human', 'stride', 'body-mechanics', 'contact-frame', 'anatomy'],
    visualTags: ['human', 'walking', 'stride', 'mechanics'],
    palette: ['#111111', '#e5e5e5', '#737373'],
    startTime: 0,
    endTime: 2.0,
  },
  {
    id: 'muybridge-cat-gallop-locomotion',
    title: 'Eadweard Muybridge: Feline Quadruped Bound & Gallop',
    category: 'Creature',
    mediaType: 'image',
    sourcePlatform: 'archive',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Muybridge_Cat_trotting.jpg',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Muybridge_Cat_trotting.jpg/800px-Muybridge_Cat_trotting.jpg',
    uploadedMediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Muybridge_Cat_trotting.jpg/1280px-Muybridge_Cat_trotting.jpg',
    sourceAuthorName: 'Eadweard Muybridge',
    sourceAuthorUrl: 'https://en.wikipedia.org/wiki/Eadweard_Muybridge',
    sourceDescription: 'High-speed sequential plate showing feline spine compression, leg retraction, and paw contact sequence during trot and gallop. Crucial for understanding quadruped flexibility.',
    tags: ['muybridge', 'cat', 'feline', 'quadruped', 'trot', 'spine-compression', 'creature'],
    visualTags: ['cat', 'creature', 'trot', 'quadruped', 'flexibility'],
    palette: ['#0f0f0f', '#f5f5f5', '#7f7f7f'],
    startTime: 0,
    endTime: 1.2,
  },
  {
    id: 'muybridge-athlete-high-jump',
    title: 'Eadweard Muybridge: High Jump, Compression & Apex Arc',
    category: 'Stunts',
    mediaType: 'image',
    sourcePlatform: 'archive',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:High_jump_Muybridge.jpg',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/High_jump_Muybridge.jpg/800px-High_jump_Muybridge.jpg',
    uploadedMediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/High_jump_Muybridge.jpg/1280px-High_jump_Muybridge.jpg',
    sourceAuthorName: 'Eadweard Muybridge',
    sourceAuthorUrl: 'https://en.wikipedia.org/wiki/Eadweard_Muybridge',
    sourceDescription: 'Athletic leap study detailing the anticipation knee compression, upward trajectory arc, peak suspension hang-time, and impact landing recovery.',
    tags: ['muybridge', 'jump', 'arc', 'hang-time', 'anticipation', 'landing', 'athletics', 'body-mechanics'],
    visualTags: ['jump', 'athletics', 'hangtime', 'arc'],
    palette: ['#0a0a0a', '#ffffff', '#909090'],
    startTime: 0,
    endTime: 2.5,
  },
  {
    id: 'muybridge-pigeon-flight-wing-mechanics',
    title: 'Eadweard Muybridge: Bird Flight & Wing Flap Cycle',
    category: 'Creature',
    mediaType: 'image',
    sourcePlatform: 'archive',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Muybridge_pigeon_flying.jpg',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Muybridge_pigeon_flying.jpg/800px-Muybridge_pigeon_flying.jpg',
    uploadedMediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Muybridge_pigeon_flying.jpg/1280px-Muybridge_pigeon_flying.jpg',
    sourceAuthorName: 'Eadweard Muybridge',
    sourceAuthorUrl: 'https://en.wikipedia.org/wiki/Eadweard_Muybridge',
    sourceDescription: 'Wing articulation sequence: upstroke feather folding, apex extension, downstroke air capture, and feather twist mechanics for avian animation.',
    tags: ['muybridge', 'bird', 'wing', 'flight', 'avian', 'creature', 'downstroke', 'flap-cycle'],
    visualTags: ['bird', 'wings', 'flying', 'avian'],
    palette: ['#000000', '#f0f0f0', '#666666'],
    startTime: 0,
    endTime: 1.0,
  },
];

async function seedMuybridge() {
  console.log('🏛️  Seeding Eadweard Muybridge Locomotion Studies to AnimationReference.org...');

  const batch = db.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const study of MUYBRIDGE_STUDIES) {
    const docRef = db.collection('reference_clips').doc(study.id);
    const data = {
      ...study,
      creatorId: 'system_curated_archives',
      creatorName: 'Animation Reference Archive',
      creatorUsername: 'curator',
      creatorAvatar: 'https://animationreference.org/favicon.ico',
      isPrivate: false,
      communityVisible: true,
      captureStatus: 'ready',
      captureStage: 'Reference ready',
      captureProgress: 100,
      bunnySyncStatus: 'ready',
      saveCount: 42,
      createdAt: now,
      updatedAt: now,
    };

    batch.set(docRef, data, { merge: true });
    console.log(`  + Queued: ${study.title}`);
  }

  await batch.commit();
  console.log('✅ Successfully seeded Muybridge Locomotion Studies into reference_clips!');
  process.exit(0);
}

seedMuybridge().catch((err) => {
  console.error('❌ Failed to seed Muybridge references:', err);
  process.exit(1);
});
