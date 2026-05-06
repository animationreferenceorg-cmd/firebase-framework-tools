
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(process.cwd(), '.env.local') });

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
console.log("Raw Key Start:", privateKey?.substring(0, 50));
console.log("Processed Key Start:", privateKey?.replace(/^"|"$/g, '').replace(/\\n/g, "\n").substring(0, 50));
