async function listCategories() {
  const dotenv = await import('dotenv');
  const path = await import('path');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  getAdminApp();
  const db = getFirestore();

  console.log("Fetching categories...");
  const snapshot = await db.collection('categories').get();
  const categories: string[] = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    categories.push(data.title || doc.id);
  });
  console.log("Existing categories:", categories);
}

listCategories().catch(console.error);
