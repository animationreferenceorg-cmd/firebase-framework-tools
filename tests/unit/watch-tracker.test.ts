import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PRO_NUDGE_AFTER_VIEWS,
  PRO_NUDGE_COOLDOWN_MS,
  getSessionViewCount,
  markProNudgeDismissed,
  markProNudgeShown,
  recordSessionView,
  shouldShowProNudge,
} from '@/lib/watch-tracker';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => { data.delete(k); },
    setItem: (k, v) => { data.set(k, String(v)); },
  };
}

describe('pro nudge', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: memoryStorage(), sessionStorage: memoryStorage() });
  });

  it('counts views per session', () => {
    expect(getSessionViewCount()).toBe(0);
    recordSessionView();
    expect(recordSessionView()).toBe(2);
  });

  it('waits for enough views', () => {
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS - 1)).toBe(false);
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS)).toBe(true);
  });

  it('shows at most once per session', () => {
    markProNudgeShown();
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS + 10)).toBe(false);
  });

  it('stays hidden for the cooldown after a dismissal', () => {
    const now = 1_000_000_000_000;
    markProNudgeDismissed(now);
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS, now + PRO_NUDGE_COOLDOWN_MS - 1)).toBe(false);
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS, now + PRO_NUDGE_COOLDOWN_MS + 1)).toBe(true);
  });

  it('fails quietly when storage throws', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage { throw new Error('blocked'); },
      get sessionStorage(): Storage { throw new Error('blocked'); },
    });
    expect(getSessionViewCount()).toBe(0);
    expect(() => recordSessionView()).not.toThrow();
    expect(shouldShowProNudge(PRO_NUDGE_AFTER_VIEWS)).toBe(true);
  });
});
