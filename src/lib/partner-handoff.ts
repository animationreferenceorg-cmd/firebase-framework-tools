import { createHash, randomBytes } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestore } from './firebase-admin';
import { PartnerApiError, PARTNER_KEYS_COLLECTION, type PartnerKeyRecord } from './partner-api';
import { serializePartnerVideo, getPartnerVideo, isHandoffEligible } from './partner-catalog';
import type { Video } from './types';

// "Send this reference to <partner tool>" handoffs.
//
// A signed-in user on animationreference.org clicks the partner button on a
// video; we mint a single-use token and bounce their browser to the partner's
// import URL carrying only that token. The partner's server then exchanges the
// token for the video - server to server, authenticated with their API key.
//
// The media URL therefore never appears in a browser URL, history entry or
// referer header, every handoff is attributable, and a leaked token is useless
// after five minutes or one redemption, whichever comes first.

export const HANDOFF_COLLECTION = 'partner_handoffs';
export const HANDOFF_TTL_MS = 5 * 60 * 1000;

interface HandoffKeyConfig extends PartnerKeyRecord {
  /** Where the user's browser is sent. Stored on the key, never client-supplied. */
  handoffUrl: string;
}

export interface MintedHandoff {
  token: string;
  redirectUrl: string;
  expiresAt: string;
  partner: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * A partner learns a stable pseudonym for each user rather than our uid, so
 * their tool can group repeat handoffs from the same person without us handing
 * over an identifier that means anything outside our database.
 */
function pseudonymousUserId(uid: string, keyId: string): string {
  return createHash('sha256').update(`${uid}:${keyId}`).digest('hex').slice(0, 32);
}

// Per-user mint throttle, in memory. Handoffs are a button press, so anything
// above a few per minute is a stuck client rather than a person.
const mintBuckets = new Map<string, { count: number; resetAt: number }>();
const MINTS_PER_MINUTE = 30;

function throttleMint(uid: string): void {
  const now = Date.now();
  const bucket = mintBuckets.get(uid);
  if (!bucket || bucket.resetAt <= now) {
    mintBuckets.set(uid, { count: 1, resetAt: now + 60_000 });
    return;
  }
  bucket.count += 1;
  if (bucket.count > MINTS_PER_MINUTE) {
    throw new PartnerApiError(429, 'RATE_LIMITED', 'Too many handoffs. Wait a moment and try again.', {
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    });
  }
}

async function loadHandoffKey(keyId: string): Promise<HandoffKeyConfig> {
  const snap = await getFirestore()
    .collection(PARTNER_KEYS_COLLECTION)
    .where('keyId', '==', keyId)
    .where('revoked', '==', false)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new PartnerApiError(404, 'PARTNER_NOT_FOUND', `No active partner with id "${keyId}".`);
  }

  const data = snap.docs[0].data();
  if (!data.handoffUrl) {
    throw new PartnerApiError(409, 'HANDOFF_NOT_CONFIGURED', `Partner "${keyId}" has no handoff URL configured.`);
  }

  return {
    keyId: data.keyId,
    partner: data.partner || keyId,
    scopes: data.scopes || ['catalog:read'],
    allowedOrigins: data.allowedOrigins || [],
    rateLimitPerMinute: data.rateLimitPerMinute || 120,
    handoffUrl: data.handoffUrl,
  };
}

/** Called from our own site, on behalf of a signed-in user. */
export async function mintHandoff(uid: string, videoId: string, keyId: string): Promise<MintedHandoff> {
  throttleMint(uid);

  const video = getPartnerVideo(videoId);
  const ineligible = isHandoffEligible(video);
  if (ineligible) {
    throw new PartnerApiError(422, 'VIDEO_NOT_ELIGIBLE', ineligible);
  }

  const key = await loadHandoffKey(keyId);
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);

  await getFirestore()
    .collection(HANDOFF_COLLECTION)
    .doc(hashToken(token))
    .set({
      keyId: key.keyId,
      videoId: video.id,
      uid,
      redeemedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });

  const redirectUrl = new URL(key.handoffUrl);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('source', 'animationreference');

  return {
    token,
    redirectUrl: redirectUrl.toString(),
    expiresAt: expiresAt.toISOString(),
    partner: key.partner,
  };
}

export interface RedeemedHandoff {
  video: ReturnType<typeof serializePartnerVideo>;
  user: { id: string };
  createdAt: string | null;
}

/**
 * Called by the partner's server with their API key. Redemption is a single
 * transaction so two concurrent exchanges of the same token cannot both win.
 */
export async function redeemHandoff(token: string, record: PartnerKeyRecord): Promise<RedeemedHandoff> {
  if (!token || token.length > 256) {
    throw new PartnerApiError(400, 'INVALID_TOKEN', 'A handoff token is required.');
  }

  const db = getFirestore();
  const ref = db.collection(HANDOFF_COLLECTION).doc(hashToken(token));

  const { uid, videoId, createdAt } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      throw new PartnerApiError(404, 'TOKEN_NOT_FOUND', 'That handoff token is not valid.');
    }

    const data = snap.data() as { keyId: string; videoId: string; uid: string; redeemedAt: unknown; expiresAt: Timestamp; createdAt?: Timestamp };

    // A token minted for one partner must never be redeemable by another.
    if (data.keyId !== record.keyId) {
      throw new PartnerApiError(404, 'TOKEN_NOT_FOUND', 'That handoff token is not valid.');
    }
    if (data.redeemedAt) {
      throw new PartnerApiError(410, 'TOKEN_ALREADY_USED', 'That handoff token has already been redeemed.');
    }
    if (data.expiresAt.toMillis() < Date.now()) {
      throw new PartnerApiError(410, 'TOKEN_EXPIRED', 'That handoff token has expired. Ask the user to click again.');
    }

    tx.update(ref, { redeemedAt: FieldValue.serverTimestamp() });
    return { uid: data.uid, videoId: data.videoId, createdAt: data.createdAt || null };
  });

  let video: Video;
  try {
    video = getPartnerVideo(videoId);
  } catch {
    throw new PartnerApiError(410, 'VIDEO_UNAVAILABLE', 'The referenced video is no longer available.');
  }

  return {
    video: serializePartnerVideo(video, { includeStream: record.scopes.includes('media:stream') }),
    user: { id: pseudonymousUserId(uid, record.keyId) },
    createdAt: createdAt ? createdAt.toDate().toISOString() : null,
  };
}
