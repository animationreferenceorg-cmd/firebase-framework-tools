const WATCH_COUNT_KEY = 'animref_watch_count';
export const WATCH_LIMIT_BEFORE_DONATE_POPUP = 20;

/**
 * Increments reference watch count in localStorage.
 * Returns true if the user reached the configured watch limit and should trigger the Donate Popup.
 */
export function recordReferenceView(isPremium?: boolean): boolean {
  if (isPremium) {
    return false;
  }

  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(WATCH_COUNT_KEY);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    const newCount = count + 1;

    console.log(`[Watch Tracker] Watched video count: ${newCount}/${WATCH_LIMIT_BEFORE_DONATE_POPUP}`);

    if (newCount >= WATCH_LIMIT_BEFORE_DONATE_POPUP) {
      localStorage.setItem(WATCH_COUNT_KEY, '0');
      console.log(`[Watch Tracker] Limit reached (${WATCH_LIMIT_BEFORE_DONATE_POPUP}/${WATCH_LIMIT_BEFORE_DONATE_POPUP})! Triggering 12s Donate Popup.`);
      return true;
    } else {
      localStorage.setItem(WATCH_COUNT_KEY, newCount.toString());
      return false;
    }
  } catch {
    return false;
  }
}
