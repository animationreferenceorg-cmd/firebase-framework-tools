import { afterEach, describe, expect, it, vi } from 'vitest';
import { cachedDiscoveryPage, cacheDiscoveryPage } from '@/lib/reference-discovery-cache';
import type { DiscoveryPage } from '@/lib/reference-feed';

const page: DiscoveryPage = { results: [], nextCursor: null, hasMore: false, providers: [{ source: 'pinterest', status: 'ok' }] };
afterEach(() => vi.useRealTimers());

describe('session discovery cache', () => {
  it('reuses successful searches and expires them after five minutes', () => {
    vi.useFakeTimers();
    cacheDiscoveryPage('dragon-pinterest', page);
    expect(cachedDiscoveryPage('dragon-pinterest')).toBe(page);
    expect(cachedDiscoveryPage('horse-pinterest')).toBeUndefined();
    vi.advanceTimersByTime(300001);
    expect(cachedDiscoveryPage('dragon-pinterest')).toBeUndefined();
  });

  it('does not cache failures, unconfigured providers or partial pages', () => {
    for (const status of ['unavailable', 'unconfigured'] as const) {
      cacheDiscoveryPage(status, { ...page, providers: [{ source: 'pinterest', status }] });
      expect(cachedDiscoveryPage(status)).toBeUndefined();
    }
    cacheDiscoveryPage('partial', { ...page, providers: [{ source: 'pinterest', status: 'ok', partial: true }] });
    expect(cachedDiscoveryPage('partial')).toBeUndefined();
  });

  it('bounds the index and keeps recently used pages', () => {
    for (let i = 0; i < 100; i++) cacheDiscoveryPage(`bounded-${i}`, page);
    cachedDiscoveryPage('bounded-0');
    cacheDiscoveryPage('bounded-100', page);
    expect(cachedDiscoveryPage('bounded-0')).toBe(page);
    expect(cachedDiscoveryPage('bounded-1')).toBeUndefined();
  });
});
