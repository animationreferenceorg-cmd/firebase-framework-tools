const fs = require('fs');

const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\course-detail.html';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
console.log("Searching for pricing or buy options in course-detail.html...");
lines.forEach((line, index) => {
  if (line.includes('pricing') || line.includes('buy') || line.includes('enroll') || line.includes('membership')) {
    if (line.includes('<div') || line.includes('class=') || line.includes('<button')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
