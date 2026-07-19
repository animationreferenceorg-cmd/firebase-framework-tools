const fs = require('fs');
const content = fs.readFileSync('./src/app/references/data.ts', 'utf8');
const clips = content.match(/"name": "[^"]+"/g);
const korean = clips ? clips.filter(n => /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(n)) : [];
console.log('Total name entries:', clips ? clips.length : 0);
console.log('Korean titles:', korean.length);
console.log('First 5 Korean:', korean.slice(0,5).join('\n'));
