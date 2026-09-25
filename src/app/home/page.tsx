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
import { HomeHeroBanner } from '@/components/home/HomeHeroBanner';
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

  const heroVideo = useMemo(
    () => {
      const playableReferences = allVideos.filter((video) => {
        const url = video.videoUrl?.toLowerCase() || '';
        return !video.isShort && (url.includes('.mp4') || url.includes('.webm'));
      });
      if (playableReferences.length === 0) return null;
      return playableReferences[Math.floor(Math.random() * playableReferences.length)];
    },
    [allVideos]
  );

  return (
    <div className="min-h-screen text-foreground space-y-12 pb-20 pt-2 text-left">
      {/* 1. Header Section (Clean, Breathable Title & Search) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="space-y-3 max-w-2xl">
          <p className="eyebrow flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live library
            {allVideos.length > 0 && (
              <span className="timecode text-violet-200/60">· {allVideos.length.toLocaleString()} refs</span>
            )}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.035em] text-white leading-[0.95]">
            {/* Word-by-word entrance: each word rises on its own beat, like
                keys landing in sequence on a timing chart. */}
            {['Discover', 'references'].map((word, i) => (
              <motion.span
                key={word}
                className="inline-block pr-[0.22em]"
                initial={reduceMotion ? false : { opacity: 0, y: '0.45em', rotate: 2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.08 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                {i === 1 ? (
                  <span className="bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                    {word}
                  </span>
                ) : word}
              </motion.span>
            ))}
          </h1>
          <motion.p
            className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-lg"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Curated motion reference for animators — find it, step through it frame by frame, and keep it for the shot.
          </motion.p>
        </div>

        {/* Search Bar & Fast Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="group/search relative flex-1 md:w-96 lg:w-[420px]">
            {/* Soft glow that blooms behind the field when it takes focus. */}
            <div className="pointer-events-none absolute -inset-1 rounded-[20px] bg-gradient-to-r from-violet-600/0 via-violet-500/0 to-amber-400/0 opacity-0 blur-lg transition-all duration-500 ease-out-expo group-focus-within/search:from-violet-600/40 group-focus-within/search:via-fuchsia-500/25 group-focus-within/search:to-amber-400/20 group-focus-within/search:opacity-100" />
            <Search className="absolute left-3.5 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-violet-300 transition-transform duration-300 ease-overshoot group-focus-within/search:scale-110" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search references, tags, studios…"
              className="relative pl-10 pr-16 h-12 bg-[#110f1a]/80 border-white/10 hover:border-white/20 focus:border-violet-400/60 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl text-sm text-white placeholder:text-zinc-500 backdrop-blur-xl transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="squash absolute right-3 top-1/2 z-10 -translate-y-1/2 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors px-2 py-1 rounded-lg bg-white/10"
              >
                Clear
              </button>
            ) : (
              <kbd className="timecode pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400">
                /
              </kbd>
            )}
          </div>

          <Button
            variant="outline"
            onClick={() => setShowPricingDialog(true)}
            className="squash shine h-12 px-4 rounded-2xl bg-gradient-to-b from-amber-300/15 to-amber-500/5 border-amber-300/25 hover:border-amber-300/50 hover:bg-amber-400/10 text-amber-100 hover:text-white shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs"
            title="Animation Reference Pro"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Go Pro</span>
          </Button>
        </div>
      </div>

      {/* 2. Full-Page Creator Discovery Hero Banner */}
      {!searchQuery && (
        <Reveal distance={16}>
          <HomeHeroBanner video={heroVideo} />
        </Reveal>
      )}

      {/* New product launch announcement */}
      {!searchQuery && (
        <Reveal>
          <HomeProductLaunchAnnouncement />
        </Reveal>
      )}

      {/* 3. SHELF: Community Portfolio Feed */}
      {!searchQuery && (
        <Reveal>
          <CommunityFeedShelf />
        </Reveal>
      )}

      {/* 4. SHELF: Full Reference Discovery Catalog */}
      <section className="space-y-5 pt-4">
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
