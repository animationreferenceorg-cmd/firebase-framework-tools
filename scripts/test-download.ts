import { spawn } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

async function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log(`Running: ${command} ${args.join(' ')}`);
        const process = spawn(command, args, { shell: true });
        let stdout = '';
        let stderr = '';

        const logStream = fs.createWriteStream('download.log', { flags: 'a' });

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
            logStream.write(`[stderr] ${data}`);
        });

        process.on('close', (code) => {
            logStream.end();
            if (code !== 0) {
                console.error(`Command failed with code ${code}`);
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            } else {
                resolve(stdout);
            }
        });
    });
}

async function testDownload() {
    const url = 'https://www.instagram.com/p/DSEtLEyl9EB/';
    const tempDir = os.tmpdir();
    const uniqueId = uuidv4();
    // Intentionally matching the app's logic exactly
    const tempFilePath = path.join(tempDir, `${uniqueId}.mp4`);

    console.log(`Temp output path: ${tempFilePath}`);

    const args = [
        'yt-dlp',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-o', tempFilePath,
        '--no-warnings',
        '--print-json',
        url
    ];

    try {
        await runCommand('yt-dlp', args.slice(1));

        console.log('Download command finished.');

        if (fs.existsSync(tempFilePath)) {
            console.log('SUCCESS: File exists at expected path.');
            const stats = fs.statSync(tempFilePath);
            console.log(`Size: ${stats.size} bytes`);

            // Cleanup
            fs.unlinkSync(tempFilePath);
        } else {
            console.error('FAILURE: File NOT found at expected path.');

            // Debug: List files in temp that might match
            console.log('Checking for similar files in temp dir...');
            const files = fs.readdirSync(tempDir);
            const matches = files.filter(f => f.includes(uniqueId));
            if (matches.length > 0) {
                console.log('Found these matches instead:', matches);
            } else {
                console.log('No matches found via UUID.');
            }
        }

    } catch (e) {
        console.error('Test failed with error:', e);
    }
}

testDownload();
