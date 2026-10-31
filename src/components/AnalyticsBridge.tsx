'use client';

import { useEffect, useRef } from 'react';
import { logEvent, setUserId, setUserProperties } from 'firebase/analytics';
import { analytics } from '@/lib/firebase';
import { setAnalyticsProvider, type AnalyticsEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Forwards product events from track() to Google Analytics 4 (Firebase
 * Analytics is already loaded with the site's measurement ID).
 *
 * Tracks Member vs Guest user properties across all GA4 reports, Explorations,
 * and Audiences so you can compare signed-up members vs unauthenticated guests.
 */
const GA4_NAMES: Partial<Record<AnalyticsEvent, string>> = {
  checkout_started: 'begin_checkout',
  checkout_completed: 'purchase',
  sign_up: 'sign_up',
};

export function AnalyticsBridge() {
  const { user, loading: authLoading } = useAuth();
  const { userProfile } = useUser();
  const lastTrackedAuthRef = useRef<string | null>(null);

  // Sync Google Analytics (gtag and Firebase Analytics) with User Auth Status:
  // Allows GA4 to segment and compare Members vs Guests in all reports
  useEffect(() => {
    if (authLoading) return;

    const isMember = !!user;
    const isPro = Boolean((userProfile as any)?.isPro || userProfile?.isPremium || userProfile?.plan === 'pro_monthly' || userProfile?.plan === 'pro_annual');
    const authKey = isMember ? `member:${user.uid}:${isPro ? 'pro' : 'free'}` : 'guest';

    if (lastTrackedAuthRef.current === authKey) return;
    lastTrackedAuthRef.current = authKey;

    const userType = isMember ? 'member' : 'guest';
    const plan = isMember ? (isPro ? 'pro' : (userProfile?.plan || 'free')) : 'guest';

    // 1. Firebase Analytics
    if (analytics) {
      if (isMember) {
        setUserId(analytics, user.uid);
      }
      setUserProperties(analytics, {
        user_type: userType,
        logged_in: isMember ? 'true' : 'false',
        membership_tier: plan,
      });
    }

    // 2. Google Tag (gtag.js)
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('set', 'user_properties', {
        user_type: userType,
        logged_in: isMember ? 'true' : 'false',
        membership_tier: plan,
      });

      if (isMember) {
        window.gtag('config', 'G-PR79SNDBLG', {
          user_id: user.uid,
        });
      }

      window.gtag('event', 'user_status_sync', {
        user_type: userType,
        logged_in: isMember ? 'true' : 'false',
        membership_tier: plan,
      });
    }
  }, [user, userProfile, authLoading]);

  useEffect(() => {
    if (!analytics) return;
    const ga = analytics;
    setAnalyticsProvider({
      track(event, properties) {
        logEvent(ga, GA4_NAMES[event] ?? event, properties as Record<string, unknown>);
        if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
          window.gtag('event', GA4_NAMES[event] ?? event, properties as Record<string, unknown>);
        }
      },
    });
    return () => setAnalyticsProvider(null);
  }, []);

  return null;
}
