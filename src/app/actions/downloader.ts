'use server';

import { getFirestore, getFirebaseStorage } from '@/lib/firebase-admin';
import { spawn, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import https from 'https';
import { bunnyMp4Url, bunnyStreamConfig, waitForBunnyVideo } from '@/lib/bunny-stream';

// --- Helpers ---

/**
 * Public download URL for an object in a Cloud Storage bucket.
 *
 * Preferred over getSignedUrl for reference clips: a signature is only valid
 * while the service account that produced it still holds the signing key, so
 * "permanent" signed URLs break the moment that key is rotated or the account
 * is deleted. A public object has no such dependency.
 */
export function publicStorageUrl(bucketName: string, objectPath: string): string {
    const encoded = objectPath.split('/').map(encodeURIComponent).join('/');
    return `https://storage.googleapis.com/${bucketName}/${encoded}`;
}

function runCommand(command: string, args: string[], options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        // Arguments include user-supplied source URLs; never pass them through a shell.
        const finalOptions = { shell: false, ...options };
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
 * Downloads a file from a URL using curl, to bypass bot protection blocks.
 */
function downloadFileWithCurl(url: string, dest: string, referer?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
        const args = ['--fail-with-body', '-s', '-L', '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'];
        if (referer) args.push('-e', referer);
        args.push('-o', dest, url);
        const proc = spawn(curlCmd, args, { shell: false });
        
        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`curl download failed with code ${code}`));
            } else {
                resolve();
            }
        });
    });
}

/**
 * Fetches JSON from a URL using curl, to bypass bot protection blocks.
 */
function fetchJsonWithCurl(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
        const args = ['-s', '-L', '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', url];
        const proc = spawn(curlCmd, args, { shell: false });
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });
        
        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`curl failed with code ${code}: ${stderr}`));
            } else {
                try {
                    resolve(JSON.parse(stdout));
                } catch (e: any) {
                    reject(new Error(`Failed to parse json: ${e.message}. Output was: ${stdout.substring(0, 200)}`));
                }
            }
        });
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
        const pythonPath = process.env.PYTHON_PATH;
        const localDevPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;

        // Verify the module, not just Python itself. A Python installation
        // without yt-dlp was causing every extension capture to fail.
        const pythonCandidates = [pythonPath, fs.existsSync(localDevPath) ? localDevPath : null, 'python']
            .filter((candidate, index, items): candidate is string => Boolean(candidate) && items.indexOf(candidate) === index);
        for (const candidate of pythonCandidates) {
            try {
                await runCommand(candidate, ['-m', 'yt_dlp', '--version']);
                console.log(`[Downloader] Windows mode: using yt-dlp from ${candidate}`);
                return { command: candidate, baseArgs: ['-m', 'yt_dlp'] };
            } catch {
                console.warn(`[Downloader] yt-dlp is not available through ${candidate}; trying another option.`);
            }
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
        if (hostname.includes('sakugabooru.com')) return 'sakugabooru';
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

export async function downloadSocialVideo(
    url: string,
    saveToFirestore: boolean = true,
    capturedMediaUrl?: string,
    onProgress?: (value: number, stage: string) => void | Promise<void>,
) {
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
        const platform = detectPlatform(url);
        await onProgress?.(15, 'Downloading source video');

        if (platform === 'sakugabooru') {
            try {
                console.log('[Downloader] Detected Sakugabooru URL. Processing directly...');
                let postId: string | null = null;
                const showMatch = url.match(/post\/show\/(\d+)/);
                if (showMatch) {
                    postId = showMatch[1];
                } else {
                    const tagsMatch = url.match(/tags=id:(\d+)/);
                    if (tagsMatch) {
                        postId = tagsMatch[1];
                    }
                }

                if (!postId && (url.endsWith('.mp4') || url.endsWith('.webm'))) {
                    const basename = path.basename(url, path.extname(url));
                    postId = `file-${basename}`;
                }

                if (!postId) {
                    return { success: false, error: "Could not parse Sakugabooru post ID from the provided URL." };
                }

                const apiUrl = `https://www.sakugabooru.com/post.json?tags=id:${postId}`;
                console.log(`[Downloader] Fetching Sakugabooru API via curl: ${apiUrl}`);

                const postsList = await fetchJsonWithCurl(apiUrl);
                if (!postsList || postsList.length === 0) {
                    return { success: false, error: `Sakugabooru post #${postId} not found via API.` };
                }

                const postInfo = postsList[0];
                const videoFileUrl = postInfo.file_url;
                if (!videoFileUrl) {
                    return { success: false, error: "Sakugabooru post does not contain a valid direct video link." };
                }

                console.log(`[Downloader] Downloading Sakugabooru video from: ${videoFileUrl}`);
                await downloadFileWithCurl(videoFileUrl, tempFilePath);

                if (!fs.existsSync(tempFilePath)) {
                    throw new Error('Downloaded file not found at expected path.');
                }

                const stats = fs.statSync(tempFilePath);
                console.log(`[Downloader] Downloaded file size: ${stats.size} bytes.`);

                const apiKey = process.env.BUNNY_API_KEY;
                const libraryId = process.env.BUNNY_LIBRARY_ID || process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID;
                const bunnyHost = process.env.NEXT_PUBLIC_BUNNY_STREAM_HOST || 'vz-79893c7f-720.b-cdn.net';

                let videoUrl = '';
                let thumbnailUrl = postInfo.preview_url || '';
                let externalBunnyId: string | null = null;

                if (apiKey && libraryId) {
                    console.log(`[Downloader] Uploading to Bunny Stream library ${libraryId}...`);
                    const createRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
                        method: 'POST',
                        headers: {
                            'AccessKey': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ title: postInfo.source || `Sakugabooru Post #${postInfo.id}` })
                    });
                    if (!createRes.ok) {
                        throw new Error(`Failed to create video on Bunny Stream: ${createRes.statusText}`);
                    }
                    const createData = await createRes.json() as any;
                    const guid = createData.guid;

                    const fileBuffer = fs.readFileSync(tempFilePath);
                    const uploadRes = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${guid}`, {
                        method: 'PUT',
                        headers: {
                            'AccessKey': apiKey,
                            'Content-Type': 'application/octet-stream'
                        },
                        body: fileBuffer
                    });
                    if (!uploadRes.ok) {
                        throw new Error(`Failed to upload binary to Bunny Stream: ${uploadRes.statusText}`);
                    }

                    videoUrl = `https://${bunnyHost}/${guid}/playlist.m3u8`;
                    thumbnailUrl = `https://${bunnyHost}/${guid}/thumbnail.jpg`;
                    externalBunnyId = guid;
                } else {
                    console.log('[Downloader] Bunny credentials not configured. Falling back to Firebase Storage.');
                    const storage = getFirebaseStorage();
                    const bucket = storage.bucket();
                    const destination = `videos/sakugabooru-${postInfo.id}.mp4`;

                    console.log(`[Downloader] Uploading to ${destination}...`);
                    await bucket.upload(tempFilePath, {
                        destination,
                        metadata: {
                            contentType: 'video/mp4',
                            metadata: {
                                originalUrl: url,
                                uploader: postInfo.author || 'Unknown',
                                title: postInfo.source || `Sakugabooru Post #${postInfo.id}`
                            }
                        }
                    });

                    // Reference clips are public, so serve them from a plain
                    // public URL. The previous approach signed a URL expiring in
                    // 2500, which looked permanent but silently died the moment
                    // its signing service-account key was rotated or removed.
                    console.log('[Downloader] Upload complete. Publishing object...');
                    await bucket.file(destination).makePublic();
                    videoUrl = publicStorageUrl(bucket.name, destination);
                }

                const mappedTags = (postInfo.tags || '')
                    .split(' ')
                    .map((t: string) => t.trim().toLowerCase().replace(/_/g, '-'))
                    .filter(Boolean);

                let description = `Source: ${postInfo.source || 'Unknown'}`;
                description += `\nOriginal Sakugabooru post: https://www.sakugabooru.com/post/show/${postInfo.id}`;
                description += `\nRating: ${postInfo.rating}, Score: ${postInfo.score}`;

                const videoData = {
                    title: postInfo.source || `Sakugabooru Post #${postInfo.id}`,
                    description,
                    videoUrl,
                    thumbnailUrl,
                    posterUrl: thumbnailUrl,
                    tags: mappedTags,
                    type: 'social',
                    originalUrl: url,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    uploader: postInfo.author || 'Unknown',
                    duration: 0,
                    width: postInfo.width || 0,
                    height: postInfo.height || 0,
                    status: 'published' as const,
                    folderId: null,
                    ...(externalBunnyId ? { externalBunnyId } : {})
                };

                let videoId = `sakugabooru-${postInfo.id}`;
                if (saveToFirestore) {
                    const db = getFirestore();
                    await db.collection('videos').doc(videoId).set(videoData, { merge: true });

                    const batch = db.batch();
                    for (const tag of mappedTags) {
                        if (tag && !tag.includes('/') && tag !== '.' && tag !== '..') {
                            batch.set(db.collection('tags').doc(tag), { name: tag }, { merge: true });
                        }
                    }
                    await batch.commit();
                    console.log(`[Downloader] Saved to Firestore: ${videoId}`);
                }

                fs.unlinkSync(tempFilePath);
                console.log('[Downloader] Temp file cleaned up.');

                return {
                    success: true,
                    videoId,
                    video: { id: videoId, ...videoData }
                };

            } catch (error: any) {
                console.error('[Downloader] Sakugabooru Direct Fetch Error:', error);
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                return { success: false, error: error.message };
            }
        }

        let info: any = {};
        if (capturedMediaUrl) {
            // For signed-in social pages, the extension can see the exact CDN
            // video URL. This is the closest match to Pinterest's capture flow
            // and avoids re-scraping Instagram from a logged-out server.
            console.log('[Downloader] Downloading the media URL captured by the extension.');
            await downloadFileWithCurl(capturedMediaUrl, tempFilePath, url);
        } else {
            const { command, baseArgs } = await getYtDlpExecutor();
            const hasFfmpeg = await isFfmpegAvailable();
            const formatString = hasFfmpeg
                ? 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
                : 'best[ext=mp4]/best';
            const dlArgs = [...baseArgs, '-f', formatString, '-o', tempFilePath, '--no-warnings', '--print-json', url];
            if (hasFfmpeg) dlArgs.splice(baseArgs.length, 0, '--merge-output-format', 'mp4');

            let cookieFilePath: string | null = null;
            if (platform) {
                cookieFilePath = await getCookieFile(platform);
                if (cookieFilePath) dlArgs.splice(dlArgs.length - 1, 0, '--cookies', cookieFilePath);
            }
            let stdout: string;
            try {
                stdout = await runCommand(command, dlArgs);
            } finally {
                if (cookieFilePath && fs.existsSync(cookieFilePath)) fs.unlinkSync(cookieFilePath);
            }
            try {
                info = JSON.parse(stdout);
            } catch {
                console.warn('[Downloader] Could not parse download metadata; using extension details.');
            }
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
        const header = Buffer.alloc(16);
        const descriptor = fs.openSync(tempFilePath, 'r');
        fs.readSync(descriptor, header, 0, header.length, 0);
        fs.closeSync(descriptor);
        const isMp4 = header.toString('ascii', 4, 8) === 'ftyp';
        const isWebM = header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
        if (stats.size < 1024 || (!isMp4 && !isWebM)) {
            throw new Error('The source returned a webpage or error response instead of a playable video.');
        }
        await onProgress?.(48, 'Preparing upload');

        // 7. Copy the bytes into storage controlled by Animation Reference.
        // Bunny is preferred for streaming, with Firebase as the fallback.
        const { apiKey: bunnyApiKey, libraryId: bunnyLibraryId, host: bunnyHost } = bunnyStreamConfig();
        let storedVideoUrl = '';
        let storedThumbnailUrl = info.thumbnail || '';
        let storagePath = '';
        let externalBunnyId: string | null = null;

        if (bunnyApiKey && bunnyLibraryId) {
            await onProgress?.(55, 'Uploading video');
            const createRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos`, {
                method: 'POST',
                headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title || `Reference ${uniqueId}` }),
            });
            if (!createRes.ok) throw new Error(`Could not create the Bunny Stream video (${createRes.status}).`);
            const created = await createRes.json() as { guid?: string };
            if (!created.guid) throw new Error('Bunny Stream did not return a video id.');
            externalBunnyId = created.guid;

            const uploadRes = await fetch(`https://video.bunnycdn.com/library/${bunnyLibraryId}/videos/${externalBunnyId}`, {
                method: 'PUT',
                headers: { AccessKey: bunnyApiKey, 'Content-Type': 'application/octet-stream' },
                body: fs.readFileSync(tempFilePath),
            });
            if (!uploadRes.ok) throw new Error(`Could not upload the video to Bunny Stream (${uploadRes.status}).`);

            await onProgress?.(76, 'Processing playback');
            const encoded = await waitForBunnyVideo(externalBunnyId);
            storedVideoUrl = bunnyMp4Url(externalBunnyId, encoded.availableResolutions);
            storedThumbnailUrl = `https://${bunnyHost}/${externalBunnyId}/thumbnail.jpg`;
            storagePath = `bunny/${bunnyLibraryId}/${externalBunnyId}`;
            await onProgress?.(94, 'Finalizing reference');
        } else {
            const storage = getFirebaseStorage();
            const bucket = storage.bucket();
            storagePath = `reference-imports/${uniqueId}.mp4`;
            console.log(`[Downloader] Uploading to ${storagePath}...`);
            await bucket.upload(tempFilePath, {
                destination: storagePath,
                metadata: {
                    contentType: 'video/mp4',
                    metadata: { originalUrl: url, uploader, title }
                }
            });
            await bucket.file(storagePath).makePublic();
            storedVideoUrl = publicStorageUrl(bucket.name, storagePath);
            await onProgress?.(94, 'Finalizing reference');
        }

        // 8. Build video data
        const videoData = {
            title: title || 'Untitled',
            description: description || '',
            videoUrl: storedVideoUrl,
            thumbnailUrl: storedThumbnailUrl,
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
            folderId: null,
            storagePath,
            externalBunnyId,
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
