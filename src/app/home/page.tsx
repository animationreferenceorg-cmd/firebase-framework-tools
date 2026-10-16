'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video } from '@/lib/types';
import { Film } from 'lucide-react';
import { FilterBar, TabOption, TypeOption, PillOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { PricingDialog } from '@/components/PricingDialog';
import { ImmersiveHomeHeader } from '@/components/home/ImmersiveHomeHeader';
import { CommunityFeedShelf } from '@/components/home/CommunityFeedShelf';
import { TrendingCommunityShelf } from '@/components/home/TrendingCommunityShelf';
import { RecentlyViewedShelf } from '@/components/home/RecentlyViewedShelf';
import { LiveWebDiscoveryShelf } from '@/components/home/LiveWebDiscoveryShelf';
import { LiveWebSearchResults } from '@/components/home/LiveWebSearchResults';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import { searchResultToVideo } from '@/lib/reference-hub';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/motion/SectionHeading';
import { filterAvailableVideos } from '@/lib/video-availability';
import { mixReferences } from '@/lib/reference-mix';
import { Globe, Loader2, Sparkles } from 'lucide-react';

const VIDEOS_PER_PAGE = 30;

export default function HomePage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Live External Search State
  const [externalVideos, setExternalVideos] = useState<Video[]>([]);
  const [webResults, setWebResults] = useState<UnifiedSearchResult[]>([]);
  const [webSearching, setWebSearching] = useState(false);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // "/" or Cmd/Ctrl+K jumps to search, the convention in streaming and
  // design apps. Ignored while typing in another field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const isShortcut = (e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing);
      if (!isShortcut) return;
      e.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const videos = await getSnapshotVideos();
        // Shuffled once per visit; tabs and filters keep this mixed order.
        setAllVideos(mixReferences(filterAvailableVideos(videos)));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filtered Videos
  const filteredVideos = useMemo(() => {
    let result = allVideos.filter(v => activePill === 'shorts' ? v.isShort : !v.isShort);

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.title.toLowerCase().includes(q) ||
        (v.description || '').toLowerCase().includes(q) ||
        (v.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Helper to get numeric timestamp for sorting (newest first)
    const getVideoTimestamp = (v: Video): number => {
      if (typeof v.createdAt === 'number' && !isNaN(v.createdAt) && v.createdAt > 0) return v.createdAt;
      if (typeof (v as any).updatedAt === 'number' && (v as any).updatedAt > 0) return (v as any).updatedAt;
      if (typeof (v as any).uploadedAt === 'number' && (v as any).uploadedAt > 0) return (v as any).uploadedAt;
      if (typeof (v as any).importedAt === 'number' && (v as any).importedAt > 0) return (v as any).importedAt;
      if (typeof v.createdAt === 'string') {
        const p = Date.parse(v.createdAt);
        if (!isNaN(p)) return p;
      }
      if (v.createdAt?.toMillis && typeof v.createdAt.toMillis === 'function') {
        return v.createdAt.toMillis();
      }
      if (v.createdAt?.seconds) {
        return v.createdAt.seconds * 1000;
      }
      return 0;
    };

    // 2D / 3D
    if (activeType !== 'all') {
      const typeLower = activeType.toLowerCase();
      result = result.filter(v => {
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const cats = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
        return tags.some(t => t.includes(typeLower)) || cats.some(c => c.includes(typeLower));
      });
    }

    // Quick Pill Filter
    if (activePill !== 'all' && activePill !== 'shorts') {
      const pillKeywords: Record<string, string[]> = {
        locomotion: ['locomotion', 'walk', 'run', 'jump', 'parkour', 'sprint', 'crawl', 'stagger'],
        combat: ['combat', 'fight', 'sword', 'punch', 'kick', 'action', 'martial', 'attack'],
        acting: ['acting', 'facial', 'lip sync', 'dialogue', 'expression', 'gesture', 'emotion'],
        creature: ['creature', 'animal', 'quadruped', 'monster', 'dragon', 'dog', 'bird', 'horse'],
        mechanics: ['mechanic', 'body mechanic', 'weight', 'physics', 'push', 'pull', 'lift', 'fall'],
        vfx: ['vfx', 'fx', 'fire', 'water', 'smoke', 'explosion', 'magic', 'energy'],
      };
      const keywords = pillKeywords[activePill] || [];
      result = result.filter(v => {
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const cats = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
        const fullText = (v.title + ' ' + (v.description || '')).toLowerCase();
        return keywords.some(kw => tags.some(t => t.includes(kw)) || cats.some(c => c.includes(kw)) || fullText.includes(kw));
      });
    }

    // --- Tab Specific Rules ---
    if (activeTab === 'community') {
      // Community: JUST tagged accounts and portfolio / user uploaded videos
      result = result.filter(v => 
        !!v.uploader || 
        !!v.author_name || 
        !!v.isPortfolio || 
        v.type === 'social' || 
        (v.type as string) === 'instagram' || 
        !!v.originalUrl
      );
    } else if (activeTab === 'trending') {
      // Trending: Whoever has most likes (sorted descending by likeCount)
      result = [...result].sort((a, b) => {
        const likesA = a.likeCount ?? 0;
        const likesB = b.likeCount ?? 0;
        if (likesB !== likesA) return likesB - likesA;
        const viewsA = a.viewCount ?? 0;
        const viewsB = b.viewCount ?? 0;
        return viewsB - viewsA;
      });
    } else if (activeTab === 'latest') {
      // Latest: Latest uploaded references (newest first by createdAt)
      result = [...result].sort((a, b) => getVideoTimestamp(b) - getVideoTimestamp(a));
    }
    // Featured: keeps the randomized, anime-balanced order from mixReferences.

    return result;
  }, [allVideos, activeTab, activeType, activePill, searchQuery]);

  useEffect(() => {
    setVisibleCount(VIDEOS_PER_PAGE);
  }, [activeTab, activeType, activePill, searchQuery]);

  // Unified Catalog: seamlessly blend local database clips and external hub results
  const unifiedVideos = useMemo(() => {
    if (!searchQuery.trim() || externalVideos.length === 0) {
      return filteredVideos;
    }

    const set = new Set(filteredVideos.map(v => v.id));
    const newExternals = externalVideos.filter(v => !set.has(v.id));

    // Interleave local and external results evenly
    const combined: Video[] = [];
    const maxLen = Math.max(filteredVideos.length, newExternals.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < filteredVideos.length) combined.push(filteredVideos[i]);
      if (i < newExternals.length) combined.push(newExternals[i]);
    }
    return combined;
  }, [filteredVideos, externalVideos, searchQuery]);

  const visibleVideos = useMemo(() => unifiedVideos.slice(0, visibleCount), [unifiedVideos, visibleCount]);
  const hasMore = visibleCount < unifiedVideos.length;

  // Load one bounded batch whenever the bottom sentinel enters the viewport.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(unifiedVideos.length);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 24, unifiedVideos.length));
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, unifiedVideos.length]);

  const heroVideos = useMemo(
    () => {
      const playableReferences = allVideos.filter((video) => {
        const url = video.videoUrl?.toLowerCase() || '';
        return !video.isShort && (url.includes('.mp4') || url.includes('.webm'));
      });

      // Prefer our own storage-backed media for the hero. Third-party preview
      // hosts can reject direct requests, which would leave a large black pane.
      const reliableReferences = playableReferences.filter((video) => {
        const url = video.videoUrl?.toLowerCase() || '';
        return url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com');
      });
      const heroPool = reliableReferences.length >= 3 ? reliableReferences : playableReferences;
      if (heroPool.length <= 3) return heroPool;
      return [
        heroPool[0],
        heroPool[Math.floor(heroPool.length / 3)],
        heroPool[Math.floor((heroPool.length * 2) / 3)],
      ];
    },
    [allVideos]
  );

  // Debounced live web search across ArtStation, Pinterest, Sketchfab, Sakugabooru, Wikimedia
  useEffect(() => {
    if (!searchQuery.trim()) {
      setWebResults([]);
      setExternalVideos([]);
      setWebSearching(false);
      return;
    }

    setWebSearching(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/import/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const items: UnifiedSearchResult[] = data.results || [];
          setWebResults(items);
          const converted = items.map(searchResultToVideo);
          setExternalVideos(converted);
        }
      } catch (err) {
        console.error('Failed to search external web sources:', err);
      } finally {
        setWebSearching(false);
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  return (
    <div className="min-h-screen space-y-12 pb-20 text-left text-foreground">
      <ImmersiveHomeHeader
        videos={heroVideos}
        totalVideos={allVideos.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchInputRef={searchInputRef}
        onOpenPricing={() => setShowPricingDialog(true)}
      />

      {/* 2. SHELF: Recently Viewed References (always playable) */}
      {!searchQuery && (
        <Reveal>
          <RecentlyViewedShelf videos={allVideos} />
        </Reveal>
      )}

      {/* 3. SHELF: Live Web Integration (ArtStation, Pinterest, Sakugabooru, Locomotion) */}
      {!searchQuery && (
        <Reveal>
          <LiveWebDiscoveryShelf />
        </Reveal>
      )}

      {/* 4. SHELF: Monthly challenge + trending community references */}
      {!searchQuery && (
        <Reveal>
          <TrendingCommunityShelf />
        </Reveal>
      )}

      {/* 5. SHELF: Community Portfolio Feed */}
      {!searchQuery && (
        <Reveal>
          <CommunityFeedShelf />
        </Reveal>
      )}

      {/* 6. CATALOG / SEARCH RESULTS */}
      <section id="reference-library" className="scroll-mt-28 space-y-5 pt-4">
        <SectionHeading
          eyebrow={searchQuery ? 'Universal Hub Search' : 'The library'}
          title={searchQuery ? <>Results for “{searchQuery}”</> : 'All reference clips'}
          aside={
            <span className="timecode rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-violet-200">
              <Film className="mr-1.5 inline h-3 w-3 -translate-y-px" />
              {unifiedVideos.length.toLocaleString()}
            </span>
          }
        />

        {/* Global Reference Hub Search Active Banner */}
        {searchQuery && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-zinc-900/70 p-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Universal Reference Hub Active</span>
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    ArtStation • Pinterest • Sketchfab 3D • Sakuga
                  </span>
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {webSearching
                    ? `Broadcasting query "${searchQuery}" to live external 3D & animation engines…`
                    : `Streaming ${externalVideos.length} external models & cuts alongside ${filteredVideos.length} library clips`}
                </p>
              </div>
            </div>

            {webSearching ? (
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Querying live web engines...
              </div>
            ) : (
              <span className="text-xs text-zinc-400">
                Total: <strong className="text-white">{unifiedVideos.length}</strong> matching references
              </span>
            )}
          </div>
        )}

        {/* Filter Bar with Quick Pills */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeType={activeType}
          setActiveType={setActiveType}
          columns={columns}
          setColumns={setColumns}
          activePill={activePill}
          setActivePill={setActivePill}
        />

        {/* Video Grid */}
        {loading && allVideos.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-8">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="skeleton-shimmer aspect-[3/4] md:aspect-video rounded-[15px] ring-1 ring-white/[0.04]"
                style={{ animationDelay: `${(idx % 4) * 120}ms` }}
              />
            ))}
          </div>
        ) : unifiedVideos.length === 0 && !webSearching && searchQuery ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-zinc-300">
              No references found for &quot;{searchQuery}&quot;
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Try broader search terms like &quot;turnaround&quot;, &quot;walk&quot;, &quot;combat&quot;, or &quot;smear&quot;.
            </p>
          </div>
        ) : (
          <VideoGrid title="" videos={visibleVideos} columns={columns} />
        )}

        {/* Infinite Scroll Indicator */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div className="relative h-8 w-8">
                <span className="absolute bottom-0 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-violet-400/30 animate-shadow-pulse" />
                <span className="absolute bottom-1 left-1/2 -ml-2 h-4 w-4 origin-bottom rounded-full bg-gradient-to-b from-violet-300 to-violet-500 shadow-[0_0_14px_rgba(167,139,250,0.7)] animate-ball-bounce" />
              </div>
              <span className="timecode text-[11px] tracking-wider">LOADING MORE REFERENCES</span>
            </div>
          </div>
        )}
      </section>

      <PricingDialog open={showPricingDialog} onOpenChange={setShowPricingDialog} />
    </div>
  );
}
