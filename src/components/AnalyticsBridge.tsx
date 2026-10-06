'use client';

import { useEffect } from 'react';
import { logEvent } from 'firebase/analytics';
import { analytics } from '@/lib/firebase';
import { setAnalyticsProvider, type AnalyticsEvent } from '@/lib/analytics';

/**
 * Forwards product events from track() to Google Analytics 4 (Firebase
 * Analytics is already loaded with the site's measurement ID). Until this was
 * mounted, every track() call went to a no-op provider, so the upgrade funnel
 * was invisible.
 *
 * GA4 has standard names for the funnel steps; using them makes GA's built-in
 * monetization and funnel reports work without custom configuration.
 */
const GA4_NAMES: Partial<Record<AnalyticsEvent, string>> = {
  checkout_started: 'begin_checkout',
  checkout_completed: 'purchase',
  sign_up: 'sign_up',
};

export function AnalyticsBridge() {
  useEffect(() => {
    if (!analytics) return;
    const ga = analytics;
    setAnalyticsProvider({
      track(event, properties) {
        logEvent(ga, GA4_NAMES[event] ?? event, properties as Record<string, unknown>);
      },
    });
    return () => setAnalyticsProvider(null);
  }, []);
  return null;
}
