
// This script is not part of the app runtime, but is used to seed initial data.
// You can run this with: `npx tsx scripts/seed.ts`
import { getFirestore } from '../src/lib/firebase-admin';

async function seedContent() {
  const adminDb = getFirestore();
  console.log('Seeding content...');
  // No content to seed for now.
  console.log('✅ No content to seed.');
}

seedContent();
