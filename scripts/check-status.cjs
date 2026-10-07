const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (!admin.apps.length) {
  if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId
    });
  }
}

async function main() {
  const db = admin.firestore();
  console.log('Fetching all published videos...');
  const snap = await db.collection('videos').where('status', '==', 'published').get();
  console.log('Total published videos in Firestore:', snap.size);

  let sakugaTotal = 0;
  let sakugaDirectCdn = 0;
  let sakugaBunny = 0;
  let sakugaRawTitle = 0;
  let otherTotal = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (d.importSource === 'sakugabooru') {
      sakugaTotal++;
      const vUrl = d.videoUrl || '';
      if (vUrl.startsWith('https://www.sakugabooru.com/data/')) {
        sakugaDirectCdn++;
      } else if (vUrl.includes('b-cdn.net')) {
        sakugaBunny++;
      }
      if (/^#[0-9]+/i.test(d.title || '') || /^https?:\/\//i.test(d.title || '')) {
        sakugaRawTitle++;
      }
    } else {
      otherTotal++;
    }
  }

  console.log(`Sakugabooru published: ${sakugaTotal}`);
  console.log(`  - Direct Sakugabooru CDN (100% playable): ${sakugaDirectCdn}`);
  console.log(`  - Bunny URLs (needs CDN update): ${sakugaBunny}`);
  console.log(`  - Raw titles (#123 or URLs): ${sakugaRawTitle}`);
  console.log(`Other published videos: ${otherTotal}`);
}

main().catch(console.error);
