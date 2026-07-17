import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

import * as admin from 'firebase-admin';

async function testInit() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  console.log("Env key type:", typeof privateKey);
  if (!privateKey) {
    console.log("No private key found.");
    return;
  }

  // Let's try different replacements:
  const attempts = [
    { name: "Original (as is)", key: privateKey },
    { name: "Replace raw escaped newlines", key: privateKey.replace(/\\n/g, '\n') },
    { name: "Strip quotes and replace escaped newlines", key: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n') },
    { name: "Replace escaped and fix double newlines", key: privateKey.replace(/\\n/g, '\n').replace(/\n+/g, '\n') },
    { name: "Double escaped replacement", key: privateKey.replace(/\\\\n/g, '\n') }
  ];

  for (const attempt of attempts) {
    try {
      console.log(`\nTrying: ${attempt.name}`);
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: attempt.key
        })
      }, attempt.name.replace(/[^a-zA-Z]/g, '')); // unique app name
      
      console.log(`✅ Success for: ${attempt.name}`);
      await app.delete();
    } catch (e: any) {
      console.log(`❌ Failed for: ${attempt.name} - ${e.message}`);
    }
  }
}

testInit().catch(console.error);
