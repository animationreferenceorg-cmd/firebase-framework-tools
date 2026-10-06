const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
} else {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

const db = admin.firestore();

async function check() {
  console.log('Querying Firestore videos collection...');
  const snap = await db.collection('videos').get();
  console.log('Total videos in Firestore:', snap.size);
  
  let reflixCount = 0;
  let reflixPreviewCount = 0;
  const reflixExamples = [];
  const hosts = {};
  
  for (const doc of snap.docs) {
    const data = doc.data();
    const url = data.videoUrl || '';
    const thumb = data.thumbnailUrl || '';
    const poster = data.posterUrl || '';
    
    const isReflixVideo = url.includes('reflix');
    const isReflixThumb = thumb.includes('reflix') || poster.includes('reflix');
    
    if (isReflixVideo) {
      reflixCount++;
      if (reflixExamples.length < 5) {
        reflixExamples.push({ id: doc.id, title: data.title, videoUrl: url, thumbnailUrl: thumb });
      }
    }
    if (isReflixThumb) reflixPreviewCount++;
    
    try {
      const u = new URL(url);
      hosts[u.hostname] = (hosts[u.hostname] || 0) + 1;
    } catch (e) {
      hosts['invalid/empty'] = (hosts['invalid/empty'] || 0) + 1;
    }
  }
  
  console.log('Reflix videoUrl count in Firestore:', reflixCount);
  console.log('Reflix thumb/poster count in Firestore:', reflixPreviewCount);
  console.log('Hosts breakdown in Firestore:');
  console.log(JSON.stringify(hosts, null, 2));
  
  if (reflixExamples.length > 0) {
    console.log('Reflix video examples:', JSON.stringify(reflixExamples, null, 2));
  }
  
  // Also check Firebase Storage
  try {
    const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`);
    console.log('Checking Firebase Storage bucket:', bucket.name);
    const [files] = await bucket.getFiles({ maxResults: 10 });
    console.log(`Bucket reachable! Sample files (${files.length}):`, files.map(f => f.name));
  } catch (err) {
    console.log('Error checking Storage bucket:', err.message);
  }
}

check().then(() => process.exit(0)).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
