export const GUEST_HOVER_STORAGE_KEY = 'animref_guest_hover_count';
export const GUEST_HOVER_LIMIT = 8;
export const GUEST_HOVER_WARN_THRESHOLD = 5;

let memoryGuestHoverCount = 0;

/**
 * Returns true if the current page is the homepage or main home browse feed.
 * Explicitly excludes dedicated landing pages, marketing pages, and policy pages.
 */
export function isHomePage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/' || path === '/home';
}

export function getGuestHoverCount(): number {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return memoryGuestHoverCount;
  try {
    const raw = window.localStorage.getItem(GUEST_HOVER_STORAGE_KEY);
    const count = Number(raw);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  } catch {
    return memoryGuestHoverCount;
  }
}

export function recordGuestHover(): { count: number; limitReached: boolean; warn: boolean } {
  const current = getGuestHoverCount();
  const next = current + 1;
  memoryGuestHoverCount = next;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      window.localStorage.setItem(GUEST_HOVER_STORAGE_KEY, String(next));
    } catch {
      // Ignore quota errors
    }
  }
  return {
    count: next,
    limitReached: next >= GUEST_HOVER_LIMIT,
    warn: next >= GUEST_HOVER_WARN_THRESHOLD && next < GUEST_HOVER_LIMIT,
  };
}

export function hasReachedGuestHoverLimit(): boolean {
  return getGuestHoverCount() >= GUEST_HOVER_LIMIT;
}

export function resetGuestHoverForTesting(): void {
  memoryGuestHoverCount = 0;
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(GUEST_HOVER_STORAGE_KEY);
  }
}
