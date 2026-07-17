const fs = require('fs');
const path = require('path');

function readDirRecursive(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(readDirRecursive(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
}

async function run() {
  const targetDir = path.resolve(__dirname, '../node_modules/genkit');
  console.log("Scanning directory:", targetDir);
  if (!fs.existsSync(targetDir)) {
    console.log("Directory does not exist.");
    return;
  }

  const files = readDirRecursive(targetDir);
  console.log(`Found ${files.length} files. Attempting to force download/read them...`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    try {
      // Just open and read a single byte to trigger download
      const fd = fs.openSync(file, 'r');
      const buffer = Buffer.alloc(1);
      fs.readSync(fd, buffer, 0, 1, 0);
      fs.closeSync(fd);
      successCount++;
    } catch (err) {
      console.log(`Failed to read: ${file} - ${err.message}`);
      failCount++;
    }
  }

  console.log(`Completed. Success: ${successCount}, Failed: ${failCount}`);
}

run().catch(console.error);
