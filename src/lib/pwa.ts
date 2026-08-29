'use client';

export function isAppInstalled(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function isMobileInstallCandidate(): boolean {
  if (typeof window === 'undefined') return false;

  const navigatorWithUserAgentData = window.navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };
  const userAgentMobile = /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent);
  const iPadDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  const compactTouchScreen = window.matchMedia('(max-width: 767px)').matches && window.navigator.maxTouchPoints > 0;

  return Boolean(navigatorWithUserAgentData.userAgentData?.mobile) || userAgentMobile || iPadDesktopMode || compactTouchScreen;
}
