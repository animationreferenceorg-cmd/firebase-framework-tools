/**
 * Partner Click & Referral Tracking Utility
 *
 * Tracks traffic and outbound referrals sent to partners (primarily anim.works).
 * Dispatches events to:
 * 1. Google Analytics 4 (gtag.js and Firebase Analytics)
 * 2. Internal Firestore telemetry API for real-time admin reporting
 * 3. Appends UTM tracking tags (utm_source=animationreference) so Anim.works can
 *    measure incoming referral traffic in their own analytics dashboard.
 */

import { track } from '@/lib/analytics';

export interface PartnerClickParams {
  targetUrl: string;
  source: 'marketplace_banner' | 'marketplace_product' | 'sidebar_tab' | 'animworks_modal' | string;
  itemTitle?: string;
  userType?: 'member' | 'guest';
  userId?: string | null;
}

/**
 * Ensures outbound links to anim.works have clean attribution UTM parameters
 * so the anim.works owner can identify animationreference.org traffic in GA4 / Shopify / Plausible.
 */
export function buildAnimWorksUrl(
  rawUrl?: string,
  params?: {
    source?: string;
    campaign?: string;
    content?: string;
  }
): string {
  const fallback = 'https://anim.works/';
  const input = rawUrl?.trim() || fallback;

  try {
    const url = new URL(input, 'https://anim.works');
    // Decorate anim.works domains
    if (url.hostname.includes('anim.works')) {
      if (!url.searchParams.has('utm_source')) {
        url.searchParams.set('utm_source', 'animationreference');
      }
      if (!url.searchParams.has('utm_medium')) {
        url.searchParams.set('utm_medium', 'partner_marketplace');
      }
      if (!url.searchParams.has('utm_campaign')) {
        url.searchParams.set('utm_campaign', params?.campaign || 'marketplace_tab');
      }
      if (params?.source && !url.searchParams.has('utm_content')) {
        url.searchParams.set('utm_content', params.source);
      }
      return url.toString();
    }
  } catch {
    // Return original if parsing fails
  }

  return input;
}

/**
 * Fires when a user clicks any outbound link, banner, or product card that sends traffic to anim.works.
 */
export function trackAnimWorksClick({
  targetUrl,
  source,
  itemTitle,
  userType = 'guest',
  userId,
}: PartnerClickParams): string {
  const decoratedUrl = buildAnimWorksUrl(targetUrl, {
    source,
    campaign: 'marketplace_outbound',
    content: itemTitle,
  });

  // 1. Google Analytics 4: Custom partner tracking event
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'anim_works_click', {
      event_category: 'outbound_partner',
      partner: 'anim.works',
      destination_url: decoratedUrl,
      click_source: source,
      item_title: itemTitle || 'Visit Anim.works',
      user_type: userType,
    });

    // Standard GA4 outbound click event for standard GA4 Outbound Clicks report
    window.gtag('event', 'click', {
      outbound: true,
      link_domain: 'anim.works',
      link_url: decoratedUrl,
      link_text: itemTitle || 'Anim.works',
    });
  }

  // 2. Firebase Analytics via internal track provider
  track('partner_click', {
    source,
    destination: decoratedUrl,
    partner: 'anim.works',
    item_title: itemTitle || 'Anim.works',
    user_type: userType,
  });

  // 3. Persistent internal counter for real-time admin telemetry
  sendTelemetryBeacon({
    partner: 'anim_works',
    targetUrl: decoratedUrl,
    source,
    itemTitle: itemTitle || 'Anim.works',
    userType,
    userId: userId || null,
  });

  return decoratedUrl;
}

/**
 * Fires when a user clicks the "Marketplace" tab in the navigation / sidebar.
 */
export function trackMarketplaceTabClick(userType: 'member' | 'guest' = 'guest', userId?: string | null): void {
  // 1. Google Analytics 4
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'marketplace_tab_click', {
      event_category: 'navigation',
      destination_url: '/marketplace',
      user_type: userType,
    });
  }

  // 2. Firebase Analytics
  track('marketplace_tab_clicked', {
    source: 'sidebar_nav',
    destination: '/marketplace',
    user_type: userType,
  });

  // 3. Persistent telemetry
  sendTelemetryBeacon({
    partner: 'anim_works',
    targetUrl: '/marketplace',
    source: 'sidebar_tab',
    itemTitle: 'Marketplace Navigation Tab',
    userType,
    userId: userId || null,
  });
}

function sendTelemetryBeacon(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify({
      ...payload,
      timestamp: Date.now(),
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/partner-click', blob);
    } else {
      fetch('/api/analytics/partner-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Non-blocking telemetry
  }
}
