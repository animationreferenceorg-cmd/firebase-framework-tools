import { beforeEach, describe, expect, it } from 'vitest';
import { handleStripeEvent, type WebhookDeps } from '@/lib/stripe-webhook';
import { LEGACY_PRICE_IDS, getEntitlements, type PriceEnv } from '@/lib/plans';
import type { SubscriptionLike } from '@/lib/subscription-state';

const ENV: PriceEnv = {
  NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_9',
  NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: 'price_pro_annual_79',
};

/** In-memory Stripe + Firestore stand-in. */
class World {
  users = new Map<string, Record<string, any>>();
  subs = new Map<string, SubscriptionLike[]>();
  customers = new Map<string, { email?: string; metadata?: Record<string, string> }>();
  logs: string[] = [];
  private clock = 1_700_000_000;

  sub(customer: string, id: string, status: string, price = 'price_pro_monthly_9') {
    const list = this.subs.get(customer) ?? [];
    const existing = list.find((s) => s.id === id);
    if (existing) {
      existing.status = status;
      existing.items.data[0].price.id = price;
    }
    else list.push({ id, status, created: this.clock++, items: { data: [{ price: { id: price } }] } });
    this.subs.set(customer, list);
  }

  deps(): WebhookDeps {
    return {
      env: ENV,
      now: () => new Date('2026-09-25T00:00:00Z'),
      log: (m) => this.logs.push(m),
      listSubscriptions: async (c) => structuredClone(this.subs.get(c) ?? []),
      getCustomer: async (c) => this.customers.get(c) ?? null,
      getProfile: async (uid) => (this.users.has(uid) ? { ...this.users.get(uid) } : null),
      findUserIdsByCustomerId: async (c) => [...this.users].filter(([, u]) => u.stripeCustomerId === c).map(([id]) => id),
      findUserIdsByEmail: async (e) => [...this.users].filter(([, u]) => u.email === e).map(([id]) => id),
      updateUser: async (uid, data) => {
        this.users.set(uid, { ...(this.users.get(uid) ?? {}), ...data });
      },
    };
  }

  send(type: string, object: Record<string, unknown>) {
    return handleStripeEvent({ id: `evt_${type}`, type, data: { object } }, this.deps());
  }

  access(uid: string) {
    return getEntitlements(this.users.get(uid)).access;
  }
}

let w: World;
beforeEach(() => {
  w = new World();
  w.users.set('alice', { email: 'alice@example.com', role: 'user' });
});

describe('Stripe webhook → access', () => {
  it('upgrade: checkout completion links the customer and grants Pro monthly', async () => {
    w.sub('cus_A', 'sub_1', 'active');
    const result = await w.send('checkout.session.completed', { customer: 'cus_A', client_reference_id: 'alice' });

    expect(result.userIds).toEqual(['alice']);
    expect(w.users.get('alice')).toMatchObject({
      stripeCustomerId: 'cus_A',
      isPremium: true,
      tier: 'tier5',
      plan: 'pro_monthly',
      subscriptionStatus: 'active',
      stripeSubscriptionId: 'sub_1',
    });
    expect(w.access('alice')).toBe('pro');
  });

  it('annual purchases record the annual plan', async () => {
    w.sub('cus_A', 'sub_1', 'active', 'price_pro_annual_79');
    await w.send('checkout.session.completed', { customer: 'cus_A', client_reference_id: 'alice' });
    expect(w.users.get('alice')?.plan).toBe('pro_annual');
  });

  it('renewal: invoice.paid keeps access', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'active');
    await w.send('invoice.paid', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('pro');
  });

  it('payment failure: past_due keeps access during retries, unpaid revokes it', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'past_due');
    await w.send('invoice.payment_failed', { customer: 'cus_A' });
    expect(w.users.get('alice')?.subscriptionStatus).toBe('past_due');
    expect(w.access('alice')).toBe('pro');

    w.sub('cus_A', 'sub_1', 'unpaid');
    await w.send('customer.subscription.updated', { customer: 'cus_A', id: 'sub_1', status: 'unpaid' });
    expect(w.users.get('alice')).toMatchObject({ isPremium: false, tier: null, plan: 'free', subscriptionStatus: 'unpaid' });
    expect(w.access('alice')).toBe('free');
  });

  it('cancellation revokes access; incomplete_expired never grants it', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'active');
    await w.send('customer.subscription.updated', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('pro');

    w.sub('cus_A', 'sub_1', 'canceled');
    await w.send('customer.subscription.deleted', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('free');
    expect(w.users.get('alice')?.subscriptionStatus).toBe('canceled');

    w.sub('cus_A', 'sub_2', 'incomplete_expired');
    await w.send('customer.subscription.updated', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('free');
  });

  it('reactivation: a new subscription next to a canceled one restores Pro', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_old', 'canceled');
    w.sub('cus_A', 'sub_new', 'active');
    await w.send('customer.subscription.created', { customer: 'cus_A' });
    expect(w.users.get('alice')).toMatchObject({ isPremium: true, stripeSubscriptionId: 'sub_new' });
  });

  it('a late event for an old subscription cannot revoke a newer active one', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_old', 'canceled');
    w.sub('cus_A', 'sub_new', 'active');
    // Stripe delivers the old subscription's deletion after the new one exists.
    await w.send('customer.subscription.deleted', { customer: 'cus_A', id: 'sub_old', status: 'canceled' });
    expect(w.access('alice')).toBe('pro');
  });

  it('legacy $1/$2/$5 subscribers keep their legacy access', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'active', LEGACY_PRICE_IDS.tier1);
    await w.send('invoice.paid', { customer: 'cus_A' });
    expect(w.users.get('alice')).toMatchObject({ plan: 'tier1', tier: 'tier1' });
    expect(w.access('alice')).toBe('tier1');

    w.sub('cus_A', 'sub_1', 'active', LEGACY_PRICE_IDS.tier5);
    await w.send('invoice.paid', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('pro');
  });

  it('an unknown price grants nothing', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'active', 'price_someone_forgot_to_configure');
    await w.send('invoice.paid', { customer: 'cus_A' });
    expect(w.access('alice')).toBe('free');
  });

  it('never revokes SJSU/VIP access when their Stripe subscription ends', async () => {
    w.users.set('sam', { email: 'sam@sjsu.edu', tier: 'student_unlimited', isVIP: true, isPremium: true, stripeCustomerId: 'cus_S' });
    w.sub('cus_S', 'sub_1', 'canceled');
    await w.send('customer.subscription.deleted', { customer: 'cus_S' });
    expect(w.users.get('sam')).toMatchObject({ tier: 'student_unlimited', isPremium: true, subscriptionStatus: 'canceled' });
    expect(w.access('sam')).toBe('student_unlimited');
  });

  it('finds the user through customer metadata when the customer is not linked yet', async () => {
    w.customers.set('cus_A', { metadata: { firebaseUID: 'alice' } });
    w.sub('cus_A', 'sub_1', 'active');
    await w.send('customer.subscription.created', { customer: 'cus_A' });
    expect(w.users.get('alice')?.stripeCustomerId).toBe('cus_A');
  });

  it('does not guess when several accounts share a billing email', async () => {
    w.users.set('alice2', { email: 'alice@example.com' });
    w.customers.set('cus_X', { email: 'alice@example.com' });
    w.sub('cus_X', 'sub_1', 'active');
    const result = await w.send('customer.subscription.created', { customer: 'cus_X' });
    expect(result.userIds).toEqual([]);
    expect(w.access('alice')).toBe('free');
    expect(w.logs.join('\n')).toMatch(/share the billing email/);
  });

  it('ignores a forged client_reference_id for a user that does not exist', async () => {
    w.users.get('alice')!.stripeCustomerId = 'cus_A';
    w.sub('cus_A', 'sub_1', 'active');
    const result = await w.send('checkout.session.completed', { customer: 'cus_A', client_reference_id: 'ghost' });
    expect(result.userIds).toEqual(['alice']);
    expect(w.users.has('ghost')).toBe(false);
  });

  it('ignores event types it does not handle', async () => {
    const result = await w.send('payment_intent.created', { customer: 'cus_A' });
    expect(result.handled).toBe(false);
  });
});
