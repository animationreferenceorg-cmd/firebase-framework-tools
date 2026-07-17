const fs = require('fs');
const path = 'C:\\Users\\micha\\OneDrive\\Documents\\Github\\Animationreference.org\\node_modules\\genkit\\lib\\index.js';
console.log("File exists:", fs.existsSync(path));
try {
  const stat = fs.statSync(path);
  console.log("Stat:", stat);
} catch (e) {
  console.log("Stat failed:", e);
}
