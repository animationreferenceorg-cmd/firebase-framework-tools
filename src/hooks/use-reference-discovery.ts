'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';
import { discoverySources, mergeReferenceVideos, type DiscoveryPage, type ReferenceSource } from '@/lib/reference-feed';
import { searchResultToVideo } from '@/lib/reference-hub';
import { filterReferenceCatalog } from '@/lib/reference-filters';
import type { Video } from '@/lib/types';
import { cachedDiscoveryPage, cacheDiscoveryPage } from '@/lib/reference-discovery-cache';

interface SourceState {
  cursor: string | null;
  hasMore: boolean;
  phase: 'idle' | 'loading' | 'error';
  error?: string;
  warning?: string;
  notice?: string;
  limited?: boolean;
  emptyPages: number;
}
interface Session {
  key: string;
  sources: Partial<Record<ReferenceSource, SourceState>>;
  controllers: Set<AbortController>;
  seen: Set<string>;
}
interface DiscoveryState {
  key: string;
  videos: Video[];
  loading: boolean;
  hasMore: boolean;
  canAutoLoad: boolean;
  errors: string[];
  notices: string[];
  limited: boolean;
}
const EMPTY: DiscoveryState = { key: '', videos: [], loading: false, hasMore: false, canAutoLoad: false, errors: [], notices: [], limited: false };

/** Each source has its own cursor and request so a slow/failed provider cannot stall the feed. */
export function useReferenceDiscovery(query: string, tab: TabOption, type: TypeOption, pill: PillOption, media: MediaOption = 'all') {
  const key = JSON.stringify([query.trim(), tab, type, pill, media]);
  const sessionRef = useRef<Session | null>(null);
  const resultsRef = useRef<{ query: string; videos: Video[] }>({ query: '', videos: [] });
  const [state, setState] = useState<DiscoveryState>(EMPTY);

  const loadMore = useCallback(async (manual = false) => {
    const session = sessionRef.current;
    if (!session || session.key !== key) return;
    const publish = (incoming: Video[] = []) => {
      if (sessionRef.current !== session) return;
      if (incoming.length) {
        const previous = resultsRef.current.query === query.trim() ? resultsRef.current.videos : [];
        resultsRef.current = { query: query.trim(), videos: mergeReferenceVideos(previous, incoming).slice(-600) };
      }
      const sources = Object.values(session.sources);
      setState(previous => ({
        key, videos: previous.key === key && incoming.length === 0 ? previous.videos : mergeReferenceVideos(previous.key === key ? previous.videos : [], incoming),
        loading: sources.some(source => source.phase === 'loading'),
        hasMore: sources.some(source => source.hasMore && source.phase !== 'error'),
        canAutoLoad: sources.some(source => source.hasMore && source.phase === 'idle' && source.emptyPages < 3),
        errors: sources.flatMap(source => source.error || source.warning ? [source.error || source.warning!] : []),
        notices: sources.flatMap(source => source.notice ? [source.notice] : []),
        limited: sources.some(source => source.limited),
      }));
    };
    const tasks = Object.entries(session.sources).filter(([, source]) =>
      source.phase !== 'loading' && (manual ? source.hasMore || source.phase === 'error' : source.hasMore && source.phase !== 'error' && source.emptyPages < 3)
    ).map(async ([sourceName, source]) => {
      const sourceId = sourceName as ReferenceSource;
      source.phase = 'loading';
      source.error = undefined;
      source.warning = undefined;
      source.notice = undefined;
      if (manual) source.emptyPages = 0;
      const controller = new AbortController();
      session.controllers.add(controller);
      publish();
      const params = new URLSearchParams({ q: query.trim(), tab, type, pill, media, source: sourceId, mode: query.trim() ? 'search' : 'explore' });
      if (source.cursor) params.set('cursor', source.cursor);
      try {
        const pageKey = params.toString();
        let data: DiscoveryPage | undefined = manual ? undefined : cachedDiscoveryPage(pageKey);
        if (!data) {
          const response = await fetch(`/api/import/search?${params}`, {
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12000)]),
          });
          if (!response.ok) throw new Error('Search is temporarily unavailable. Please try again.');
          data = await response.json() as DiscoveryPage;
          cacheDiscoveryPage(pageKey, data);
        }
        if (sessionRef.current !== session || controller.signal.aborted) return;
        const provider = data.providers?.find(provider => provider.source === sourceId);
        if (provider?.status === 'unavailable') {
          source.phase = 'idle';
          source.hasMore = false;
          publish();
          return;
        }
        if (provider?.status === 'unconfigured') {
          source.phase = 'idle';
          source.hasMore = false;
          source.notice = provider.message;
          publish();
          return;
        }
        const matching = filterReferenceCatalog((data.results || []).map(searchResultToVideo), { tab, type, pill, media, query: '', scores: new Map() });
        const incoming = matching.filter(item => {
          if (session.seen.has(item.id)) return false;
          session.seen.add(item.id);
          return true;
        });
        const next = data.nextCursor || null;
        source.hasMore = Boolean(next && next !== source.cursor);
        source.cursor = next;
        source.emptyPages = incoming.length ? 0 : source.emptyPages + 1;
        source.limited = provider?.limited;
        source.warning = provider?.partial ? 'Some results from this source are temporarily unavailable. Load more to retry.' : undefined;
        source.phase = 'idle';
        publish(incoming);
      } catch (error) {
        if (sessionRef.current !== session || controller.signal.aborted) return;
        source.phase = 'error';
        source.error = error instanceof Error ? error.message : 'This source is temporarily unavailable.';
        publish();
      } finally {
        session.controllers.delete(controller);
      }
    });
    await Promise.all(tasks);
  }, [key, query, tab, type, pill, media]);

  useEffect(() => {
    const session: Session = { key, sources: {}, controllers: new Set(), seen: new Set() };
    for (const source of pill === 'shorts' ? [] : discoverySources(tab, type, media)) {
      session.sources[source] = { cursor: null, hasMore: true, phase: 'idle', emptyPages: 0 };
    }
    sessionRef.current = session;
    const reusable = resultsRef.current.query === query.trim() ? resultsRef.current.videos : [];
    const videos = filterReferenceCatalog(reusable, { tab, type, pill, media, query: '', scores: new Map() });
    setState({ ...EMPTY, key, videos, loading: Object.keys(session.sources).length > 0 });
    const timer = setTimeout(() => void loadMore(), query.trim() ? 40 : 0);
    return () => {
      clearTimeout(timer);
      session.controllers.forEach(controller => controller.abort());
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [key, loadMore, query, tab, type, media, pill]);

  // Filter the already loaded pool immediately instead of flashing an empty
  // grid while a new tab/media request is pending. Never reuse a different query.
  const pending = state.key === key ? state : {
    ...EMPTY, loading: true,
    videos: filterReferenceCatalog(resultsRef.current.query === query.trim() ? resultsRef.current.videos : [], {
      tab, type, pill, media, query: '', scores: new Map(),
    }),
  };
  return { ...pending, loadMore };
}
