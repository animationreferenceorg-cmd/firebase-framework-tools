const fs = require('fs');

const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\harvey-newman.html';
const content = fs.readFileSync(path, 'utf8');

// Find style block contents
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
if (styleMatch) {
  const css = styleMatch[1];
  const lines = css.split('\n');
  let capturing = false;
  let braces = 0;
  lines.forEach((line, index) => {
    if (line.includes('.pricing-') || line.includes('.card-') || line.includes('pricing-section') || line.includes('selectCard')) {
      capturing = true;
    }
    if (capturing) {
      console.log(`${index + 1}: ${line}`);
      if (line.includes('{')) braces++;
      if (line.includes('}')) braces--;
      if (line.includes('}') && braces <= 0) {
        capturing = false;
      }
    }
  });
}
