const WATCH_COUNT_KEY = 'animref_watch_count';
const WATCH_LIMIT_BEFORE_DONATE_POPUP = 10;

/**
 * Increments reference watch count in localStorage.
 * Returns true if user reached 10 watched references and should trigger the 12s Donate Popup.
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

    if (newCount >= WATCH_LIMIT_BEFORE_DONATE_POPUP) {
      localStorage.setItem(WATCH_COUNT_KEY, '0');
      return true;
    } else {
      localStorage.setItem(WATCH_COUNT_KEY, newCount.toString());
      return false;
    }
  } catch {
    return false;
  }
}
