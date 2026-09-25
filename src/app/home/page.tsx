'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, 
  Search, 
  Play, 
  Flame, 
  Sword, 
  PawPrint, 
  Smile, 
  Zap, 
  ArrowRight, 
  ChevronRight, 
  Film,
  Layers,
  Heart,
  Bookmark,
  Trophy,
  Clapperboard,
  Users
} from 'lucide-react';
import { FilterBar, TabOption, TypeOption, PillOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { VideoCard } from '@/components/VideoCard';
import { PricingDialog } from '@/components/PricingDialog';
import { HomeBillboard } from '@/components/home/HomeBillboard';
import { MotionTiles } from '@/components/home/MotionTiles';
import { Top10Row } from '@/components/home/Top10Row';
import { Scroller } from '@/components/home/ShelfRow';
import { matchesMotion, shuffle, type MotionCategory } from '@/lib/motion-filters';
import { cn } from '@/lib/utils';
import { useHealthyHosts, withHealthyMedia } from '@/lib/media-health';
import { HomeProductLaunchAnnouncement } from '@/components/home/HomeProductLaunchAnnouncement';
import { ArtistStoriesRail } from '@/components/home/ArtistStoriesRail';
import { CommunityFeedShelf } from '@/components/home/CommunityFeedShelf';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from '@/components/motion/Reveal';
import { SectionHeading } from '@/components/motion/SectionHeading';

const VIDEOS_PER_PAGE = 30;

// Horizontal shelves under Top 10, in the order a browsing animator most
// often reaches for them.
const SHELF_CATEGORIES: { id: MotionCategory; title: string; eyebrow: string }[] = [
  { id: 'combat', title: 'Combat & action', eyebrow: 'Hits, swings, recoveries' },
  { id: 'locomotion', title: 'Locomotion', eyebrow: 'Walks, runs, jumps' },
  { id: 'acting', title: 'Acting & performance', eyebrow: 'Faces and gesture' },
];

// Phrased the way people actually search when they have a shot in mind.
const SUGGESTED_SEARCHES = ['sword', 'walk cycle', 'jump', 'punch', 'run', 'sad', 'dog', 'fall', 'lip sync', 'magic'];

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const reduceMotion = useReducedMotion();

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
        setAllVideos(videos);
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

    // Helper to get numeric timestamp for sorting
    const getVideoTimestamp = (v: Video): number => {
      if (typeof v.createdAt === 'number') return v.createdAt;
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

    // Quick Pill Filter — same keyword sets the motion tiles and shelves use.
    if (activePill !== 'all' && activePill !== 'shorts') {
      const category = activePill as MotionCategory;
      result = result.filter(v => matchesMotion(v, category));
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

      function shuffle<T>(arr: T[]): T[] {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
      }

      const sTagged = shuffle(taggedOrUploader);
      const sUser = shuffle(userUploaded);
      const sStandard = shuffle(standardRef);

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

      for (const item of shuffle(result)) {
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

  // Picking a motion tile, or "See all" on a shelf, filters the library and
  // takes you straight to it — one gesture from browsing to the full set.
  const libraryRef = useRef<HTMLElement | null>(null);
  const openInLibrary = (category: MotionCategory) => {
    setActivePill(category);
    setActiveTab('featured');
    requestAnimationFrame(() => libraryRef.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }));
  };

  // Discovery surfaces (billboard, tiles, Top 10, shelves) only draw from
  // media hosts that are actually serving, so a CDN outage leaves them with
  // fewer picks rather than a wall of blank cards. The full library below
  // still lists everything.
  const healthyHosts = useHealthyHosts(allVideos);
  const discoveryVideos = useMemo(() => withHealthyMedia(allVideos, healthyHosts), [allVideos, healthyHosts]);

  // Genre shelves: a shuffled slice of each category, built once per load.
  const shelves = useMemo(() => {
    const pool = discoveryVideos.filter(v => !v.isShort && (v.thumbnailUrl || v.posterUrl) && v.status !== 'draft');
    return SHELF_CATEGORIES.map(({ id, title, eyebrow }) => ({
      id,
      title,
      eyebrow,
      videos: shuffle(pool.filter(v => matchesMotion(v, id))).slice(0, 16),
    })).filter(shelf => shelf.videos.length >= 4);
  }, [discoveryVideos]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen text-foreground pb-20 text-left">
      {/* ── 1. Billboard ─────────────────────────────────────────────── */}
      {!isSearching && <HomeBillboard videos={discoveryVideos} ready={healthyHosts !== null} />}

      {/* ── 2. Command bar ──────────────────────────────────────────────
          Rides up over the billboard's fade, so the page turns from "look at
          this" to "what do you need?" without a hard break. Holds the page's
          one <h1>. */}
      <section
        className={cn(
          'relative z-20 mx-auto max-w-5xl',
          isSearching ? 'mt-2' : '-mt-20 md:-mt-24'
        )}
      >
        <div className="edge-lit rounded-[26px] border border-white/[0.07] bg-[#110f1a]/80 p-4 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live library
                {allVideos.length > 0 && <span className="timecode text-violet-200/60">· {allVideos.length.toLocaleString()} refs</span>}
              </p>
              <h1 className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em] text-white md:text-3xl">
                What are you animating?
              </h1>
            </div>

            <div className="flex w-full items-center gap-2.5 md:w-auto">
              <div className="group/search relative flex-1 md:w-[420px]">
                <div className="pointer-events-none absolute -inset-1 rounded-[20px] bg-gradient-to-r from-violet-600/0 via-violet-500/0 to-amber-400/0 opacity-0 blur-lg transition-all duration-500 ease-out-expo group-focus-within/search:from-violet-600/40 group-focus-within/search:via-fuchsia-500/25 group-focus-within/search:to-amber-400/20 group-focus-within/search:opacity-100" />
                <Search className="absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-violet-300 transition-transform duration-300 ease-overshoot group-focus-within/search:scale-110" />
                <Input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="A sword swing, a sad walk, a dog jumping…"
                  aria-label="Search references"
                  className="relative h-12 rounded-2xl border-white/10 bg-black/40 pl-10 pr-16 text-sm text-white placeholder:text-zinc-500 backdrop-blur-xl transition-colors hover:border-white/20 focus:border-violet-400/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                {isSearching ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="squash absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-zinc-300 transition-colors hover:text-white"
                  >
                    Clear
                  </button>
                ) : (
                  <kbd className="timecode pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400">/</kbd>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setShowPricingDialog(true)}
                className="squash shine flex h-12 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl border-amber-300/25 bg-gradient-to-b from-amber-300/15 to-amber-500/5 px-4 text-xs font-bold text-amber-100 transition-colors hover:border-amber-300/50 hover:bg-amber-400/10 hover:text-white"
                title="Animation Reference Pro"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span className="hidden sm:inline">Go Pro</span>
              </Button>
            </div>
          </div>

          {/* Suggested searches: one tap from an idea to results. */}
          {!isSearching && (
            <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
              {SUGGESTED_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => { setSearchQuery(term); searchInputRef.current?.focus(); }}
                  className="squash shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-violet-300/30 hover:bg-violet-500/10 hover:text-white"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-14 space-y-16 md:mt-16 md:space-y-20">
        {!isSearching && (
          <>
            {/* ── 3. Browse by motion ─────────────────────────────── */}
            <Reveal>
              <section className="space-y-5">
                <SectionHeading eyebrow="Start here" title="Browse by motion" />
                <MotionTiles videos={allVideos} faces={discoveryVideos} onPick={openInLibrary} />
              </section>
            </Reveal>

            {/* ── 4. Top 10 ────────────────────────────────────────── */}
            <Reveal>
              <section className="space-y-4">
                <SectionHeading eyebrow="Most liked" title="Top 10 references" />
                <Top10Row videos={discoveryVideos} />
              </section>
            </Reveal>

            {/* ── 5. Genre shelves ─────────────────────────────────── */}
            {shelves.map((shelf) => (
              <Reveal key={shelf.id}>
                <section className="space-y-4">
                  <SectionHeading
                    eyebrow={shelf.eyebrow}
                    title={shelf.title}
                    aside={
                      <button
                        onClick={() => openInLibrary(shelf.id)}
                        className="squash group/see inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-violet-200 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        See all
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 ease-overshoot group-hover/see:translate-x-0.5" />
                      </button>
                    }
                  />
                  <Scroller>
                    {shelf.videos.map((video) => (
                      <div key={video.id} className="w-[260px] shrink-0 snap-start md:w-[300px]">
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </Scroller>
                </section>
              </Reveal>
            ))}

            {/* ── 6. Community ─────────────────────────────────────── */}
            <Reveal>
              <CommunityFeedShelf />
            </Reveal>

            {/* ── 7. New tools ─────────────────────────────────────── */}
            <Reveal>
              <HomeProductLaunchAnnouncement />
            </Reveal>
          </>
        )}

        {/* ── 8. The library ──────────────────────────────────────── */}
        <section id="library" ref={libraryRef} className="scroll-mt-28 space-y-5">
          <SectionHeading
            eyebrow={isSearching ? 'Search results' : 'Everything'}
            title={isSearching ? <>Results for “{searchQuery}”</> : 'The full library'}
            aside={
              <span className="timecode rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-violet-200">
                <Film className="mr-1.5 inline h-3 w-3 -translate-y-px" />
                {filteredVideos.length.toLocaleString()}
              </span>
            }
          />

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

          {loading && allVideos.length === 0 ? (
            <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 12 }).map((_, idx) => (
                <div
                  key={idx}
                  className="skeleton-shimmer aspect-[3/4] rounded-[15px] ring-1 ring-white/[0.04] md:aspect-video"
                  style={{ animationDelay: `${(idx % 4) * 120}ms` }}
                />
              ))}
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 py-16 text-center">
              <p className="font-display text-xl font-bold text-white">Nothing matches that yet</p>
              <p className="mt-1.5 text-sm text-zinc-400">Try a broader word — “sword” instead of “sword parry riposte”.</p>
            </div>
          ) : (
            <VideoGrid title="" videos={visibleVideos} columns={columns} />
          )}

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
      </div>

      <PricingDialog open={showPricingDialog} onOpenChange={setShowPricingDialog} />
    </div>
  );
}
