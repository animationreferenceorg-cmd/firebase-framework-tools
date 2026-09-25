/**
 * Stripe webhook event handling, separated from the route so it can be tested
 * with fakes. Every handled event re-reads the customer's subscriptions from
 * Stripe and writes the resulting state, so duplicate or out-of-order
 * deliveries converge on the same answer.
 */

import { billingStateFromSubscriptions, billingUpdateFor, type SubscriptionLike } from './subscription-state';
import type { EntitlementProfile, PriceEnv } from './plans';

export interface WebhookEventLike {
  id: string;
  type: string;
  data: { object: any };
}

export interface WebhookDeps {
  listSubscriptions(customerId: string): Promise<SubscriptionLike[]>;
  getCustomer(customerId: string): Promise<{ email?: string | null; metadata?: Record<string, string> } | null>;
  getProfile(uid: string): Promise<(EntitlementProfile & Record<string, unknown>) | null>;
  findUserIdsByCustomerId(customerId: string): Promise<string[]>;
  findUserIdsByEmail(email: string): Promise<string[]>;
  updateUser(uid: string, data: Record<string, unknown>): Promise<void>;
  env?: PriceEnv;
  now?: () => Date;
  log?: (message: string) => void;
}

export const HANDLED_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

export interface WebhookResult {
  handled: boolean;
  customerId?: string;
  userIds: string[];
}

function idOf(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { id?: unknown }).id === 'string') return (value as { id: string }).id;
  return null;
}

async function resolveUserIds(customerId: string, deps: WebhookDeps): Promise<string[]> {
  const linked = await deps.findUserIdsByCustomerId(customerId);
  if (linked.length) return linked;

  const customer = await deps.getCustomer(customerId);
  const uid = customer?.metadata?.firebaseUID || customer?.metadata?.userId;
  if (uid && (await deps.getProfile(uid))) return [uid];

  // Last resort: a single account with the billing email. Ambiguous matches
  // are skipped rather than guessed at.
  if (customer?.email) {
    const byEmail = await deps.findUserIdsByEmail(customer.email);
    if (byEmail.length === 1) return byEmail;
    if (byEmail.length > 1) deps.log?.(`[stripe-webhook] ${byEmail.length} users share the billing email for ${customerId}; not linking.`);
  }
  return [];
}

async function syncCustomer(customerId: string, userIds: string[], deps: WebhookDeps) {
  const subs = await deps.listSubscriptions(customerId);
  const billing = billingStateFromSubscriptions(subs, deps.env);
  for (const uid of userIds) {
    const profile = await deps.getProfile(uid);
    await deps.updateUser(uid, billingUpdateFor(profile, billing, { stripeCustomerId: customerId, now: deps.now?.() }));
  }
}

export async function handleStripeEvent(event: WebhookEventLike, deps: WebhookDeps): Promise<WebhookResult> {
  if (!(HANDLED_EVENT_TYPES as readonly string[]).includes(event.type)) {
    return { handled: false, userIds: [] };
  }

  const object = event.data.object ?? {};
  const customerId = idOf(object.customer);
  if (!customerId) {
    deps.log?.(`[stripe-webhook] ${event.type} ${event.id} has no customer; skipping.`);
    return { handled: true, userIds: [] };
  }

  let userIds: string[] = [];
  if (event.type === 'checkout.session.completed') {
    const uid = object.client_reference_id || object.metadata?.userId || object.metadata?.firebaseUID;
    if (uid && (await deps.getProfile(uid))) userIds = [uid];
  }
  if (!userIds.length) userIds = await resolveUserIds(customerId, deps);

  if (!userIds.length) {
    deps.log?.(`[stripe-webhook] No user found for customer ${customerId} (${event.type}).`);
    return { handled: true, customerId, userIds };
  }

  await syncCustomer(customerId, userIds, deps);
  return { handled: true, customerId, userIds };
}
