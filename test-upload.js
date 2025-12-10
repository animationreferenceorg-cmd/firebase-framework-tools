// test-upload.js
const admin = require("firebase-admin");
const fs = require("fs");

// Load environment variables from .env file
require('dotenv').config();

// This ensures we don't re-initialize if hot-reloading in dev
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines in private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    console.log("✅ Firebase Admin initialized successfully");
  } catch (err) {
    console.error("❌ Error initializing Firebase Admin SDK", err);
    throw new Error("Could not initialize Firebase Admin SDK.");
  }
}

const bucket = admin.storage().bucket();
const filePath = "./hello.txt";

// Make a simple file
try {
    fs.writeFileSync(filePath, "Hello Firebase!");
    console.log(`📝 Created test file: ${filePath}`);

    console.log(`☁️  Uploading to bucket: ${process.env.FIREBASE_STORAGE_BUCKET}...`);
    
    bucket.upload(filePath)
      .then(() => {
        console.log("✅ Upload success");
        // Clean up the local file
        fs.unlinkSync(filePath);
      })
      .catch(err => {
        console.error("❌ Upload failed", err);
        // Clean up the local file
        fs.unlinkSync(filePath);
      });

} catch (err) {
    console.error("Error during test script execution:", err);
}
