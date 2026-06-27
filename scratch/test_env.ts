import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env.local') });

console.log("PROJECT_ID:", process.env.FIREBASE_PROJECT_ID);
console.log("CLIENT_EMAIL:", process.env.FIREBASE_CLIENT_EMAIL);
const key = process.env.FIREBASE_PRIVATE_KEY;
console.log("PRIVATE_KEY exists:", !!key);
if (key) {
  console.log("PRIVATE_KEY length:", key.length);
  console.log("PRIVATE_KEY starts with:", key.substring(0, 30));
  console.log("PRIVATE_KEY ends with:", key.substring(key.length - 30));
  const replaced = key.replace(/^"|"$/g, '').replace(/\\n/g, "\n");
  console.log("REPLACED length:", replaced.length);
  console.log("REPLACED starts with:", replaced.substring(0, 30));
  console.log("REPLACED ends with:", replaced.substring(replaced.length - 30));
}
