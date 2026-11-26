import type Stripe from 'stripe';
import { getProOffers, isCheckoutPlanId, type CheckoutPlanId, type IntroOffer, type PriceEnv } from './plans';

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
  /** Stripe coupon for 1-month intro offers; only applied to Pro monthly. */
  introCouponId?: string | null;
  /** Multi-month upfront intro offer (e.g. Black Friday: $1 total for 3 months, then $5/mo). */
  introOffer?: IntroOffer | null;
}

/** Parameters for stripe.checkout.sessions.create. */
export function buildCheckoutSessionParams({
  plan,
  uid,
  customerId,
  origin,
  env,
  embedded,
  introCouponId,
  introOffer,
}: CheckoutSessionInput) {
  const resolved = priceForCheckout(plan, env);
  const isMultiMonthDeal = Boolean(introOffer && introOffer.months >= 2 && resolved.plan === 'pro_monthly');
  const isSingleMonthCoupon = !isMultiMonthDeal && Boolean(introCouponId) && resolved.plan === 'pro_monthly';

  // Multi-month global Black Friday deal ($1 total for 3 months, then $5/mo recurring):
  // Charges $1.00 immediately as a one-time pass line item while starting the $5/mo Pro
  // subscription with a 90-day trial (`trialing` grants full Pro access immediately).
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = isMultiMonthDeal && introOffer
    ? [
        { price: resolved.priceId, quantity: 1 },
        {
          price_data: {
            currency: 'usd',
            unit_amount: introOffer.amountCents,
            product_data: {
              name: `${introOffer.label} — ${introOffer.months} Months of AnimationReference Pro`,
              description: `$${(introOffer.amountCents / 100).toFixed(introOffer.amountCents % 100 === 0 ? 0 : 2)} total for your first ${introOffer.months} months, then $5/month. Cancel anytime.`,
            },
          },
          quantity: 1,
        },
      ]
    : [{ price: resolved.priceId, quantity: 1 }];

  const subMetadata: Record<string, string> = {
    firebaseUID: uid,
    plan: resolved.plan,
    ...(isMultiMonthDeal && introOffer ? { offer: `black_friday_${introOffer.months}m_${introOffer.amountCents}c` } : {}),
  };

  const subscriptionData = isMultiMonthDeal && introOffer
    ? { trial_period_days: introOffer.months * 30, metadata: subMetadata }
    : { metadata: subMetadata };

  // Stripe rejects `discounts` together with `allow_promotion_codes`.
  const discountParams = isMultiMonthDeal
    ? {}
    : isSingleMonthCoupon
    ? { discounts: [{ coupon: introCouponId as string }] }
    : { allow_promotion_codes: true };

  const offerTag = isMultiMonthDeal && introOffer
    ? `black_friday_${introOffer.months}m_${introOffer.amountCents}c`
    : isSingleMonthCoupon
    ? 'intro_first_month'
    : undefined;

  const base = {
    mode: 'subscription' as const,
    locale: 'auto' as const,
    customer: customerId,
    client_reference_id: uid,
    metadata: { userId: uid, firebaseUID: uid, plan: resolved.plan, ...(offerTag ? { offer: offerTag } : {}) },
    subscription_data: subscriptionData,
    line_items: lineItems,
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
