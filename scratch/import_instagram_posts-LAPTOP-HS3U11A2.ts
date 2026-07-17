import path from 'path';
import fs from 'fs';

const INSTAGRAM_FOLDER_ID = 'SoskU2OKGXoebJ4a76bs';

const urls = [
  // First 10
  "https://www.instagram.com/p/DaAzynAspgz/",
  "https://www.instagram.com/p/DZ_CEcmzJd9/",
  "https://www.instagram.com/p/DZ5a8IRxpv_/",
  "https://www.instagram.com/p/DaBC3CJluBd/",
  "https://www.instagram.com/p/DZ30g29hjNz/",
  "https://www.instagram.com/p/DXJ-n0wk0Lu/",
  "https://www.instagram.com/p/DY9vt7WsoYh/",
  "https://www.instagram.com/p/DZUepk7oXIO/",
  "https://www.instagram.com/p/DZdz595qRZo/",
  "https://www.instagram.com/p/DYr1Lz4KNA8/",
  
  // Next 10
  "https://www.instagram.com/p/DZul191iKN7/",
  "https://www.instagram.com/p/DZC7zX5juzG/",
  "https://www.instagram.com/p/DY4erPyMc32/",
  "https://www.instagram.com/p/DWdLdWzEVSN/",
  "https://www.instagram.com/p/DZi_WuytcJ6/",
  "https://www.instagram.com/p/DZZCvKNO2eE/",
  "https://www.instagram.com/p/DXU_I1MDWQA/",
  "https://www.instagram.com/p/DZdAx3dAYPI/",
  "https://www.instagram.com/p/DZzvxZHvP2R/",
  "https://www.instagram.com/p/DZOhgojDTZQ/"
];

async function runImport() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const admin = await import('firebase-admin');
  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  const { downloadSocialVideo } = await import('../src/app/actions/downloader');

  getAdminApp();
  const db = getFirestore();

  console.log("----------------------------------------");
  console.log(`Starting import of ${urls.length} Instagram videos...`);
  console.log("----------------------------------------");

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n[${i + 1}/${urls.length}] Processing URL: ${url}`);

    try {
      // 1. Check if video already exists in Firestore (deduplicate)
      const existingVideos = await db.collection('videos')
        .where('originalUrl', '==', url)
        .limit(1)
        .get();

      if (!existingVideos.empty) {
        console.log(`⏩ Video already imported. Skipping. (ID: ${existingVideos.docs[0].id})`);
        continue;
      }

      // 2. Download video
      console.log(`📥 Downloading video...`);
      const downloadResult = await downloadSocialVideo(url, false);

      if (!downloadResult.success || !downloadResult.video) {
        console.error(`❌ Download failed: ${downloadResult.error}`);
        continue;
      }

      const video = downloadResult.video;
      console.log(`✅ Downloaded successfully. Title: "${video.title}" by "${video.uploader}"`);

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
      console.log(`🎉 Saved video to Firestore (ID: ${videoRef.id}) in Instagram folder.`);

    } catch (err: any) {
      console.error(`❌ Error processing ${url}:`, err.message || err);
    }
  }

  console.log("\n----------------------------------------");
  console.log("Instagram import process completed!");
  console.log("----------------------------------------");
}

runImport().catch(console.error);
