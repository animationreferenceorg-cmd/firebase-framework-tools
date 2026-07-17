const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\micha\\.gemini\\antigravity-ide\\brain\\c1666e23-5253-41dc-a1ed-c449f8b84a7f\\.system_generated\\steps\\1351\\content.md';

const html = fs.readFileSync(contentPath, 'utf8');

// Find next data
const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
if (nextDataMatch) {
  console.log("Found __NEXT_DATA__!");
  try {
    const data = JSON.parse(nextDataMatch[1]);
    fs.writeFileSync('scratch/next_data.json', JSON.stringify(data, null, 2));
    console.log("Saved __NEXT_DATA__ to scratch/next_data.json");
  } catch (e) {
    console.error("Failed to parse JSON:", e.message);
  }
} else {
  console.log("__NEXT_DATA__ not found. Let's look for script tags with json data...");
  // Find any JSON script
  const matches = [...html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)];
  console.log(`Found ${matches.length} json script tags`);
  matches.forEach((m, index) => {
    try {
      const data = JSON.parse(m[1]);
      fs.writeFileSync(`scratch/json_script_${index}.json`, JSON.stringify(data, null, 2));
      console.log(`Saved json_script_${index}.json`);
    } catch (e) {
      console.log(`Script ${index} is not valid JSON`);
    }
  });
}
