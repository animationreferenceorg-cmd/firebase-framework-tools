
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

async function revertThumbnails() {
  const videosCollection = db.collection('videos');
  const snapshot = await videosCollection.where('isShort', '==', true).get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const videoUrl = data.videoUrl;

    if (videoUrl && videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts?|watch)\/?(?:\?v=)?|v\/|e\/|watch\?v=)|youtu\.be\/)([^"&?\/ ]{11})/;
      const match = videoUrl.match(youtubeRegex);
      if (match?.[1]) {
        const videoId = match[1];
        const hqThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        
        await doc.ref.update({ thumbnailUrl: hqThumbnail });
        console.log(`Reverted thumbnail for: ${data.title}`);
      }
    }
  }
}

revertThumbnails().catch(console.error);
