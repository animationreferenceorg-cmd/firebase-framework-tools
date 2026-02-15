'use server';

import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Helper to run shell commands
function runCommand(command: string, args: string[], options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        // Use shell: true by default for better Windows compatibility
        const finalOptions = { shell: true, ...options };
        const process = spawn(command, args, finalOptions);
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
                console.error(`[Downloader] Command failed with code ${code}. Stderr: ${stderr}`);
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
                if (stderr) {
                    console.warn(`[Downloader] Command succeeded with warnings: ${stderr}`);
                }
                resolve(stdout);
            }
        });
    });
}

function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        // Block localhost and private IPs roughly
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.')) {
            return false;
        }
        // Must be http or https
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Helper to check for ffmpeg
async function isFfmpegAvailable(): Promise<boolean> {
    try {
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
    if (!isValidUrl(url)) {
        console.error(`[Downloader] Invalid or blocked URL: ${url}`);
        return { success: false, error: "Invalid URL. Please provide a valid public URL." };
    }

    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);
    console.log(`[Downloader] Starting download for: ${url}`);
    console.log(`[Downloader] Temp file: ${tempFilePath}`);

    try {
        const hasFfmpeg = await isFfmpegAvailable();
        const formatString = hasFfmpeg
            ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            : 'best[ext=mp4]/best';

        console.log(`[Downloader] Ffmpeg available: ${hasFfmpeg}. Using format: ${formatString}`);

        const args = [
            'yt-dlp',
            '-f', formatString,
            '-o', tempFilePath,
            '--no-warnings',
            '--print-json',
            url
        ];

        if (hasFfmpeg) {
            args.splice(2, 0, '--merge-output-format', 'mp4');
        }

        // Determine Python path:
        // 1. Use PYTHON_PATH env var if set
        // 2. Fallback to 'python' on Windows, 'python3' on Linux/Unix
        // 3. Last resort fallback to local dev path (optional, maybe just log warning)

        let pythonPath = process.env.PYTHON_PATH;
        if (!pythonPath) {
            pythonPath = process.platform === 'win32' ? 'python' : 'python3';
        }

        // For local dev fallback if system python isn't set up but we know where it is
        const localDevPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;
        if (process.env.NODE_ENV === 'development' && process.platform === 'win32' && !process.env.PYTHON_PATH) {
            // Check if we should use the hardcoded path as a convenience for this specific user
            // We can check if 'python' command actually works, if not, use localDevPath
            // For now, let's just stick to the specific path for this user's local env to avoid breaking it,
            // but allow override.
            pythonPath = localDevPath;
        }

        let stdout = '';
        try {
            console.log(`[Downloader] Executing yt-dlp via Python: ${pythonPath}`);
            const pyArgs = ['-m', 'yt_dlp', ...args.slice(1)];
            stdout = await runCommand(pythonPath, pyArgs);
            console.log('[Downloader] Command execution successful.');
        } catch (e: any) {
            console.error('[Downloader] Python module execution failed:', e);
            throw new Error(`Failed to execute yt-dlp: ${e.message}`);
        }

        // Parse Metadata
        let info: any = {};
        try {
            info = JSON.parse(stdout);
            console.log('[Downloader] Metadata parsed successfully.');
        } catch (e) {
            console.error('[Downloader] Could not parse JSON metadata. Raw stdout:', stdout);
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
            console.error(`[Downloader] File not found at expected path: ${tempFilePath}`);

            // Debug: Check if any file with the ID exists (maybe different extension)
            try {
                const files = fs.readdirSync(tempDir);
                const matchingFiles = files.filter(f => f.includes(uniqueId));
                console.error(`[Downloader] Found matching files in temp dir:`, matchingFiles);

                if (matchingFiles.length > 0) {
                    console.error(`[Downloader] Possible extension mismatch. Expected .mp4, found: ${matchingFiles.join(', ')}`);
                }
            } catch (err) {
                console.error('[Downloader] Failed to list temp dir:', err);
            }

            throw new Error('Downloaded file not found. yt-dlp might have failed to create the file at the expected path.');
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
