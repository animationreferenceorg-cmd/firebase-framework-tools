// Mints an API key for a partner integration (see docs/partner-api.md).
//
//   node scripts/create-partner-key.cjs --partner "Anim.works" --key-id anim_works \
//     [--scopes catalog:read,media:stream] [--rate 120] \
//     [--origins https://anim.works,https://www.anim.works] [--expires 2027-01-01] \
//     [--handoff-url https://anim.works/import]
//
// --handoff-url enables the "send this reference to <partner>" button on our
// video pages. It is the only place that destination is defined, so a request
// can never redirect a user somewhere of its own choosing.
//
// The raw key is printed once and never stored - only its SHA-256 hash, which
// is the Firestore document id. Revoke with --revoke <keyId>; list with --list.
const crypto = require('crypto');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const KEYS_COLLECTION = 'partner_keys';
const VALID_SCOPES = ['catalog:read', 'media:stream'];

function initDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey.includes('BEGIN PRIVATE KEY')) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
  } else {
    admin.initializeApp();
  }
  return admin.firestore();
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[name] = true;
    } else {
      args[name] = next;
      i++;
    }
  }
  return args;
}

function generateKey() {
  // 32 bytes of entropy, url-safe, with a recognisable prefix so a leaked key
  // is easy to spot in logs and secret scanners.
  return `arefk_live_${crypto.randomBytes(32).toString('base64url')}`;
}

async function list(db) {
  const snap = await db.collection(KEYS_COLLECTION).get();
  if (snap.empty) {
    console.log('No partner keys issued yet.');
    return;
  }
  console.log('keyId'.padEnd(24), 'partner'.padEnd(24), 'scopes'.padEnd(28), 'status');
  snap.docs.forEach((doc) => {
    const d = doc.data();
    console.log(
      String(d.keyId || doc.id.slice(0, 12)).padEnd(24),
      String(d.partner || '').padEnd(24),
      (d.scopes || []).join(',').padEnd(28),
      d.revoked ? 'REVOKED' : 'active',
    );
  });
}

async function revoke(db, keyId) {
  const snap = await db.collection(KEYS_COLLECTION).where('keyId', '==', keyId).get();
  if (snap.empty) {
    console.error(`No key with keyId "${keyId}".`);
    process.exit(1);
  }
  await Promise.all(snap.docs.map((doc) => doc.ref.update({ revoked: true, revokedAt: admin.firestore.FieldValue.serverTimestamp() })));
  console.log(`Revoked ${snap.size} key(s) with keyId "${keyId}".`);
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  const db = initDb();

  if (args.list) return list(db);
  if (args.revoke) return revoke(db, String(args.revoke));

  const partner = args.partner;
  if (!partner || partner === true) {
    console.error('Usage: node scripts/create-partner-key.cjs --partner "Anim.works" --key-id anim_works');
    process.exit(1);
  }

  const keyId = `pk_${String(args['key-id'] || partner).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')}`;
  const scopes = String(args.scopes || 'catalog:read')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
  if (invalid.length) {
    console.error(`Unknown scope(s): ${invalid.join(', ')}. Valid scopes: ${VALID_SCOPES.join(', ')}`);
    process.exit(1);
  }

  const existing = await db.collection(KEYS_COLLECTION).where('keyId', '==', keyId).where('revoked', '==', false).get();
  if (!existing.empty) {
    console.warn(`Note: ${existing.size} active key(s) already exist for "${keyId}". Both will work until you --revoke.`);
  }

  let handoffUrl = null;
  if (args['handoff-url'] && args['handoff-url'] !== true) {
    try {
      const parsed = new URL(String(args['handoff-url']));
      if (parsed.protocol !== 'https:') throw new Error('must be https');
      handoffUrl = parsed.toString();
    } catch (e) {
      console.error(`--handoff-url "${args['handoff-url']}" must be a valid https URL.`);
      process.exit(1);
    }
  }

  const rawKey = generateKey();
  const docId = crypto.createHash('sha256').update(rawKey).digest('hex');

  const expiresAt = args.expires && args.expires !== true ? new Date(String(args.expires)) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    console.error(`--expires "${args.expires}" is not a valid date.`);
    process.exit(1);
  }

  await db.collection(KEYS_COLLECTION).doc(docId).set({
    keyId,
    partner: String(partner),
    scopes,
    allowedOrigins: args.origins && args.origins !== true ? String(args.origins).split(',').map((o) => o.trim()).filter(Boolean) : [],
    rateLimitPerMinute: Number(args.rate) > 0 ? Number(args.rate) : 120,
    handoffUrl: handoffUrl,
    revoked: false,
    expiresAt: expiresAt ? admin.firestore.Timestamp.fromDate(expiresAt) : null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('');
  console.log('Partner key created. Copy it now - it cannot be shown again.');
  console.log('-----------------------------------------------------------');
  console.log(`  partner : ${partner}`);
  console.log(`  keyId   : ${keyId}`);
  console.log(`  scopes  : ${scopes.join(', ')}`);
  console.log(`  rate    : ${Number(args.rate) > 0 ? Number(args.rate) : 120} requests/minute`);
  console.log(`  expires : ${expiresAt ? expiresAt.toISOString() : 'never'}`);
  console.log(`  handoff : ${handoffUrl || 'not configured (button hidden)'}`);
  console.log('');
  console.log(`  API KEY : ${rawKey}`);
  console.log('-----------------------------------------------------------');
  console.log('');
  console.log('Verify with:');
  console.log(`  curl -H "X-API-Key: ${rawKey}" https://animationreference.org/api/v1/status`);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
