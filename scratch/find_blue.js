const fs = require('fs');
const file = 'c:\\Users\\micha\\OneDrive\\Documents\\[MEMBER] Github\\\\..\\\\..\\\\OneDrive\\\\Documents\\\\Github\\\\Michaelfred designs\\\\AnimWorks\\\\course-3d-cutscenes.html';
// Wait, the path is C:\Users\micha\OneDrive\Documents\Github\Michaelfred designs\AnimWorks\course-3d-cutscenes.html
const actualPath = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks\\course-3d-cutscenes.html';
const content = fs.readFileSync(actualPath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('blue') || line.toLowerCase().includes('grotesk') || line.toLowerCase().includes('manrope')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
