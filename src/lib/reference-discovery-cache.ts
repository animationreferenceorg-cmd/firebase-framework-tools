import type { DiscoveryPage } from './reference-feed';

const MAX_PAGES = 100;
const TTL_MS = 5 * 60 * 1000;
const pages = new Map<string, { data: DiscoveryPage; expires: number }>();

/** Bounded per-browser-session index of successful query/filter/cursor pages. */
export function cachedDiscoveryPage(key: string): DiscoveryPage | undefined {
  const page = pages.get(key);
  if (!page) return undefined;
  if (page.expires <= Date.now()) { pages.delete(key); return undefined; }
  pages.delete(key);
  pages.set(key, page);
  return page.data;
}

export function cacheDiscoveryPage(key: string, data: DiscoveryPage) {
  // Retry failures, missing credentials and partial results against the server.
  if (!data.providers?.length || data.providers.some(provider => provider.status !== 'ok' || provider.partial)) return;
  pages.delete(key);
  pages.set(key, { data, expires: Date.now() + TTL_MS });
  while (pages.size > MAX_PAGES) pages.delete(pages.keys().next().value!);
}
