// Imports all clips from src/app/references/data.ts into Firestore as published
// videos inside a new "Animation References" folder, using the English titles/tags
// produced by scripts/translate-reference-titles.cjs.
// Run with: node scripts/import-references.cjs
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const FOLDER_NAME = 'Animation References';
const TRANSLATIONS_FILE = path.join(__dirname, '..', 'scratch', 'reference-translations.json');
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-퟿]/;

function loadClips() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'app', 'references', 'data.ts'), 'utf8');
  return eval(src.slice(src.indexOf('[', src.indexOf('export const CLIPS'))).replace(/;\s*$/, ''));
}

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) { console.error('Missing FIREBASE_* credentials in .env'); process.exit(1); }
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  return admin.firestore();
}

(async () => {
  const clips = loadClips();
  const tr = JSON.parse(fs.readFileSync(TRANSLATIONS_FILE, 'utf8'));

  const untranslated = clips.filter(c => HANGUL.test(c.name) && !tr.names[c.name]).length;
  if (untranslated > 0 && !process.argv.includes('--allow-missing')) {
    console.error(`${untranslated} clip names have no translation yet. Finish translation first, or pass --allow-missing.`);
    process.exit(1);
  }

  const db = initDb();

  // 1. Ensure the target folder exists (idempotent)
  let folderId;
  const existing = await db.collection('folders').where('name', '==', FOLDER_NAME).limit(1).get();
  if (!existing.empty) {
    folderId = existing.docs[0].id;
    console.log(`Folder "${FOLDER_NAME}" already exists (${folderId})`);
  } else {
    const ref = await db.collection('folders').add({ name: FOLDER_NAME, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    folderId = ref.id;
    console.log(`Created folder "${FOLDER_NAME}" (${folderId})`);
  }

  const mapTag = t => {
    const en = HANGUL.test(t) ? (tr.tags[t] || t) : t;
    return en.toLowerCase().replace(/\//g, '-').trim();
  };

  // 2. Import videos in batches, doc ID = clip ID so reruns are safe
  const allFinalTags = new Set();
  let written = 0;
  for (let i = 0; i < clips.length; i += 400) {
    const batch = db.batch();
    for (const clip of clips.slice(i, i + 400)) {
      const tags = [...new Set([...clip.tags.map(mapTag), clip.category.replace(/-/g, ' ')])].filter(Boolean);
      tags.forEach(t => allFinalTags.add(t));
      const title = tr.names[clip.name] || clip.name;
      batch.set(db.collection('videos').doc(clip.id), {
        type: 'video',
        title,
        originalTitle: clip.name,
        description: '',
        thumbnailUrl: clip.thumbnailUrl,
        posterUrl: clip.thumbnailUrl,
        videoUrl: clip.videoUrl,
        tags,
        categoryIds: [],
        isShort: false,
        status: 'published',
        folderId,
        importSource: 'animref-references',
        duration: clip.duration,
        width: clip.width,
        height: clip.height,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await batch.commit();
    written += Math.min(400, clips.length - i);
    console.log(`videos: ${written}/${clips.length} written`);
  }

  // 3. Register tags in the master tags collection (doc ID = tag name)
  const tagList = [...allFinalTags].filter(t => t && !t.includes('/') && t !== '.' && t !== '..');
  let tWritten = 0;
  for (let i = 0; i < tagList.length; i += 400) {
    const batch = db.batch();
    for (const tag of tagList.slice(i, i + 400)) {
      batch.set(db.collection('tags').doc(tag), { name: tag }, { merge: true });
    }
    await batch.commit();
    tWritten += Math.min(400, tagList.length - i);
    console.log(`tags: ${tWritten}/${tagList.length} written`);
  }

  // 4. Verify
  const count = await db.collection('videos').where('folderId', '==', folderId).count().get();
  console.log(`DONE. Folder "${FOLDER_NAME}" (${folderId}) now contains ${count.data().count} videos.`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
