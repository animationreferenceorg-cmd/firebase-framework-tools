#!/usr/bin/env node

/**
 * Curated Multi-Category Sakugabooru Ingestion Script
 * 
 * Fetches top-rated animation cuts across the most essential reference
 * disciplines (Combat, FX, Acting, Locomotion, Creatures, Smears)
 * and ingests them directly into your Bunny Stream CDN library and Firestore.
 */

const { execSync } = require('child_process');

const BATCHES = [
  { name: 'Top Masterpieces (All-Time)', tags: 'order:score', limit: 25 },
  { name: 'Elemental FX & Explosions', tags: 'effects order:score', limit: 25 },
  { name: 'Combat & Fight Choreography', tags: 'fighting order:score', limit: 25 },
  { name: 'Character Acting & Expressions', tags: 'character_acting order:score', limit: 25 },
  { name: 'Locomotion & Body Mechanics', tags: 'running order:score', limit: 25 },
  { name: 'Creature & Animal Locomotion', tags: 'creatures order:score', limit: 20 },
  { name: 'Smears & Multi-Limbs', tags: 'smears order:score', limit: 20 },
];

console.log('🚀 Starting Curated Multi-Category Reference Ingestion to Bunny Stream...');

for (let i = 0; i < BATCHES.length; i++) {
  const b = BATCHES[i];
  console.log(`\n============================================================`);
  console.log(`[Batch ${i + 1}/${BATCHES.length}] Ingesting: ${b.name}`);
  console.log(`Tags: "${b.tags}" | Limit: ${b.limit}`);
  console.log(`============================================================`);

  try {
    execSync(`node scripts/import-sakugabooru.cjs --limit ${b.limit} --tags "${b.tags}" --download`, {
      stdio: 'inherit'
    });
  } catch (err) {
    console.error(`Error processing batch "${b.name}":`, err.message);
  }
}

console.log('\n============================================================');
console.log('🎉 Curated Reference Ingestion Complete!');
console.log('Regenerating static snapshot (export-videos-snapshot.cjs)...');
execSync('node scripts/export-videos-snapshot.cjs', { stdio: 'inherit' });
console.log('✅ Library updated and ready.');
