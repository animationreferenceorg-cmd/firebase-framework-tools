import type { NextRequest } from 'next/server';
import { getFirebaseAuth, getFirestore } from './firebase-admin';

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

export function profileHasPro(profile: FirebaseFirestore.DocumentData) {
  return profile.role === 'admin' || (profile.isPremium === true && profile.tier === 'tier5');
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
