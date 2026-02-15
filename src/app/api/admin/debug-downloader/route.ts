import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

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
        python: {
            available: false,
            version: 'unknown',
            error: null
        },
        env: {
            PATH: process.env.PATH,
            NODE_ENV: process.env.NODE_ENV,
            PYTHON_PATH: process.env.PYTHON_PATH || '(not set)'
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

    // Check Python
    const pythonCmd = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
    try {
        const pyVersion = await new Promise<string>((resolve, reject) => {
            exec(`${pythonCmd} --version`, (error, stdout) => {
                if (error) reject(error);
                else resolve(stdout.trim());
            });
        });
        debugInfo.python.available = true;
        debugInfo.python.version = pyVersion;
    } catch (e: any) {
        debugInfo.python.error = e.message;
    }

    // Check yt-dlp via Python module
    try {
        const ytdlpVersion = await new Promise<string>((resolve, reject) => {
            exec(`${pythonCmd} -m yt_dlp --version`, (error, stdout) => {
                if (error) reject(error);
                else resolve(stdout.trim());
            });
        });
        debugInfo.ytDlp.version = ytdlpVersion;
    } catch (e: any) {
        debugInfo.ytDlp.error = e.message;
    }

    return NextResponse.json(debugInfo);
}
