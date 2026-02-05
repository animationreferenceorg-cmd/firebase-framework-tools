import * as dotenv from 'dotenv';
import * as path from 'path';

// Fix for loading env vars in script context
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

import { getFirestore } from '../src/lib/firebase-admin';

async function main() {
    const db = getFirestore();
    const foldersCollection = db.collection('folders');
    const videosCollection = db.collection('videos');

    console.log('Finding "Instagram" folder...');

    // 1. Find the "Instagram" folder
    const foldersSnapshot = await foldersCollection.get();
    let instagramFolderId: string | null = null;

    foldersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.name && data.name.toLowerCase().includes('instagram')) {
            instagramFolderId = doc.id;
            console.log(`Found Instagram folder: ${data.name} (ID: ${doc.id})`);
        }
    });

    if (!instagramFolderId) {
        console.log('Instagram folder not found. Creating one...');
        const newFolderRef = await foldersCollection.add({
            name: 'Instagram',
            createdAt: new Date(),
        });
        instagramFolderId = newFolderRef.id;
        console.log(`Created Instagram folder (ID: ${instagramFolderId})`);
    }

    // 2. Find videos to move
    console.log('Finding social videos to move...');
    const videosSnapshot = await videosCollection.get();
    let movedCount = 0;
    const batch = db.batch();

    videosSnapshot.forEach(doc => {
        const data = doc.data();
        // Check if it's a social video (has originalUrl or type is social)
        // AND it's not already in the Instagram folder
        const isSocial = (data.originalUrl && data.originalUrl.length > 0) ||
            (data.type === 'social') ||
            (data.uploader_url && (data.uploader_url.includes('instagram') || data.uploader_url.includes('tiktok')));

        if (isSocial && data.folderId !== instagramFolderId) {
            console.log(`Moving video: ${data.title || doc.id}`);
            const docRef = videosCollection.doc(doc.id);
            batch.update(docRef, { folderId: instagramFolderId });
            movedCount++;
        }
    });

    if (movedCount > 0) {
        await batch.commit();
        console.log(`Successfully moved ${movedCount} videos to the Instagram folder.`);
    } else {
        console.log('No videos needed moving.');
    }
}

main().catch(console.error);
