const admin = require('firebase-admin');
const { Resend } = require('resend');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const projectId = process.env.FIREBASE_PROJECT_ID || 'aniamtion-reference';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
const privateKey = rawKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');

if (clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
} else {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
}

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('RESEND_API_KEY missing!');
  process.exit(1);
}
const resend = new Resend(resendApiKey);

// Import the HTML renderer
const { renderOneDollarPromoHtml } = require('../src/lib/email-template-promo.ts');

const SENT_RECORDS_FILE = 'campaign_sent_recipients.json';

async function main() {
  console.log('--- GLOBAL 6:00 AM STAGGERED EMAIL BROADCAST ---');
  console.log('Sender: Animation Reference <team@animationreference.org>');
  console.log('Subject: Your Animation Reference Pro pass is ready');

  // Load already sent set
  const alreadySent = new Set();
  if (fs.existsSync(SENT_RECORDS_FILE)) {
    try {
      const saved = JSON.parse(fs.readFileSync(SENT_RECORDS_FILE, 'utf8'));
      if (Array.isArray(saved.sentEmails)) {
        saved.sentEmails.forEach(e => alreadySent.add(e.toLowerCase()));
      }
    } catch (e) {}
  }
  console.log(`Loaded ${alreadySent.size} previously sent recipients (skipping to avoid duplicates).`);

  const auth = admin.auth();
  const db = admin.firestore();

  // 1. Gather all Pro UIDs
  const proUids = new Set();
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.isPremium || d.isPro || d.plan?.startsWith('pro') || d.tier?.startsWith('pro')) {
      proUids.add(doc.id);
    }
  });

  // 2. Fetch all Free tier accounts
  const freeUsers = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (!u.email) continue;
      if (proUids.has(u.uid)) continue;
      if (alreadySent.has(u.email.toLowerCase())) continue; // Skip already delivered
      freeUsers.push({
        uid: u.uid,
        email: u.email,
        name: u.displayName || 'Animator',
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`Remaining Unsent Free Audience: ${freeUsers.length} Animators`);
  if (freeUsers.length === 0) {
    console.log('All free accounts have already received this campaign!');
    return;
  }

  // 3. Define 6:00 AM Local Time Global Waves
  const now = Date.now();
  const waveSchedules = [
    { name: 'Wave 1 (Europe Morning - Immediate)', scheduledAt: undefined },
    { name: 'Wave 2 (US East Morning ~6:30 AM EDT)', scheduledAt: new Date(now + 3 * 3600 * 1000).toISOString() },
    { name: 'Wave 3 (US West Morning ~6:30 AM PDT)', scheduledAt: new Date(now + 6 * 3600 * 1000).toISOString() },
    { name: 'Wave 4 (Asia / Pacific Sunday Morning)', scheduledAt: new Date(now + 14 * 3600 * 1000).toISOString() },
  ];

  // Assign remaining recipients to wave buckets
  const waveBuckets = [[], [], [], []];
  freeUsers.forEach((user, idx) => {
    waveBuckets[idx % 4].push(user);
  });

  console.log('\nScheduling Plan for Remaining Recipients:');
  for (let w = 0; w < 4; w++) {
    console.log(`  ${w + 1}. ${waveSchedules[w].name}: ${waveBuckets[w].length} recipients (${waveSchedules[w].scheduledAt || 'Immediate'})`);
  }

  // 4. Batch Dispatcher
  let totalScheduled = 0;
  let totalErrors = 0;
  let quotaHit = false;

  console.log('\nStarting dispatch to Resend API...');

  function persistProgress() {
    fs.writeFileSync(SENT_RECORDS_FILE, JSON.stringify({
      campaign: '1_dollar_intro_promo',
      lastRunAt: new Date().toISOString(),
      totalSent: alreadySent.size,
      sentEmails: Array.from(alreadySent),
    }, null, 2));
  }

  for (let w = 0; w < 4; w++) {
    const wave = waveSchedules[w];
    const recipients = waveBuckets[w];
    if (recipients.length === 0) continue;

    console.log(`\n=== Processing ${wave.name} (${recipients.length} recipients) ===`);

    const batchSize = 5;
    for (let i = 0; i < recipients.length; i += batchSize) {
      if (quotaHit) break;

      const batch = recipients.slice(i, i + batchSize);
      await Promise.all(batch.map(async (recipient) => {
        try {
          const html = renderOneDollarPromoHtml(recipient.name);
          const sendPayload = {
            from: 'Animation Reference <team@animationreference.org>',
            to: [recipient.email],
            replyTo: 'team@animationreference.org',
            subject: 'Your Animation Reference Pro pass is ready',
            html,
            headers: {
              'X-Entity-Ref-ID': `animref-${Date.now()}`,
            },
          };
          if (wave.scheduledAt) {
            sendPayload.scheduledAt = wave.scheduledAt;
          }

          const res = await resend.emails.send(sendPayload);
          if (res.error) {
            console.error(`[FAIL] ${recipient.email}: ${res.error.message}`);
            totalErrors++;
            if (res.error.message.includes('quota') || res.error.message.includes('rate limit')) {
              quotaHit = true;
            }
          } else {
            totalScheduled++;
            alreadySent.add(recipient.email.toLowerCase());
          }
        } catch (err) {
          console.error(`[ERR] ${recipient.email}:`, err.message);
          totalErrors++;
          if (err.message.includes('quota')) {
            quotaHit = true;
          }
        }
      }));

      persistProgress();
      process.stdout.write(`Progress: ${totalScheduled} scheduled/sent, ${totalErrors} errors...\r`);
      await new Promise(r => setTimeout(r, 350));
    }

    if (quotaHit) {
      console.log('\n⚠️ Resend daily plan quota reached. Stopping gracefully.');
      break;
    }
  }

  console.log(`\n\n--- BROADCAST PROGRESS SUMMARY ---`);
  console.log(`New Emails Scheduled / Sent in this run: ${totalScheduled}`);
  console.log(`Cumulative Total Sent for Campaign: ${alreadySent.size}`);
  console.log(`Remaining to Send: ${Math.max(0, 1988 - alreadySent.size)}`);
}

main().catch(console.error);
