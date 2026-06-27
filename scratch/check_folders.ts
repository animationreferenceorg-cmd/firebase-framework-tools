import path from 'path';

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  getAdminApp();
  const db = getFirestore();

  console.log("Querying folders...");
  const snapshot = await db.collection('folders').get();
  console.log(`Found ${snapshot.size} folders:`);
  snapshot.forEach(doc => {
    console.log(`Folder ID: ${doc.id}`);
    console.log(`  Name: ${doc.data().name}`);
  });
}

main().catch(console.error);
