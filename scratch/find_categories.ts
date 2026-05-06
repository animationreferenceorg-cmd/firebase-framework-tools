
import { getFirestore } from '../src/lib/firebase-admin';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local from the root
config({ path: path.resolve(process.cwd(), '.env.local') });

async function findCategory() {
  const db = getFirestore();
  const snapshot = await db.collection('categories').where('status', '==', 'published').get();
  snapshot.forEach(doc => {
    console.log(`ID: ${doc.id}, Title: ${doc.data().title}`);
  });
}

findCategory().catch(console.error);
