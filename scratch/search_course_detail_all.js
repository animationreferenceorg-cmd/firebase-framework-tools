const fs = require('fs');

const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\course-detail.html';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
console.log("Searching for pricing/checkout keywords in course-detail.html...");
lines.forEach((line, index) => {
  const l = line.toLowerCase();
  if (l.includes('price') || l.includes('buy') || l.includes('enroll') || l.includes('membership') || l.includes('card') || l.includes('early')) {
    if (line.includes('<div') || line.includes('class=') || line.includes('<button') || line.includes('<aside') || line.includes('<section')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
