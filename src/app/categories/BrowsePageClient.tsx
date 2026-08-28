'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video, Category } from '@/lib/types';
import { findCategoryThumbnailMatch } from '@/lib/category-utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Construction, Grid, X, Search, Loader2, Sparkles, Heart, Share2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { BrowseHero } from '@/components/BrowseHero';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { FilterBar, TabOption, TypeOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { BrowseDirectory } from '@/components/BrowseDirectory';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useInView } from 'react-intersection-observer';
import { trackCategoryView } from '@/lib/recent-categories';

const VIDEOS_PER_PAGE = 24;

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')        // Replace spaces with -
        .replace(/&/g, '-and-')      // Replace & with 'and'
        .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
        .replace(/\-\-+/g, '-');     // Replace multiple - with single -
};

interface BrowsePageClientProps {
    initialCategoryId?: string;
}

export default function BrowsePageClient({ initialCategoryId }: BrowsePageClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const { toast } = useToast();
    const [favoritedCategories, setFavoritedCategories] = useState<string[]>([]);

    const toggleFavoriteCategory = (id: string, title: string) => {
        const isFav = favoritedCategories.includes(id);
        if (isFav) {
            setFavoritedCategories(prev => prev.filter(item => item !== id));
            toast({ title: "Removed from Favorites", description: `Removed ${title} from your saved collections.` });
        } else {
            setFavoritedCategories(prev => [...prev, id]);
            toast({ title: "Saved to Favorites", description: `Saved ${title} to your reference collections!` });
        }
    };

    const handleShareCategory = (title: string) => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: "Link Copied!", description: `Share link for ${title} copied to clipboard.` });
        }
    };

    // Data State
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Pagination State (client-side over the static snapshot)
    const [visibleCount, setVisibleCount] = useState(VIDEOS_PER_PAGE);

    // Infinite Scroll Ref
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '200px', // Trigger 200px before bottom
    });

    // Filter State
    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    // Map URL params to State
    const [activeTab, setActiveTabState] = useState<TabOption>(() => {
        const sort = searchParams.get('sort_by');
        return (sort === 'trending' || sort === 'latest') ? sort : 'latest';
    });
    const [activeType, setActiveTypeState] = useState<TypeOption>(() => {
        const dim = searchParams.get('dimension');
        return dim === '2d' ? '2D' : dim === '3d' ? '3D' : 'all';
    });
    const [columns, setColumns] = useState<number>(4);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
        if (initialCategoryId) return initialCategoryId;
        return searchParams.get('category');
    });
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    // Sync with Prop if it changes (Server Navigation)
    useEffect(() => {
        if (initialCategoryId) {
            setSelectedCategory(initialCategoryId);
        }
    }, [initialCategoryId]);

    // Track category views whenever selectedCategory changes
    useEffect(() => {
        if (selectedCategory) {
            trackCategoryView(selectedCategory);
        }
    }, [selectedCategory]);

    // Handle Back/Forward Button
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            if (event.state && event.state.categoryId !== undefined) {
                setSelectedCategory(event.state.categoryId);
            } else {
                const path = window.location.pathname;
                const parts = path.split('/');
                const slug = parts[parts.length - 1]; // /categories/slug
                if (slug && slug !== 'categories') {
                    const cat = categories.find(c => c.slug === slug || c.id === slug);
                    // If categories aren't loaded yet, this might be null. 
                    // But usually they load fast. If null, we might stay null until user interaction?
                    // Ideally we should retry match when categories load.
                    if (cat) setSelectedCategory(cat.id);
                } else {
                    setSelectedCategory(null);
                }
            }

            // Also restore filters from URL on back/forward
            const params = new URLSearchParams(window.location.search);
            const sort = params.get('sort_by');
            setActiveTabState((sort === 'trending' || sort === 'latest') ? sort : 'latest');

            const dim = params.get('dimension');
            setActiveTypeState(dim === '2d' ? '2D' : dim === '3d' ? '3D' : 'all');
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [categories]);

    // Helper to update URL without reload
    const updateUrl = (updates: { category?: string | null, sort?: string, dimension?: string, query?: string }) => {
        const currentParams = new URLSearchParams(window.location.search);

        // Handle Params
        if (updates.sort) currentParams.set('sort_by', updates.sort);
        if (updates.dimension) currentParams.set('dimension', updates.dimension);
        if (updates.query !== undefined) {
            if (updates.query) currentParams.set('q', updates.query);
            else currentParams.delete('q');
        }

        // Handle Path (Category)
        let newPath = window.location.pathname;
        if (updates.category !== undefined) {
            const catId = updates.category;
            if (catId) {
                const category = categories.find(c => c.id === catId);
                const slug = category?.slug || (category?.title ? slugify(category.title) : null);
                newPath = slug ? `/categories/${slug}` : `/categories/${catId}`;
            } else {
                newPath = '/categories';
            }
        }

        const newUrl = `${newPath}?${currentParams.toString()}`;
        if (window.location.pathname + window.location.search !== newUrl) {
            window.history.pushState({
                categoryId: updates.category !== undefined ? updates.category : selectedCategory,
                // We could store other state here if needed
            }, '', newUrl);
        }
    };

    // Wrappers for state setters to also update URL
    const setActiveTab = (tab: TabOption) => {
        setActiveTabState(tab);
        updateUrl({ sort: tab });
    };

    const setActiveType = (type: TypeOption) => {
        setActiveTypeState(type);
        updateUrl({ dimension: type });
    };

    const handleSearch = (q: string) => {
        setSearchQuery(q);
        // Debounce URL update for search could be nice, but for now direct
        updateUrl({ query: q });
    };

    // Data Fetching Function
    const fetchVideos = useCallback(async (reset = false) => {
        if (reset) {
            setLoading(true);
            setAllVideos([]);
            setVisibleCount(VIDEOS_PER_PAGE);
        } else {
            setLoadingMore(true);
        }

        try {
            if (reset) {
                // The whole published library comes from the free static snapshot,
                // so filters and search below cover every video, not just loaded pages.
                const videos = await getSnapshotVideos();
                setAllVideos(videos.filter(v => !v.isShort));
            } else {
                // "Load more" is just revealing more of the already-loaded list
                setVisibleCount(prev => prev + VIDEOS_PER_PAGE);
            }
        } catch (error) {
            console.error("Error fetching videos:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    // Initial Load & Category Fetch
    useEffect(() => {
        // Fetch Categories once
        const fetchCategories = async () => {
            try {
                const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"), limit(100));
                const categorySnapshot = await getDocs(categoriesQuery);
                const fetchedCategories = categorySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const s = data.slug || slugify(data.title || '');
                    return {
                        id: doc.id,
                        href: `/categories/${s}`,
                        slug: s,
                        ...data
                    } as Category;
                });

                // Fallback: If category has no thumbnail, use a video thumbnail from that category
                // Note: We need some videos for this match logic. 
                // Since we are now paginating, we might not have the matching video loaded.
                // We will skip this optimization or do it lazily. For now, let's keep it simple.
                // Or we can fetch a small batch specifically for this? 
                // Let's just set the categories.
                setCategories(fetchedCategories);
            } catch (e) {
                console.error("Categories error", e);
            }
        };

        fetchCategories();
        fetchVideos(true);
    }, []); // Run once on mount

    // Filter Logic (Client-Side filtering on the loaded page)
    const filteredVideos = useMemo(() => {
        let result = [...allVideos];

        // 1. Text Search
        if (searchQuery.trim()) {
            const lowerQ = searchQuery.toLowerCase();
            result = result.filter(v =>
                v.title.toLowerCase().includes(lowerQ) ||
                v.description?.toLowerCase().includes(lowerQ) ||
                v.tags?.some(t => t.toLowerCase().includes(lowerQ))
            );
        }

        // 2. Filter by Category
        if (selectedCategory) {
            result = result.filter(v =>
                (v.categoryIds || []).includes(selectedCategory)
            );
        }

        // 2b. Filter by Tag (from the directory tag explorer)
        if (selectedTag) {
            result = result.filter(v =>
                v.tags?.some(t => t.toLowerCase() === selectedTag)
            );
        }

        // 3. Filter by Type (2D / 3D)
        if (activeType !== 'all') {
            const typeLower = activeType.toLowerCase();
            result = result.filter(v => {
                const tags = v.tags?.map(t => t.toLowerCase()) || [];
                const searchCategories = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
                const combinedText = (v.title + v.description).toLowerCase();

                const tagMatch = tags.some(t => t.includes(typeLower));
                const catMatch = searchCategories.some(c => c.includes(typeLower));
                const textMatch = combinedText.includes(typeLower);

                return tagMatch || catMatch || textMatch;
            });
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

        // 4. Sort / Filter by Tab
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
    }, [allVideos, activeType, activeTab, selectedCategory, selectedTag, searchQuery]);

    // Paginate the filtered results client-side
    const visibleVideos = useMemo(() => filteredVideos.slice(0, visibleCount), [filteredVideos, visibleCount]);
    const hasMore = visibleCount < filteredVideos.length;

    // Start pagination over whenever the filters change
    useEffect(() => {
        setVisibleCount(VIDEOS_PER_PAGE);
    }, [searchQuery, selectedCategory, selectedTag, activeType, activeTab]);

    // Trigger Infinite Scroll
    useEffect(() => {
        if (inView && hasMore && !loadingMore && !loading) {
            fetchVideos(false);
        }
    }, [inView, hasMore, loadingMore, loading, fetchVideos]);

    const scrollToResults = () => {
        setTimeout(() => {
            document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    };

    const handleCategorySelect = (catId: string | null) => {
        // Optimistic update
        setSelectedCategory(catId);
        setIsCategoryDialogOpen(false);
        updateUrl({ category: catId });
        if (catId) scrollToResults();
    };

    const handleTagSelect = (tag: string | null) => {
        setSelectedTag(tag);
        setVisibleCount(VIDEOS_PER_PAGE);
        if (tag) scrollToResults();
    };

    // Hero Video Selection (Pick from first batch)
    const heroVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        // Just pick one from the first few loaded
        return allVideos[0];
    }, [allVideos]);

    if (loading && allVideos.length === 0) {
        return (
            <div className="min-h-screen bg-[#030014] p-8 space-y-8">
                <div className="flex gap-6">
                    <div className="h-[400px] w-full bg-zinc-900/50 rounded-2xl animate-pulse" />
                </div>
                <div className="h-20 w-full bg-zinc-900/50 rounded-lg animate-pulse" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="aspect-video bg-zinc-900/50 rounded-xl animate-pulse" />)}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans pb-24 -mt-32 pt-32">
            {/* 1. Hero Section */}
            {heroVideo ? (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-10 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)] group hover:scale-105 transition-transform duration-300">
                                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Animation Reference Hub</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                Explore Animation
                            </span>
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                                Reference Categories
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-zinc-100 mb-6 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Browse thousands of curated animation clips. Filter by 2D, 3D, source, and categories below.
                        </p>
                    </div>
                </BrowseHero>
            ) : null}

            <div className="w-full px-2 md:px-4 lg:px-6">

                {/* 2. Browse Directory — indexed search + category grid + tag explorer */}
                <div className="mt-8 mb-4">
                    <BrowseDirectory
                        categories={categories}
                        videos={allVideos}
                        onSelectCategory={(catId) => {
                            setSelectedCategory(catId);
                            setSelectedTag(null);
                            updateUrl({ category: catId });
                            document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        onSelectTag={(tag) => {
                            setSelectedTag(tag);
                            setSelectedCategory(null);
                            updateUrl({ query: tag });
                            document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                    />
                </div>

                {/* 4. Filter Bar (Tabs & Toggles) */}
                <div className="mt-4">
                    <FilterBar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        activeType={activeType}
                        setActiveType={setActiveType}
                        columns={columns}
                        setColumns={setColumns}
                    />
                </div>

                {/* 5. Main Content Grid */}
                <div id="results" className="mt-4 min-h-[500px] scroll-mt-24">
                    {/* SEO Category / Tag Banner Header when selected */}
                    {(selectedCategory || selectedTag) && (() => {
                        const activeTitle = selectedCategory
                            ? `${categories.find(c => c.id === selectedCategory)?.title || 'Category'} Animation Reference`
                            : selectedTag
                            ? `${selectedTag.charAt(0).toUpperCase() + selectedTag.slice(1)} Animation Reference`
                            : '';
                        const activeKey = selectedCategory || selectedTag || '';
                        const isFavorited = favoritedCategories.includes(activeKey);
                        const categoryName = selectedCategory ? categories.find(c => c.id === selectedCategory)?.title.toLowerCase() : selectedTag;

                        return (
                            <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-3xl mb-6 text-left space-y-4 shadow-2xl animate-fade-in relative overflow-hidden">
                                {/* Ambient Background Glow */}
                                <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-purple-600/10 blur-[100px] rounded-full pointer-events-none" />

                                {/* Top Action Bar: Badge + Heart / Favorite + Share + Close */}
                                <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/40 text-purple-300 text-xs font-bold shadow-md">
                                            <Sparkles className="h-3.5 w-3.5" />
                                            <span>Reference Collection</span>
                                        </div>
                                        <Badge variant="outline" className="bg-black/60 text-white font-mono text-xs font-bold border-white/15 px-3 py-1">
                                            {filteredVideos.length} Curated Clips
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Heart / Favorite Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleFavoriteCategory(activeKey, activeTitle)}
                                            className={cn(
                                                "h-9 px-3.5 rounded-2xl border-white/15 text-xs font-bold transition-all cursor-pointer shadow-md",
                                                isFavorited
                                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30"
                                                    : "bg-black/60 text-zinc-300 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            <Heart className={cn("h-4 w-4 mr-1.5 transition-colors", isFavorited ? "fill-rose-500 text-rose-500" : "text-zinc-400")} />
                                            {isFavorited ? 'Favorited' : 'Favorite'}
                                        </Button>

                                        {/* Share Button */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleShareCategory(activeTitle)}
                                            className="h-9 px-3.5 rounded-2xl border-white/15 bg-black/60 text-zinc-300 hover:text-white hover:bg-white/10 text-xs font-bold cursor-pointer shadow-md"
                                        >
                                            <Share2 className="h-4 w-4 mr-1.5 text-purple-400" />
                                            Share
                                        </Button>

                                        {/* Clear Button */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setSelectedCategory(null); setSelectedTag(null); updateUrl({ category: null }); }}
                                            className="h-9 px-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 text-xs font-bold cursor-pointer ml-1"
                                        >
                                            <X className="h-4 w-4 mr-1" /> View All Categories
                                        </Button>
                                    </div>
                                </div>

                                {/* Title & Detailed SEO Subtitle */}
                                <div className="space-y-2 relative z-10">
                                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                                        {activeTitle}
                                    </h1>

                                    <p className="text-sm md:text-base text-zinc-300 max-w-5xl font-medium leading-relaxed">
                                        {filteredVideos.length} curated {categoryName} animation reference clips for animators, game developers and motion designers. Open any clip for frame-by-frame playback to study the timing, spacing and posing of real {categoryName} motion — often studied together with staging, cinematic, animation.
                                    </p>
                                </div>

                                {/* Related Topic Badges */}
                                <div className="pt-2 flex flex-wrap gap-2 relative z-10">
                                    {['#staging', '#cinematic', '#animation', '#keyframe', '#timing', '#mechanics'].map(tag => (
                                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono font-semibold text-zinc-400 hover:text-white transition-colors cursor-default">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-zinc-200">
                                {selectedCategory
                                    ? (categories.find(c => c.id === selectedCategory)?.title || 'Selected Category')
                                    : selectedTag
                                    ? `#${selectedTag}`
                                    : (activeTab === 'trending' ? 'Trending Now' : activeTab === 'latest' ? 'Fresh Drops' : 'All Videos')}
                            </h2>
                            {(selectedCategory || selectedTag) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setSelectedCategory(null); setSelectedTag(null); updateUrl({ category: null }); }}
                                    className="h-6 w-6 p-0 rounded-full hover:bg-zinc-800"
                                >
                                    <X className="h-4 w-4 text-zinc-400" />
                                </Button>
                            )}
                        </div>
                        <span className="text-sm text-zinc-500 font-medium">{filteredVideos.length} Matching</span>
                    </div>

                    <VideoGrid title="" videos={visibleVideos} columns={columns} />

                    {filteredVideos.length === 0 && !loading && (
                        <div className="py-20 text-center text-zinc-500">
                            No videos found matching your criteria.
                        </div>
                    )}

                    {/* Infinite Scroll Sentinel */}
                    {hasMore && (
                        <div ref={ref} className="flex justify-center mt-12 mb-20 py-8">
                            {loadingMore ? (
                                <div className="flex items-center gap-2 text-zinc-400">
                                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                                    <span>Loading more inspiration...</span>
                                </div>
                            ) : (
                                <div className="h-8" /> // Invisible spacer to catch scroll
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 6. All Channels Dialog */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent className="bg-zinc-950 border-zinc-800 max-w-5xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-white mb-4">All Categories</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Select a category to filter the video feed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                        <Link
                            href="/categories"
                            onClick={(e) => {
                                e.preventDefault();
                                handleCategorySelect(null);
                            }}
                            className={cn(
                                "flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:scale-[1.02]",
                                selectedCategory === null
                                    ? "bg-purple-500/10 border-purple-500/50"
                                    : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10"
                            )}
                        >
                            <div className="h-12 w-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <Grid className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white">All Channels</h3>
                                <p className="text-xs text-zinc-500">View everything</p>
                            </div>
                        </Link>

                        {categories.map((cat) => (
                            <Link
                                key={cat.id}
                                href={cat.slug ? `/categories/${cat.slug}` : `/categories/${cat.id}`}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleCategorySelect(cat.id);
                                }}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl border text-left transition-all hover:scale-[1.02]",
                                    selectedCategory === cat.id
                                        ? "bg-purple-500/10 border-purple-500/50"
                                        : "bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10"
                                )}
                            >
                                <div className="h-12 w-12 rounded-lg bg-zinc-950 relative overflow-hidden shrink-0">
                                    {cat.imageUrl ? (
                                        <Image src={cat.imageUrl} alt={cat.title} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800" />
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-white truncate">{cat.title}</h3>
                                    <p className="text-xs text-zinc-500 truncate">{cat.description || 'Collection'}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
