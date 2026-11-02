import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { codeDigest, pkceChallenge, publicProfile } from '@/lib/studiowatch-connect';

const fake = vi.hoisted(() => ({ grants: new Map<string, any>(), user: { uid: 'UserABC123', name: 'Artist', firebase: { sign_in_provider: 'password' } } }));
vi.mock('@/lib/api-auth', () => ({
  requireFirebaseUser: async () => fake.user,
  getTrustedProfile: async () => ({ username: 'artist.name', displayName: 'Artist', bio: 'Hello', email: 'private@example.com' }),
  apiErrorResponse: () => Response.json({ message: 'Authentication failed' }, { status: 401 }),
}));
vi.mock('@/lib/firebase-admin', () => ({
  getFirestore: () => ({
    collection: () => ({ doc: (id: string) => ({ id, create: async (grant: any) => fake.grants.set(id, { ...grant, expiresAt: { toMillis: () => grant.expiresAt.getTime() } }) }) }),
    runTransaction: async (fn: (transaction: any) => Promise<unknown>) => fn({
      get: async (ref: { id: string }) => ({ data: () => fake.grants.get(ref.id) }),
      delete: (ref: { id: string }) => fake.grants.delete(ref.id),
    }),
  }),
}));

const callback = 'https://jobs.example.com/api/animref/callback';
const verifier = 'a'.repeat(43);
const state = 'b'.repeat(43);
function request(path: string, body: object, origin = 'https://animationreference.org') {
  return new NextRequest(`https://animationreference.org${path}`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

beforeEach(() => {
  fake.grants.clear();
  fake.user.firebase.sign_in_provider = 'password';
  vi.stubEnv('STUDIOWATCH_REDIRECT_URIS', callback);
});

describe('StudioWatch portfolio connection', () => {
  it('uses the public ID route for unsupported usernames and does not return private fields', () => {
    const profile = publicProfile('UserABC123', { username: 'artist.name', email: 'private@example.com', bio: 'Hello' });
    expect(profile.arProfileUrl).toBe('https://animationreference.org/UserABC123');
    expect(profile.arHandle).toBe('@artist.name');
    expect(profile).not.toHaveProperty('email');
    expect(publicProfile('UserABC123', { username: 'renamed' }).arProfileUrl).toBe('https://animationreference.org/renamed');
  });

  it('issues a consented code and exchanges it once using the matching verifier', async () => {
    const { POST: authorize } = await import('@/app/api/studiowatch/authorize/route');
    const { POST: exchange } = await import('@/app/api/studiowatch/exchange/route');
    const response = await authorize(request('/api/studiowatch/authorize', { redirect_uri: callback, state, code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256' }));
    expect(response.status).toBe(200);
    const redirect = new URL((await response.json()).redirect);
    const code = redirect.searchParams.get('code')!;
    expect(redirect.searchParams.get('state')).toBe(state);
    expect(fake.grants.has(codeDigest(code))).toBe(true);
    const body = { redirect_uri: callback, code, code_verifier: verifier };
    expect((await exchange(request('/api/studiowatch/exchange', { ...body, code_verifier: 'c'.repeat(43) }))).status).toBe(400);
    const success = await exchange(request('/api/studiowatch/exchange', body));
    expect(success.status).toBe(200);
    const result = await success.json();
    expect(result.profile.arProfileUrl).toBe('https://animationreference.org/UserABC123');
    expect(result.profile).not.toHaveProperty('email');
    expect((await exchange(request('/api/studiowatch/exchange', body))).status).toBe(400);
  });

  it('rejects cross-origin, anonymous, and unapproved callback requests', async () => {
    const { POST } = await import('@/app/api/studiowatch/authorize/route');
    const body = { redirect_uri: callback, state, code_challenge: pkceChallenge(verifier), code_challenge_method: 'S256' };
    expect((await POST(request('/api/studiowatch/authorize', body, 'https://evil.example'))).status).toBe(403);
    fake.user.firebase.sign_in_provider = 'anonymous';
    expect((await POST(request('/api/studiowatch/authorize', body))).status).toBe(401);
    fake.user.firebase.sign_in_provider = 'password';
    expect((await POST(request('/api/studiowatch/authorize', { ...body, redirect_uri: 'https://evil.example/api/animref/callback' }))).status).toBe(400);
    expect(fake.grants.size).toBe(0);
  });
});
