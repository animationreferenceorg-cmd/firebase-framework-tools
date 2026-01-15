
import * as admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Manually load .env since direct execution might miss it
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    console.log(`Loading env from ${envPath}`);
    dotenv.config({ path: envPath });
} else {
    console.log('No .env file found!');
}

async function configureCors() {
    try {
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
        const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

        if (!privateKeyRaw) {
            console.error('Missing FIREBASE_PRIVATE_KEY');
            return;
        }

        // Handle both actual newlines and escaped newlines
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

        console.log('Initializing Firebase Admin...');
        console.log(`Project: ${projectId}`);
        console.log(`Email: ${clientEmail}`);
        console.log(`Key Length: ${privateKey.length}`);

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
                storageBucket: storageBucket,
            });
        }

        const bucket = getStorage().bucket();
        console.log(`Configuring CORS for bucket: ${bucket.name}`);

        await bucket.setCorsConfiguration([
            {
                origin: ['http://localhost:3000', 'https://animation-reference.web.app', 'https://animation-reference.firebaseapp.com'],
                responseHeader: ['Content-Type', 'Access-Control-Allow-Origin'],
                method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
                maxAgeSeconds: 3600
            }
        ]);

        console.log('CORS configuration updated successfully!');

        // Verify
        const [metadata] = await bucket.getMetadata();
        console.log('Current CORS config:', JSON.stringify(metadata.cors, null, 2));

    } catch (error) {
        console.error('Error configuring CORS:', error);
    }
}

configureCors();
