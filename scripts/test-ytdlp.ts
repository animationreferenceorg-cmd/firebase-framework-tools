
import { spawn } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

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
            // Log real-time stderr to see what's happening
            console.error(`[Test:STDERR] ${data.toString().trim()}`);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                console.error(`[Test] Command failed with code ${code}. Stderr: ${stderr}`);
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
                if (stderr) {
                    console.warn(`[Test] Command succeeded with warnings: ${stderr}`);
                }
                resolve(stdout);
            }
        });
    });
}

async function testDownload() {
    // A safe, small video to test (Shorts often work for testing social import)
    const url = 'https://www.youtube.com/watch?v=BaW_jenozKc';
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `test-video-${Date.now()}.mp4`);

    console.log(`[Test] Starting download for: ${url}`);
    console.log(`[Test] Temp file: ${tempFilePath}`);

    try {
        const args = [
            'yt-dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '-o', tempFilePath,
            '--no-warnings',
            '--print-json',
            url
        ];

        const pythonPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;

        let stdout = '';
        try {
            console.log('[Test] Using Python module execution with absolute path...');
            const pyArgs = ['-m', 'yt_dlp', ...args.slice(1)];
            stdout = await runCommand(pythonPath, pyArgs);
            console.log('[Test] Command execution successful.');
        } catch (e: any) {
            console.error('[Test] Python module execution failed:', e);
            throw new Error(`Failed to execute yt-dlp: ${e.message}`);
        }

        // Parse Metadata
        let info: any = {};
        try {
            info = JSON.parse(stdout);
            console.log('[Test] Metadata parsed successfully.');
        } catch (e) {
            console.error('[Test] Could not parse JSON metadata. Raw stdout:', stdout);
        }

        const title = info.title || 'Downloaded Video';
        console.log(`[Test] Title: ${title}`);
        console.log(`[Test] Thumbnail: ${info.thumbnail}`);

        if (fs.existsSync(tempFilePath)) {
            console.log(`[Test] File exists at ${tempFilePath}`);
            const stats = fs.statSync(tempFilePath);
            console.log(`[Test] File size: ${stats.size} bytes`);

            // Check if file is actually a valid video file (basic check)
            if (stats.size > 1000) {
                console.log('[Test] File size looks reasonable.');
            } else {
                console.warn('[Test] File size is suspiciously small.');
            }

            // Cleanup
            fs.unlinkSync(tempFilePath);
            console.log('[Test] Cleaned up temp file.');
        } else {
            console.error('[Test] File was NOT created.');
        }

    } catch (error: any) {
        console.error('[Test] Fatal Error:', error);
    }
}

testDownload();
