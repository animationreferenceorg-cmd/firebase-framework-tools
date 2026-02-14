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
        // "shell: true" is often needed on Windows to find commands in PATH
        const process = spawn(command, args, { shell: true });
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
                // Capture stderr for better debugging
                const cleanStderr = stderr.replace(/\s+/g, ' ').trim();
                console.error(`[Downloader] Command "${command}" failed (code ${code}): ${cleanStderr.slice(0, 500)}`);
                reject(new Error(`Command failed: ${cleanStderr.slice(0, 200)}...`));
            } else {
                resolve(stdout);
            }
        });
    });
}

export async function downloadSocialVideo(url: string, saveToFirestore: boolean = true, folderId?: string | null) {
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
        // Attempt to find best match for author name
        const authorName = info.uploader || info.channel || info.creator || '';
        const tags = info.tags || [];
        const duration = info.duration || 0;
        const width = info.width || 0;
        const height = info.height || 0;

        // Robustly find the downloaded file (ignoring extension)
        const files = fs.readdirSync(tempDir);
        const downloadedFile = files.find(f => f.startsWith(uniqueId));

        if (!downloadedFile) {
            throw new Error('Downloaded file not found. yt-dlp might have failed to save the file.');
        }

        const actualFilePath = path.join(tempDir, downloadedFile);
        const destination = `videos/${uniqueId}${path.extname(downloadedFile)}`;

        const storage = getFirebaseStorage();
        const bucket = storage.bucket();

        console.log(`[Downloader] Uploading to ${destination}...`);

        await bucket.upload(actualFilePath, {
            destination: destination,
            metadata: {
                contentType: 'video/mp4', // This might need adjustment based on ext, but usually fine for storage
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
            folderId: folderId || null,
            authorName: authorName,
            authorUrl: info.uploader_url || info.channel_url || url, // Fallback to video URL if no profile URL
            authorAvatarUrl: info.channel_follower_count ? '' : '' // Placeholder: yt-dlp doesn't reliably give avatars.
        };

        if (info.thumbnail) {
            videoData.thumbnailUrl = info.thumbnail;
        }

        // Deep copy for Firestore (keeps Dates)
        const firestoreData = { ...videoData };

        // Prepare for Client (convert Dates to strings)
        const clientData = {
            ...videoData,
            createdAt: videoData.createdAt.toISOString(),
            updatedAt: videoData.updatedAt.toISOString()
        };

        let videoId = null;

        if (saveToFirestore) {
            const db = getFirestore();
            // Use firestoreData which has Date objects
            const docRef = await db.collection('videos').add(firestoreData);
            videoId = docRef.id;
            console.log(`[Downloader] Success! Video ID: ${videoId}`);
        } else {
            console.log(`[Downloader] Success! Returned metadata without saving to Firestore.`);
        }

        // Cleanup
        fs.unlinkSync(actualFilePath);

        // Sanitize return value to ensure it's serializable for Server Actions
        return JSON.parse(JSON.stringify({
            success: true,
            videoId: videoId,
            video: { id: videoId, ...clientData }
        }));

    } catch (error: any) {
        console.error('[Downloader] Error:', error);
        // Cleanup if exists
        // Cleanup if exists (using regex/prefix since we don't know exact extension if we failed early)
        try {
            const files = fs.readdirSync(tempDir);
            const relatedFiles = files.filter(f => f.startsWith(uniqueId));
            relatedFiles.forEach(f => fs.unlinkSync(path.join(tempDir, f)));
        } catch (cleanupError) {
            console.warn('[Downloader] Cleanup warning:', cleanupError);
        }

        const errorMessage = String(error.message || error);

        // Check for common Instagram errors
        if (errorMessage.includes("Sign in") || errorMessage.includes("login") || errorMessage.includes("403")) {
            return { success: false, error: "Instagram requires login to view this post. Try a public post or configure cookies." };
        }

        return { success: false, error: `Download failed: ${errorMessage}` };
    }
}
