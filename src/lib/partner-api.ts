import { createHash } from 'crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from './firebase-admin';

// Shared plumbing for the public partner API mounted at /api/v1.
//
// Partners (e.g. Anim.works) authenticate with a long-lived API key issued via
// scripts/create-partner-key.cjs. Only the SHA-256 hash of the key is stored, as
// the Firestore document id, so a single get() authenticates a request and a
// leaked database dump does not leak usable keys.

export const PARTNER_KEYS_COLLECTION = 'partner_keys';
export const PARTNER_USAGE_COLLECTION = 'partner_usage';

export const API_VERSION = 'v1';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://animationreference.org';

/** Scopes a key can hold. Keys default to `catalog:read` only. */
export type PartnerScope = 'catalog:read' | 'media:stream';

export interface PartnerKeyRecord {
  /** Short public identifier for the key, e.g. `pk_anim_works`. Safe to log. */
  keyId: string;
  /** Human readable partner name, shown in usage reports. */
  partner: string;
  scopes: PartnerScope[];
  /** Browser origins allowed to call the API directly. Empty = server-side only. */
  allowedOrigins: string[];
  rateLimitPerMinute: number;
  revoked?: boolean;
  expiresAt?: FirebaseFirestore.Timestamp | null;
}

export class PartnerApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function hashKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

function readRawKey(request: NextRequest): string {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey && headerKey.trim()) return headerKey.trim();
  const authorization = request.headers.get('authorization') || '';
  if (authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return '';
}

/**
 * Verifies the request API key. Throws PartnerApiError on any failure so the
 * caller can hand it straight to partnerErrorResponse().
 */
export async function requirePartnerKey(request: NextRequest, scope: PartnerScope = 'catalog:read'): Promise<PartnerKeyRecord> {
  const rawKey = readRawKey(request);
  if (!rawKey) {
    throw new PartnerApiError(401, 'MISSING_API_KEY', 'Send your key in the X-API-Key header.');
  }

  const snap = await getFirestore().collection(PARTNER_KEYS_COLLECTION).doc(hashKey(rawKey)).get();
  if (!snap.exists) {
    throw new PartnerApiError(401, 'INVALID_API_KEY', 'That API key is not recognised.');
  }

  const data = (snap.data() || {}) as Partial<PartnerKeyRecord>;
  if (data.revoked) {
    throw new PartnerApiError(401, 'REVOKED_API_KEY', 'That API key has been revoked.');
  }
  if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
    throw new PartnerApiError(401, 'EXPIRED_API_KEY', 'That API key has expired.');
  }

  const record: PartnerKeyRecord = {
    keyId: data.keyId || snap.id.slice(0, 12),
    partner: data.partner || 'Unknown partner',
    scopes: data.scopes || ['catalog:read'],
    allowedOrigins: data.allowedOrigins || [],
    rateLimitPerMinute: data.rateLimitPerMinute || 120,
  };

  if (!record.scopes.includes(scope)) {
    throw new PartnerApiError(403, 'SCOPE_REQUIRED', `This key does not have the "${scope}" scope.`);
  }

  enforceRateLimit(record);
  return record;
}

// ---- Rate limiting ---------------------------------------------------------

// Fixed one-minute windows held in process memory. Each serving instance keeps
// its own counters, so the effective ceiling is per-instance rather than global;
// that is deliberate for v1 - it costs nothing and is enough to stop a runaway
// integration. Move to Firestore/Redis if a partner ever needs a hard quota.
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function enforceRateLimit(record: PartnerKeyRecord): void {
  const now = Date.now();
  const bucket = rateBuckets.get(record.keyId);

  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(record.keyId, { count: 1, resetAt: now + 60_000 });
    return;
  }

  bucket.count += 1;
  if (bucket.count > record.rateLimitPerMinute) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    throw new PartnerApiError(429, 'RATE_LIMITED', `Rate limit of ${record.rateLimitPerMinute} requests/minute exceeded.`, { retryAfter });
  }
}

export function rateLimitSnapshot(record: PartnerKeyRecord): { limit: number; remaining: number; resetAt: string } {
  const bucket = rateBuckets.get(record.keyId);
  const resetAt = bucket && bucket.resetAt > Date.now() ? bucket.resetAt : Date.now() + 60_000;
  return {
    limit: record.rateLimitPerMinute,
    remaining: Math.max(0, record.rateLimitPerMinute - (bucket?.count || 0)),
    resetAt: new Date(resetAt).toISOString(),
  };
}

// ---- CORS ------------------------------------------------------------------

/**
 * Partner keys are meant to live on the partner server. A key may opt into
 * browser use by listing exact origins, which are the only ones we echo back.
 */
export function partnerCors(request: NextRequest, record?: PartnerKeyRecord | null): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'X-API-Key, Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && record?.allowedOrigins?.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/**
 * A CORS preflight carries no API key, so the key document cannot be consulted.
 * Preflights are answered from PARTNER_ALLOWED_ORIGINS instead; the real request
 * is still checked against the key's own allowedOrigins list.
 */
export function preflightCors(request: NextRequest): Record<string, string> {
  const configured = (process.env.PARTNER_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return partnerCors(request, {
    keyId: 'preflight',
    partner: 'preflight',
    scopes: [],
    allowedOrigins: configured,
    rateLimitPerMinute: 0,
  });
}

// ---- Responses -------------------------------------------------------------

export function partnerErrorResponse(error: unknown, headers: Record<string, string> = {}): NextResponse {
  if (error instanceof PartnerApiError) {
    const response = NextResponse.json(
      { error: { code: error.code, message: error.message, ...error.extra } },
      { status: error.status, headers },
    );
    if (typeof error.extra.retryAfter === 'number') {
      response.headers.set('Retry-After', String(error.extra.retryAfter));
    }
    return response;
  }
  console.error('[partner-api]', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side.' } },
    { status: 500, headers },
  );
}

export function partnerResponse(
  body: Record<string, unknown>,
  record: PartnerKeyRecord,
  request: NextRequest,
  { maxAge = 300 }: { maxAge?: number } = {},
): NextResponse {
  const limits = rateLimitSnapshot(record);
  const response = NextResponse.json(body, { headers: partnerCors(request, record) });
  response.headers.set('Cache-Control', `public, max-age=60, s-maxage=${maxAge}, stale-while-revalidate=600`);
  response.headers.set('X-RateLimit-Limit', String(limits.limit));
  response.headers.set('X-RateLimit-Remaining', String(limits.remaining));
  response.headers.set('X-RateLimit-Reset', limits.resetAt);
  return response;
}

/**
 * Fire-and-forget daily usage counter, one document per partner per UTC day.
 * Call inside `after()` so it never delays the response.
 */
export async function recordUsage(record: PartnerKeyRecord, endpoint: string): Promise<void> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    await getFirestore()
      .collection(PARTNER_USAGE_COLLECTION)
      .doc(`${record.keyId}_${day}`)
      .set(
        {
          keyId: record.keyId,
          partner: record.partner,
          day,
          total: FieldValue.increment(1),
          endpoints: { [endpoint.replace(/[^a-z0-9]/gi, '_')]: FieldValue.increment(1) },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  } catch (error) {
    console.warn('[partner-api] usage logging failed', error);
  }
}

// ---- Pagination ------------------------------------------------------------

export function parseLimit(value: string | null, fallback = 24, max = 100): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

/** Cursors are opaque to partners; internally they are just an offset. */
export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const decoded = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
  if (!Number.isFinite(decoded) || decoded < 0) {
    throw new PartnerApiError(400, 'INVALID_CURSOR', 'The cursor parameter is not valid.');
  }
  return Math.floor(decoded);
}

export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), 'utf8').toString('base64url');
}
