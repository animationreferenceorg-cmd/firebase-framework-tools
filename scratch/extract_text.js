const fs = require('fs');
const path = require('path');

const contentPath = 'C:\\Users\\micha\\.gemini\\antigravity-ide\\brain\\c1666e23-5253-41dc-a1ed-c449f8b84a7f\\.system_generated\\steps\\1351\\content.md';
let html = fs.readFileSync(contentPath, 'utf8');

// Strip scripts and styles
html = html.replace(/<script[\s\S]*?<\/script>/gi, '');
html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
html = html.replace(/<svg[\s\S]*?<\/svg>/gi, '');

// Strip other HTML tags, leaving text
let text = html.replace(/<[^>]+>/g, ' ');

// Clean up whitespace
text = text.replace(/\s+/g, ' ');

// Save cleaned text
fs.writeFileSync('scratch/cleaned_text.txt', text);
console.log("Saved cleaned text to scratch/cleaned_text.txt. Length:", text.length);
