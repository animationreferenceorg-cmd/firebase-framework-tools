'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video, Category } from '@/lib/types';
import { findCategoryThumbnailMatch } from '@/lib/category-utils';
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
import { DonateDialog } from '@/components/DonateDialog';
import { HomeHeroBanner } from '@/components/home/HomeHeroBanner';
import { HomeProductLaunchAnnouncement } from '@/components/home/HomeProductLaunchAnnouncement';
import { ArtistStoriesRail } from '@/components/home/ArtistStoriesRail';
import { CommunityFeedShelf } from '@/components/home/CommunityFeedShelf';
import { CuratedCategoryPillsShelf } from '@/components/home/CuratedCategoryPillsShelf';
import { ScrollingBentoShelf } from '@/components/home/ScrollingBentoShelf';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { useInView } from 'react-intersection-observer';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import Link from 'next/link';

const VIDEOS_PER_PAGE = 30;

export default function HomePage() {
  const { user } = useAuth();
  const { userProfile } = useUser();
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [selectedPickVideo, setSelectedPickVideo] = useState<Video | null>(null);

  // Pagination & Filters
  const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);
  const [activeTab, setActiveTab] = useState<TabOption>('featured');
  const [activeType, setActiveType] = useState<TypeOption>('all');
  const [activePill, setActivePill] = useState<PillOption>('all');
  const [columns, setColumns] = useState<number>(4);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
    rootMargin: '200px',
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"), limit(100));
        const [videos, categorySnapshot] = await Promise.all([
          getSnapshotVideos(),
          getDocs(categoriesQuery)
        ]);

        const fetchedCategories = categorySnapshot.docs.map(doc => ({
          id: doc.id,
          href: `/categories?category=${doc.id}`,
          ...doc.data()
        } as Category));

        fetchedCategories.forEach(cat => {
          if (!cat.imageUrl || cat.imageUrl.includes('placehold.co')) {
            const match = findCategoryThumbnailMatch(cat, videos);
            if (match) cat.imageUrl = match.thumbnailUrl || match.posterUrl;
          }
        });

        setAllVideos(videos);
        setCategories(fetchedCategories);
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

  // Infinite Scroll
  useEffect(() => {
    if (inView && visibleCount < filteredVideos.length) {
      setVisibleCount(prev => prev + 24);
    }
  }, [inView, visibleCount, filteredVideos.length]);

  const visibleVideos = useMemo(() => filteredVideos.slice(0, visibleCount), [filteredVideos, visibleCount]);
  const hasMore = visibleCount < filteredVideos.length;

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

  // Generate daily random top community animation picks (seeded by current date)
  const dailyCommunityPicks = useMemo(() => {
    if (!allVideos || allVideos.length === 0) return [];

    const candidates = allVideos.filter(v => 
      !v.isShort && (v.thumbnailUrl || v.posterUrl)
    );

    if (candidates.length === 0) return [];

    const communityCandidates = candidates.filter(
      v => v.type === 'social' || (v.type as string) === 'instagram' || !!v.uploader || (v.tags && v.tags.length > 0)
    );
    const pool = [...(communityCandidates.length >= 3 ? communityCandidates : candidates)];

    // Seed hash from date (YYYY-MM-DD)
    const todayStr = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < todayStr.length; i++) {
      seed = ((seed << 5) - seed) + todayStr.charCodeAt(i);
      seed |= 0;
    }

    const picks: Array<{
      video: Video;
      bgGradient: string;
      tag: string;
      creator: string;
    }> = [];

    const gradients = [
      'from-[#0284c7] via-[#0369a1] to-[#024368]', // Sky Blue
      'from-[#ea580c] via-[#c2410c] to-[#7c2d12]', // Coral Orange
      'from-[#d97706] via-[#b45309] to-[#78350f]', // Cyber Gold
    ];

    for (let i = 0; i < Math.min(3, pool.length); i++) {
      const idx = Math.abs((seed + (i * 997)) % pool.length);
      const chosenVideo = pool[idx];
      pool.splice(idx, 1);

      const tag = (chosenVideo.tags?.[0] || chosenVideo.categories?.[0] || 'COMMUNITY').toUpperCase();
      const creator = chosenVideo.uploader ? `by ${chosenVideo.uploader}` : chosenVideo.author_name ? `by ${chosenVideo.author_name}` : 'Community Artist';

      picks.push({
        video: chosenVideo,
        bgGradient: gradients[i % gradients.length],
        tag,
        creator,
      });
    }

    return picks;
  }, [allVideos]);

  return (
    <div className="min-h-screen text-foreground space-y-12 pb-20 pt-2 text-left">
      {/* 1. Header Section (Clean, Breathable Title & Search) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 px-1">
        <div className="space-y-1.5 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Discover References
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
            High-speed curated motion & animation references for artists and studios.
          </p>
        </div>

        {/* Search Bar & Fast Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 10,000+ references, tags, shots..."
              className="pl-10 pr-4 h-11 bg-white/[0.04] border-white/10 hover:border-white/20 focus:border-purple-500 rounded-2xl text-xs text-white placeholder:text-zinc-500 shadow-inner"
            />
          </div>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowDonateDialog(true)}
            className="h-11 w-11 rounded-2xl bg-white/[0.04] border-white/10 hover:bg-white/[0.08] text-zinc-300 hover:text-white shrink-0"
            title="Supporter Tier"
          >
            <Heart className="w-4 h-4 text-pink-400 fill-pink-500/30" />
          </Button>
        </div>
      </div>

      {/* 2. Full-Page Creator Discovery Hero Banner */}
      {!searchQuery && (
        <HomeHeroBanner video={heroVideo} />
      )}

      {/* New product launch announcement */}
      {!searchQuery && (
        <HomeProductLaunchAnnouncement />
      )}

      {/* 3. SHELF: Community Portfolio Feed */}
      {!searchQuery && (
        <CommunityFeedShelf />
      )}

      {/* 4. SHELF: Browse Reference Specialties (Interactive Category Cards) */}
      {!searchQuery && (
        <CuratedCategoryPillsShelf 
          onSelectPill={(pill) => setActivePill(pill as PillOption)} 
          categories={categories}
          videos={allVideos}
        />
      )}

      {/* 5. SHELF: "Our Picks" Daily Community Highlights */}
      {!searchQuery && dailyCommunityPicks.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
              Our Picks
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dailyCommunityPicks.map((pick) => (
              <div
                key={pick.video.id}
                onClick={() => setSelectedPickVideo(pick.video)}
                className={`group relative rounded-3xl overflow-hidden bg-gradient-to-br ${pick.bgGradient} p-6 shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between min-h-[220px] cursor-pointer`}
              >
                <div className="absolute inset-0 opacity-50 group-hover:opacity-65 transition-opacity mix-blend-luminosity">
                  <img
                    src={pick.video.thumbnailUrl || pick.video.posterUrl}
                    alt={pick.video.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-xl bg-black/45 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-white border border-white/10 shadow-sm">
                    {pick.tag}
                  </span>
                  <div className="p-2 rounded-xl bg-black/40 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="relative z-10 text-left space-y-1 mt-auto">
                  <h4 className="text-xl md:text-2xl font-black text-white drop-shadow-md leading-tight line-clamp-2">
                    {pick.video.title}
                  </h4>
                  <p className="text-xs text-white/80 font-semibold drop-shadow-sm truncate">
                    {pick.creator}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. SHELF: Full Reference Discovery Catalog */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-purple-400" />
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight">
              All Reference Clips
            </h2>
            <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-800/40 text-xs font-bold">
              {filteredVideos.length} Clips
            </Badge>
          </div>
        </div>

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
              <div key={idx} className="aspect-[3/4] md:aspect-video rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <VideoGrid title="" videos={visibleVideos} columns={columns} />
        )}

        {/* Infinite Scroll Indicator */}
        {hasMore && (
          <div ref={inViewRef} className="flex justify-center py-8">
            <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold">
              <Sparkles className="h-5 w-5 animate-spin text-purple-500" />
              <span>Loading more reference inspiration...</span>
            </div>
          </div>
        )}
      </section>

      {/* Video Modal Player for Our Picks */}
      {selectedPickVideo && (
        <Dialog open={!!selectedPickVideo} onOpenChange={(open) => !open && setSelectedPickVideo(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/95 border border-white/10 rounded-2xl text-white">
            <DialogTitle className="sr-only">{selectedPickVideo.title}</DialogTitle>
            <div className="aspect-video w-full">
              <VideoPlayer video={selectedPickVideo} startsPaused={false} muted={false} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DonateDialog open={showDonateDialog} onOpenChange={setShowDonateDialog} />
    </div>
  );
}
