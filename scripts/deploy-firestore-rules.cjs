// Deploys firestore.rules using the service account via the Firebase Rules API
// (no firebase-tools login needed). Run with: node scripts/deploy-firestore-rules.cjs
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

(async () => {
    const { GoogleAuth } = require('google-auth-library');
    const project = process.env.FIREBASE_PROJECT_ID;
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

    const source = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

    // 1. Create a ruleset
    let res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${project}/rulesets`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: source }] } }),
    });
    let data = await res.json();
    if (!res.ok) { console.error('Ruleset creation failed:', JSON.stringify(data).slice(0, 500)); process.exit(1); }
    const rulesetName = data.name;
    console.log('Created ruleset:', rulesetName);

    // 2. Point the cloud.firestore release at it
    const releaseName = `projects/${project}/releases/cloud.firestore`;
    res = await fetch(`https://firebaserules.googleapis.com/v1/${releaseName}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ release: { name: releaseName, rulesetName } }),
    });
    data = await res.json();
    if (!res.ok) { console.error('Release update failed:', JSON.stringify(data).slice(0, 500)); process.exit(1); }
    console.log('✅ Firestore rules deployed:', data.name || releaseName);
    process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
