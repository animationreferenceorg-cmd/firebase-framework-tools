'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';
import { discoverySources, mergeReferenceVideos, type DiscoveryPage, type ReferenceSource } from '@/lib/reference-feed';
import { searchResultToVideo } from '@/lib/reference-hub';
import { filterReferenceCatalog } from '@/lib/reference-filters';
import type { Video } from '@/lib/types';

interface SourceState {
  cursor: string | null;
  hasMore: boolean;
  phase: 'idle' | 'loading' | 'error';
  error?: string;
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
  limited: boolean;
}
const EMPTY: DiscoveryState = { key: '', videos: [], loading: false, hasMore: false, canAutoLoad: false, errors: [], limited: false };

/** Each source has its own cursor and request so a slow/failed provider cannot stall the feed. */
export function useReferenceDiscovery(query: string, tab: TabOption, type: TypeOption, pill: PillOption, media: MediaOption = 'all') {
  const key = JSON.stringify([query.trim(), tab, type, pill, media]);
  const sessionRef = useRef<Session | null>(null);
  const [state, setState] = useState<DiscoveryState>(EMPTY);

  const loadMore = useCallback(async (manual = false) => {
    const session = sessionRef.current;
    if (!session || session.key !== key) return;
    const publish = (incoming: Video[] = []) => {
      if (sessionRef.current !== session) return;
      const sources = Object.values(session.sources);
      setState(previous => ({
        key, videos: previous.key === key && incoming.length === 0 ? previous.videos : mergeReferenceVideos(previous.key === key ? previous.videos : [], incoming),
        loading: sources.some(source => source.phase === 'loading'),
        hasMore: sources.some(source => source.hasMore && source.phase !== 'error'),
        canAutoLoad: sources.some(source => source.hasMore && source.phase === 'idle' && source.emptyPages < 3),
        errors: sources.flatMap(source => source.error ? [source.error] : []),
        limited: sources.some(source => source.limited),
      }));
    };
    const tasks = Object.entries(session.sources).filter(([, source]) =>
      source.phase !== 'loading' && (manual ? source.hasMore || source.phase === 'error' : source.hasMore && source.phase !== 'error' && source.emptyPages < 3)
    ).map(async ([sourceName, source]) => {
      const sourceId = sourceName as ReferenceSource;
      source.phase = 'loading';
      source.error = undefined;
      if (manual) source.emptyPages = 0;
      const controller = new AbortController();
      session.controllers.add(controller);
      publish();
      const params = new URLSearchParams({ q: query.trim(), tab, type, pill, media, source: sourceId, mode: query.trim() ? 'search' : 'explore' });
      if (source.cursor) params.set('cursor', source.cursor);
      try {
        const response = await fetch(`/api/import/search?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search is temporarily unavailable. Please try again.');
        const data: DiscoveryPage = await response.json();
        if (sessionRef.current !== session || controller.signal.aborted) return;
        const provider = data.providers?.find(provider => provider.source === sourceId);
        if (provider?.status === 'unavailable') throw new Error(provider.message || 'This source is temporarily unavailable.');
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
    setState({ ...EMPTY, key, loading: Object.keys(session.sources).length > 0 });
    const timer = setTimeout(() => void loadMore(), query.trim() ? 350 : 0);
    return () => {
      clearTimeout(timer);
      session.controllers.forEach(controller => controller.abort());
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [key, loadMore, query, tab, type, media, pill]);

  return { ...(state.key === key ? state : { ...EMPTY, loading: true }), loadMore };
}
