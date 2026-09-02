// Exports all published, non-short videos from Firestore to a static JSON file
// (public/data/videos-snapshot.json) that public pages read instead of querying
// Firestore per visitor. Run manually or via `npm run export:videos`; also runs
// automatically before `next build` (prebuild). If Firestore credentials are not
// available it keeps the existing committed snapshot and exits successfully.
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const OUT_FILE = path.join(__dirname, '..', 'public', 'data', 'videos-snapshot.json');

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  } else {
    // Firebase App Hosting / Cloud Build, or a developer authenticated with
    // `gcloud auth application-default login`.
    //
    // applicationDefault() is passed explicitly rather than relying on a bare
    // initializeApp(): without it, local ADC was not picked up and the probe
    // below failed with UNAUTHENTICATED, silently keeping a stale snapshot.
    // projectId is passed too, since ADC alone does not always resolve it.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId:
        projectId ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        process.env.GCLOUD_PROJECT ||
        'aniamtion-reference',
    });
  }
  return admin.firestore();
}

/** Re-initialises against Application Default Credentials, discarding the
 * previously configured app. Used when the env-var service account is present
 * but no longer valid — a deleted or rotated key leaves FIREBASE_PRIVATE_KEY
 * sitting in .env.local, which would otherwise fail the probe and silently
 * publish a stale snapshot. */
async function retryWithAdc() {
  await Promise.all(admin.apps.map((app) => app && app.delete()));
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      'aniamtion-reference',
  });
  const db = admin.firestore();
  await db.collection('videos').limit(1).get();
  return db;
}

(async () => {
  let db;
  try {
    db = initDb();
    await db.collection('videos').limit(1).get(); // credential probe
  } catch (initError) {
    try {
      console.warn('Configured credentials rejected — falling back to ADC.', initError.message);
      db = await retryWithAdc();
    } catch (e) {
      if (fs.existsSync(OUT_FILE)) {
        console.warn('No Firestore credentials available — keeping existing snapshot.', e.message);
        process.exit(0);
      }
      console.error('No Firestore credentials and no existing snapshot:', e.message);
      process.exit(1);
    }
  }

  const snap = await db.collection('videos').get();
  const videos = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(v => v.status !== 'draft' && v.isShort !== true)
    .map(v => ({
      id: v.id,
      type: v.type || 'video',
      title: v.title || '',
      description: v.description || '',
      thumbnailUrl: v.thumbnailUrl || '',
      posterUrl: v.posterUrl || v.thumbnailUrl || '',
      videoUrl: v.videoUrl || '',
      tags: v.tags || [],
      categoryIds: v.categoryIds || [],
      categories: v.categories || [],
      isShort: false,
      status: 'published',
      ...(v.uploader ? { uploader: v.uploader } : {}),
      ...(v.originalUrl ? { originalUrl: v.originalUrl } : {}),
      ...(v.author_name ? { author_name: v.author_name } : {}),
      ...(v.fps ? { fps: v.fps } : {}),
      ...(v.duration ? { duration: v.duration } : {}),
      ...(v.width ? { width: v.width } : {}),
      ...(v.height ? { height: v.height } : {}),
      createdAt: v.createdAt && typeof v.createdAt.toMillis === 'function' ? v.createdAt.toMillis() : null,
    }))
    // Oldest first, so consumers doing [...videos].reverse() get newest first
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(videos));
  const mb = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2);
  console.log(`Exported ${videos.length} published videos to ${path.relative(process.cwd(), OUT_FILE)} (${mb} MB)`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
