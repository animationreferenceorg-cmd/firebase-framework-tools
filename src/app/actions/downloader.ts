'use server';

import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Helper to run shell commands
function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function downloadSocialVideo(url: string, saveToFirestore: boolean = true) {
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);
    console.log(`[Downloader] Starting download for: ${url}`);
    console.log(`[Downloader] Temp file: ${tempFilePath}`);

    try {
        const args = [
            'yt-dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', tempFilePath,
            '--no-warnings',
            '--print-json',
            url
        ];

        let stdout = '';
        try {
            stdout = await runCommand('yt-dlp', args.slice(1));
        } catch (e: any) {
            console.log('[Downloader] Direct yt-dlp failed, trying module...');
            const pyArgs = ['-m', 'yt_dlp', ...args.slice(1)];
            stdout = await runCommand('python', pyArgs);
        }

        // Parse Metadata
        let info: any = {};
        try {
            info = JSON.parse(stdout);
        } catch (e) {
            console.warn('[Downloader] Could not parse JSON metadata, using defaults.');
        }

        const title = info.title || 'Downloaded Video';
        const description = info.description || `Imported from ${url}`;
        const uploader = info.uploader || 'Unknown';
        const tags = info.tags || [];
        const duration = info.duration || 0;
        const width = info.width || 0;
        const height = info.height || 0;

        if (!fs.existsSync(tempFilePath)) {
            throw new Error('Downloaded file not found. yt-dlp might have failed.');
        }

        const storage = getFirebaseStorage();
        const bucket = storage.bucket();
        const destination = `videos/${uniqueId}.mp4`;

        console.log(`[Downloader] Uploading to ${destination}...`);

        await bucket.upload(tempFilePath, {
            destination: destination,
            metadata: {
                contentType: 'video/mp4',
                metadata: {
                    originalUrl: url,
                    uploader: uploader,
                    title: title
                }
            }
        });

        const [signedUrl] = await bucket.file(destination).getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        const videoData = {
            title: title || 'Untitled',
            description: description || '',
            videoUrl: signedUrl,
            thumbnailUrl: '',
            tags: tags,
            type: 'video',
            originalUrl: url,
            createdAt: new Date(),
            updatedAt: new Date(),
            uploader: uploader,
            duration: duration,
            width: width,
            height: height,
            status: 'draft',
            folderId: null
        };

        if (info.thumbnail) {
            // @ts-ignore
            videoData.thumbnailUrl = info.thumbnail;
        }

        let videoId = null;

        if (saveToFirestore) {
            const db = getFirestore();
            const docRef = await db.collection('videos').add(videoData);
            videoId = docRef.id;
            console.log(`[Downloader] Success! Video ID: ${videoId}`);
        } else {
            console.log(`[Downloader] Success! Returned metadata without saving to Firestore.`);
        }

        // Cleanup
        fs.unlinkSync(tempFilePath);

        return {
            success: true,
            videoId: videoId,
            video: { id: videoId, ...videoData }
        };

    } catch (error: any) {
        console.error('[Downloader] Error:', error);
        // Cleanup if exists
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return { success: false, error: error.message };
    }
}
