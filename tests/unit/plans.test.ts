import { describe, expect, it } from 'vitest';
import {
  LEGACY_PRICE_IDS,
  describeAccess,
  getEntitlements,
  getProOffers,
  planFromPriceId,
  resolveAccessLevel,
  type PriceEnv,
} from '@/lib/plans';

const CONFIGURED: PriceEnv = {
  NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_5',
  NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: 'price_pro_annual_45',
};

describe('getProOffers', () => {
  it('offers $5 monthly and $45 annual when both prices are configured', () => {
    const offers = getProOffers(CONFIGURED);
    expect(offers.pro_monthly).toMatchObject({ priceId: 'price_pro_monthly_5', amountCents: 500, available: true, legacyFallback: false });
    expect(offers.pro_annual).toMatchObject({ priceId: 'price_pro_annual_45', amountCents: 4500, interval: 'year', available: true });
  });

  it('never lets annual silently reuse the monthly price', () => {
    const offers = getProOffers({ NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_pro_monthly_5' });
    expect(offers.pro_annual.available).toBe(false);
    expect(offers.pro_annual.priceId).toBeNull();
  });

  it('falls back to the legacy $5 price and shows $5 until custom price is configured', () => {
    const offers = getProOffers({});
    expect(offers.pro_monthly).toMatchObject({ priceId: LEGACY_PRICE_IDS.tier5, amountCents: 500, legacyFallback: true });
  });

  it('ignores values that are not Stripe price IDs', () => {
    expect(getProOffers({ NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: '  ' }).pro_annual.available).toBe(false);
    expect(getProOffers({ NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'prod_123' }).pro_monthly.legacyFallback).toBe(true);
  });
});

describe('planFromPriceId', () => {
  it('maps configured and legacy prices', () => {
    expect(planFromPriceId('price_pro_monthly_5', CONFIGURED)).toBe('pro_monthly');
    expect(planFromPriceId('price_pro_annual_45', CONFIGURED)).toBe('pro_annual');
    expect(planFromPriceId(LEGACY_PRICE_IDS.tier1, CONFIGURED)).toBe('tier1');
    expect(planFromPriceId(LEGACY_PRICE_IDS.tier2, CONFIGURED)).toBe('tier2');
    expect(planFromPriceId(LEGACY_PRICE_IDS.tier5, CONFIGURED)).toBe('tier5');
  });

  it('grants nothing for unknown prices (fails closed)', () => {
    expect(planFromPriceId('price_unknown', CONFIGURED)).toBeNull();
    // The mistyped ID that used to live in the checkout route.
    expect(planFromPriceId('price_1SFgUc59QHehw05fc0lPRRf7', CONFIGURED)).toBeNull();
    expect(planFromPriceId(undefined, CONFIGURED)).toBeNull();
  });
});

describe('entitlements', () => {
  it('free users get the free limits and no Pro tools', () => {
    const e = getEntitlements({});
    expect(e.access).toBe('free');
    expect(e.limits).toEqual({ maxBoards: 1, maxSavedReferences: 5, maxPortfolioPosts: 3 });
    expect(e.canUsePrivateWorkspace || e.canComparePlayblast || e.canRemoveWatermark || e.canUseMayaBridge).toBe(false);
  });

  it.each([
    [{ isPremium: true, plan: 'pro_monthly', tier: 'tier5' }, 'pro'],
    [{ isPremium: true, plan: 'pro_annual', tier: 'tier5' }, 'pro'],
    [{ isPremium: true, tier: 'tier5' }, 'pro'], // legacy $5 subscriber
    [{ isPremium: true, tier: 'tier2' }, 'tier2'],
    [{ isPremium: true, tier: 'tier1' }, 'tier1'],
    [{ isPremium: true }, 'tier1'], // premium with no tier never becomes Pro
    [{ isPremium: false, tier: 'tier5' }, 'free'],
    [{ isPremium: true, tier: 'tier5', subscriptionStatus: 'canceled' }, 'free'],
    [{ isPremium: true, tier: 'tier5', subscriptionStatus: 'unpaid' }, 'free'],
    [{ isPremium: true, tier: 'tier5', subscriptionStatus: 'past_due' }, 'pro'],
  ] as const)('%o resolves to %s', (profile, access) => {
    expect(resolveAccessLevel(profile)).toBe(access);
  });

  it('preserves SJSU and VIP accounts regardless of Stripe fields', () => {
    expect(getEntitlements({ tier: 'student_unlimited', isPremium: true }).isPro).toBe(true);
    expect(getEntitlements({ isVIP: true, isPremium: false, subscriptionStatus: 'canceled' }).access).toBe('student_unlimited');
    expect(getEntitlements({ unlimitedAccess: true }).limits.maxBoards).toBe(Infinity);
  });

  it('keeps legacy supporter limits', () => {
    expect(getEntitlements({ isPremium: true, tier: 'tier1' }).limits).toMatchObject({ maxBoards: 3, maxSavedReferences: 10 });
    expect(getEntitlements({ isPremium: true, tier: 'tier2' }).limits).toMatchObject({ maxBoards: 6, maxSavedReferences: 20 });
    expect(getEntitlements({ isPremium: true, tier: 'tier2' }).canUsePrivateWorkspace).toBe(false);
  });

  it('admins are unlimited unless simulating a tier', () => {
    expect(resolveAccessLevel({ role: 'admin' })).toBe('admin');
    expect(resolveAccessLevel({ role: 'admin', tier: null, isPremium: false })).toBe('admin');
    expect(resolveAccessLevel({ role: 'admin', tier: 'tier1', isPremium: true })).toBe('tier1');
  });
});

describe('describeAccess', () => {
  it('shows what each account is actually billed', () => {
    expect(describeAccess({ isPremium: true, plan: 'pro_monthly', tier: 'tier5' }).price).toBe('$5/mo');
    expect(describeAccess({ isPremium: true, plan: 'pro_annual', tier: 'tier5' }).price).toBe('$45/yr');
    expect(describeAccess({ isPremium: true, tier: 'tier5' }).price).toBe('$5/mo');
    expect(describeAccess({ tier: 'student_unlimited' }).price).toBe('$0/mo');
    expect(describeAccess(null).title).toBe('Free');
  });
});
