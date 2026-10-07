import type { NextRequest } from 'next/server';
import { getFirebaseAuth, getFirestore } from './firebase-admin';
import { getEntitlements } from './plans';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export async function requireFirebaseUser(request: NextRequest) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to Animation Reference first.');
  const token = authorization.slice(7).trim();
  if (!token) throw new ApiError(401, 'AUTH_REQUIRED', 'A Firebase ID token is required.');
  try {
    const decoded = await getFirebaseAuth().verifyIdToken(token, true);
    return decoded;
  } catch {
    throw new ApiError(401, 'AUTH_INVALID', 'Your session has expired. Please reconnect the extension.');
  }
}

export async function getTrustedProfile(uid: string) {
  const snap = await getFirestore().collection('users').doc(uid).get();
  return snap.exists ? snap.data() || {} : {};
}

/** Verifies the caller and requires an admin claim or an admin profile role. */
export async function requireAdmin(request: NextRequest) {
  const identity = await requireFirebaseUser(request);
  if (identity.admin === true) return identity;
  const profile = await getTrustedProfile(identity.uid);
  if (profile.role === 'admin') return identity;
  throw new ApiError(403, 'FORBIDDEN', 'Admins only.');
}

/** Returns the caller's uid when a valid ID token is sent, otherwise null. */
export async function optionalFirebaseUser(request: NextRequest): Promise<string | null> {
  if (!(request.headers.get('authorization') || '').startsWith('Bearer ')) return null;
  return requireFirebaseUser(request).then((identity) => identity.uid).catch(() => null);
}

/** Pro check for a profile read with the Admin SDK (never from client input). */
export function profileHasPro(profile: FirebaseFirestore.DocumentData) {
  return getEntitlements(profile).isPro;
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('[API]', error);
  return Response.json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' }, { status: 500 });
}

export function extensionCors(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowed = origin === 'https://animationreference.org' || origin.startsWith('chrome-extension://') || origin.startsWith('moz-extension://');
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://animationreference.org',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}
