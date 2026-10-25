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
import { LiveWebSearchResults } from '@/components/home/LiveWebSearchResults';
import type { UnifiedSearchResult } from '@/app/api/import/search/route';
import { searchResultToVideo, fetchLiveHubReferences } from '@/lib/reference-hub';
import { getPublicPortfolioItems, portfolioItemToVideo } from '@/lib/portfolio-service';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/motion/SectionHeading';
import { filterAvailableVideos } from '@/lib/video-availability';
import { mixReferences } from '@/lib/reference-mix';
import { parseSearchIntent, scoreVideoRelevance } from '@/lib/search-intent';
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
    let isCurrent = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fast initial load of snapshot references so grid displays immediately
        const snapshotVids = await getSnapshotVideos().catch(() => [] as Video[]);
        if (!isCurrent) return;
        const available = filterAvailableVideos(snapshotVids);
        if (available.length > 0) {
          setAllVideos(mixReferences(available));
          setLoading(false);
        }

        // 2. Concurrently fetch and blend live streamed content (Sketchfab 3D, ArtStation VisDev, Pinterest Design, Community)
        const [liveHub, portfolioItems] = await Promise.all([
          fetchLiveHubReferences().catch(() => [] as Video[]),
          getPublicPortfolioItems({ limitCount: 30 }).catch(() => [] as any[]),
        ]);
        if (!isCurrent) return;

        const communityVids = (portfolioItems || []).map(portfolioItemToVideo);
        const blended = [...available, ...liveHub, ...communityVids];
        setAllVideos(mixReferences(blended));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchData();
    return () => { isCurrent = false; };
  }, []);

  // Filtered Videos
  const filteredVideos = useMemo(() => {
    let result = allVideos.filter(v => activePill === 'shorts' ? v.isShort : !v.isShort);

    // Search Query with Animation Domain Intent & Relevance Scoring
    if (searchQuery.trim()) {
      const intent = parseSearchIntent(searchQuery);
      result = result
        .map(v => ({ video: v, score: scoreVideoRelevance(v, intent) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.video);
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
    if (activeTab === 'animations') {
      // Animations: Video clips, animation cuts, sakuga choreography, 2D/3D shots
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        const isVid = !!v.videoUrl && (v.videoUrl.includes('.mp4') || v.videoUrl.includes('.webm') || v.type === 'video');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return !is3D && (isVid || tags.some(t => t.includes('animat') || t.includes('sakuga') || t.includes('cut') || t.includes('clip') || t.includes('smear')) || cats.some(c => c.includes('animat')));
      });
    } else if (activeTab === '3d-models') {
      // 3D Models: Sketchfab interactive 3D models, rigs, and 3D turnarounds
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return is3D || tags.some(t => t === '3d-model' || t === '3d-models' || t === '3d model' || t.includes('turnaround') || t.includes('rigged')) || cats.some(c => c.toLowerCase() === '3d models' || c.toLowerCase() === '3d model');
      });
    } else if (activeTab === 'visdev') {
      // VisDev: ArtStation visual development, concept art, backgrounds, matte painting
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const isPin = source === 'pinterest' || v.id.startsWith('pin_');
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        if (isPin || is3D) return false;
        const isArtStation = source === 'artstation' || v.id.startsWith('as_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return isArtStation || tags.some(t => t.includes('visdev') || t.includes('vis-dev') || t.includes('concept') || t.includes('visual development') || t.includes('matte') || t.includes('environment')) || cats.some(c => c.includes('visdev') || c.includes('concept') || c.includes('visual development'));
      });
    } else if (activeTab === 'character-design') {
      // Character Design: Pinterest model sheets, pose references, anatomy studies
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const isPin = source === 'pinterest' || v.id.startsWith('pin_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return isPin || tags.some(t => t.includes('character-design') || t.includes('character design') || t.includes('model-sheet') || t.includes('model sheet') || t.includes('pose') || t.includes('anatomy') || t.includes('expression')) || cats.some(c => c.includes('character design') || c.includes('model sheet'));
      });
    } else if (activeTab === 'community') {
      // Community: Tagged accounts and portfolio / user uploaded references
      result = result.filter(v => 
        !!v.uploader || 
        !!v.author_name || 
        !!v.isPortfolio || 
        v.type === 'social' || 
        (v.type as string) === 'instagram' || 
        !!v.originalUrl
      );
    } else if (activeTab === 'trending') {
      // Trending: Highest likes & views
      result = [...result].sort((a, b) => {
        const likesA = a.likeCount ?? 0;
        const likesB = b.likeCount ?? 0;
        if (likesB !== likesA) return likesB - likesA;
        const viewsA = a.viewCount ?? 0;
        const viewsB = b.viewCount ?? 0;
        return viewsB - viewsA;
      });
    } else if (activeTab === 'latest') {
      // Latest: Newest first by timestamp
      result = [...result].sort((a, b) => getVideoTimestamp(b) - getVideoTimestamp(a));
    }
    // Featured: keeps the natural randomized, anime-balanced order from mixReferences

    return result;
  }, [allVideos, activeTab, activeType, activePill, searchQuery]);

  useEffect(() => {
    setVisibleCount(VIDEOS_PER_PAGE);
  }, [activeTab, activeType, activePill, searchQuery]);

  // Unified Catalog: seamlessly blend local database clips and external hub results
  const unifiedVideos = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredVideos;
    }

    if (externalVideos.length === 0) {
      return filteredVideos;
    }

    const intent = parseSearchIntent(searchQuery);
    const set = new Set(filteredVideos.map(v => v.id));
    const newExternals = externalVideos.filter(v => !set.has(v.id));

    // Combine local library matches with external hub results (Sketchfab, ArtStation, Pinterest, Sakuga)
    const combined = [...filteredVideos, ...newExternals];
    return combined
      .map(v => ({ video: v, score: scoreVideoRelevance(v, intent) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.video);
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

      {/* 3. SHELF: Monthly challenge + trending community references */}
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
          eyebrow={searchQuery ? 'Search' : 'The library'}
          title={searchQuery ? <>Results for “{searchQuery}”</> : 'All references & 3D models'}
          aside={
            <span className="timecode rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-violet-200">
              <Film className="mr-1.5 inline h-3 w-3 -translate-y-px" />
              {unifiedVideos.length.toLocaleString()}
            </span>
          }
        />

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
