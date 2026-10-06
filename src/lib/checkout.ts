import { getProOffers, isCheckoutPlanId, type CheckoutPlanId, type PriceEnv } from './plans';

export class CheckoutPlanError extends Error {
  constructor(public code: 'INVALID_PLAN' | 'PLAN_UNAVAILABLE', message: string) {
    super(message);
  }
}

/** Resolves a requested plan to the Stripe price that checkout must charge. */
export function priceForCheckout(plan: unknown, env?: PriceEnv): { plan: CheckoutPlanId; priceId: string } {
  if (!isCheckoutPlanId(plan)) throw new CheckoutPlanError('INVALID_PLAN', 'Choose Pro monthly or Pro annual.');
  const offer = getProOffers(env)[plan];
  if (!offer.available || !offer.priceId) {
    throw new CheckoutPlanError('PLAN_UNAVAILABLE', 'Annual billing is not available yet.');
  }
  return { plan, priceId: offer.priceId };
}

export interface CheckoutSessionInput {
  plan: unknown;
  uid: string;
  customerId: string;
  origin: string;
  env?: PriceEnv;
  embedded?: boolean;
  /** Stripe coupon for the first-month intro offer; only applied to Pro monthly. */
  introCouponId?: string | null;
}

/** Parameters for stripe.checkout.sessions.create. */
export function buildCheckoutSessionParams({ plan, uid, customerId, origin, env, embedded, introCouponId }: CheckoutSessionInput) {
  const resolved = priceForCheckout(plan, env);
  const intro = Boolean(introCouponId) && resolved.plan === 'pro_monthly';
  // Stripe rejects `discounts` together with `allow_promotion_codes`.
  const discountParams = intro
    ? { discounts: [{ coupon: introCouponId as string }] }
    : { allow_promotion_codes: true };
  const base = {
    mode: 'subscription' as const,
    customer: customerId,
    client_reference_id: uid,
    metadata: { userId: uid, firebaseUID: uid, plan: resolved.plan, ...(intro ? { offer: 'intro_first_month' } : {}) },
    subscription_data: { metadata: { firebaseUID: uid, plan: resolved.plan } },
    line_items: [{ price: resolved.priceId, quantity: 1 }],
    ...discountParams,
  };

  if (embedded) {
    return {
      ...base,
      ui_mode: 'embedded' as const,
      return_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    };
  }

  return {
    ...base,
    // The profile page syncs from Stripe on ?sync=true, so access appears
    // even if the webhook is slow.
    success_url: `${origin}/profile?sync=true&checkout=success`,
    cancel_url: `${origin}/profile?checkout=canceled`,
  };
}
