import { describe, expect, it } from 'vitest';
import { getIntroOffer, isIntroEligible } from '@/lib/plans';
import { buildCheckoutSessionParams } from '@/lib/checkout';

const env = { NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_monthly', NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: 'price_annual' };

describe('getIntroOffer', () => {
  it('is off unless configured', () => {
    expect(getIntroOffer(env)).toBeNull();
  });

  it('returns the configured first-month price', () => {
    expect(getIntroOffer({ ...env, NEXT_PUBLIC_PRO_INTRO_FIRST_MONTH_CENTS: '100' })).toEqual({ amountCents: 100 });
  });

  it('ignores nonsense or prices that are not a discount', () => {
    expect(getIntroOffer({ ...env, NEXT_PUBLIC_PRO_INTRO_FIRST_MONTH_CENTS: 'abc' })).toBeNull();
    expect(getIntroOffer({ ...env, NEXT_PUBLIC_PRO_INTRO_FIRST_MONTH_CENTS: '0' })).toBeNull();
    expect(getIntroOffer({ ...env, NEXT_PUBLIC_PRO_INTRO_FIRST_MONTH_CENTS: '900' })).toBeNull();
  });
});

describe('isIntroEligible', () => {
  it('offers it to visitors and accounts that never subscribed', () => {
    expect(isIntroEligible(null)).toBe(true);
    expect(isIntroEligible({ role: 'user' })).toBe(true);
    expect(isIntroEligible({ role: 'user', subscriptionStatus: 'none' })).toBe(true);
  });

  it('hides it from past and current subscribers', () => {
    expect(isIntroEligible({ role: 'user', subscriptionStatus: 'canceled', isPremium: false })).toBe(false);
    expect(isIntroEligible({ role: 'user', isPremium: true, tier: 'tier5', plan: 'pro_monthly', subscriptionStatus: 'active' })).toBe(false);
    expect(isIntroEligible({ role: 'user', isPremium: true, tier: 'tier1', subscriptionStatus: 'active' })).toBe(false);
  });
});

describe('checkout with the intro coupon', () => {
  const base = { uid: 'u1', customerId: 'cus_1', origin: 'https://animationreference.org', env };

  it('applies the coupon to Pro monthly and drops promo-code entry (Stripe rejects both)', () => {
    const p = buildCheckoutSessionParams({ ...base, plan: 'pro_monthly', introCouponId: 'PRO_FIRST_MONTH_1' }) as Record<string, any>;
    expect(p.discounts).toEqual([{ coupon: 'PRO_FIRST_MONTH_1' }]);
    expect(p.allow_promotion_codes).toBeUndefined();
    expect(p.metadata.offer).toBe('intro_first_month');
  });

  it('never applies it to the annual plan', () => {
    const p = buildCheckoutSessionParams({ ...base, plan: 'pro_annual', introCouponId: 'PRO_FIRST_MONTH_1' }) as Record<string, any>;
    expect(p.discounts).toBeUndefined();
    expect(p.allow_promotion_codes).toBe(true);
  });

  it('keeps promo codes when there is no intro coupon', () => {
    const p = buildCheckoutSessionParams({ ...base, plan: 'pro_monthly' }) as Record<string, any>;
    expect(p.discounts).toBeUndefined();
    expect(p.allow_promotion_codes).toBe(true);
  });
});
