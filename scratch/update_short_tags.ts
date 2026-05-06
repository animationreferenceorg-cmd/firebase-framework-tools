
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing credentials");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  })
});

const db = admin.firestore();

async function updateTags() {
  const videosCollection = db.collection('videos');
  const snapshot = await videosCollection.where('isShort', '==', true).get();

  const updates = {
    "Wire | Worthikids": ['Surreal', 'Experimental', 'Hybrid', 'Character Animation'],
    "Monsters Down Under | Dead Sound": ['Nature', 'Creature', 'Sci-Fi', 'Documentary'],
    "ENA - Temptation Stairway | Joel G": ['Surreal', 'Experimental', 'Abstract', '3D'],
    "Amaro and Walden's Joyride | The Line": ['Action', 'Combat', '2D', 'Chase'],
    "Animation vs. Minecraft (Official) | Alan Becker": ['Action', 'Combat', 'Gaming', 'Stick Figure'],
    "Best Friend | GOBELINS": ['Sci-Fi', 'Drama', 'Future', 'Award-Winning'],
    "BLIND EYE | GOBELINS": ['Sci-Fi', 'Drama', 'Society', 'Conceptual'],
    "EGGPLANT | Omeleto Animation": ['Whimsical', 'Drama', 'Fantasy', 'Surreal'],
    "Sintel | Blender Open Movie": ['Fantasy', 'Adventure', '3D', 'Drama'],
    "THE REWARD | Sun Creature Studio": ['Adventure', 'Fantasy', '2D', 'Epic']
  };

  for (const doc of snapshot.docs) {
    const title = doc.data().title;
    for (const [key, tags] of Object.entries(updates)) {
      if (title.includes(key)) {
        await doc.ref.update({ tags });
        console.log(`Updated tags for: ${title}`);
      }
    }
  }
}

updateTags().catch(console.error);
