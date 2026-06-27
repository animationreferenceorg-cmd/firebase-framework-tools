
import { getAdminApp, getFirestore } from '../src/lib/firebase-admin';

async function listBlogPosts() {
  getAdminApp();
  const db = getFirestore();

  console.log("Fetching blog posts...");
  const snapshot = await db.collection('blogPosts').get();
  if (snapshot.empty) {
    console.log("No blog posts found.");
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Title: ${data.title}, Slug: ${data.slug}, Status: ${data.status}`);
    });
  }
}

listBlogPosts().catch(console.error);
