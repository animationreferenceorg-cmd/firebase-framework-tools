'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, query, limit, where, documentId } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video, Category } from '@/lib/types';
import { findCategoryThumbnailMatch } from '@/lib/category-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Sparkles,
  Film,
  LogIn,
  Clock, 
  Flame, 
  Trophy, 
  Upload, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Users, 
  Compass, 
  TrendingUp, 
  Sparkle,
  Layers,
  Wand2,
  Bookmark,
  Bell,
  Megaphone
} from 'lucide-react';
import { BrowseHero } from '@/components/BrowseHero';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar, TabOption, TypeOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { LikedVideoRow, LikedCategoryRow } from '@/components/RecentlyViewed';

import Link from 'next/link';
import { DonateDialog } from '@/components/DonateDialog';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';
import { getRecentCategoryIds } from '@/lib/recent-categories';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/lib/utils';

const VIDEOS_PER_PAGE = 30;

// Top Quick Jump & Spotlight Banner Cards
const COMMUNITY_SPOTLIGHTS = [
  {
    id: 'spotlight-1',
    badge: 'LIKED VIDEOS',
    title: 'My Liked Reference Clips',
    description: 'Jump straight to your favorited video reference clips for quick studying.',
    cta: 'View Liked Clips',
    href: '/profile',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    accent: 'purple',
  },
  {
    id: 'spotlight-2',
    badge: 'LIKED CATEGORIES',
    title: 'My Favorite Categories',
    description: 'Explore your saved animation categories and specialized topic indexes.',
    cta: 'View Categories',
    href: '/categories',
    coverUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=1200&auto=format&fit=crop&q=80',
    accent: 'cyan',
  },
  {
    id: 'spotlight-3',
    badge: 'MOODBOARDS',
    title: 'My Custom Moodboards',
    description: 'Organize, layout, and analyze reference clips on interactive canvas boards.',
    cta: 'Open Moodboards',
    href: '/moodboard',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    accent: 'amber',
  },
  {
    id: 'spotlight-4',
    badge: 'MY PROFILE',
    title: 'My Artist Portfolio & Studio',
    description: 'Manage your uploaded clips, profile settings, and studio portfolio.',
    cta: 'Open Profile',
    href: '/profile',
    coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200&auto=format&fit=crop&q=80',
    accent: 'emerald',
  },
];


export default function HomePage() {
    const { user } = useAuth();
    const { userProfile } = useUser();
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDonateDialog, setShowDonateDialog] = useState(false);

    const spotlightScrollRef = useRef<HTMLDivElement>(null);

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);

    const { ref: inViewRef, inView } = useInView({
        threshold: 0,
        rootMargin: '200px',
    });

    // Filter State
    const [activeTab, setActiveTab] = useState<TabOption>('featured');
    const [activeType, setActiveType] = useState<TypeOption>('all');
    const [columns, setColumns] = useState<number>(6);

    // Liked Data
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [likedCategories, setLikedCategories] = useState<Category[]>([]);
    const [recentCategories, setRecentCategories] = useState<Category[]>([]);

    // Fetch Data
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
        }
        fetchData();
    }, []);

    // Liked Videos
    const likedVideoIdsStr = (userProfile?.likedVideoIds || []).join(',');
    useEffect(() => {
        const fetchLikedVideos = async () => {
            const ids = userProfile?.likedVideoIds || [];
            if (ids.length === 0) { setLikedVideos([]); return; }
            try {
                const chunks: Video[] = [];
                for (let i = 0; i < ids.length; i += 30) {
                    const slice = ids.slice(i, i + 30);
                    const q = query(collection(db, 'videos'), where(documentId(), 'in', slice));
                    const snap = await getDocs(q);
                    snap.docs.forEach(d => chunks.push({ id: d.id, ...d.data() } as Video));
                }
                setLikedVideos(chunks);
            } catch (e) {
                console.error('Failed to fetch liked videos', e);
            }
        };
        fetchLikedVideos();
    }, [likedVideoIdsStr]);

    // Liked & Recent Categories
    useEffect(() => {
        const likedCatIds: string[] = userProfile?.likedCategoryIds || [];
        if (likedCatIds.length === 0) { setLikedCategories([]); return; }
        setLikedCategories(categories.filter(c => likedCatIds.includes(c.id)));
    }, [(userProfile?.likedCategoryIds || []).join(','), categories]);

    useEffect(() => {
        const recentIds = getRecentCategoryIds();
        if (recentIds.length === 0 || categories.length === 0) { setRecentCategories([]); return; }
        const map = new Map(categories.map(c => [c.id, c]));
        setRecentCategories(recentIds.map((id: string) => map.get(id)).filter(Boolean) as Category[]);
    }, [categories]);

    // Filter Logic
    const filteredVideos = useMemo(() => {
        let result = allVideos.filter(v => !v.isShort);

        if (activeTab === 'community') {
            result = result.filter(v =>
                v.type === 'social' ||
                (v.type as string) === 'instagram' ||
                !!v.uploader
            );
        }

        if (activeType !== 'all') {
            const typeLower = activeType.toLowerCase();
            result = result.filter(v => {
                const tags = v.tags?.map(t => t.toLowerCase()) || [];
                const searchCategories = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
                const combinedText = (v.title + v.description).toLowerCase();
                return tags.some(t => t.includes(typeLower)) || searchCategories.some(c => c.includes(typeLower)) || combinedText.includes(typeLower);
            });
        }

        if (activeTab === 'featured') {
            result = [...result].sort(() => 0.5 - Math.random());
        } else if (activeTab === 'latest') {
            result = [...result].reverse();
        } else if (activeTab === 'trending') {
            result = [...result].sort(() => 0.5 - Math.random());
        }

        return result;
    }, [allVideos, activeType, activeTab]);

    useEffect(() => {
        setVisibleCount(VIDEOS_PER_PAGE);
    }, [activeTab, activeType]);

    const visibleVideos = useMemo(() => filteredVideos.slice(0, visibleCount), [filteredVideos, visibleCount]);
    const hasMore = visibleCount < filteredVideos.length;

    useEffect(() => {
        if (inView && hasMore) {
            setVisibleCount(prev => prev + VIDEOS_PER_PAGE);
        }
    }, [inView, hasMore]);

    const heroVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        const candidates = allVideos.filter(v => !v.isShort);
        if (candidates.length === 0) return allVideos[0];
        return candidates[Math.floor(Math.random() * candidates.length)];
    }, [allVideos]);

    // Bento Spotlight Card Video
    const bentoSpotlightVideo = useMemo(() => {
        return allVideos.find(v => v.uploader || v.thumbnailUrl) || heroVideo;
    }, [allVideos, heroVideo]);

    const scrollSpotlight = (direction: 'left' | 'right') => {
        if (spotlightScrollRef.current) {
            const amount = direction === 'left' ? -400 : 400;
            spotlightScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent p-8 space-y-8">
                <div className="h-[400px] w-full bg-zinc-900/50 rounded-3xl animate-pulse" />
                <div className="grid grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => <div key={i} className="aspect-square bg-zinc-900/50 rounded-2xl animate-pulse" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans pb-24 -mt-32 pt-32">
            {/* 1. Hero Showcase Section */}
            {heroVideo && (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-16 animate-fade-in-up">
                        <div className="flex justify-center mb-6 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-white/15 backdrop-blur-md shadow-2xl">
                                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-bold text-purple-200">The Creator Reference & Discovery Hub</span>
                            </div>
                        </div>

                        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight mb-6 leading-[1.1] max-w-6xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                Discover Animation
                            </span>
                            <br />
                            <span className="inline-block bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x transition-all duration-500">
                                Your Professional Portfolio
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-zinc-100 mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Showcase your animation work, get discovered by studios, and collaborate with top animators worldwide.
                        </p>

                        <Button asChild size="lg" className="h-12 sm:h-14 px-6 sm:px-8 rounded-2xl text-sm sm:text-base font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white shadow-xl shadow-purple-600/30 gap-2.5 cursor-pointer hover:scale-105 transition-all">
                            <Link href="/profile">
                                <Upload className="h-5 w-5 text-white" />
                                Build Your Portfolio
                            </Link>
                        </Button>

                        {/* Animated Scrolling Portfolio Features Marquee */}
                        <div className="w-full max-w-4xl mx-auto mt-6 sm:mt-10 overflow-hidden rounded-full bg-gradient-to-r from-purple-950/80 via-zinc-950/80 to-purple-950/80 border border-purple-500/40 py-2 sm:py-3 px-3 sm:px-6 backdrop-blur-2xl shadow-2xl group">
                            <div className="flex whitespace-nowrap animate-marquee items-center gap-8 text-xs md:text-sm font-extrabold text-purple-200">
                                <span className="flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-pink-400 animate-pulse" />
                                    Upload your best animation work
                                </span>
                                <span className="text-purple-500 font-bold">•</span>
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-400" />
                                    Get discovered by industry studios
                                </span>
                                <span className="text-purple-500 font-bold">•</span>
                                <span className="flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-pink-400 animate-pulse" />
                                    Collaborate with top animators
                                </span>
                                <span className="text-purple-500 font-bold">•</span>
                                <span className="flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-purple-400" />
                                    Build your professional portfolio
                                </span>
                            </div>
                        </div>
                    </div>
                </BrowseHero>
            )}

            <div className="w-full px-3 md:px-6 lg:px-8 space-y-12 mt-6" id="content">

                {/* 2. Higgsfield Bento Box Spotlight Grid (FIRST ON TOP) */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-purple-400" />
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Creator Community Bento Spotlights</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Large Hero Bento Announcement Card: Animator Portfolios */}
                        <Link
                            href="/profile"
                            className="group relative md:col-span-2 md:row-span-2 aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden border border-purple-500/40 bg-gradient-to-br from-purple-950 via-zinc-950 to-black p-6 md:p-8 shadow-[0_0_50px_-10px_rgba(168,85,247,0.3)] transition-all duration-500 hover:scale-[1.01] hover:border-purple-400 hover:shadow-[0_0_60px_0px_rgba(168,85,247,0.5)] cursor-pointer flex flex-col justify-between min-h-[340px]"
                        >
                            {/* Background Glow & Ambient Sparkles */}
                            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-purple-600/20 transition-colors" />
                            <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-20 flex items-center justify-between">
                                <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white font-extrabold text-xs shadow-lg flex items-center gap-1.5 border border-purple-400/30">
                                    <Sparkle className="h-3.5 w-3.5 fill-white text-white animate-spin" />
                                    🎉 NEW FEATURE ANNOUNCEMENT
                                </span>
                                <Badge variant="outline" className="bg-purple-950/80 text-purple-300 border-purple-700/50 text-xs font-mono font-bold px-2.5 py-0.5">
                                    LIVE NOW
                                </Badge>
                            </div>

                            <div className="relative z-20 space-y-3 text-left my-4">
                                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md group-hover:text-purple-300 transition-colors">
                                    Animator Portfolios & <br className="hidden sm:inline" />
                                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-purple-400">
                                        WIP Showcase Hub
                                    </span>
                                </h3>
                                <p className="text-xs md:text-sm text-zinc-300 max-w-xl font-medium leading-relaxed">
                                    Claim your personal handle URL (<span className="text-purple-300 font-mono font-semibold">/yourname</span>), upload blocking passes & WIPs, pick cover keyframes with our interactive frame scrubber, and share your work with studio directors worldwide.
                                </p>
                            </div>

                            <div className="relative z-20 flex items-center gap-3 pt-2">
                                <Button size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs md:text-sm px-5 py-2.5 gap-2 shadow-xl group-hover:scale-105 transition-all">
                                    <Sparkles className="h-4 w-4" />
                                    ✨ Create & View Your Portfolio
                                </Button>
                                <span className="text-xs text-purple-300/80 font-medium hidden sm:inline">Free for all animators</span>
                            </div>
                        </Link>

                        {/* Block 1: My Lists & Saved References */}
                        <Link
                            href="/profile"
                            className="group relative aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-purple-950/60 to-zinc-950 p-5 shadow-xl transition-all hover:border-purple-500/60 hover:scale-[1.02] flex flex-col justify-between min-h-[165px]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-900/60 border border-purple-700/50 text-purple-300 font-mono text-[10px] font-bold">
                                    MY LISTS
                                </span>
                                <Bookmark className="h-5 w-5 text-purple-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-left space-y-1">
                                <h4 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                                    My Saved References
                                </h4>
                                <p className="text-xs text-zinc-400 font-medium line-clamp-2">
                                    Organize favorited animation reference clips into custom playlists & study lists.
                                </p>
                            </div>
                        </Link>

                        {/* Block 2: Interactive Moodboards */}
                        <Link
                            href="/moodboard"
                            className="group relative aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-amber-950/60 to-zinc-950 p-5 shadow-xl transition-all hover:border-amber-500/60 hover:scale-[1.02] flex flex-col justify-between min-h-[165px]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-900/60 border border-amber-700/50 text-amber-300 font-mono text-[10px] font-bold">
                                    MOODBOARDS
                                </span>
                                <Wand2 className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-left space-y-1">
                                <h4 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                                    Studio Moodboards
                                </h4>
                                <p className="text-xs text-zinc-400 font-medium line-clamp-2">
                                    Layout and analyze reference videos side-by-side on infinite studio canvases.
                                </p>
                            </div>
                        </Link>

                        {/* Block 3: Community Announcements */}
                        <Link
                            href="/profile"
                            className="group relative aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-rose-950/60 to-zinc-950 p-5 shadow-xl transition-all hover:border-rose-500/60 hover:scale-[1.02] flex flex-col justify-between min-h-[165px]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full bg-rose-900/60 border border-rose-700/50 text-rose-300 font-mono text-[10px] font-bold">
                                    ANNOUNCEMENTS
                                </span>
                                <Megaphone className="h-5 w-5 text-rose-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-left space-y-1">
                                <h4 className="text-lg font-black text-white group-hover:text-rose-300 transition-colors">
                                    Platform News & Updates
                                </h4>
                                <p className="text-xs text-zinc-400 font-medium line-clamp-2">
                                    Stay updated on feature drops, reel studio upgrades, & community showcases.
                                </p>
                            </div>
                        </Link>

                        {/* Block 4: Categories Index (Live Count Updated) */}
                        <Link
                            href="/categories"
                            className="group relative aspect-[16/10] md:aspect-auto rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-cyan-950/60 to-zinc-950 p-5 shadow-xl transition-all hover:border-cyan-500/60 hover:scale-[1.02] flex flex-col justify-between min-h-[165px]"
                        >
                            <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-700/50 text-cyan-300 font-mono text-[10px] font-bold">
                                    {categories.length > 0 ? `${categories.length}+ CATEGORIES` : '120+ CATEGORIES'}
                                </span>
                                <Layers className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div className="text-left space-y-1">
                                <h4 className="text-lg font-black text-white group-hover:text-cyan-300 transition-colors">
                                    Animation Categories
                                </h4>
                                <p className="text-xs text-zinc-400 font-medium line-clamp-2">
                                    Browse body mechanics, acting, quadrupeds, lip sync, combat, & elemental VFX.
                                </p>
                            </div>
                        </Link>
                    </div>
                </div>

                {/* 3. Higgsfield Style Filter Bar & Multi-Column Discovery Grid */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Compass className="h-5 w-5 text-purple-400" />
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Discover Animation References</h2>
                            <Badge variant="outline" className="bg-purple-950/60 text-purple-300 border-purple-800/40 text-xs font-bold">
                                {filteredVideos.length} Clips
                            </Badge>
                        </div>
                    </div>

                    <FilterBar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        activeType={activeType}
                        setActiveType={setActiveType}
                        columns={columns}
                        setColumns={setColumns}
                    />

                    {/* Video Grid */}
                    <VideoGrid title="" videos={visibleVideos} columns={columns} />

                    {/* Infinite Scroll Sentinel */}
                    {hasMore && (
                        <div ref={inViewRef} className="flex justify-center py-8">
                            <div className="flex items-center gap-2 text-zinc-400 text-sm font-semibold">
                                <Sparkles className="h-5 w-5 animate-spin text-purple-500" />
                                <span>Loading more animation inspiration...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <DonateDialog open={showDonateDialog} onOpenChange={setShowDonateDialog} />
        </div>
    );
}
