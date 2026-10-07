import { describe, expect, it } from 'vitest';
import { buildCheckoutSessionParams, CheckoutPlanError, priceForCheckout } from '@/lib/checkout';
import { checkLimit } from '@/lib/limits';
import { LEGACY_PRICE_IDS, type PriceEnv } from '@/lib/plans';
import { ANALYTICS_EVENTS, sanitizeProperties, setAnalyticsProvider, track } from '@/lib/analytics';
import type { UserProfile } from '@/lib/types';

const ENV: PriceEnv = {
  NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_9',
  NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: 'price_pro_annual_79',
};

describe('checkout pricing', () => {
  it('monthly checkout charges the monthly price', () => {
    const params = buildCheckoutSessionParams({ plan: 'pro_monthly', uid: 'u1', customerId: 'cus_1', origin: 'https://x.test', env: ENV });
    expect(params.line_items).toEqual([{ price: 'price_pro_monthly_9', quantity: 1 }]);
    expect(params).toMatchObject({ mode: 'subscription', customer: 'cus_1', client_reference_id: 'u1' });
    expect(params.subscription_data.metadata.firebaseUID).toBe('u1');
    expect((params as any).success_url).toBe('https://x.test/profile?sync=true&checkout=success');
  });

  it('annual checkout charges the annual price', () => {
    const params = buildCheckoutSessionParams({ plan: 'pro_annual', uid: 'u1', customerId: 'cus_1', origin: 'https://x.test', env: ENV });
    expect(params.line_items[0].price).toBe('price_pro_annual_79');
  });

  it('embedded checkout sets ui_mode embedded and return_url without success_url', () => {
    const params = buildCheckoutSessionParams({
      plan: 'pro_monthly',
      uid: 'u1',
      customerId: 'cus_1',
      origin: 'https://x.test',
      env: ENV,
      embedded: true,
    });
    expect(params).toMatchObject({
      ui_mode: 'embedded',
      return_url: 'https://x.test/checkout/return?session_id={CHECKOUT_SESSION_ID}',
    });
    expect((params as any).success_url).toBeUndefined();
    expect((params as any).cancel_url).toBeUndefined();
  });

  it('refuses annual checkout when no annual price exists', () => {
    expect(() => priceForCheckout('pro_annual', { NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_9' })).toThrowError(
      expect.objectContaining({ code: 'PLAN_UNAVAILABLE' })
    );
  });

  it('only accepts plan names, never a client-supplied price or legacy tier', () => {
    for (const plan of ['price_pro_monthly_9', LEGACY_PRICE_IDS.tier1, 'tier5', '', undefined, { plan: 'pro_monthly' }]) {
      expect(() => priceForCheckout(plan, ENV)).toThrow(CheckoutPlanError);
    }
  });
});

describe('checkLimit (legacy call sites)', () => {
  const profile = (p: Partial<UserProfile>) => ({ uid: 'u', email: null, displayName: null, photoURL: null, role: 'user', ...p }) as UserProfile;

  it('free: unlimited boards and saved references', () => {
    expect(checkLimit(profile({}), 'moodboards', 0).allowed).toBe(true);
    expect(checkLimit(profile({}), 'moodboards', 500)).toMatchObject({ allowed: true, limit: Infinity, nextTier: undefined });
    expect(checkLimit(profile({}), 'likes', 500).allowed).toBe(true);
  });

  it('Pro and SJSU are unlimited', () => {
    expect(checkLimit(profile({ isPremium: true, tier: 'tier5' }), 'moodboards', 999).allowed).toBe(true);
    expect(checkLimit(profile({ tier: 'student_unlimited' }), 'likes', 999).allowed).toBe(true);
  });
});

describe('analytics', () => {
  it('defines the Phase 6 event names', () => {
    expect(ANALYTICS_EVENTS).toContain('checkout_started');
    expect(ANALYTICS_EVENTS).toContain('subscription_canceled');
  });

  it('forwards only allow-listed, non-identifying properties', () => {
    expect(
      sanitizeProperties({ plan: 'pro_monthly', source: 'x'.repeat(200), query: 'secret search', email: 'a@b.c', notes: 'private', result_count: 3 })
    ).toEqual({ plan: 'pro_monthly', source: 'x'.repeat(80), result_count: 3 });
  });

  it('never throws when a provider fails', () => {
    setAnalyticsProvider({ track: () => { throw new Error('down'); } });
    expect(() => track('checkout_started', { plan: 'pro_monthly' })).not.toThrow();
    setAnalyticsProvider(null);
  });
});
