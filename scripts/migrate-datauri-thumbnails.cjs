// Migrates legacy base64 data-URI thumbnails/posters stored inside Firestore
// video docs to real files in Firebase Storage, replacing the fields with URLs.
// Run with: node scripts/migrate-datauri-thumbnails.cjs
const admin = require('firebase-admin');
const { getDownloadURL } = require('firebase-admin/storage');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

(async () => {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  const snap = await db.collection('videos').get();
  const targets = snap.docs.filter(d => {
    const v = d.data();
    return (v.thumbnailUrl || '').startsWith('data:') || (v.posterUrl || '').startsWith('data:');
  });
  console.log(`${targets.length} videos with data-URI images`);

  let done = 0, failed = 0;
  for (const d of targets) {
    const v = d.data();
    const update = {};
    try {
      for (const field of ['thumbnailUrl', 'posterUrl']) {
        const val = v[field] || '';
        if (!val.startsWith('data:')) continue;
        const m = val.match(/^data:(image\/[a-z+.-]+);base64,(.*)$/s);
        if (!m) { console.warn(`  ${d.id}: unparseable data URI in ${field}, skipping field`); continue; }
        const [, mime, b64] = m;
        const ext = (mime.split('/')[1] || 'png').replace('jpeg', 'jpg').replace(/\+.*$/, '');
        const file = bucket.file(`migrated-thumbnails/${d.id}-${field}.${ext}`);
        await file.save(Buffer.from(b64, 'base64'), {
          contentType: mime,
          metadata: { cacheControl: 'public, max-age=31536000' },
        });
        update[field] = await getDownloadURL(file);
      }
      if (Object.keys(update).length > 0) {
        await d.ref.update(update);
        done++;
        console.log(`  ${done}/${targets.length} ${d.id} (${(v.title || '').slice(0, 40)})`);
      }
    } catch (e) {
      failed++;
      console.error(`  FAILED ${d.id}: ${e.message}`);
    }
  }
  console.log(`DONE. migrated: ${done}, failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
