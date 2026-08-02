/**
 * CLI Helper to trigger social media posts directly from prompt / terminal
 * Usage:
 *   node scripts/post-social.cjs --videoId <id> [--platforms instagram,twitter,linkedin]
 *   node scripts/post-social.cjs --bot
 *   node scripts/post-social.cjs --list
 */

require('dotenv').config({ path: '.env.local' });
const http = require('http');
const https = require('https');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path, options = {}, bodyData = null) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const botMode = args.includes('--bot');
  const listMode = args.includes('--list');
  const videoIdIndex = args.indexOf('--videoId');
  const videoId = videoIdIndex !== -1 ? args[videoIdIndex + 1] : null;

  const platformsIndex = args.indexOf('--platforms');
  const platformsRaw = platformsIndex !== -1 ? args[platformsIndex + 1] : 'instagram,twitter,linkedin';
  const platforms = platformsRaw.split(',').map((p) => p.trim());

  if (listMode) {
    console.log('Fetching platform connection status...');
    try {
      const res = await makeRequest('/api/social/status', { method: 'GET' });
      console.log('\n--- Platform API Status ---');
      console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Make sure your local dev server (npm run dev) is running at', BASE_URL);
    }
    return;
  }

  if (botMode) {
    console.log('🤖 Triggering Daily Automated Social Post Bot...');
    try {
      const res = await makeRequest('/api/social/cron', { method: 'POST' });
      console.log('\n--- Result ---');
      console.log(JSON.stringify(res.data, null, 2));
    } catch (e) {
      console.error('Error connecting to local server:', e.message);
      console.error('Make sure your local dev server (npm run dev) is running on port', PORT);
    }
    return;
  }

  if (!videoId) {
    console.log('Usage:');
    console.log('  node scripts/post-social.cjs --videoId <id> [--platforms instagram,twitter,linkedin]');
    console.log('  node scripts/post-social.cjs --bot');
    console.log('  node scripts/post-social.cjs --list');
    return;
  }

  console.log(`🚀 Dispatching Post for Video ID: ${videoId} to [${platforms.join(', ')}]...`);

  try {
    const res = await makeRequest('/api/social/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      videoId,
      platforms,
    });

    console.log('\n--- Result ---');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('Error connecting to local server:', e.message);
    console.error('Make sure your local dev server (npm run dev) is running on port', PORT);
  }
}

main();
