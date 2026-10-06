/**
 * Public (non-secret) billing configuration with built-in defaults.
 *
 * Production builds on Firebase App Hosting have not received the plain
 * `value` entries in apphosting.yaml (verified Oct 2026: builds only see the
 * backend's console variables), which left the live site without the Pro
 * price IDs, the publishable key and the intro offer, so annual checkout
 * failed and monthly fell back to the legacy price. None of these values are
 * secret, so they live here; an environment variable, when present, still
 * wins. Secrets (STRIPE_SECRET_KEY etc.) stay in the backend configuration.
 */

export const PUBLIC_CONFIG_DEFAULTS = {
  /** Pro monthly, $5/month (live mode). */
  STRIPE_PRICE_PRO_MONTHLY: 'price_1UJczS59QHehw05fbqoQC0Po',
  /** Pro annual, $45/year (live mode). */
  STRIPE_PRICE_PRO_ANNUAL: 'price_1UJd4X59QHehw05fqbQ2qZLs',
  STRIPE_PUBLISHABLE_KEY: 'pk_live_51SFfWk59QHehw05fAQmlkaJZ6ys02e7g5EwfG44sUIkSvC0F6fos5TyfIzMvCHAoMrI7piuOdUfwglN7jh2CFAuK00pBgZ4uI7',
  /** First month of Pro monthly for new subscribers, in cents. "0" in env turns the offer off. */
  PRO_INTRO_FIRST_MONTH_CENTS: '100',
  /** Stripe coupon applied for the intro offer. "none" in env turns it off. */
  STRIPE_PRO_INTRO_COUPON_ID: 'PRO_FIRST_MONTH_1',
} as const;

/** Env value if set (non-empty), otherwise the default. */
export function withDefault(envValue: string | undefined, fallback: string): string {
  const v = envValue?.trim();
  return v ? v : fallback;
}
