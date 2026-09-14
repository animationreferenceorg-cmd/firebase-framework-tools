/**
 * Video Watch Tracker for Animation Reference
 *
 * Free users get 30 video watches before a donate popup is displayed.
 * A video watch (view) is counted only when the user watches for more than 3 seconds.
 */

export const WATCH_COUNT_KEY = 'animref_video_watch_count';

/** Number of video watches allowed for free users before the donate dialog pops up. */
export const WATCH_COUNT_THRESHOLD = 30;

/** Minimum watch duration (in seconds) required for a watch session to count as a view. */
export const VIEW_MIN_SECONDS = 3;
export const VIEW_MIN_DURATION_MS = VIEW_MIN_SECONDS * 1000;

// Kept for backward compatibility with any legacy imports
export const HOVER_GRACE_MS = VIEW_MIN_DURATION_MS;
export const WATCH_MINUTES_BEFORE_DONATE_POPUP = 15;
export const WATCH_SECONDS_BEFORE_DONATE_POPUP = 15 * 60;

/**
 * Get current number of counted video watches from localStorage.
 */
export function getWatchCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(WATCH_COUNT_KEY);
    const value = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Set the number of counted video watches in localStorage.
 */
export function setWatchCount(count: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCH_COUNT_KEY, String(Math.max(0, count)));
  } catch {
    // Storage unavailable (private mode, blocked cookies)
  }
}

/**
 * Reset the video watch count back to 0.
 */
export function resetWatchCount(): void {
  setWatchCount(0);
}

/**
 * Increments the video watch count by 1 for free users.
 * Returns the updated count and whether the 30-watch threshold was reached.
 */
export function recordVideoWatch(isPremium?: boolean): { count: number; reachedLimit: boolean } {
  if (isPremium) {
    return { count: 0, reachedLimit: false };
  }
  if (typeof window === 'undefined') {
    return { count: 0, reachedLimit: false };
  }

  const previous = getWatchCount();
  const next = previous + 1;
  setWatchCount(next);

  const reachedLimit = next >= WATCH_COUNT_THRESHOLD;
  console.log(
    `[Watch Tracker] Video view counted: ${next}/${WATCH_COUNT_THRESHOLD}${
      reachedLimit ? ' — 30 watches reached, donate prompt queued!' : ''
    }`
  );

  return { count: next, reachedLimit };
}

// Backward-compatibility helpers
export function getWatchSeconds(): number {
  return getWatchCount() * VIEW_MIN_SECONDS;
}

export function setWatchSeconds(seconds: number): void {
  setWatchCount(Math.floor(seconds / VIEW_MIN_SECONDS));
}

export function resetWatchSeconds(): void {
  resetWatchCount();
}

export function clearLegacyWatchCount(): void {
  // Not needed, but preserved for backward compatibility
}

export function addWatchSeconds(seconds: number, isPremium?: boolean): boolean {
  if (isPremium) return false;
  if (seconds >= VIEW_MIN_SECONDS) {
    const { reachedLimit } = recordVideoWatch(isPremium);
    return reachedLimit;
  }
  return false;
}
