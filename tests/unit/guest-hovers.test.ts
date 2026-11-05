import { describe, it, expect, beforeEach } from 'vitest';
import {
  GUEST_HOVER_LIMIT,
  GUEST_HOVER_WARN_THRESHOLD,
  getGuestHoverCount,
  recordGuestHover,
  hasReachedGuestHoverLimit,
  isHomePage,
  resetGuestHoverForTesting,
} from '@/lib/guest-hovers';

describe('guest hover previews', () => {
  beforeEach(() => {
    resetGuestHoverForTesting();
  });

  it('identifies home page vs landing pages in browser environment', () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
      expect(isHomePage()).toBe(true);

      window.history.pushState({}, '', '/home');
      expect(isHomePage()).toBe(true);

      window.history.pushState({}, '', '/pricing');
      expect(isHomePage()).toBe(false);

      window.history.pushState({}, '', '/landing');
      expect(isHomePage()).toBe(false);
    } else {
      expect(isHomePage()).toBe(false);
    }
  });

  it('starts at 0 and increments on each hover record', () => {
    expect(getGuestHoverCount()).toBe(0);
    expect(hasReachedGuestHoverLimit()).toBe(false);

    const r1 = recordGuestHover();
    expect(r1.count).toBe(1);
    expect(r1.limitReached).toBe(false);
    expect(r1.warn).toBe(false);
  });

  it('triggers warning after threshold (5 hovers) and reaches limit at 8', () => {
    expect(GUEST_HOVER_WARN_THRESHOLD).toBe(5);
    expect(GUEST_HOVER_LIMIT).toBe(8);

    for (let i = 1; i <= 4; i++) {
      const res = recordGuestHover();
      expect(res.count).toBe(i);
      expect(res.warn).toBe(false);
      expect(res.limitReached).toBe(false);
    }

    // 5th hover warns
    const r5 = recordGuestHover();
    expect(r5.count).toBe(5);
    expect(r5.warn).toBe(true);
    expect(r5.limitReached).toBe(false);

    // 6th and 7th hover warn
    const r6 = recordGuestHover();
    expect(r6.warn).toBe(true);
    const r7 = recordGuestHover();
    expect(r7.warn).toBe(true);

    // 8th hover reaches limit
    const r8 = recordGuestHover();
    expect(r8.count).toBe(8);
    expect(r8.limitReached).toBe(true);
    expect(hasReachedGuestHoverLimit()).toBe(true);
  });
});
