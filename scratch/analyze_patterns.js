const fs = require('fs');

// Extract the CLIPS array from the TypeScript file
const content = fs.readFileSync('./src/app/references/data.ts', 'utf8');

// Get a sample of unique name patterns
const names = [];
const matches = content.matchAll(/"name": "([^"]+)"/g);
for (const m of matches) {
  names.push(m[1]);
}

// Get unique first tokens (usually category/game prefix)
const firstWords = {};
for (const n of names) {
  const parts = n.split(' ');
  const key = parts[0];
  firstWords[key] = (firstWords[key] || 0) + 1;
}

// Sort by frequency
const sorted = Object.entries(firstWords).sort((a,b) => b[1] - a[1]);
console.log('Top 30 first words (likely game/category prefixes):');
sorted.slice(0, 30).forEach(([w, c]) => console.log(`  ${c}x: "${w}"`));

// Sample 20 random names
console.log('\n20 sample names:');
const sample = names.filter((_, i) => i % 370 === 0).slice(0, 20);
sample.forEach(n => console.log(`  "${n}"`));
