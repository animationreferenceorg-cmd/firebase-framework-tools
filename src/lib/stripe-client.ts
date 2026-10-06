import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { PUBLIC_CONFIG_DEFAULTS, withDefault } from './public-config';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Returns a cached Stripe client initialized with NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
 * Returns null if the publishable key is not set.
 */
export function getStripeClient(): Promise<Stripe | null> {
  const key = withDefault(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, PUBLIC_CONFIG_DEFAULTS.STRIPE_PUBLISHABLE_KEY);
  if (!key) {
    return Promise.resolve(null);
  }
  if (!stripePromise) {
    // loadStripe rejects when js.stripe.com can't load (ad/privacy blockers,
    // strict tracking prevention, flaky networks). Resolve to null instead so
    // callers fall back to hosted checkout, and allow a retry next time.
    stripePromise = loadStripe(key).catch((err) => {
      console.warn('[stripe] Stripe.js failed to load; using hosted checkout instead.', err);
      stripePromise = null;
      return null;
    });
  }
  return stripePromise;
}
