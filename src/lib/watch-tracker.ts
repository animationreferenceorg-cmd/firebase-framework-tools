/**
 * Watch tracking for the soft Pro nudge.
 *
 * Watching is free and unlimited. After a free user has actually played
 * PRO_NUDGE_AFTER_VIEWS references in one browser session, we show one small,
 * dismissible corner card — never a blocking modal, and never mid-playback.
 * Hover previews do not count: skimming a grid is browsing, not studying.
 */

/** Minimum playback (in seconds) before a play counts as a view. */
export const VIEW_MIN_SECONDS = 3;
export const VIEW_MIN_DURATION_MS = VIEW_MIN_SECONDS * 1000;
/** Hover-preview delay used by cards; unrelated to counting. */
export const HOVER_GRACE_MS = VIEW_MIN_DURATION_MS;

/** Played references in one session before the nudge may appear. */
export const PRO_NUDGE_AFTER_VIEWS = 15;
/** After the nudge is dismissed, keep it hidden for this long. */
export const PRO_NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const SESSION_VIEWS_KEY = 'animref:session-views';
const NUDGE_SHOWN_KEY = 'animref:pro-nudge-shown';
const NUDGE_DISMISSED_AT_KEY = 'animref:pro-nudge-dismissed-at';

// Storage can be missing or throw (SSR, private windows, blocked site data),
// so every access goes through these guards and fails quietly.
function read(storage: 'local' | 'session', key: string): string | null {
  try {
    return (storage === 'local' ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: 'local' | 'session', key: string, value: string): void {
  try {
    (storage === 'local' ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Storage unavailable
  }
}

export function getSessionViewCount(): number {
  const value = parseInt(read('session', SESSION_VIEWS_KEY) || '0', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Records one played reference and returns the new session total. */
export function recordSessionView(): number {
  const next = getSessionViewCount() + 1;
  write('session', SESSION_VIEWS_KEY, String(next));
  return next;
}

/** True when the nudge may be shown: enough views, not yet shown this session, not recently dismissed. */
export function shouldShowProNudge(views: number, now = Date.now()): boolean {
  if (views < PRO_NUDGE_AFTER_VIEWS) return false;
  if (read('session', NUDGE_SHOWN_KEY) === '1') return false;
  const dismissedAt = parseInt(read('local', NUDGE_DISMISSED_AT_KEY) || '0', 10);
  return !(dismissedAt && now - dismissedAt < PRO_NUDGE_COOLDOWN_MS);
}

export function markProNudgeShown(): void {
  write('session', NUDGE_SHOWN_KEY, '1');
}

export function markProNudgeDismissed(now = Date.now()): void {
  write('local', NUDGE_DISMISSED_AT_KEY, String(now));
}

/** Removes the counters used by the old 30-watch popup. */
export function clearLegacyWatchCount(): void {
  try {
    window.localStorage.removeItem('animref_video_watch_count');
  } catch {
    // Storage unavailable
  }
}
