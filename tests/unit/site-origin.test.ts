import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANONICAL_ORIGIN, publicOrigin } from '@/lib/site-origin';
import { buildCheckoutSessionParams } from '@/lib/checkout';

const headers = (h: Record<string, string>) => new Headers(h);

describe('publicOrigin', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('never returns the container address App Hosting sees internally', () => {
    // What production sent to Stripe before this fix: https://0.0.0.0:8080/checkout/return
    expect(publicOrigin(headers({ host: '0.0.0.0:8080' }))).toBe(CANONICAL_ORIGIN);
  });

  it('uses the forwarded host when it is our domain', () => {
    expect(publicOrigin(headers({ host: '0.0.0.0:8080', 'x-forwarded-host': 'animationreference.org' }))).toBe('https://animationreference.org');
    expect(publicOrigin(headers({ 'x-forwarded-host': 'www.animationreference.org' }))).toBe('https://www.animationreference.org');
  });

  it('ignores a spoofed host so paying users cannot be redirected elsewhere', () => {
    expect(publicOrigin(headers({ host: 'evil.example', 'x-forwarded-host': 'evil.example' }))).toBe(CANONICAL_ORIGIN);
  });

  it('keeps local development working', () => {
    expect(publicOrigin(headers({ host: 'localhost:3001' }))).toBe('http://localhost:3001');
  });

  it('prefers an explicitly configured site URL', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://staging.animationreference.org/');
    expect(publicOrigin(headers({ host: '0.0.0.0:8080' }))).toBe('https://staging.animationreference.org');
  });

  it('produces a checkout return URL customers can actually reach', () => {
    const params = buildCheckoutSessionParams({
      plan: 'pro_monthly',
      uid: 'u1',
      customerId: 'cus_1',
      origin: publicOrigin(headers({ host: '0.0.0.0:8080' })),
      embedded: true,
      env: { NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: 'price_monthly' },
    }) as { return_url?: string };
    expect(params.return_url).toBe('https://animationreference.org/checkout/return?session_id={CHECKOUT_SESSION_ID}');
  });
});
