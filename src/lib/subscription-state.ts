/**
 * Turns Stripe subscription state into the billing fields stored on a user
 * profile. Stripe is the source of truth: callers fetch the customer's current
 * subscriptions and write the result of `billingUpdateFor`, instead of trusting
 * whatever a single (possibly out-of-order) event says.
 *
 * Pure functions only — no Stripe or Firebase imports — so the webhook, the
 * sync routes and the tests share exactly one implementation.
 */

import {
  ACCESS_GRANTING_STATUSES,
  hasComplimentaryAccess,
  legacyTierForPlan,
  planFromPriceId,
  readPriceEnv,
  type EntitlementProfile,
  type LegacyTier,
  type PaidPlanId,
  type PriceEnv,
  type StoredPlan,
} from './plans';

/** The subset of a Stripe.Subscription this module reads. */
export interface SubscriptionLike {
  id: string;
  status: string;
  created: number;
  items: { data: Array<{ price: { id: string } }> };
}

export interface BillingState {
  isPremium: boolean;
  tier: LegacyTier | null;
  plan: StoredPlan;
  subscriptionStatus: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
}

const STATUS_RANK: Record<string, number> = { active: 3, trialing: 2, past_due: 1 };
const PLAN_RANK: Record<PaidPlanId, number> = { pro_annual: 5, pro_monthly: 4, tier5: 3, tier2: 2, tier1: 1 };

function grantsAccess(status: string): boolean {
  return (ACCESS_GRANTING_STATUSES as readonly string[]).includes(status);
}

/**
 * Picks the subscription that should decide access when a customer has
 * several (an old canceled one next to a reactivated one, say). A granting
 * status on a recognised price always wins; among those, healthier status,
 * then higher plan, then newest.
 */
export function pickGoverningSubscription(subs: SubscriptionLike[], env: PriceEnv = readPriceEnv()) {
  const candidates = subs
    .map((sub) => ({ sub, plan: planFromPriceId(sub.items.data[0]?.price?.id, env) }))
    .filter((c): c is { sub: SubscriptionLike; plan: PaidPlanId } => c.plan !== null && grantsAccess(c.sub.status));

  candidates.sort(
    (a, b) =>
      (STATUS_RANK[b.sub.status] ?? 0) - (STATUS_RANK[a.sub.status] ?? 0) ||
      PLAN_RANK[b.plan] - PLAN_RANK[a.plan] ||
      b.sub.created - a.sub.created
  );
  return candidates[0] ?? null;
}

export function billingStateFromSubscriptions(subs: SubscriptionLike[], env: PriceEnv = readPriceEnv()): BillingState {
  const governing = pickGoverningSubscription(subs, env);
  if (governing) {
    return {
      isPremium: true,
      tier: legacyTierForPlan(governing.plan),
      plan: governing.plan,
      subscriptionStatus: governing.sub.status,
      stripeSubscriptionId: governing.sub.id,
      stripePriceId: governing.sub.items.data[0]?.price?.id ?? null,
    };
  }

  // No access. Record the newest subscription's status so support can see
  // why (canceled, unpaid, incomplete_expired…), or 'none' if there is none.
  const newest = [...subs].sort((a, b) => b.created - a.created)[0];
  return {
    isPremium: false,
    tier: null,
    plan: 'free',
    subscriptionStatus: newest?.status ?? 'none',
    stripeSubscriptionId: newest?.id ?? null,
    stripePriceId: newest?.items.data[0]?.price?.id ?? null,
  };
}

/**
 * The Firestore update for a profile given its Stripe billing state.
 *
 * Complimentary access (SJSU, VIP, admin) is not Stripe's to revoke: for those
 * accounts only the Stripe bookkeeping fields are written, never
 * `isPremium`/`tier`.
 */
export function billingUpdateFor(
  profile: EntitlementProfile | null | undefined,
  billing: BillingState,
  opts: { stripeCustomerId?: string | null; now?: Date } = {}
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    plan: billing.plan,
    subscriptionStatus: billing.subscriptionStatus,
    stripeSubscriptionId: billing.stripeSubscriptionId,
    stripePriceId: billing.stripePriceId,
    billingUpdatedAt: (opts.now ?? new Date()).toISOString(),
  };
  if (opts.stripeCustomerId) update.stripeCustomerId = opts.stripeCustomerId;
  if (!hasComplimentaryAccess(profile)) {
    update.isPremium = billing.isPremium;
    update.tier = billing.tier;
  }
  return update;
}
