import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import ytDlp from 'yt-dlp-exec';

export async function GET() {
    const debugInfo: any = {
        timestamp: new Date().toISOString(),
        platform: os.platform(),
        tmpDir: os.tmpdir(),
        tmpDirWritable: false,
        ffmpeg: {
            available: false,
            version: 'unknown'
        },
        ytDlp: {
            version: 'unknown',
            error: null
        },
        env: {
            PATH: process.env.PATH,
            NODE_ENV: process.env.NODE_ENV
        }
    };

    // Check Temp Dir Writability
    try {
        const testFile = path.join(os.tmpdir(), `test-write-${Date.now()}.txt`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        debugInfo.tmpDirWritable = true;
    } catch (e: any) {
        debugInfo.tmpDirWritable = false;
        debugInfo.tmpDirError = e.message;
    }

    // Check ffmpeg
    try {
        await new Promise((resolve, reject) => {
            exec('ffmpeg -version', (error, stdout) => {
                if (error) {
                    reject(error);
                } else {
                    debugInfo.ffmpeg.available = true;
                    debugInfo.ffmpeg.version = stdout.split('\n')[0];
                    resolve(true);
                }
            });
        });
    } catch (e: any) {
        debugInfo.ffmpeg.error = e.message;
    }

    // Check yt-dlp
    try {
        // Run version check
        const output = await ytDlp('--version');
        debugInfo.ytDlp.version = typeof output === 'string' ? output.trim() : JSON.stringify(output);
    } catch (e: any) {
        debugInfo.ytDlp.error = e.message || JSON.stringify(e);
    }

    return NextResponse.json(debugInfo);
}
