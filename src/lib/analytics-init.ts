import { analytics } from '@heycatch/sdk';

let initialized = false;

export function initializeSiteAnalytics() {
  if (initialized || typeof window === 'undefined' || window.location.pathname.startsWith('/embed/')) return;
  initialized = true;
  analytics.init({
    projectKey: 'hck_pk_ZH7SVbyuigr81Wgmsh7TJ9q_NaGxQyXb',
    install: { framework: 'nextjs', frameworkVersion: '15', agent: 'other' },
  });
}
