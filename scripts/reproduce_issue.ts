
import { downloadSocialVideo } from '@/app/actions/downloader';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Mock globals if needed for 'use server' functions running in standalone script
// (Usually fine if they don't use headers/cookies)

async function run() {
    console.log('Starting reproduction test with yt-dlp-exec...');
    // A known working YouTube video (Me at the zoo)
    const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

    try {
        console.log(`Attempting to download: ${url}`);
        // Pass false to avoid saving to Firestore
        const result = await downloadSocialVideo(url, false);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test Failed:', error);
    }
}

run();
