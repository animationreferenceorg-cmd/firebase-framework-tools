const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Michaelfred designs\\AnimWorks';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('course-') || line.includes('href="course') || line.includes('href="/course')) {
      console.log(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
});
