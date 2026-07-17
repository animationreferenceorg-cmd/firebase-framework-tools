const fs = require('fs');

const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\harvey-newman.html';
const content = fs.readFileSync(path, 'utf8');

const lines = content.split('\n');
let print = false;
let depth = 0;
lines.forEach((line, index) => {
  if (line.includes('function selectCard')) {
    print = true;
  }
  if (print) {
    console.log(`${index + 1}: ${line}`);
    if (line.includes('{')) depth++;
    if (line.includes('}')) depth--;
    if (depth <= 0 && index > 2000) {
      print = false;
    }
  }
});
