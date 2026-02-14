
import { spawn } from 'child_process';

const pythonPath = String.raw`C:\Users\micha\AppData\Local\Programs\Python\Python314\python.exe`;

const child = spawn(pythonPath, ['-m', 'yt_dlp', '--version'], { shell: true });

child.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
});

child.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
});

child.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});

child.on('error', (err) => {
    console.error('Failed to start subprocess.', err);
});
