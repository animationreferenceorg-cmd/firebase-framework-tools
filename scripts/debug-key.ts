
import { config } from 'dotenv';
config({ path: '.env.local' });

const key = process.env.FIREBASE_PRIVATE_KEY;
if (!key) {
    console.log("Key not found");
} else {
    console.log("Raw Key Length:", key.length);
    console.log("Starts with:", key.substring(0, 30));
    console.log("Ends with:", key.substring(key.length - 30));
    const fixed = key.replace(/^"|"$/g, '').replace(/\\n/g, "\n");
    console.log("Fixed Key Length:", fixed.length);
    console.log("Fixed Starts with:", fixed.substring(0, 30));
    console.log("Contains real newlines?", fixed.includes('\n'));
}
