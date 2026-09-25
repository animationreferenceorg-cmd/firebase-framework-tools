/**
 * Server-only glue between Stripe, Firestore (Admin SDK) and the pure billing
 * logic. Used by the webhook and the on-demand sync routes.
 */

import type Stripe from 'stripe';
import type { Firestore } from 'firebase-admin/firestore';
import { billingStateFromSubscriptions, billingUpdateFor, type BillingState } from './subscription-state';
import type { WebhookDeps } from './stripe-webhook';

const MAX_LOOKUP = 5;

export async function listCustomerSubscriptions(stripe: Stripe, customerId: string) {
  const res = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  return res.data;
}

export function createWebhookDeps(stripe: Stripe, db: Firestore): WebhookDeps {
  const users = db.collection('users');
  return {
    listSubscriptions: (customerId) => listCustomerSubscriptions(stripe, customerId),
    async getCustomer(customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || (customer as Stripe.DeletedCustomer).deleted) return null;
      const c = customer as Stripe.Customer;
      return { email: c.email, metadata: c.metadata };
    },
    async getProfile(uid) {
      const snap = await users.doc(uid).get();
      return snap.exists ? (snap.data() as Record<string, unknown>) : null;
    },
    async findUserIdsByCustomerId(customerId) {
      const snap = await users.where('stripeCustomerId', '==', customerId).limit(MAX_LOOKUP).get();
      return snap.docs.map((d) => d.id);
    },
    async findUserIdsByEmail(email) {
      const snap = await users.where('email', '==', email).limit(MAX_LOOKUP).get();
      return snap.docs.map((d) => d.id);
    },
    async updateUser(uid, data) {
      await users.doc(uid).set(data, { merge: true });
    },
    log: (message) => console.warn(message),
  };
}

// Firebase UIDs are alphanumeric; anything else must not reach a search query.
const SAFE_UID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Finds every Stripe customer that belongs to this user. Email lookup is only
 * used when the email is verified — otherwise anyone could register with a
 * subscriber's address and inherit their plan.
 */
export async function findCustomerIdsForUser(
  stripe: Stripe,
  db: Firestore,
  uid: string,
  opts: { verifiedEmail?: string | null }
): Promise<string[]> {
  const ids = new Set<string>();

  const [userDoc, customerDoc] = await Promise.all([
    db.collection('users').doc(uid).get(),
    db.collection('customers').doc(uid).get(), // written by the Stripe Firebase extension
  ]);
  const stored = userDoc.data()?.stripeCustomerId;
  if (typeof stored === 'string' && stored) ids.add(stored);
  const extensionId = customerDoc.data()?.stripeId;
  if (typeof extensionId === 'string' && extensionId) ids.add(extensionId);

  if (SAFE_UID.test(uid)) {
    try {
      const found = await stripe.customers.search({ query: `metadata['firebaseUID']:'${uid}'`, limit: MAX_LOOKUP });
      found.data.forEach((c) => ids.add(c.id));
    } catch (err) {
      console.warn('[stripe-sync] Customer search unavailable:', (err as Error).message);
    }
  }

  if (opts.verifiedEmail) {
    const byEmail = await stripe.customers.list({ email: opts.verifiedEmail, limit: MAX_LOOKUP });
    byEmail.data.forEach((c) => ids.add(c.id));
  }

  return Array.from(ids);
}

export interface UserSyncResult {
  billing: BillingState;
  customerId: string | null;
  customerIds: string[];
}

/** Recomputes a user's billing fields from Stripe and writes them. */
export async function syncUserFromStripe(
  stripe: Stripe,
  db: Firestore,
  uid: string,
  opts: { verifiedEmail?: string | null }
): Promise<UserSyncResult> {
  const customerIds = await findCustomerIdsForUser(stripe, db, uid, opts);

  const perCustomer = await Promise.all(
    customerIds.map(async (id) => ({ id, subs: await listCustomerSubscriptions(stripe, id) }))
  );
  const allSubs = perCustomer.flatMap((c) => c.subs);
  const billing = billingStateFromSubscriptions(allSubs);
  const owning = billing.stripeSubscriptionId
    ? perCustomer.find((c) => c.subs.some((s) => s.id === billing.stripeSubscriptionId))?.id ?? null
    : null;

  const profile = (await db.collection('users').doc(uid).get()).data() ?? null;
  await db
    .collection('users')
    .doc(uid)
    .set(billingUpdateFor(profile, billing, { stripeCustomerId: owning ?? profile?.stripeCustomerId ?? customerIds[0] ?? null }), { merge: true });

  return { billing, customerId: owning, customerIds };
}
