/**
 * Exercises the real Next.js route handlers with Stripe and Firebase Admin
 * replaced by in-memory fakes.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ---- In-memory Firestore ---------------------------------------------------
const store = new Map<string, Record<string, any>>();
function docRef(path: string) {
  return {
    id: path.split('/').pop()!,
    async get() {
      const data = store.get(path);
      return { exists: data !== undefined, id: path.split('/').pop(), data: () => (data ? { ...data } : undefined) };
    },
    async set(data: Record<string, any>, opts?: { merge?: boolean }) {
      store.set(path, opts?.merge ? { ...(store.get(path) ?? {}), ...data } : { ...data });
    },
    async update(data: Record<string, any>) {
      store.set(path, { ...(store.get(path) ?? {}), ...data });
    },
  };
}
function collection(name: string) {
  const query = (field?: string, value?: unknown) => ({
    where: (f: string, _op: string, v: unknown) => query(f, v),
    limit: () => query(field, value),
    async get() {
      const docs = [...store]
        .filter(([p, d]) => p.startsWith(`${name}/`) && p.split('/').length === 2 && (!field || d[field] === value))
        .map(([p, d]) => ({ id: p.split('/')[1], data: () => d }));
      return { empty: docs.length === 0, docs, size: docs.length, forEach: (fn: any) => docs.forEach(fn) };
    },
  });
  return { doc: (id: string) => docRef(`${name}/${id}`), ...query() };
}
const fakeDb = { collection };

// ---- Auth -------------------------------------------------------------------
const tokens: Record<string, { uid: string; email?: string; email_verified?: boolean }> = {
  'token-alice': { uid: 'alice', email: 'alice@example.com', email_verified: true },
  'token-mallory': { uid: 'mallory', email: 'alice@example.com', email_verified: false },
};

vi.mock('@/lib/firebase-admin', () => ({
  getFirestore: () => fakeDb,
  getAdminApp: () => ({}),
  getFirebaseStorage: () => ({}),
  getFirebaseAuth: () => ({
    verifyIdToken: async (t: string) => {
      if (!tokens[t]) throw new Error('bad token');
      return tokens[t];
    },
    getUser: async (uid: string) => ({ uid, email: `${uid}@example.com`, emailVerified: true }),
  }),
}));

// ---- Stripe -----------------------------------------------------------------
const stripe = {
  customers: {
    create: vi.fn(async () => ({ id: 'cus_new' })),
    list: vi.fn(async () => ({ data: [] as Array<{ id: string }> })),
    search: vi.fn(async () => ({ data: [] as Array<{ id: string }> })),
    retrieve: vi.fn(async () => ({ id: 'cus_A', email: 'alice@example.com', metadata: {} })),
  },
  subscriptions: { list: vi.fn(async () => ({ data: [] as any[] })) },
  checkout: { sessions: { create: vi.fn(async (_params: any) => ({ url: 'https://checkout.stripe.test/session' })) } },
  billingPortal: { sessions: { create: vi.fn(async (_params: any) => ({ url: 'https://billing.stripe.test/portal' })) } },
  webhooks: {
    constructEvent: vi.fn(() => {
      throw new Error('No signatures found matching the expected signature');
    }),
  },
};
vi.mock('@/lib/stripe', () => ({ getStripe: () => stripe }));

function post(url: string, body: unknown, token?: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://animationreference.test${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  store.clear();
  store.set('users/alice', { email: 'alice@example.com', role: 'user' });
  store.set('users/mallory', { email: 'alice@example.com', role: 'user' });
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY', 'price_pro_monthly_9');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL', 'price_pro_annual_79');
  vi.clearAllMocks();
});

describe('POST /api/checkout (checkout redirect)', () => {
  it('requires sign-in', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(post('/api/checkout', { plan: 'pro_monthly' }));
    expect(res.status).toBe(401);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('monthly: creates a session on the monthly price and returns the Stripe URL', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(post('/api/checkout', { plan: 'pro_monthly' }, 'token-alice'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/session' });

    const params = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(params.line_items).toEqual([{ price: 'price_pro_monthly_9', quantity: 1 }]);
    expect(params.customer).toBe('cus_new');
    expect(params.client_reference_id).toBe('alice');
    // The new customer is linked to the account before payment.
    expect(store.get('users/alice')?.stripeCustomerId).toBe('cus_new');
  });

  it('annual: uses the annual price and reuses the existing customer', async () => {
    store.set('users/alice', { email: 'alice@example.com', stripeCustomerId: 'cus_A' });
    const { POST } = await import('@/app/api/checkout/route');
    await POST(post('/api/checkout', { plan: 'pro_annual' }, 'token-alice'));
    const params = stripe.checkout.sessions.create.mock.calls[0][0];
    expect(params.line_items[0].price).toBe('price_pro_annual_79');
    expect(params.customer).toBe('cus_A');
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it('rejects client-chosen prices', async () => {
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(post('/api/checkout', { plan: 'price_1SFgUc59QHehw05fROtqwkLN' }, 'token-alice'));
    expect(res.status).toBe(400);
  });

  it('returns 409 instead of charging monthly when annual is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL', '');
    const { POST } = await import('@/app/api/checkout/route');
    const res = await POST(post('/api/checkout', { plan: 'pro_annual' }, 'token-alice'));
    expect(res.status).toBe(409);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/portal (billing portal redirect)', () => {
  it('requires sign-in', async () => {
    const { POST } = await import('@/app/api/portal/route');
    expect((await POST(post('/api/portal', {}))).status).toBe(401);
  });

  it('opens the portal for the linked customer and keeps return URLs on-site', async () => {
    store.set('users/alice', { email: 'alice@example.com', stripeCustomerId: 'cus_A' });
    const { POST } = await import('@/app/api/portal/route');
    const res = await POST(post('/api/portal', { returnUrl: 'https://evil.test/phish' }, 'token-alice'));
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.test/portal' });
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_A',
      return_url: 'https://animationreference.test/profile',
    });
  });
});

describe('POST /api/sync-stripe', () => {
  it('syncs Pro from Stripe for the caller', async () => {
    store.set('users/alice', { email: 'alice@example.com', stripeCustomerId: 'cus_A' });
    stripe.subscriptions.list.mockResolvedValueOnce({
      data: [{ id: 'sub_1', status: 'active', created: 1, items: { data: [{ price: { id: 'price_pro_monthly_9' } }] } }],
    });
    const { POST } = await import('@/app/api/sync-stripe/route');
    const body = await (await POST(post('/api/sync-stripe', {}, 'token-alice'))).json();
    expect(body).toMatchObject({ success: true, plan: 'pro_monthly' });
    expect(store.get('users/alice')).toMatchObject({ isPremium: true, plan: 'pro_monthly', tier: 'tier5' });
  });

  it('does not look up Stripe customers by an unverified email', async () => {
    const { POST } = await import('@/app/api/sync-stripe/route');
    await POST(post('/api/sync-stripe', {}, 'token-mallory'));
    expect(stripe.customers.list).not.toHaveBeenCalled();
    expect(store.get('users/mallory')?.isPremium).toBe(false);
  });

  it('forbids syncing another account unless admin', async () => {
    const { POST } = await import('@/app/api/sync-stripe/route');
    const res = await POST(post('/api/sync-stripe', { userId: 'alice' }, 'token-mallory'));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/webhooks/stripe', () => {
  it('rejects requests without a valid signature', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test');
    const { POST } = await import('@/app/api/webhooks/stripe/route');
    const unsigned = await POST(new Request('https://x.test/api/webhooks/stripe', { method: 'POST', body: '{}' }));
    expect(unsigned.status).toBe(400);
    const forged = await POST(
      new Request('https://x.test/api/webhooks/stripe', { method: 'POST', body: '{}', headers: { 'stripe-signature': 't=1,v1=forged' } })
    );
    expect(forged.status).toBe(400);
    expect(store.get('users/alice')?.isPremium).toBeUndefined();
  });
});
