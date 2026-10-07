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
import { RecentlyViewedShelf } from '@/components/home/RecentlyViewedShelf';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/motion/SectionHeading';
import { filterAvailableVideos } from '@/lib/video-availability';

const VIDEOS_PER_PAGE = 30;

export default function HomePage() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('latest');
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
        setAllVideos(filterAvailableVideos(videos));
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
    } else if (activeTab === 'featured') {
      // Featured: Randomized videos with a mix between tagged accounts, non-tagged accounts, and user uploaded videos
      const taggedOrUploader = result.filter(v => !!v.uploader || !!v.author_name || v.type === 'social' || (v.type as string) === 'instagram' || !!v.originalUrl);
      const userUploaded = result.filter(v => !!v.isPortfolio || !!v.uploader);
      const standardRef = result.filter(v => !v.uploader && !v.author_name && v.type !== 'social' && (v.type as string) !== 'instagram');

      const sortByNewest = (arr: Video[]) => [...arr].sort((a, b) => getVideoTimestamp(b) - getVideoTimestamp(a));

      const sTagged = sortByNewest(taggedOrUploader);
      const sUser = sortByNewest(userUploaded);
      const sStandard = sortByNewest(standardRef);

      const mixed: Video[] = [];
      const seen = new Set<string>();
      const maxLen = Math.max(sTagged.length, sUser.length, sStandard.length);

      for (let i = 0; i < maxLen; i++) {
        if (i < sTagged.length && !seen.has(sTagged[i].id)) {
          mixed.push(sTagged[i]);
          seen.add(sTagged[i].id);
        }
        if (i < sUser.length && !seen.has(sUser[i].id)) {
          mixed.push(sUser[i]);
          seen.add(sUser[i].id);
        }
        if (i < sStandard.length && !seen.has(sStandard[i].id)) {
          mixed.push(sStandard[i]);
          seen.add(sStandard[i].id);
        }
      }

      for (const item of sortByNewest(result)) {
        if (!seen.has(item.id)) {
          mixed.push(item);
          seen.add(item.id);
        }
      }
      result = mixed;
    }

    return result;
  }, [allVideos, activeTab, activeType, activePill, searchQuery]);

  useEffect(() => {
    setVisibleCount(VIDEOS_PER_PAGE);
  }, [activeTab, activeType, activePill, searchQuery]);

  const visibleVideos = useMemo(() => filteredVideos.slice(0, visibleCount), [filteredVideos, visibleCount]);
  const hasMore = visibleCount < filteredVideos.length;

  // Load one bounded batch whenever the bottom sentinel enters the viewport.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(filteredVideos.length);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisibleCount(prev => Math.min(prev + 24, filteredVideos.length));
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredVideos.length]);

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

      {/* 3. SHELF: Community Portfolio Feed */}
      {!searchQuery && (
        <Reveal>
          <CommunityFeedShelf />
        </Reveal>
      )}

      {/* 4. SHELF: Full Reference Discovery Catalog */}
      <section id="reference-library" className="scroll-mt-28 space-y-5 pt-4">
        <SectionHeading
          eyebrow={searchQuery ? 'Search results' : 'The library'}
          title={searchQuery ? <>Results for “{searchQuery}”</> : 'All reference clips'}
          aside={
            <span className="timecode rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-violet-200">
              <Film className="mr-1.5 inline h-3 w-3 -translate-y-px" />
              {filteredVideos.length.toLocaleString()}
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
        ) : (
          <VideoGrid title="" videos={visibleVideos} columns={columns} />
        )}

        {/* Infinite Scroll Indicator */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-8">
            {/* The bouncing ball as a loader — squash on contact, stretch on
                the way up. Reads as "working" and as animation at once. */}
            <div className="flex flex-col items-center gap-3 text-zinc-500">
              <div className="relative h-8 w-8">
                <span className="absolute bottom-0 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-violet-400/30 animate-shadow-pulse" />
                <span className="absolute bottom-1 left-1/2 -ml-2 h-4 w-4 origin-bottom rounded-full bg-gradient-to-b from-violet-300 to-violet-500 shadow-[0_0_14px_rgba(167,139,250,0.7)] animate-ball-bounce" />
              </div>
              <span className="timecode text-[11px] tracking-wider">LOADING NEXT REEL</span>
            </div>
          </div>
        )}
      </section>

      <PricingDialog open={showPricingDialog} onOpenChange={setShowPricingDialog} />
    </div>
  );
}
