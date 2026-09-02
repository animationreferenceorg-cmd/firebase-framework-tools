#!/usr/bin/env node
/**
 * Generates a real poster frame for videos whose thumbnail is dead or missing.
 *
 * The Instagram-sourced clips stored their thumbnail as a scontent.cdninstagram.com
 * URL. Those are signed and expire, and only Instagram can reissue them, so they
 * now return 403 and the cards render blank — the card falls through to a <video>
 * fallback that has no poster to show either.
 *
 * This pulls a frame out of the video itself with ffmpeg, uploads it to our own
 * bucket as a public object, and points thumbnailUrl at it. After this the cards
 * take the normal image path like every other video, which also restores the
 * hover-to-play preview that sits inside that path.
 *
 * Auth: Application Default Credentials (gcloud auth application-default login).
 *
 * Usage:
 *   node scripts/backfill-thumbnails.cjs --dry-run
 *   node scripts/backfill-thumbnails.cjs --limit 5
 *   node scripts/backfill-thumbnails.cjs
 */

const admin = require('firebase-admin');
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

const DRY_RUN = process.argv.includes('--dry-run');
const limitFlag = process.argv.indexOf('--limit');
const LIMIT = limitFlag !== -1 ? parseInt(process.argv[limitFlag + 1], 10) : Infinity;

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET || 'aniamtion-reference.firebasestorage.app';

const FFMPEG =
  process.env.FFMPEG_PATH ||
  path.join(
    os.homedir(),
    'AppData/Local/Microsoft/WinGet/Packages',
    'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
    'ffmpeg-9.0.1-full_build/bin/ffmpeg.exe'
  );

/** Hosts whose thumbnails are signed and expire outside our control. */
const DEAD_THUMB_HOST = /cdninstagram\.com|fbcdn\.net/i;

/** ffmpeg can only pull a frame from a direct media URL. */
function isDirectMedia(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('<iframe')) return false;
  if (/youtube\.com|youtu\.be|instagram\.com|tiktok\.com/i.test(url)) return false;
  return /\.mp4|\.webm|\.mov|\.m3u8|storage\.googleapis\.com|firebasestorage/i.test(url);
}

function needsThumbnail(v) {
  const t = v.thumbnailUrl || v.posterUrl || '';
  if (!t) return true;
  return DEAD_THUMB_HOST.test(t);
}

/** Grabs a frame a little way in — the very first frame is often black. */
async function extractFrame(videoUrl, outPath) {
  const attempts = ['00:00:01.0', '00:00:00.3', '00:00:00.0'];
  let lastError;
  for (const seek of attempts) {
    try {
      await execFileAsync(
        FFMPEG,
        [
          '-hide_banner', '-loglevel', 'error',
          '-ss', seek,
          '-i', videoUrl,
          '-frames:v', '1',
          '-vf', "scale='min(640,iw)':-2",
          '-q:v', '4',
          '-y', outPath,
        ],
        { timeout: 90_000, maxBuffer: 1024 * 1024 }
      );
      const stat = fs.statSync(outPath);
      if (stat.size > 1024) return true; // a near-empty file means a blank frame
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) throw lastError;
  return false;
}

async function main() {
  admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: BUCKET,
    credential: admin.credential.applicationDefault(),
  });

  if (!fs.existsSync(FFMPEG)) {
    console.error(`ffmpeg not found at:\n  ${FFMPEG}\nSet FFMPEG_PATH to override.`);
    process.exit(1);
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  console.log(`project : ${PROJECT_ID}`);
  console.log(`bucket  : ${bucket.name}`);
  console.log(`ffmpeg  : ${FFMPEG}`);
  console.log(`mode    : ${DRY_RUN ? 'DRY RUN (no writes)' : 'APPLY'}\n`);

  const snapshot = await db.collection('videos').get();
  const all = snapshot.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const candidates = all.filter(needsThumbnail);
  const actionable = candidates.filter((v) => isDirectMedia(v.videoUrl));
  const unfixable = candidates.filter((v) => !isDirectMedia(v.videoUrl));

  console.log(`scanned            : ${all.length}`);
  console.log(`dead/missing thumb : ${candidates.length}`);
  console.log(`can extract a frame: ${actionable.length}`);
  console.log(`cannot (embed/link): ${unfixable.length}\n`);

  if (DRY_RUN) {
    actionable.slice(0, 5).forEach((v) =>
      console.log(`  ${v.id}  ${String(v.title || '').slice(0, 34).padEnd(36)} ${String(v.videoUrl).slice(0, 60)}`)
    );
    if (actionable.length > 5) console.log(`  ... and ${actionable.length - 5} more`);
    console.log('\nRe-run without --dry-run to apply.');
    return;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aref-thumbs-'));
  let generated = 0;
  const failed = [];

  let batch = db.batch();
  let pending = 0;
  let processed = 0;

  for (const v of actionable) {
    if (processed >= LIMIT) break;
    processed += 1;

    const outPath = path.join(tmpDir, `${v.id}.jpg`);
    try {
      const ok = await extractFrame(v.videoUrl, outPath);
      if (!ok) {
        failed.push({ id: v.id, error: 'no usable frame' });
        continue;
      }

      const objectPath = `thumbnails/${v.id}.jpg`;
      await bucket.upload(outPath, {
        destination: objectPath,
        metadata: { contentType: 'image/jpeg', cacheControl: 'public, max-age=31536000' },
      });
      await bucket.file(objectPath).makePublic();

      batch.update(v.ref, {
        thumbnailUrl: `https://storage.googleapis.com/${bucket.name}/${objectPath}`,
        thumbnailSource: 'extracted-frame',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      generated += 1;
      pending += 1;

      if (pending >= 400) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
      if (generated % 10 === 0) console.log(`  ...${generated} thumbnails generated`);
    } catch (error) {
      failed.push({ id: v.id, error: (error.message || String(error)).slice(0, 90) });
    } finally {
      fs.rmSync(outPath, { force: true });
    }
  }

  if (pending > 0) await batch.commit();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\ngenerated : ${generated}`);
  console.log(`failed    : ${failed.length}`);
  failed.slice(0, 10).forEach((f) => console.log(`  fail ${f.id}: ${f.error}`));
  console.log('\nRun `npm run export:videos` to refresh the public snapshot.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
