// Deploys storage.rules using the service account via the Firebase Rules API
// (no firebase-tools login needed). Run with: node scripts/deploy-storage-rules.cjs
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

(async () => {
    const { GoogleAuth } = require('google-auth-library');
    const project = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
    const bucket = process.env.FIREBASE_STORAGE_BUCKET || 'aniamtion-reference.firebasestorage.app';

    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
        console.error('FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must be set in .env.local');
        process.exit(1);
    }

    const auth = new GoogleAuth({
        credentials: {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
    });
    const client = await auth.getClient();
    const { token } = await client.getAccessToken();
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const source = fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8');

    // 1. Create a ruleset
    console.log('Uploading storage rules to projects/' + project + '...');
    let res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source: { files: [{ name: 'storage.rules', content: source }] } }),
    });
    let data = await res.json();
    if (!res.ok) { 
        console.error('Ruleset creation failed:', JSON.stringify(data).slice(0, 500)); 
        process.exit(1); 
    }
    const rulesetName = data.name;
    console.log('Created ruleset:', rulesetName);

    // 2. Point the firebase.storage release at it
    const releaseName = `projects/${project}/releases/firebase.storage/${bucket}`;
    res = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ release: { name: releaseName, rulesetName } }),
    });
    data = await res.json();
    if (!res.ok) { 
        console.error('Release update failed:', JSON.stringify(data).slice(0, 500)); 
        process.exit(1); 
    }
    console.log('✅ Storage rules deployed:', data.name || releaseName);
    process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
