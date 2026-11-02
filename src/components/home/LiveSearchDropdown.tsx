'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Box, 
  ExternalLink, 
  Film, 
  Globe, 
  Loader2, 
  Palette, 
  Pin, 
  Play, 
  Sparkles, 
  X, 
  Zap, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import type { Video } from '@/lib/types';
import type { UnifiedSearchResult } from '@/lib/reference-feed';
import { searchResultToVideo } from '@/lib/reference-hub';

interface LiveSearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  allVideos: Video[];
  onSelectVideo: (video: Video) => void;
  onSelectExternal: (item: UnifiedSearchResult) => void;
  onViewAllInLibrary: (source?: string) => void;
}

type DropdownSourceFilter = 'all' | 'pinterest' | 'artstation' | 'sketchfab' | 'sakugabooru' | 'free' | 'library';

// In-memory query cache to avoid re-fetching across backspaces
const SEARCH_CACHE = new Map<string, UnifiedSearchResult[]>();

export function LiveSearchDropdown({
  query,
  isOpen,
  onClose,
  allVideos,
  onSelectVideo,
  onSelectExternal,
  onViewAllInLibrary,
}: LiveSearchDropdownProps) {
  const [activeFilter, setActiveFilter] = useState<DropdownSourceFilter>('all');
  const [externalResults, setExternalResults] = useState<UnifiedSearchResult[]>([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const trimmed = query.trim();

  // Reset filter on new search query
  useEffect(() => {
    setActiveFilter('all');
  }, [trimmed]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // 1. Instant Local Library Matches (<10ms)
  const localMatches = useMemo(() => {
    if (!trimmed || trimmed.length < 2) return [];
    const qLower = trimmed.toLowerCase();
    const words = qLower.split(/\s+/).filter(w => !['the', 'and', 'for', 'of', 'in', 'to', 'a', 'an'].includes(w) && w.length > 1);
    if (words.length === 0) return [];

    const scored = allVideos.map((video) => {
      const titleLower = (video.title || '').toLowerCase();
      const tags = (video.tags || []).map((t) => t.toLowerCase());
      const descLower = (video.description || '').toLowerCase();
      const text = `${titleLower} ${tags.join(' ')} ${descLower}`;

      // When searching multiple keywords (e.g. "cat character designs"),
      // require every query word to be present so unrelated library videos don't leak in
      const matchesAll = words.every((word) => {
        const singular = word.endsWith('s') ? word.slice(0, -1) : word;
        const plural = word.endsWith('s') ? word : `${word}s`;
        return text.includes(word) || text.includes(singular) || text.includes(plural);
      });
      if (!matchesAll) return { video, score: 0 };

      let score = 0;
      if (titleLower === qLower) score += 100;
      else if (titleLower.startsWith(qLower)) score += 60;
      else if (titleLower.includes(qLower)) score += 40;

      for (const word of words) {
        if (titleLower.includes(word)) score += 20;
        if (tags.some((t) => t === word)) score += 30;
        else if (tags.some((t) => t.includes(word))) score += 15;
        if (descLower.includes(word)) score += 5;
      }

      return { video, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((s) => s.video);
  }, [allVideos, trimmed]);

  // 2. Debounced External Multi-Source Fetch (250ms)
  useEffect(() => {
    if (!trimmed || trimmed.length < 2) {
      setExternalResults([]);
      setLoadingExternal(false);
      return;
    }

    // Check cache first
    const cacheKey = trimmed.toLowerCase();
    if (SEARCH_CACHE.has(cacheKey)) {
      setExternalResults(SEARCH_CACHE.get(cacheKey)!);
      setLoadingExternal(false);
      return;
    }

    setLoadingExternal(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/import/search?q=${encodeURIComponent(trimmed)}&source=all`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const results: UnifiedSearchResult[] = data.results || [];
        SEARCH_CACHE.set(cacheKey, results);
        setExternalResults(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Live search fetch error:', err);
        }
      } finally {
        setLoadingExternal(false);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmed]);

  // Merge & filter results based on active source filter
  const displayedItems = useMemo(() => {
    const isFree = (src: string, id: string) =>
      ['openverse', 'wikimedia', 'archive', 'sakugabooru'].includes(src) ||
      id.startsWith('openverse_') ||
      id.startsWith('wiki_') ||
      id.startsWith('archive_') ||
      id.startsWith('saku_');

    const qClean = trimmed.toLowerCase();
    const qWords = qClean.split(/\s+/).filter(w => !['the', 'and', 'for', 'of', 'in', 'to', 'a', 'an'].includes(w) && w.length > 1);

    const matchesKeywords = (title: string, tags: string[] = [], desc: string = '') => {
      if (qWords.length === 0) return true;
      const text = `${title} ${tags.join(' ')} ${desc}`.toLowerCase();
      return qWords.some(w => {
        const singular = w.endsWith('s') ? w.slice(0, -1) : w;
        const plural = w.endsWith('s') ? w : `${w}s`;
        return text.includes(w) || text.includes(singular) || text.includes(plural);
      });
    };

    let localFiltered = localMatches.filter(v => matchesKeywords(v.title, v.tags, v.description));
    let extFiltered = externalResults.filter(r => matchesKeywords(r.title, r.tags, r.description));

    if (activeFilter === 'pinterest') {
      localFiltered = localMatches.filter((v) => v.source === 'pinterest' || v.id.startsWith('pin_'));
      extFiltered = externalResults.filter((r) => r.source === 'pinterest');
    } else if (activeFilter === 'artstation') {
      localFiltered = localMatches.filter((v) => v.source === 'artstation' || v.id.startsWith('as_'));
      extFiltered = externalResults.filter((r) => r.source === 'artstation');
    } else if (activeFilter === 'sketchfab') {
      localFiltered = localMatches.filter((v) => v.source === 'sketchfab' || v.id.startsWith('sf_') || v.mediaType === 'model3d');
      extFiltered = externalResults.filter((r) => r.source === 'sketchfab' || r.mediaType === 'model3d');
    } else if (activeFilter === 'sakugabooru') {
      localFiltered = localMatches.filter((v) => v.source === 'sakugabooru' || v.id.startsWith('saku_'));
      extFiltered = externalResults.filter((r) => r.source === 'sakugabooru');
    } else if (activeFilter === 'free') {
      localFiltered = localMatches.filter((v) => isFree((v.source || '').toLowerCase(), v.id));
      extFiltered = externalResults.filter((r) => isFree(r.source, r.id));
    } else if (activeFilter === 'library') {
      extFiltered = [];
    }

    return {
      local: localFiltered,
      external: extFiltered,
      totalCount: localFiltered.length + extFiltered.length,
    };
  }, [activeFilter, localMatches, externalResults]);

  if (!isOpen || (!trimmed && externalResults.length === 0 && localMatches.length === 0)) {
    return null;
  }

  // Count items per source for filter badges
  const counts = {
    all: localMatches.length + externalResults.length,
    pinterest: externalResults.filter((r) => r.source === 'pinterest').length + localMatches.filter((v) => v.source === 'pinterest' || v.id.startsWith('pin_')).length,
    artstation: externalResults.filter((r) => r.source === 'artstation').length + localMatches.filter((v) => v.source === 'artstation' || v.id.startsWith('as_')).length,
    sketchfab: externalResults.filter((r) => r.source === 'sketchfab' || r.mediaType === 'model3d').length + localMatches.filter((v) => v.source === 'sketchfab' || v.id.startsWith('sf_')).length,
    sakugabooru: externalResults.filter((r) => r.source === 'sakugabooru').length + localMatches.filter((v) => v.source === 'sakugabooru' || v.id.startsWith('saku_')).length,
    free: externalResults.filter((r) => ['openverse', 'wikimedia', 'archive', 'sakugabooru'].includes(r.source)).length,
    library: localMatches.length,
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'sketchfab':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#1CAAD9]/20 text-[#1CAAD9] border border-[#1CAAD9]/30">
            <Box className="h-2.5 w-2.5" /> 3D
          </span>
        );
      case 'artstation':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#13AFF0]/20 text-[#13AFF0] border border-[#13AFF0]/30">
            <Palette className="h-2.5 w-2.5" /> ArtStation
          </span>
        );
      case 'pinterest':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-[#E60023]/20 text-[#FF5252] border border-[#E60023]/30">
            <Pin className="h-2.5 w-2.5" /> Pinterest
          </span>
        );
      case 'sakugabooru':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Zap className="h-2.5 w-2.5" /> Sakuga 2D
          </span>
        );
      case 'openverse':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="h-2.5 w-2.5" /> Free CC0
          </span>
        );
      case 'wikimedia':
      case 'archive':
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
            <Sparkles className="h-2.5 w-2.5" /> Public Domain
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Film className="h-2.5 w-2.5" /> AnimRef
          </span>
        );
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl border border-white/15 bg-zinc-950/95 backdrop-blur-3xl shadow-[0_32px_96px_-24px_rgba(0,0,0,0.95)] overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-black/40">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar py-0.5">
          {[
            { id: 'all', label: 'All', count: counts.all },
            { id: 'pinterest', label: '📌 Pinterest', count: counts.pinterest },
            { id: 'artstation', label: '🎨 ArtStation', count: counts.artstation },
            { id: 'sketchfab', label: '🧊 3D Models', count: counts.sketchfab },
            { id: 'sakugabooru', label: '⚡ Sakuga', count: counts.sakugabooru },
            { id: 'free', label: '🆓 Free / CC0', count: counts.free },
            { id: 'library', label: '🎬 Library', count: counts.library },
          ].map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as DropdownSourceFilter)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pl-2 shrink-0">
          {loadingExternal && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-violet-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Searching live web…</span>
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results Content Area */}
      <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-700">
        {displayedItems.totalCount === 0 && !loadingExternal ? (
          <div className="text-center py-10 space-y-2">
            <p className="text-sm font-semibold text-zinc-300">
              No references found for &ldquo;{trimmed}&rdquo;
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try searching broader terms like <em>combat</em>, <em>turnaround</em>, <em>walk</em>, or <em>dragon</em>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {/* Local Matches */}
            {displayedItems.local.map((video) => (
              <div
                key={video.id}
                onClick={() => {
                  onSelectVideo(video);
                  onClose();
                }}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-1.5 transition-all duration-200 hover:border-violet-500/60 hover:bg-zinc-900 hover:shadow-[0_8px_24px_-8px_rgba(124,58,237,0.5)]"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/60">
                  <img
                    src={video.thumbnailUrl || video.posterUrl}
                    alt={video.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    {getSourceBadge(video.source || 'library')}
                  </div>
                  {video.videoUrl && (
                    <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white opacity-80 group-hover:opacity-100">
                      <Play className="h-3 w-3 fill-white" />
                    </div>
                  )}
                </div>
                <div className="mt-2 px-1 pb-1">
                  <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-violet-300">
                    {video.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {video.author_name || 'Animation Reference'}
                  </p>
                </div>
              </div>
            ))}

            {/* External Results */}
            {displayedItems.external.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectExternal(item);
                  onClose();
                }}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-zinc-900/60 p-1.5 transition-all duration-200 hover:border-violet-500/60 hover:bg-zinc-900 hover:shadow-[0_8px_24px_-8px_rgba(124,58,237,0.5)]"
              >
                <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/60">
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    {getSourceBadge(item.source)}
                  </div>
                  {item.mediaType === 'model3d' ? (
                    <div className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                      3D Interactive
                    </div>
                  ) : item.mediaType === 'video' ? (
                    <div className="absolute bottom-1.5 right-1.5 rounded-full bg-black/70 p-1 text-white opacity-80 group-hover:opacity-100">
                      <Play className="h-3 w-3 fill-white" />
                    </div>
                  ) : null}
                </div>
                <div className="mt-2 px-1 pb-1">
                  <p className="text-xs font-semibold text-white line-clamp-1 group-hover:text-violet-300">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                    {item.authorName || `@${item.source}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Footer Call to Action */}
      <div className="border-t border-white/10 bg-black/60 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-zinc-400 hidden sm:inline">
          Showing top instant matches across Pinterest, ArtStation, Sketchfab & Sakuga
        </span>
        <button
          type="button"
          onClick={() => {
            onViewAllInLibrary(activeFilter === 'all' ? undefined : activeFilter);
            onClose();
          }}
          className="ml-auto flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
        >
          <span>View all in full grid</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

