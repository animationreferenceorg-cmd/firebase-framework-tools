const admin = require('firebase-admin');
const { Resend } = require('resend');
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

async function main() {
  console.log('--- LAUNCHING GLOBAL 6:00 AM STAGGERED EMAIL CAMPAIGN ---');
  console.log('Sender: Animation Reference <team@animationreference.org>');
  console.log('Subject: Your Animation Reference Pro pass is ready');

  const auth = admin.auth();
  const db = admin.firestore();

  // 1. Gather all pro UIDs to exclude them
  console.log('Querying current Pro members...');
  const proUids = new Set();
  const snap = await db.collection('users').get();
  snap.forEach(doc => {
    const d = doc.data();
    if (d.isPremium || d.isPro || d.plan?.startsWith('pro') || d.tier?.startsWith('pro')) {
      proUids.add(doc.id);
    }
  });
  console.log(`Found ${proUids.size} Pro accounts.`);

  // 2. Fetch all Free tier accounts
  console.log('Gathering free tier user accounts from Firebase Auth...');
  const freeUsers = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (!u.email) continue;
      if (proUids.has(u.uid)) continue;
      freeUsers.push({
        uid: u.uid,
        email: u.email,
        name: u.displayName || 'Animator',
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`Total Target Audience: ${freeUsers.length} Free Tier Animators`);

  // 3. Define 6:00 AM Local Time Global Waves
  // Wave 1: Europe/UK (Currently 7:30 AM local time) -> Immediate
  // Wave 2: US East (Target 6:30 AM EDT = ~3 hours from now)
  // Wave 3: US West (Target 6:30 AM PDT = ~6 hours from now)
  // Wave 4: Asia/Pacific (Target 7:00 AM Sunday = ~14 hours from now)
  const now = Date.now();
  const waveSchedules = [
    { name: 'Wave 1 (Europe Morning - Immediate)', scheduledAt: undefined },
    { name: 'Wave 2 (US East Morning ~6:30 AM EDT)', scheduledAt: new Date(now + 3 * 3600 * 1000).toISOString() },
    { name: 'Wave 3 (US West Morning ~6:30 AM PDT)', scheduledAt: new Date(now + 6 * 3600 * 1000).toISOString() },
    { name: 'Wave 4 (Asia / Pacific Sunday Morning)', scheduledAt: new Date(now + 14 * 3600 * 1000).toISOString() },
  ];

  console.log('\nScheduling Plan:');
  waveSchedules.forEach((w, idx) => {
    console.log(`  ${idx + 1}. ${w.name}: ${w.scheduledAt || 'Immediate delivery'}`);
  });

  // Assign recipients evenly to waves
  const waveBuckets = [[], [], [], []];
  freeUsers.forEach((user, idx) => {
    waveBuckets[idx % 4].push(user);
  });

  for (let w = 0; w < 4; w++) {
    console.log(`  -> ${waveSchedules[w].name}: ${waveBuckets[w].length} recipients`);
  }

  // 4. Batch Dispatcher
  let totalSent = 0;
  let totalFailed = 0;
  let quotaHit = false;

  console.log('\nStarting dispatch to Resend API...');
  
  for (let w = 0; w < 4; w++) {
    const wave = waveSchedules[w];
    const recipients = waveBuckets[w];
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
            totalFailed++;
            if (res.error.message.includes('quota') || res.error.message.includes('rate limit')) {
              quotaHit = true;
            }
          } else {
            totalSent++;
          }
        } catch (err) {
          console.error(`[ERR] ${recipient.email}:`, err.message);
          totalFailed++;
          if (err.message.includes('quota')) {
            quotaHit = true;
          }
        }
      }));

      // Rate limit protection: 350ms pause between batches
      process.stdout.write(`Progress: ${totalSent} scheduled/sent, ${totalFailed} errors...\r`);
      await new Promise(r => setTimeout(r, 350));
    }

    if (quotaHit) {
      console.log('\n⚠️ Resend daily plan quota reached. Stopping gracefully.');
      break;
    }
  }

  console.log(`\n\n--- BROADCAST SUMMARY ---`);
  console.log(`Total Scheduled / Delivered: ${totalSent}`);
  console.log(`Failed / Skipped: ${totalFailed}`);
  console.log(`Total Free Audience: ${freeUsers.length}`);
}

main().catch(console.error);
