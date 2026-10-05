/**
 * Canonical product rules: plans, Stripe prices, entitlements and limits.
 *
 * Every pricing surface, checkout, webhook, sync route and limit check reads
 * from here. Nothing in this file touches Stripe or Firebase, so it is safe to
 * import from both server routes and client components.
 *
 * Product concepts: `free`, `pro_monthly`, `pro_annual`, `student_unlimited`,
 * `admin`. The `tier1`/`tier2`/`tier5` values are legacy $1/$2/$5 supporter
 * subscriptions that still exist in Stripe; they are honoured for existing
 * subscribers but never offered to new buyers.
 */

export type CheckoutPlanId = 'pro_monthly' | 'pro_annual';
export type LegacyTier = 'tier1' | 'tier2' | 'tier5';
/** What a Stripe price grants. */
export type PaidPlanId = CheckoutPlanId | LegacyTier;
/** Stored on `users/{uid}.plan`. */
export type StoredPlan = PaidPlanId | 'free';

/**
 * The access level a profile resolves to. `pro` covers pro_monthly,
 * pro_annual and legacy tier5; `tier1`/`tier2` keep their legacy limits.
 */
export type AccessLevel = 'free' | 'tier1' | 'tier2' | 'pro' | 'student_unlimited' | 'admin';

// Legacy Stripe prices (live). They keep existing subscriptions working and
// are the fallback for Pro monthly until the $9 price is configured.
export const LEGACY_PRICE_IDS: Record<LegacyTier, string> = {
  tier1: 'price_1SFgUc59QHehw05fROtqwkLN', // $1/month "Supporter"
  tier2: 'price_1SFgiV59QHehw05fc0lPRRf7', // $2/month "Super Fan"
  tier5: 'price_1SFgiq59QHehw05fy017h1gR', // $5/month original Pro
};

const LEGACY_PRICE_CENTS: Record<LegacyTier, number> = { tier1: 100, tier2: 200, tier5: 500 };

export const PRO_MONTHLY_CENTS = 500;
export const PRO_ANNUAL_CENTS = 4500;

export interface PriceEnv {
  NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY?: string;
  NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL?: string;
}

/**
 * NEXT_PUBLIC_ values are inlined at build time only when referenced
 * literally, so read them here rather than via `process.env[name]`.
 */
export function readPriceEnv(): PriceEnv {
  return {
    NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
  };
}

function clean(value?: string): string | null {
  const v = value?.trim();
  return v && v.startsWith('price_') ? v : null;
}

export interface ProOffer {
  id: CheckoutPlanId;
  /** Stripe price charged at checkout, or null when this offer is not configured. */
  priceId: string | null;
  available: boolean;
  amountCents: number;
  interval: 'month' | 'year';
  /** True while monthly checkout still falls back to the legacy $5 price. */
  legacyFallback: boolean;
}

/**
 * The offers a new buyer can purchase. Displayed prices always match the
 * price that checkout will charge: until a $9 monthly price is configured,
 * monthly falls back to the legacy $5 price and is shown as $5; annual is
 * unavailable rather than silently charging the monthly price.
 */
export function getProOffers(env: PriceEnv = readPriceEnv()): Record<CheckoutPlanId, ProOffer> {
  const monthly = clean(env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY);
  const annual = clean(env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL);
  return {
    pro_monthly: monthly
      ? { id: 'pro_monthly', priceId: monthly, available: true, amountCents: PRO_MONTHLY_CENTS, interval: 'month', legacyFallback: false }
      : { id: 'pro_monthly', priceId: LEGACY_PRICE_IDS.tier5, available: true, amountCents: LEGACY_PRICE_CENTS.tier5, interval: 'month', legacyFallback: true },
    pro_annual: annual
      ? { id: 'pro_annual', priceId: annual, available: true, amountCents: PRO_ANNUAL_CENTS, interval: 'year', legacyFallback: false }
      : { id: 'pro_annual', priceId: null, available: false, amountCents: PRO_ANNUAL_CENTS, interval: 'year', legacyFallback: false },
  };
}

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return value === 'pro_monthly' || value === 'pro_annual';
}

/**
 * Maps a Stripe price to the plan it grants. Unknown prices grant nothing —
 * a misconfigured price must fail closed, not quietly hand out a tier.
 */
export function planFromPriceId(priceId: string | null | undefined, env: PriceEnv = readPriceEnv()): PaidPlanId | null {
  if (!priceId) return null;
  const monthly = clean(env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY);
  const annual = clean(env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL);
  if (monthly && priceId === monthly) return 'pro_monthly';
  if (annual && priceId === annual) return 'pro_annual';
  if (priceId === 'price_1UJd4X59QHehw05fqbQ2qZLs' || priceId === 'price_1UMth959QHehw05fBF5a7UHD') return 'pro_annual';
  if (priceId === 'price_1UJczS59QHehw05fbqoQC0Po') return 'pro_monthly';
  for (const tier of Object.keys(LEGACY_PRICE_IDS) as LegacyTier[]) {
    if (LEGACY_PRICE_IDS[tier] === priceId) return tier;
  }
  return null;
}

/**
 * The legacy `tier` value mirrored onto the profile for a paid plan. New Pro
 * purchases mirror `tier5` so older clients (and the browser extension) that
 * still check `tier === 'tier5'` keep recognising them as Pro.
 */
export function legacyTierForPlan(plan: PaidPlanId): LegacyTier {
  return plan === 'pro_monthly' || plan === 'pro_annual' ? 'tier5' : plan;
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

export interface PlanLimits {
  maxBoards: number;
  maxSavedReferences: number;
  maxPortfolioPosts: number;
  maxUnlockedReferences: number;
}

export interface Entitlements {
  access: AccessLevel;
  isPro: boolean;
  canCreateUnlimitedBoards: boolean;
  canUsePrivateWorkspace: boolean;
  canUploadPrivateMedia: boolean;
  canPublishShotBreakdowns: boolean;
  canComparePlayblast: boolean;
  canExportHighResolution: boolean;
  canRemoveWatermark: boolean;
  canUseMayaBridge: boolean;
  limits: PlanLimits;
}

const UNLIMITED: PlanLimits = { maxBoards: Infinity, maxSavedReferences: Infinity, maxPortfolioPosts: Infinity, maxUnlockedReferences: Infinity };

export const ACCESS_LIMITS: Record<AccessLevel, PlanLimits> = {
  free: { maxBoards: 1, maxSavedReferences: 5, maxPortfolioPosts: 3, maxUnlockedReferences: 25 },
  tier1: { maxBoards: 3, maxSavedReferences: 10, maxPortfolioPosts: 3, maxUnlockedReferences: 50 },
  tier2: { maxBoards: 6, maxSavedReferences: 20, maxPortfolioPosts: 3, maxUnlockedReferences: 100 },
  pro: UNLIMITED,
  student_unlimited: UNLIMITED,
  admin: UNLIMITED,
};

/** Subscription statuses that keep paid access. `past_due` is Stripe's retry window. */
export const ACCESS_GRANTING_STATUSES = ['active', 'trialing', 'past_due'] as const;
/** Statuses that end paid access even if a stale `isPremium` flag says otherwise. */
export const ACCESS_ENDING_STATUSES = ['canceled', 'unpaid', 'incomplete_expired', 'incomplete', 'paused'] as const;

/**
 * The profile fields entitlements are computed from. On the server these
 * must come from a trusted read (Admin SDK); the Firestore rules stop a
 * client from writing any of them.
 */
export interface EntitlementProfile {
  role?: string | null;
  tier?: string | null;
  plan?: string | null;
  isPremium?: boolean | null;
  subscriptionStatus?: string | null;
  isVIP?: boolean | null;
  unlimitedAccess?: boolean | null;
}

/** True for accounts whose access does not come from Stripe (SJSU, VIP, admin). */
export function hasComplimentaryAccess(profile: EntitlementProfile | null | undefined): boolean {
  if (!profile) return false;
  return profile.role === 'admin' || profile.tier === 'student_unlimited' || profile.isVIP === true || profile.unlimitedAccess === true;
}

export function resolveAccessLevel(profile: EntitlementProfile | null | undefined): AccessLevel {
  if (!profile) return 'free';
  if (profile.role === 'admin') {
    // The admin "Simulate tier" control sets a paid legacy tier to preview
    // its limits; "Reset" clears it back to full admin access.
    const simulating = profile.isPremium === true && (profile.tier === 'tier1' || profile.tier === 'tier2' || profile.tier === 'tier5');
    if (!simulating) return 'admin';
  }
  if (profile.tier === 'student_unlimited' || profile.isVIP === true || profile.unlimitedAccess === true) return 'student_unlimited';

  if (profile.isPremium !== true) return 'free';
  if (profile.subscriptionStatus && (ACCESS_ENDING_STATUSES as readonly string[]).includes(profile.subscriptionStatus)) return 'free';

  if (profile.plan === 'pro_monthly' || profile.plan === 'pro_annual' || profile.plan === 'tier5' || profile.tier === 'tier5') return 'pro';
  if (profile.plan === 'tier2' || profile.tier === 'tier2') return 'tier2';
  // Premium with no recognisable tier gets the smallest paid allowance, not Pro.
  return 'tier1';
}

export function getEntitlements(profile: EntitlementProfile | null | undefined): Entitlements {
  const access = resolveAccessLevel(profile);
  const isPro = access === 'pro' || access === 'student_unlimited' || access === 'admin';
  return {
    access,
    isPro,
    canCreateUnlimitedBoards: isPro,
    canUsePrivateWorkspace: isPro,
    canUploadPrivateMedia: isPro,
    canPublishShotBreakdowns: isPro,
    canComparePlayblast: isPro,
    canExportHighResolution: isPro,
    canRemoveWatermark: isPro,
    canUseMayaBridge: isPro,
    limits: ACCESS_LIMITS[access],
  };
}

// ---------------------------------------------------------------------------
// Display copy — shared by every pricing surface
// ---------------------------------------------------------------------------

export function formatUsd(cents: number): string {
  return cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;
}

/**
 * Features that exist and are gated today. Only add a line here once its
 * happy path is tested and reachable from the product.
 */
export const FREE_FEATURES = [
  `${ACCESS_LIMITS.free.maxUnlockedReferences} library references (re-watch anytime)`,
  'Frame-by-frame playback and speed controls',
  `${ACCESS_LIMITS.free.maxBoards} visual reference board`,
  'Save clips directly to your boards',
  `${ACCESS_LIMITS.free.maxPortfolioPosts} portfolio posts`,
] as const;

export const PRO_FEATURES = [
  'Unlimited visual reference boards',
  'Private boards & private video uploads',
  'Side-by-side synchronized playblast compare',
  'High-resolution contact sheets & PureRef export',
  'Reference MP4 video downloads & exports',
  'Pitch deck & director presentation PDF exports',
  'Unlimited portfolio posts & shot breakdowns',
] as const;

export interface PlanSummary {
  badge: string;
  title: string;
  /** e.g. "$9/mo" — what this account is actually billed. */
  price: string;
  description: string;
}

export function describeAccess(profile: EntitlementProfile | null | undefined): PlanSummary {
  const access = resolveAccessLevel(profile);
  switch (access) {
    case 'admin':
      return { badge: 'ADMIN', title: 'Admin', price: '—', description: 'Full access for site administrators.' };
    case 'student_unlimited':
      return { badge: 'SJSU VIP', title: 'SJSU Unlimited Pass', price: '$0/mo', description: 'Complimentary Pro access for verified SJSU students.' };
    case 'pro': {
      if (profile?.plan === 'pro_annual') return { badge: 'PRO', title: 'Pro (annual)', price: `${formatUsd(PRO_ANNUAL_CENTS)}/yr`, description: 'Unlimited reference boards and private workspaces.' };
      if (profile?.plan === 'pro_monthly') return { badge: 'PRO', title: 'Pro', price: `${formatUsd(PRO_MONTHLY_CENTS)}/mo`, description: 'Unlimited reference boards and private workspaces.' };
      return { badge: 'PRO', title: 'Pro (original)', price: `${formatUsd(LEGACY_PRICE_CENTS.tier5)}/mo`, description: 'Unlimited reference boards and private workspaces.' };
    }
    case 'tier2':
      return { badge: 'SUPER FAN', title: 'Super Fan (legacy)', price: `${formatUsd(LEGACY_PRICE_CENTS.tier2)}/mo`, description: `${ACCESS_LIMITS.tier2.maxBoards} reference boards.` };
    case 'tier1':
      return { badge: 'SUPPORTER', title: 'Supporter (legacy)', price: `${formatUsd(LEGACY_PRICE_CENTS.tier1)}/mo`, description: `${ACCESS_LIMITS.tier1.maxBoards} reference boards.` };
    default:
      return { badge: 'FREE', title: 'Free', price: '$0', description: `${ACCESS_LIMITS.free.maxBoards} active visual reference board.` };
  }
}

/** Short admin-table label for a stored tier/plan value. */
export function planLabel(value: string | null | undefined): string {
  switch (value) {
    case 'pro_monthly': return `Pro ${formatUsd(PRO_MONTHLY_CENTS)}/mo`;
    case 'pro_annual': return `Pro ${formatUsd(PRO_ANNUAL_CENTS)}/yr`;
    case 'tier5': return `Pro ${formatUsd(LEGACY_PRICE_CENTS.tier5)}/mo (legacy)`;
    case 'tier2': return `Super Fan ${formatUsd(LEGACY_PRICE_CENTS.tier2)}/mo (legacy)`;
    case 'tier1': return `Supporter ${formatUsd(LEGACY_PRICE_CENTS.tier1)}/mo (legacy)`;
    case 'student_unlimited': return 'SJSU Unlimited';
    case 'admin': return 'Admin';
    case 'free': case null: case undefined: case '': return 'Free';
    default: return value;
  }
}
