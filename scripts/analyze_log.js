
const fs = require('fs');
const path = require('path');

const logPath = path.join(process.cwd(), 'reproduction_output.txt');
try {
    const content = fs.readFileSync(logPath, 'utf8');
    console.log('Read content length:', content.length);
    const lines = content.split('\n');
    lines.forEach(line => {
        if (line.includes('Info filename') || line.includes('Raw stdout start') || line.includes('Files in temp dir') || line.includes('Temp file does not exist')) {
            console.log(line.trim());
        }
    });
} catch (e) {
    console.error('Failed to read log:', e);
}
