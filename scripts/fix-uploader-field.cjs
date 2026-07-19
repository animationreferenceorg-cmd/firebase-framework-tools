// One-time fix: imported reference clips were given uploader: 'AnimRef Import',
// which the home page's Community tab uses to detect community content.
// Replaces it with importSource: 'animref-references'.
// Run with: node scripts/fix-uploader-field.cjs
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

(async () => {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    }),
  });
  const db = admin.firestore();
  const snap = await db.collection('videos').where('uploader', '==', 'AnimRef Import').select().get();
  console.log(`Fixing ${snap.size} docs...`);
  let done = 0;
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = db.batch();
    snap.docs.slice(i, i + 400).forEach(d => {
      batch.update(d.ref, { uploader: admin.firestore.FieldValue.delete(), importSource: 'animref-references' });
    });
    await batch.commit();
    done += Math.min(400, snap.docs.length - i);
    console.log(`${done}/${snap.size}`);
  }
  console.log('DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
