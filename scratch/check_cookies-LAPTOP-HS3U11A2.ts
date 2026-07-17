async function listSocialVideos() {
  const dotenv = await import('dotenv');
  const path = await import('path');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  getAdminApp();
  const db = getFirestore();

  console.log("Querying social videos...");
  const snapshot = await db.collection('videos')
    .where('type', '==', 'social')
    .limit(10)
    .get();

  console.log(`Found ${snapshot.size} videos with type=social`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Video ID: ${doc.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Type: ${data.type}`);
    console.log(`  Video URL: ${data.videoUrl}`);
    console.log(`  Original URL: ${data.originalUrl}`);
    console.log(`  Thumbnail URL: ${data.thumbnailUrl}`);
    console.log(`  Poster URL: ${data.posterUrl}`);
  });

  const snapshot2 = await db.collection('videos')
    .limit(10)
    .get();
  console.log(`General first 10 videos (checking if any contain instagram/tiktok in originalUrl but type is not social):`);
  snapshot2.forEach(doc => {
    const data = doc.data();
    if (data.originalUrl && (data.originalUrl.includes('instagram.com') || data.originalUrl.includes('tiktok.com'))) {
      console.log(`Video ID: ${doc.id}`);
      console.log(`  Title: ${data.title}`);
      console.log(`  Type: ${data.type}`);
      console.log(`  Video URL: ${data.videoUrl}`);
      console.log(`  Original URL: ${data.originalUrl}`);
    }
  });
}

listSocialVideos().catch(console.error);
