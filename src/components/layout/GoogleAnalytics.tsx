'use client';

import Script from 'next/script';

interface GoogleAnalyticsProps {
  measurementId?: string;
}

export function GoogleAnalytics({ measurementId = 'G-PR79SNDBLG' }: GoogleAnalyticsProps) {
  // Supports both the Firebase GA4 measurement ID (G-PR79SNDBLG) and the GTM/GA4 ID (G-M30D8SMY7G)
  const secondaryId = 'G-M30D8SMY7G';

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
            send_page_view: true
          });

          ${secondaryId && secondaryId !== measurementId ? `gtag('config', '${secondaryId}', { send_page_view: true });` : ''}
        `}
      </Script>
    </>
  );
}

export default GoogleAnalytics;
