import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Mock Firebase for script
const getFirebaseStorage = () => ({
    bucket: () => ({
        upload: async () => console.log('Mock Upload'),
        file: () => ({
            getSignedUrl: async () => ['mock_signed_url']
        })
    })
});

const getFirestore = () => ({
    collection: () => ({
        add: async () => ({ id: 'mock_doc_id' })
    })
});

// Helper to run shell commands
function runCommand(command: string, args: string[], options: any = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const finalOptions = { shell: true, ...options };
        const logFile = path.join(process.cwd(), 'reproduction_output.txt');
        fs.appendFileSync(logFile, `[Reproduce] Spawning: ${command} ${args.join(' ')}\n`);

        const process = spawn(command, args, finalOptions);
        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
            fs.appendFileSync(logFile, `[STDOUT] ${data}`);
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
            fs.appendFileSync(logFile, `[STDERR] ${data}`);
        });

        process.on('close', (code) => {
            fs.appendFileSync(logFile, `[Reproduce] Exit Code: ${code}\n`);
            if (code !== 0) {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
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

async function downloadSocialVideo(url: string) {
    const logFile = path.join(process.cwd(), 'reproduction_output.txt');
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync(logFile, `${msg}\n`);
    };

    if (!isValidUrl(url)) {
        log(`[Reproduce] Invalid or blocked URL: ${url}`);
        return { success: false, error: "Invalid URL" };
    }

    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    const tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);
    log(`[Reproduce] Starting download for: ${url}`);
    log(`[Reproduce] Temp file: ${tempFilePath}`);

    try {
        const args = [
            'yt-dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '-o', tempFilePath,
            '--no-warnings',
            '--print-json',
            url
        ];

        const pythonPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;

        let stdout = '';
        try {
            log('[Reproduce] Executing yt-dlp via Python module...');
            const pyArgs = ['-m', 'yt_dlp', ...args.slice(1)];
            stdout = await runCommand(pythonPath, pyArgs);
            log('[Reproduce] Command execution successful.');
        } catch (e: any) {
            log(`[Reproduce] Python module execution failed: ${e.message}`);
            throw new Error(`Failed to execute yt-dlp: ${e.message}`);
        }

        // Parse Metadata
        let info: any = {};
        try {
            info = JSON.parse(stdout);
            log('[Reproduce] Metadata parsed successfully.');
        } catch (e) {
            log(`[Reproduce] Could not parse JSON metadata.`);
        }

        const title = info.title || 'Downloaded Video';
        log(`[Reproduce] Title: ${title}`);

        if (!fs.existsSync(tempFilePath)) {
            log(`[Reproduce] File not found at expected path: ${tempFilePath}`);

            // Debug: Check if any file with the ID exists
            try {
                const files = fs.readdirSync(tempDir);
                const matchingFiles = files.filter(f => f.includes(uniqueId));
                log(`[Reproduce] Found matching files in temp dir: ${JSON.stringify(matchingFiles)}`);
            } catch (err) {
                log(`[Reproduce] Failed to list temp dir: ${err}`);
            }

            throw new Error('Downloaded file not found.');
        } else {
            log('[Reproduce] SUCCESS: File found!');
            const stats = fs.statSync(tempFilePath);
            log(`[Reproduce] File size: ${stats.size} bytes`);

            // Cleanup
            fs.unlinkSync(tempFilePath);
        }

    } catch (error: any) {
        log(`[Reproduce] Fatal Error: ${error.message}`);
    }
}

// Run with a sample URL
const url = process.argv[2] || 'https://www.youtube.com/watch?v=jNQXAC9IVRw'; // Me at the zoo
// Clear log file first
fs.writeFileSync(path.join(process.cwd(), 'reproduction_output.txt'), '');
downloadSocialVideo(url);
