# Development, tests and billing setup

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (port 3000 by default; `npx next dev -p 3002` to match the tests). |
| `npm run typecheck` | `tsc --noEmit`. `next build` skips type errors (`ignoreBuildErrors`), so run this separately. |
| `npm run lint` | ESLint. Also skipped by `next build` (`ignoreDuringBuilds`). |
| `npm test` | Vitest unit + route-integration tests (`tests/unit`, `tests/integration`). No network, no emulator. |
| `npm run test:e2e` | Playwright smoke tests (`tests/e2e`). Starts `next dev -p 3002` or reuses a running one. |
| `npm run test:rules` | Firestore rules tests against the Firebase emulator (`tests/rules`). **Requires Java 11+ on PATH.** |
| `npm run build` | Production build. The `prebuild` step regenerates `public/data/videos-snapshot.json` from Firestore. |
| `npm run check` | typecheck + lint + unit tests. Run before every commit. |

Playwright tips:

- Use an installed browser instead of downloading one: `PLAYWRIGHT_CHANNEL=msedge npm run test:e2e`, or run `npx playwright install chromium` once.
- Test a deployment: `PLAYWRIGHT_BASE_URL=https://animationreference.org npm run test:e2e`.
- Only tests tagged `@mobile` run in the mobile project.

Environment variables are listed, without values, in [`.env.example`](../.env.example).

## Billing model

All plan rules live in [`src/lib/plans.ts`](../src/lib/plans.ts). It holds prices, entitlements, limits, legacy tiers and display copy. Pricing screens, limit checks and server routes all read it.

- **Offers for new buyers:** `pro_monthly` at $9 and `pro_annual` at $79. The price IDs come from `NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY` and `NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL`. What the site shows always matches what checkout charges:
  - If the monthly variable is unset, checkout uses the legacy $5 price and the site shows $5.
  - If the annual variable is unset, the annual option is hidden and the server refuses annual checkout.
- **Legacy plans:** `tier1` ($1), `tier2` ($2) and `tier5` (the original $5 Pro) keep working for existing subscribers but are not sold anymore.
- **Complimentary access:** SJSU and VIP accounts (`tier: 'student_unlimited'`, `isVIP`, `unlimitedAccess`) and admins. Stripe never removes this access.
- **Checkout:** `POST /api/checkout` with body `{ plan }`. The server picks the price, so the client never sends a price ID.
- **Source of truth:** `POST /api/webhooks/stripe`. On every handled event it re-reads the customer's subscriptions from Stripe, so duplicate or out-of-order events end up in the same state. The logic is in [`src/lib/stripe-webhook.ts`](../src/lib/stripe-webhook.ts) and [`src/lib/subscription-state.ts`](../src/lib/subscription-state.ts).
- **Subscription statuses:** Access comes from the healthiest subscription on a recognised price.

  | Status | Access |
  | --- | --- |
  | `active`, `trialing` | Access |
  | `past_due` | Access (Stripe's retry window) |
  | `unpaid`, `canceled`, `incomplete`, `incomplete_expired`, `paused` | No access |

- **Other sync routes:** `/api/sync-stripe` (after checkout or the billing portal) and `/api/check-subscription` (before checkout) share the same logic. They only look customers up by email when Firebase has verified that email.
- **Firestore rules:** clients cannot write any entitlement field:
  - `role`, `isPremium`, `tier`, `plan`, `subscriptionStatus`
  - `stripe*`, `isVIP`, `unlimitedAccess`, `isStudent`
  - Stripe's `customers/{uid}.stripeId`

  Only the server (Admin SDK) and admins can set them.

## One-time Stripe and Firebase setup (human)

1. **Create the prices** in Stripe (live mode), under one "AnimationReference Pro" product:
   - $9.00 USD monthly (recurring).
   - $79.00 USD yearly (recurring).
2. **Set the price IDs** as plain (non-secret) env vars in `apphosting.yaml`. They are public IDs, and they must be available at build time and at runtime:
   ```yaml
   - variable: NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
     value: price_...
     availability: [BUILD, RUNTIME]
   - variable: NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL
     value: price_...
     availability: [BUILD, RUNTIME]
   ```
3. **Register the webhook** in Stripe → Developers → Webhooks:
   - **Endpoint URL:** `https://animationreference.org/api/webhooks/stripe`
   - **Events:**
     - `checkout.session.completed`
     - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`
     - `invoice.paid`, `invoice.payment_failed`
   - **Signing secret:** store it as the `STRIPE_WEBHOOK_SECRET` secret in Secret Manager.
4. **Configure the billing portal** (Stripe → Settings → Billing → Customer portal): allow cancellation, and allow switching between the monthly and annual Pro prices.
5. **Deploy the rules:** `firebase deploy --only firestore:rules`. Run `npm run test:rules` first, on a machine with Java.
6. **Backfill existing subscribers once:** after the webhook is live, have each paying user (or an admin, from `/admin/users`) run a sync. This clears any `past_due` or canceled subscription that still shows as premium.
