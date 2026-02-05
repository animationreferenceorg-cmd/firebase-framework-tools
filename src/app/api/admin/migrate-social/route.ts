import { NextResponse } from 'next/server';
import { getFirestore } from '@/lib/firebase-admin';

export async function GET() {
    try {
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
        const report: any[] = [];

        videosSnapshot.forEach(doc => {
            const data = doc.data();
            // Check if it's a social video (has originalUrl or type is social)
            // AND it's not already in the Instagram folder
            const isSocial = (data.originalUrl && data.originalUrl.length > 0) ||
                (data.type === 'social') ||
                (data.uploader_url && (data.uploader_url.includes('instagram') || data.uploader_url.includes('tiktok')));

            if (isSocial) {
                const isUnsorted = !data.folderId || data.folderId === 'null';

                report.push({
                    id: doc.id,
                    title: data.title,
                    folderId: data.folderId,
                    isUnsorted,
                    originalUrl: data.originalUrl,
                    type: data.type
                });

                // FORCE MOVE: User wants ALL social videos in Instagram folder
                if (data.folderId !== instagramFolderId) {
                    // console.log(`>> MOVING video: ${data.title || doc.id} from ${data.folderId} to ${instagramFolderId}`);
                    const docRef = videosCollection.doc(doc.id);
                    batch.update(docRef, { folderId: instagramFolderId });
                    movedCount++;
                }
            }
        });

        if (movedCount > 0) {
            await batch.commit();
            return NextResponse.json({ success: true, message: `Moved ${movedCount} videos to Instagram folder.`, report });
        } else {
            return NextResponse.json({ success: true, message: 'No videos needed moving.', report });
        }
    } catch (error: any) {
        console.error("Migration failed:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
