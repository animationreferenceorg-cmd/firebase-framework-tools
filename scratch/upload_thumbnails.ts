
import * as admin from 'firebase-admin';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

config({ path: path.resolve(process.cwd(), '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '').replace(/\\n/g, "\n");
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !storageBucket) {
  throw new Error("Missing credentials or storage bucket");
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey
  }),
  storageBucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const imageMapping = [
  {
    titleContains: "TOMORROW",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\tomorrow_short_film_cover_1778043209816.png`,
    storagePath: "thumbnails/tomorrow_generated.png"
  },
  {
    titleContains: "FETCH",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\fetch_short_film_cover_1778043224855.png`,
    storagePath: "thumbnails/fetch_generated.png"
  },
  {
    titleContains: "WORMWOOD",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\wormwood_short_film_cover_1778043238678.png`,
    storagePath: "thumbnails/wormwood_generated.png"
  },
  {
    titleContains: "CHÈRE FIN",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\chere_fin_short_film_cover_1778043252156.png`,
    storagePath: "thumbnails/chere_fin_generated.png"
  },
  {
    titleContains: "Blowing Off Steam",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\blowing_off_steam_short_film_cover_1778043265624.png`,
    storagePath: "thumbnails/blowing_off_steam_generated.png"
  },
  {
    titleContains: "Sea of Lightning",
    localPath: String.raw`C:\Users\micha\.gemini\antigravity\brain\eaa25f27-1ca3-4211-9955-8ff96bd39225\sea_of_lightning_short_film_cover_1778043278146.png`,
    storagePath: "thumbnails/sea_of_lightning_generated.png"
  }
];

async function uploadAndUpdate() {
  const videosCollection = db.collection('videos');
  const snapshot = await videosCollection.where('isShort', '==', true).get();

  for (const mapping of imageMapping) {
    if (!fs.existsSync(mapping.localPath)) {
      console.warn(`File not found: ${mapping.localPath}`);
      continue;
    }

    console.log(`Uploading ${mapping.storagePath}...`);
    const [file] = await bucket.upload(mapping.localPath, {
      destination: mapping.storagePath,
      metadata: { contentType: 'image/png' }
    });

    // Make public or get signed URL?
    // For this project, usually we use firebasestorage.googleapis.com URL with a token or just make it public.
    // Let's make it public for simplicity if possible, or just use the download URL.
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${mapping.storagePath}`;

    // Find the video document
    const videoDoc = snapshot.docs.find(doc => doc.data().title.includes(mapping.titleContains));
    if (videoDoc) {
      await videoDoc.ref.update({ thumbnailUrl: publicUrl });
      console.log(`Updated video: ${videoDoc.data().title} with new thumbnail.`);
    } else {
      console.warn(`Could not find video document for: ${mapping.titleContains}`);
    }
  }
}

uploadAndUpdate().catch(console.error);
