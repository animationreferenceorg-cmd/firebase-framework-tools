const fs = require('fs');
const originalReadFileSync = fs.readFileSync;

fs.readFileSync = function (path, options) {
  console.log("Reading file:", path);
  try {
    return originalReadFileSync.apply(this, arguments);
  } catch (err) {
    console.error("FAILED reading file:", path, err);
    throw err;
  }
};

const { genkit } = require('genkit');
console.log("JS Import success:", typeof genkit);
