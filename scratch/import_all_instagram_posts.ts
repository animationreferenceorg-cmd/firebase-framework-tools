import path from 'path';
import fs from 'fs';

const INSTAGRAM_FOLDER_ID = 'SoskU2OKGXoebJ4a76bs';
const URLS_FILE = path.resolve(process.cwd(), 'scratch/collection_urls.txt');
const LOG_FILE = path.resolve(process.cwd(), 'scratch/import_all_progress.log');

function logProgress(msg: string) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${msg}\n`;
  console.log(formattedMsg.trim());
  fs.appendFileSync(LOG_FILE, formattedMsg, 'utf8');
}

async function runImport() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const admin = await import('firebase-admin');
  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  const { downloadSocialVideo } = await import('../src/app/actions/downloader');

  getAdminApp();
  const db = getFirestore();

  // Reset log file
  fs.writeFileSync(LOG_FILE, '', 'utf8');

  logProgress("=================================================");
  logProgress("Starting Batch Import of ALL Instagram Videos");
  logProgress("=================================================");

  if (!fs.existsSync(URLS_FILE)) {
    logProgress(`❌ Error: URL list file not found at ${URLS_FILE}`);
    return;
  }

  const fileContent = fs.readFileSync(URLS_FILE, 'utf8');
  const rawUrls = fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('http'));

  const urls = Array.from(new Set(rawUrls));
  logProgress(`Loaded ${urls.length} unique URLs from ${URLS_FILE}`);

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    logProgress(`\n[${i + 1}/${urls.length}] Processing: ${url}`);

    try {
      // 1. Check Firestore if already exists
      const existingVideos = await db.collection('videos')
        .where('originalUrl', '==', url)
        .limit(1)
        .get();

      if (!existingVideos.empty) {
        logProgress(`⏩ Already imported. Skipping. (Firestore ID: ${existingVideos.docs[0].id})`);
        skipCount++;
        continue;
      }

      // 2. Download
      logProgress(`📥 Downloading video via yt-dlp...`);
      const downloadResult = await downloadSocialVideo(url, false);

      if (!downloadResult.success || !downloadResult.video) {
        logProgress(`❌ Download failed: ${downloadResult.error}`);
        failCount++;
        continue;
      }

      const video = downloadResult.video;
      logProgress(`✅ Downloaded successfully: "${video.title}" by "${video.uploader}"`);

      // 3. Save to Firestore
      const videoRef = db.collection('videos').doc();
      const tagsList = [video.uploader, ...(video.tags || [])]
        .map(t => t?.trim())
        .filter(t => t && t !== 'Unknown' && t !== '');

      const videoToSave = {
        title: video.title || 'Untitled',
        description: video.description || `Imported from ${url}`,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || '',
        posterUrl: video.posterUrl || video.thumbnailUrl || '',
        tags: Array.from(new Set(tagsList)),
        type: 'social',
        originalUrl: url,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        uploader: video.uploader || 'Unknown',
        duration: video.duration || 0,
        width: video.width || 0,
        height: video.height || 0,
        status: 'published',
        folderId: INSTAGRAM_FOLDER_ID,
        isShort: false
      };

      await videoRef.set(videoToSave);
      logProgress(`🎉 Saved to Firestore (ID: ${videoRef.id})`);
      successCount++;

    } catch (err: any) {
      logProgress(`❌ Fatal error processing URL: ${err.message || err}`);
      failCount++;
    }
  }

  logProgress("\n=================================================");
  logProgress("All Import Processes Completed!");
  logProgress(`Success: ${successCount}`);
  logProgress(`Skipped: ${skipCount}`);
  logProgress(`Failed: ${failCount}`);
  logProgress(`Total processed: ${urls.length}`);
  logProgress("=================================================");
}

runImport().catch(err => {
  logProgress(`❌ Script crash: ${err.message || err}`);
});
