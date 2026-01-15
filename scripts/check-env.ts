
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const key = process.env.FIREBASE_PRIVATE_KEY || '';

console.log(`Key length: ${key.length}`);
console.log(`First 50 chars: ${key.substring(0, 50)}`);
console.log(`Contains literal \\n: ${key.includes('\\n')}`);
console.log(`Contains real newline: ${key.includes('\n')}`);
console.log(`Starts with quote: ${key.startsWith('"') || key.startsWith("'")}`);
