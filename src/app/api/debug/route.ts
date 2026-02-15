import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import os from 'os';

// Helper to run shell commands
function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
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
                resolve(`Error (Code ${code}): ${stderr}`);
            } else {
                resolve(stdout.trim());
            }
        });

        process.on('error', (err) => {
            resolve(`Execution error: ${err.message}`);
        });
    });
}

export async function GET() {
    const diagnostics: any = {
        timestamp: new Date().toISOString(),
        os: {
            platform: os.platform(),
            release: os.release(),
            tmpdir: os.tmpdir(),
        },
        env: {
            pythonPath: process.env.PYTHON_PATH || 'Not Set',
            nodeEnv: process.env.NODE_ENV,
        }
    };

    try {
        // 1. Check Python
        // Try reliable paths or system python
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        diagnostics.pythonVersion = await runCommand(pythonCmd, ['--version']);

        // 2. Check yt-dlp
        // Try module execution first as it's most reliable
        diagnostics.ytDlpVersion = await runCommand(pythonCmd, ['-m', 'yt_dlp', '--version']);

        // 3. DNS Check (using node)
        try {
            const dns = require('dns').promises;
            const googleIp = await dns.lookup('google.com');
            diagnostics.dns = {
                google: googleIp,
            };
            try {
                const instaIp = await dns.lookup('instagram.com');
                diagnostics.dns.instagram = instaIp;
            } catch (e: any) {
                diagnostics.dns.instagram = `Failed: ${e.message}`;
            }
        } catch (e: any) {
            diagnostics.dns = `Failed: ${e.message}`;
        }

    } catch (error: any) {
        diagnostics.error = error.message;
    }

    return NextResponse.json(diagnostics);
}
