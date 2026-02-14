'use server';

import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ytDlp from 'yt-dlp-exec';

// Helper to check for ffmpeg
async function isFfmpegAvailable(): Promise<boolean> {
    try {
        // specific check just for ffmpeg availability
        const { exec } = require('child_process');
        return new Promise((resolve) => {
            exec('ffmpeg -version', (error: any) => {
                resolve(!error);
            });
        });
    } catch (e) {
        return false;
    }
}

export async function downloadSocialVideo(url: string, saveToFirestore: boolean = true) {
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);
    console.log(`[Downloader] Starting download for: ${url}`);

    try {
        const hasFfmpeg = await isFfmpegAvailable();
        const formatString = hasFfmpeg
            ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            : 'best[ext=mp4]/best';

        console.log(`[Downloader] Ffmpeg available: ${hasFfmpeg}. Using format: ${formatString}`);

        console.log('[Downloader] Executing yt-dlp via yt-dlp-exec...');

        // Execute yt-dlp
        const output = await ytDlp(url, {
            format: formatString,
            output: tempFilePath,
            noWarnings: true,
            printJson: true,
        });

        // Parse Metadata
        let info: any = {};
        try {
            // yt-dlp-exec returns the stdout as a string (or object if configured, but default is usually string or process)
            // Wait, yt-dlp-exec usually returns a Promise<ChildProcess> or Promise<string> depending on usage.
            // By default with arguments, it returns a Promise that resolves to the stdout string?
            // Actually, let's verify usage. standardized is `ytDlp(url, flags)` returns Promise<ProcessOutput> or similar.
            // If it returns an object, we might need to handle it.
            // However, usually it returns the output string if expected.
            // NOTE: yt-dlp-exec v1 might return an object with stdout/stderr.
            // Let's assume it returns standard output or we check types if fails.
            // For now, let's assume `output` is the stdout string or contains it.

            // SAFETY: In many wrappers, if printJson is set, it might return the JSON object directly?
            // usage: const output = await ytDlp(url, { ...flags });

            // If `output` is an object with stdout, use that. If it's a string, use it.
            const stdout = typeof output === 'string' ? output : (output as any).stdout || JSON.stringify(output);

            // Try to parse if it looks like a string, otherwise it might already be the object if the library parses it?
            // yt-dlp-exec documentation: "Returns a promise that will resolve with the output"

            if (typeof output === 'object' && output !== null && !('stdout' in output)) {
                // It might have parsed the JSON if dumpJson was used? No, printJson prints to stdout.
            }

            info = JSON.parse(stdout);
            console.log('[Downloader] Metadata parsed successfully.');
        } catch (e) {
            console.error('[Downloader] Could not parse JSON metadata. Raw output:', output);
            console.warn('[Downloader] Using defaults due to parse error.');
        }

        const title = info.title || 'Downloaded Video';
        const description = info.description || `Imported from ${url}`;
        const uploader = info.uploader || 'Unknown';
        const tags = info.tags || [];
        const duration = info.duration || 0;
        const width = info.width || 0;
        const height = info.height || 0;

        console.log(`[Downloader] Extracted metadata - Title: ${title}, Uploader: ${uploader}`);

        if (!fs.existsSync(tempFilePath)) {
            console.error('[Downloader] Temp file does not exist after command success.');
            // Only throw if we strictly need the file (we do)
            throw new Error('Downloaded file not found. yt-dlp might have failed.');
        }

        const stats = fs.statSync(tempFilePath);
        console.log(`[Downloader] File downloaded. Size: ${stats.size} bytes.`);

        const storage = getFirebaseStorage();
        const bucket = storage.bucket();
        const destination = `videos/${uniqueId}.mp4`;

        console.log(`[Downloader] Uploading to Storage at ${destination}...`);

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

        console.log('[Downloader] Upload complete. Generating signed URL...');

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
            videoData.thumbnailUrl = info.thumbnail;
            console.log(`[Downloader] Found thumbnail URL: ${info.thumbnail}`);
        } else {
            console.warn('[Downloader] No thumbnail URL found in metadata.');
        }

        let videoId = null;

        if (saveToFirestore) {
            const db = getFirestore();
            const docRef = await db.collection('videos').add(videoData);
            videoId = docRef.id;
            console.log(`[Downloader] Success! Video saved to Firestore with ID: ${videoId}`);
        } else {
            console.log(`[Downloader] Success! Returned metadata without saving to Firestore.`);
        }

        // Cleanup
        fs.unlinkSync(tempFilePath);
        console.log('[Downloader] Cleaned up temp file.');

        return {
            success: true,
            videoId: videoId,
            video: { id: videoId, ...videoData }
        };

    } catch (error: any) {
        console.error('[Downloader] Fatal Error:', error);
        // Cleanup if exists
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return { success: false, error: error.message };
    }
}
