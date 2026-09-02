/**
 * Tracks how long someone actually spends watching reference, so the donate
 * prompt is earned by real viewing rather than by cursor movement.
 *
 * The previous version incremented a counter on every mouseenter, so sweeping
 * across a grid of cards could hit the limit in seconds without a single video
 * being watched. This measures elapsed playback instead.
 */

const WATCH_SECONDS_KEY = 'animref_watch_seconds';
/** Legacy key from the count-based tracker; cleared on first run. */
const LEGACY_COUNT_KEY = 'animref_watch_count';

/** Genuine viewing time before the donate prompt is offered. */
export const WATCH_MINUTES_BEFORE_DONATE_POPUP = 15;
export const WATCH_SECONDS_BEFORE_DONATE_POPUP = WATCH_MINUTES_BEFORE_DONATE_POPUP * 60;

/**
 * A hover preview has to run this long before any of it counts. Below this the
 * cursor was just passing over the card, which should contribute nothing.
 * Time is counted from the end of the grace period, not from zero.
 */
export const HOVER_GRACE_MS = 3000;

/** Ignore absurd jumps from a sleeping laptop or a backgrounded tab. */
const MAX_SINGLE_FLUSH_SECONDS = 120;

export function getWatchSeconds(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(WATCH_SECONDS_KEY);
    const value = raw ? parseFloat(raw) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function setWatchSeconds(seconds: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WATCH_SECONDS_KEY, String(Math.max(0, seconds)));
  } catch {
    // Storage unavailable (private mode, blocked cookies) — tracking is
    // best-effort and must never break playback.
  }
}

export function resetWatchSeconds(): void {
  setWatchSeconds(0);
}

/** One-time cleanup of the old count-based key. */
export function clearLegacyWatchCount(): void {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem(LEGACY_COUNT_KEY) !== null) {
      localStorage.removeItem(LEGACY_COUNT_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Adds genuine viewing time to the running total.
 * Returns true when this is the moment the threshold is crossed — the caller
 * decides when to actually show the prompt, so it can wait for a natural pause.
 */
export function addWatchSeconds(seconds: number, isPremium?: boolean): boolean {
  if (isPremium) return false;
  if (typeof window === 'undefined') return false;
  if (!Number.isFinite(seconds) || seconds <= 0) return false;

  const capped = Math.min(seconds, MAX_SINGLE_FLUSH_SECONDS);
  const previous = getWatchSeconds();
  const next = previous + capped;
  setWatchSeconds(next);

  const crossed = previous < WATCH_SECONDS_BEFORE_DONATE_POPUP && next >= WATCH_SECONDS_BEFORE_DONATE_POPUP;
  if (crossed) {
    console.log(
      `[Watch Tracker] ${WATCH_MINUTES_BEFORE_DONATE_POPUP} minutes of viewing reached — prompt queued for the next pause.`
    );
  }
  return crossed;
}
