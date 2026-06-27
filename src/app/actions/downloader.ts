'use server';

import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';

// --- Helpers ---

function runCommand(command: string, args: string[], options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const finalOptions = { shell: true, ...options };
        const proc = spawn(command, args, finalOptions);
        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Downloader] Command failed (code ${code}). Stderr: ${stderr}`);
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
                if (stderr) console.warn(`[Downloader] Warnings: ${stderr}`);
                resolve(stdout);
            }
        });
    });
}

function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.startsWith('192.168.')) {
            return false;
        }
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

async function isFfmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        exec('ffmpeg -version', (error) => resolve(!error));
    });
}

/**
 * Downloads a file from a URL, following redirects.
 */
function downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (currentUrl: string) => {
            https.get(currentUrl, (response) => {
                // Follow redirects (301, 302, 307, 308)
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                    console.log(`[Downloader] Following redirect to: ${response.headers.location}`);
                    request(response.headers.location);
                    return;
                }
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(dest, () => { }); // Cleanup partial file
                reject(err);
            });
        };
        request(url);
    });
}

/**
 * Ensures yt-dlp is available and returns the path/command to execute it.
 * - On Linux (production): Downloads standalone binary to /tmp if needed.
 * - On Windows (local dev): Uses Python module.
 */
async function getYtDlpExecutor(): Promise<{ command: string; baseArgs: string[] }> {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
        let pythonPath = process.env.PYTHON_PATH;
        const localDevPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;
        
        if (pythonPath && pythonPath !== 'python') {
            console.log(`[Downloader] Windows mode: using custom PYTHON_PATH at ${pythonPath}`);
            return { command: pythonPath, baseArgs: ['-m', 'yt_dlp'] };
        } else if (fs.existsSync(localDevPath)) {
            console.log(`[Downloader] Windows mode: using Python at ${localDevPath}`);
            return { command: localDevPath, baseArgs: ['-m', 'yt_dlp'] };
        }

        // Test if system python is real and has yt-dlp
        const hasRealPython = await new Promise<boolean>((resolve) => {
            exec('python --version', (error, stdout) => {
                resolve(!error && stdout && stdout.toLowerCase().includes('python'));
            });
        });

        if (hasRealPython) {
            console.log(`[Downloader] Windows mode: using system python`);
            return { command: 'python', baseArgs: ['-m', 'yt_dlp'] };
        }

        // Fallback to standalone Windows binary
        const binaryPath = path.join(os.tmpdir(), 'yt-dlp.exe');
        if (fs.existsSync(binaryPath)) {
            console.log(`[Downloader] Standalone Windows yt-dlp binary already cached at ${binaryPath}`);
            return { command: binaryPath, baseArgs: [] };
        }

        console.log('[Downloader] Downloading standalone Windows yt-dlp binary...');
        const ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
        try {
            await downloadFile(ytDlpUrl, binaryPath);
            console.log(`[Downloader] Standalone Windows yt-dlp binary downloaded and ready at ${binaryPath}`);
            return { command: binaryPath, baseArgs: [] };
        } catch (err: any) {
            console.error('[Downloader] Failed to download standalone Windows yt-dlp binary:', err.message);
            throw new Error(`Could not obtain yt-dlp: ${err.message}`);
        }
    }

    // Linux/production: use standalone binary
    const binaryPath = path.join(os.tmpdir(), 'yt-dlp');

    if (fs.existsSync(binaryPath)) {
        console.log(`[Downloader] Standalone yt-dlp binary already cached at ${binaryPath}`);
        return { command: binaryPath, baseArgs: [] };
    }

    console.log('[Downloader] Downloading standalone yt-dlp binary...');
    const ytDlpUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

    try {
        await downloadFile(ytDlpUrl, binaryPath);
        // Make executable
        fs.chmodSync(binaryPath, 0o755);
        console.log(`[Downloader] yt-dlp binary downloaded and ready at ${binaryPath}`);
        return { command: binaryPath, baseArgs: [] };
    } catch (err: any) {
        console.error('[Downloader] Failed to download yt-dlp binary:', err.message);
        throw new Error(`Could not obtain yt-dlp: ${err.message}`);
    }
}

/**
 * Detects the platform from a URL.
 */
function detectPlatform(url: string): string | null {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (hostname.includes('instagram.com')) return 'instagram';
        if (hostname.includes('tiktok.com')) return 'tiktok';
        if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
        return null;
    } catch {
        return null;
    }
}

/**
 * Fetches stored cookies for a platform from Firestore.
 * Returns the path to a temp cookies.txt file, or null if no cookies stored.
 */
async function getCookieFile(platform: string): Promise<string | null> {
    try {
        const db = getFirestore();
        const doc = await db.collection('config').doc('cookies').get();
        if (!doc.exists) return null;

        const data = doc.data();
        const cookieContent = data?.[platform];
        if (!cookieContent || typeof cookieContent !== 'string') return null;

        // Write cookies to a temp file
        const cookiePath = path.join(os.tmpdir(), `cookies_${platform}_${Date.now()}.txt`);
        fs.writeFileSync(cookiePath, cookieContent, 'utf8');
        console.log(`[Downloader] Loaded ${platform} cookies (${cookieContent.length} bytes)`);
        return cookiePath;
    } catch (err: any) {
        console.warn(`[Downloader] Could not load cookies for ${platform}:`, err.message);
        return null;
    }
}

// --- Main Export ---

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
        // 1. Get yt-dlp executor (downloads binary on first call in production)
        const { command, baseArgs } = await getYtDlpExecutor();

        // 2. Determine format based on ffmpeg availability
        const hasFfmpeg = await isFfmpegAvailable();
        const formatString = hasFfmpeg
            ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            : 'best[ext=mp4]/best';
        console.log(`[Downloader] Ffmpeg: ${hasFfmpeg}. Format: ${formatString}`);

        // 3. Build args
        const dlArgs = [
            ...baseArgs,
            '-f', formatString,
            '-o', tempFilePath,
            '--no-warnings',
            '--print-json',
            url
        ];

        if (hasFfmpeg) {
            // Insert merge format after baseArgs
            const insertIdx = baseArgs.length;
            dlArgs.splice(insertIdx, 0, '--merge-output-format', 'mp4');
        }

        // 3b. Inject cookies if available for this platform
        let cookieFilePath: string | null = null;
        const platform = detectPlatform(url);
        if (platform) {
            cookieFilePath = await getCookieFile(platform);
            if (cookieFilePath) {
                // Insert --cookies before the URL (last arg)
                dlArgs.splice(dlArgs.length - 1, 0, '--cookies', cookieFilePath);
                console.log(`[Downloader] Using ${platform} cookies`);
            }
        }

        // 4. Execute
        console.log(`[Downloader] Executing: ${command} ${dlArgs.join(' ')}`);
        let stdout: string;
        try {
            stdout = await runCommand(command, dlArgs);
        } finally {
            // Clean up cookie temp file
            if (cookieFilePath && fs.existsSync(cookieFilePath)) {
                fs.unlinkSync(cookieFilePath);
            }
        }
        console.log('[Downloader] Download command completed.');

        // 5. Parse metadata
        let info: any = {};
        try {
            info = JSON.parse(stdout);
            console.log('[Downloader] Metadata parsed successfully.');
        } catch (e) {
            console.error('[Downloader] Could not parse JSON metadata.');
            console.warn('[Downloader] Using defaults.');
        }

        const title = info.title || 'Downloaded Video';
        const description = info.description || `Imported from ${url}`;
        const uploader = info.uploader || 'Unknown';
        const tags = info.tags || [];
        const duration = info.duration || 0;
        const width = info.width || 0;
        const height = info.height || 0;

        console.log(`[Downloader] Metadata - Title: ${title}, Uploader: ${uploader}`);

        // 6. Verify file exists
        if (!fs.existsSync(tempFilePath)) {
            console.error(`[Downloader] File not found at: ${tempFilePath}`);
            try {
                const files = fs.readdirSync(tempDir);
                const matchingFiles = files.filter(f => f.includes(uniqueId));
                console.error(`[Downloader] Matching files in temp dir:`, matchingFiles);
            } catch (err) {
                console.error('[Downloader] Failed to list temp dir:', err);
            }
            throw new Error('Downloaded file not found at expected path.');
        }

        const stats = fs.statSync(tempFilePath);
        console.log(`[Downloader] File size: ${stats.size} bytes.`);

        // 7. Upload to Firebase Storage
        const storage = getFirebaseStorage();
        const bucket = storage.bucket();
        const destination = `videos/${uniqueId}.mp4`;

        console.log(`[Downloader] Uploading to ${destination}...`);
        await bucket.upload(tempFilePath, {
            destination,
            metadata: {
                contentType: 'video/mp4',
                metadata: { originalUrl: url, uploader, title }
            }
        });

        console.log('[Downloader] Upload complete. Generating signed URL...');
        const [signedUrl] = await bucket.file(destination).getSignedUrl({
            action: 'read',
            expires: '03-01-2500'
        });

        // 8. Build video data
        const videoData = {
            title: title || 'Untitled',
            description: description || '',
            videoUrl: signedUrl,
            thumbnailUrl: info.thumbnail || '',
            tags,
            type: 'social',
            originalUrl: url,
            createdAt: new Date(),
            updatedAt: new Date(),
            uploader,
            duration,
            width,
            height,
            status: 'draft',
            folderId: null
        };

        if (info.thumbnail) {
            console.log(`[Downloader] Thumbnail: ${info.thumbnail}`);
        } else {
            console.warn('[Downloader] No thumbnail in metadata.');
        }

        // 9. Save to Firestore
        let videoId = null;
        if (saveToFirestore) {
            const db = getFirestore();
            const docRef = await db.collection('videos').add(videoData);
            videoId = docRef.id;
            console.log(`[Downloader] Saved to Firestore: ${videoId}`);
        }

        // 10. Cleanup
        fs.unlinkSync(tempFilePath);
        console.log('[Downloader] Temp file cleaned up.');

        return {
            success: true,
            videoId,
            video: { id: videoId, ...videoData }
        };

    } catch (error: any) {
        console.error('[Downloader] Fatal Error:', error);
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        return { success: false, error: error.message };
    }
}
