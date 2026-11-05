'use client';

import { NoReferencesUploadCard } from '@/components/reference/NoReferencesUploadCard';

import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { getInitialVideos, getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video } from '@/lib/types';
import { Film } from 'lucide-react';
import { FilterBar, TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { PricingDialog } from '@/components/PricingDialog';
import { ImmersiveHomeHeader } from '@/components/home/ImmersiveHomeHeader';
import { CommunityFeedShelf } from '@/components/home/CommunityFeedShelf';
import { RecentlyViewedShelf } from '@/components/home/RecentlyViewedShelf';
import { InstagramCommunitySpotlight } from '@/components/InstagramFollowFunnel';
import { getPublicPortfolioItems, portfolioItemToVideo } from '@/lib/portfolio-service';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/motion/SectionHeading';
import { mixReferences } from '@/lib/reference-mix';
import { Loader2 } from 'lucide-react';
import { useReferenceDiscovery } from '@/hooks/use-reference-discovery';
import { balanceSearchResults, mergeReferenceVideos } from '@/lib/reference-feed';
import { filterReferenceCatalog, type SourceOption } from '@/lib/reference-filters';
import { Button } from '@/components/ui/button';
import { useReferenceSearch } from '@/hooks/use-reference-search';

const VIDEOS_PER_PAGE = 30;

export default function HomePage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);
  const [activeMedia, setActiveMedia] = useState<MediaOption>('all');
  const [activeSource, setActiveSource] = useState<SourceOption>('all');
  const discovery = useReferenceDiscovery(deferredQuery, activeTab, activeType, activePill, activeMedia);
  const { loadMore: loadMoreDiscovery, canAutoLoad: canAutoLoadDiscovery, loading: discoveryLoading } = discovery;
  const catalogVideos = useMemo(() => mergeReferenceVideos(discovery.videos, allVideos), [allVideos, discovery.videos]);
  // Remote pages already passed the provider's keyword search. Only classify
  // the local catalog in the worker; arrivals should not rescore the whole library.
  const searchScores = useReferenceSearch(allVideos, deferredQuery);
  const masonry = activeTab === '3d-models' || activeTab === 'visdev' || activeTab === 'character-design' || activeMedia === 'image' || activeMedia === 'model3d';
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
      // 1. Instant initial render (< 50ms) with lightweight initial batch
      const initial = mixReferences(await getInitialVideos().catch(() => [] as Video[]));
      if (initial.length > 0 && isCurrent) {
        setAllVideos(initial);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        // Publish each source independently: slow external search must not
        // hold the entire local catalog behind a Promise.all barrier.
        let library = initial;
        let community: Video[] = [];
        const publish = () => {
          if (isCurrent) setAllVideos(previous => mergeReferenceVideos(previous, library, community));
        };
        await Promise.all([
          getSnapshotVideos().then(videos => {
            if (videos.length) library = mixReferences(videos);
            publish();
            if (isCurrent) setLoading(false);
          }),
          getPublicPortfolioItems({ limitCount: 30 }).then(items => {
            community = items.map(portfolioItemToVideo);
            publish();
          }).catch(() => {}),
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    fetchData();
    return () => { isCurrent = false; };
  }, []);

  const unifiedVideos = useMemo(() => {
    const scores = new Map(searchScores);
    // Live results belong to this exact query. Rank them locally, but don't
    // discard valid provider matches whose short metadata omits our keywords.
    if (deferredQuery.trim() === searchQuery.trim()) {
      for (const video of discovery.videos) scores.set(video.id, Math.max(100, scores.get(video.id) || 0));
    }
    const filtered = filterReferenceCatalog(catalogVideos, {
      tab: activeTab, type: activeType, pill: activePill, media: activeMedia, source: activeSource, query: deferredQuery, scores,
    });
    return deferredQuery.trim() ? balanceSearchResults(filtered) : mixReferences(filtered);
  }, [catalogVideos, activeTab, activeType, activePill, activeMedia, activeSource, deferredQuery, searchScores, searchQuery, discovery.videos]);

  useEffect(() => { setVisibleCount(VIDEOS_PER_PAGE); }, [activeTab, activeType, activePill, activeMedia, activeSource, deferredQuery]);
  const visibleVideos = useMemo(() => unifiedVideos.slice(0, visibleCount), [unifiedVideos, visibleCount]);
  const moreLocal = visibleCount < unifiedVideos.length;
  const hasMore = moreLocal || discovery.hasMore;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      if (moreLocal) setVisibleCount(previous => Math.min(previous + 24, unifiedVideos.length));
      else if (canAutoLoadDiscovery) void loadMoreDiscovery();
    }, { rootMargin: '700px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, moreLocal, unifiedVideos.length, visibleCount, discoveryLoading, canAutoLoadDiscovery, loadMoreDiscovery]);

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

  return (
    <div className="min-h-screen space-y-12 pb-20 text-left text-foreground">
      <ImmersiveHomeHeader
        videos={heroVideos}
        allVideos={allVideos}
        onSelectSource={setActiveSource}
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

      {/* 5. SHELF: Community Portfolio Feed */}
      {!searchQuery && (
        <Reveal>
          <CommunityFeedShelf />
        </Reveal>
      )}

      {/* 5.5. INSTAGRAM COMMUNITY SPOTLIGHT */}
      {!searchQuery && (
        <Reveal>
          <InstagramCommunitySpotlight />
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
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab === '3d-models' && activeType === '2D') setActiveType('all');
            if ((tab === '3d-models' || tab === 'visdev' || tab === 'character-design') && activePill === 'shorts') setActivePill('all');
          }}
          activeType={activeType}
          setActiveType={setActiveType}
          columns={columns}
          setColumns={setColumns}
          activePill={activePill}
          setActivePill={setActivePill}
          activeMedia={activeMedia}
          setActiveMedia={setActiveMedia}
          activeSource={activeSource}
          setActiveSource={setActiveSource}
        />

        {/* Video Grid */}
        {loading && allVideos.length === 0 && unifiedVideos.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-8">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="skeleton-shimmer aspect-[3/4] md:aspect-video rounded-[15px] ring-1 ring-white/[0.04]"
                style={{ animationDelay: `${(idx % 4) * 120}ms` }}
              />
            ))}
          </div>
        ) : unifiedVideos.length === 0 && !discovery.loading ? (
          <NoReferencesUploadCard
            query={searchQuery}
            mediaType={activeMedia === 'video' || activeTab === 'animations' ? 'video' : 'all'}
          />
        ) : (
          <>
            {searchQuery && (activeMedia === 'video' || activeTab === 'animations' || searchQuery.toLowerCase().includes('animation')) && !unifiedVideos.some(v => v.mediaType === 'video' || (v.videoUrl && !v.videoUrl.endsWith('.jpg') && !v.videoUrl.endsWith('.png'))) && (
              <NoReferencesUploadCard
                query={searchQuery}
                mediaType="video"
                className="mb-6"
              />
            )}
            <VideoGrid title="" videos={visibleVideos} columns={columns} layout={masonry ? 'masonry' : 'grid'} />
          </>
        )}

        {/* A visible fallback also lets keyboard users continue without scrolling. */}
        <div ref={loadMoreRef} className="flex flex-col items-center gap-3 py-8" aria-live="polite">
          {discovery.loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Finding more references…</p>}
          {discovery.errors.length > 0 && unifiedVideos.length === 0 && discovery.errors.map(message => <p key={message} className="max-w-xl text-center text-sm text-muted-foreground">{message}</p>)}
          {searchQuery.trim() && discovery.notices.map(message => <p key={message} className="max-w-xl text-center text-sm text-muted-foreground">{message}</p>)}
          {discovery.limited && searchQuery.trim() && <p className="max-w-xl text-center text-sm text-muted-foreground">Pinterest results currently come from a limited selection of public feeds.</p>}
          {(hasMore || (discovery.errors.length > 0 && unifiedVideos.length === 0)) && <Button
            variant="outline" disabled={discovery.loading && !moreLocal && !discovery.canAutoLoad}
            onClick={() => {
              if (moreLocal) setVisibleCount(previous => Math.min(previous + 24, unifiedVideos.length));
              else void discovery.loadMore(true);
            }}
          >{discovery.loading ? 'Loading…' : discovery.errors.length > 0 && !hasMore && unifiedVideos.length === 0 ? 'Retry unavailable sources' : 'Load more references'}</Button>}
          {!hasMore && !discovery.loading && discovery.errors.length === 0 && unifiedVideos.length > 0 && <p className="text-sm text-muted-foreground">You’re caught up with these results. Try another search or filter to explore more.</p>}
        </div>
      </section>

      <PricingDialog open={showPricingDialog} onOpenChange={setShowPricingDialog} />
    </div>
  );
}
