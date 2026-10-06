/**
 * Product analytics behind a provider interface. The default provider is a
 * no-op (it logs in development), so events can be instrumented now and a
 * real provider plugged in later with `setAnalyticsProvider`.
 *
 * Privacy: only allow-listed, non-identifying properties are forwarded. Never
 * pass private media, notes, search text, emails or names — they are dropped.
 */

export const ANALYTICS_EVENTS = [
  'search_completed',
  'reference_saved',
  'project_created',
  'template_selected',
  'compare_opened',
  'playblast_loaded',
  'contact_sheet_generated',
  'drawover_saved',
  'export_completed',
  'upgrade_prompt_viewed',
  'checkout_started',
  'checkout_completed',
  'subscription_canceled',
  'sign_up',
  'signup_prompt_clicked',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** Property keys that may leave the app. Anything else is stripped. */
export const ALLOWED_PROPERTIES = [
  'source',
  'project_id',
  'plan',
  'trigger',
  'template',
  'result_count',
  'fps',
  'format',
  'status',
  // GA4 monetization: purchase value and currency.
  'value',
  'currency',
] as const;

export type AnalyticsProperty = (typeof ALLOWED_PROPERTIES)[number];
export type AnalyticsProperties = Partial<Record<AnalyticsProperty, string | number | boolean | null>>;

export interface AnalyticsProvider {
  track(event: AnalyticsEvent, properties: AnalyticsProperties): void;
}

export const noopProvider: AnalyticsProvider = {
  track(event, properties) {
    if (process.env.NODE_ENV === 'development') console.debug('[analytics]', event, properties);
  },
};

let provider: AnalyticsProvider = noopProvider;

export function setAnalyticsProvider(next: AnalyticsProvider | null) {
  provider = next ?? noopProvider;
}

const MAX_STRING = 80;

export function sanitizeProperties(input: Record<string, unknown> = {}): AnalyticsProperties {
  const out: AnalyticsProperties = {};
  for (const key of ALLOWED_PROPERTIES) {
    const value = input[key];
    if (value === undefined) continue;
    if (value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
      out[key] = value as AnalyticsProperties[typeof key];
    } else if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING);
    }
  }
  return out;
}

/** Records an event. Never throws — analytics must not break the product. */
export function track(event: AnalyticsEvent, properties?: Record<string, unknown>) {
  try {
    provider.track(event, sanitizeProperties(properties));
  } catch {
    // Swallow provider failures.
  }
}
