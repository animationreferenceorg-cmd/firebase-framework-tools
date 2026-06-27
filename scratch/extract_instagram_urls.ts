import path from 'path';

async function main() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  getAdminApp();
  const db = getFirestore();

  console.log("Listing collections...");
  const collections = await db.listCollections();
  console.log("Collections:", collections.map(c => c.id));
}

main().catch(console.error);
