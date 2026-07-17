const fs = require('fs');

const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\harvey-newman.html';
const content = fs.readFileSync(path, 'utf8');

// Find all HTML blocks containing booking options or cards
const lines = content.split('\n');
console.log("Searching for pricing, cards or booking options in harvey-newman.html...");
lines.forEach((line, index) => {
  if (line.includes('booking') || line.includes('book-a-call') || line.includes('pricing') || line.includes('plan-card') || line.includes('tier-card') || line.includes('card')) {
    if (line.includes('<div') || line.includes('<section') || line.includes('class=')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
