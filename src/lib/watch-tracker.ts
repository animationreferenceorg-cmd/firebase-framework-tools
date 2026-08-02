const WATCH_COUNT_KEY = 'animref_watch_count';
const WATCH_LIMIT_BEFORE_DONATE_POPUP = 5;

const HOVER_COUNT_KEY = 'animref_hover_count';
const HOVER_LIMIT_BEFORE_DONATE_POPUP = 10;

function incrementCounter(key: string, limit: number, isPremium?: boolean): boolean {
  if (isPremium) {
    return false;
  }

  if (typeof window === 'undefined') return false;

  try {
    const raw = localStorage.getItem(key);
    const count = raw ? parseInt(raw, 10) || 0 : 0;
    const newCount = count + 1;

    if (newCount >= limit) {
      localStorage.setItem(key, '0');
      return true;
    } else {
      localStorage.setItem(key, newCount.toString());
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Increments reference watch count in localStorage.
 * Returns true if user reached 5 watched references and should trigger the 12s Donate Popup.
 */
export function recordReferenceView(isPremium?: boolean): boolean {
  return incrementCounter(WATCH_COUNT_KEY, WATCH_LIMIT_BEFORE_DONATE_POPUP, isPremium);
}

/**
 * Increments hover-preview count in localStorage.
 * Returns true if user hovered 10 video previews and should trigger the 12s Donate Popup.
 */
export function recordHoverPreview(isPremium?: boolean): boolean {
  return incrementCounter(HOVER_COUNT_KEY, HOVER_LIMIT_BEFORE_DONATE_POPUP, isPremium);
}
