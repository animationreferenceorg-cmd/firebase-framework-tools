'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, limit, where, startAfter, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video, Category } from '@/lib/types';
import { findCategoryThumbnailMatch } from '@/lib/category-utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Construction, Grid, X, Search, Loader2 } from 'lucide-react';
import { BrowseHero } from '@/components/BrowseHero';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { FilterBar, TabOption, TypeOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { FeaturedCategoryRow } from '@/components/FeaturedCategoryRow';
import { ChannelBar } from '@/components/ChannelBar';
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

    // Data State
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    // Pagination State
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);

    // Infinite Scroll Ref
    const { ref, inView } = useInView({
        threshold: 0,
        rootMargin: '200px', // Trigger 200px before bottom
    });

    // Trigger Infinite Scroll
    useEffect(() => {
        if (inView && hasMore && !loadingMore && !loading) {
            fetchVideos(false);
        }
    }, [inView, hasMore, loadingMore, loading]);

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
        return (dim === '2d' || dim === '3d' || dim === 'all') ? dim : 'all';
    });
    const [columns, setColumns] = useState<number>(2);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
        if (initialCategoryId) return initialCategoryId;
        return searchParams.get('category');
    });
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    // Sync with Prop if it changes (Server Navigation)
    useEffect(() => {
        if (initialCategoryId) {
            setSelectedCategory(initialCategoryId);
        }
    }, [initialCategoryId]);

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
            setActiveTypeState((dim === '2d' || dim === '3d' || dim === 'all') ? dim : 'all');
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
            setLastDoc(null);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        try {
            // Base constraints
            const constraints: any[] = [
                limit(VIDEOS_PER_PAGE)
            ];

            // If filtering by category server-side (optional optimization, for now we filter client side to match existing hybrid logic, 
            // BUT to save costs effectively we should ideally filter by category here. 
            // However, the user agreed to a simplified pagination first. 
            // Let's implement robust "All Videos" pagination first).

            // To ensure stable pagination, we should order by something.
            // If activeTab is 'latest', order by createdAt (if exists) or just natural order.
            // Since we don't have createdAt on Video type explicitly in the file viewed, we'll try to find a proxy or just use logic.
            // For now, let's just paginate naturally.

            if (!reset && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            // Construct Query
            const q = query(collection(db, "videos"), ...constraints);

            // Execute
            const snapshot = await getDocs(q);

            // Process Results
            const newVideos = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Video));

            // Include drafts but exclude shorts (shorts are on /shorts page)
            const validVideos = newVideos.filter(v => !v.isShort);

            if (reset) {
                setAllVideos(validVideos);
            } else {
                setAllVideos(prev => [...prev, ...validVideos]);
            }

            // Update Cursor
            const lastVisible = snapshot.docs[snapshot.docs.length - 1];
            setLastDoc(lastVisible || null);
            setHasMore(snapshot.docs.length === VIDEOS_PER_PAGE);

        } catch (error) {
            console.error("Error fetching videos:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [lastDoc]);

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

        // 4. Sort by Tab
        if (activeTab === 'latest') {
            // Already roughly sorted by fetch order
            // result = [...result].reverse(); // Don't reverse if paginating, usually
        } else if (activeTab === 'trending') {
            // Shuffle the VIEWABLE results for variety
            result = [...result].sort(() => 0.5 - Math.random());
        }

        return result;
    }, [allVideos, activeType, activeTab, selectedCategory, searchQuery]);

    const handleCategorySelect = (catId: string | null) => {
        // Optimistic update
        setSelectedCategory(catId);
        setIsCategoryDialogOpen(false);
        updateUrl({ category: catId });
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
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans pb-24 -mt-32 -mx-4 md:-mx-8 pt-32">

            {/* 1. Hero Section */}
            {heroVideo ? (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-10 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)] group hover:scale-105 transition-transform duration-300">
                                <Construction className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Preview Build</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                The Ultimate
                            </span>
                            <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                                Reference Library
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-zinc-100 mb-12 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Browse thousands of curated animation clips.
                            <br className="hidden md:block" />
                            Filter by 2D, 3D, source, and more below.
                        </p>

                        {/* Search Bar (Replaces CTA) */}
                        <div className="w-full max-w-2xl mx-auto relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-zinc-400 group-focus-within:text-purple-400 transition-colors" />
                                <Input
                                    placeholder="Search videos, styles, or tags..."
                                    className="pl-14 h-16 bg-black/60 backdrop-blur-xl border-white/10 text-xl rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-400 text-white shadow-2xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </BrowseHero>
            ) : null}

            <div className="px-4 md:px-8 max-w-[1800px] mx-auto">

                {/* 2. Channel Bar (Sticky) */}
                <div id="filters" className="mt-0 mb-0 sticky top-20 z-30 bg-[#030014]/80 backdrop-blur-xl py-4 border-b border-white/5 -mx-4 md:-mx-8 px-4 md:px-8 relative overflow-hidden">
                    {/* Decorative Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-full bg-purple-500/10 blur-3xl pointer-events-none" />

                    <div className="max-w-[1600px] mx-auto">
                        <ChannelBar
                            categories={categories}
                            selectedCategory={selectedCategory}
                            /* 3. Featured Categories (Optional) 
                <FeaturedCategoryRow categories={categories.slice(0, 5)} onCategorySelect={handleCategorySelect} />
                */
                            onSelectCategory={handleCategorySelect}
                            onOpenAllCategories={() => setIsCategoryDialogOpen(true)}
                            columns={columns}
                            setColumns={setColumns}
                        />
                    </div>
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
                <div className="mt-4 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-zinc-200">
                                {selectedCategory
                                    ? (categories.find(c => c.id === selectedCategory)?.title || 'Selected Category')
                                    : (activeTab === 'trending' ? 'Trending Now' : activeTab === 'latest' ? 'Fresh Drops' : 'All Videos')}
                            </h2>
                            {selectedCategory && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCategory(null)}
                                    className="h-6 w-6 p-0 rounded-full hover:bg-zinc-800"
                                >
                                    <X className="h-4 w-4 text-zinc-400" />
                                </Button>
                            )}
                        </div>
                        <span className="text-sm text-zinc-500 font-medium">{filteredVideos.length} Visible</span>
                    </div>

                    <VideoGrid title="" videos={filteredVideos} columns={columns} />

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
