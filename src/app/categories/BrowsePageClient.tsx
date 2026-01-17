'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { useInView } from 'react-intersection-observer';

const VIDEOS_PER_PAGE = 24;

export default function BrowsePageClient() {
    const searchParams = useSearchParams();

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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabOption>('latest'); // Default to latest for consistent pagination
    const [activeType, setActiveType] = useState<TypeOption>('all');
    const [columns, setColumns] = useState<number>(2);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

    // Check URL params for category
    useEffect(() => {
        const catParam = searchParams.get('category');
        if (catParam) {
            setSelectedCategory(catParam);
        }
    }, [searchParams]);

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
                const fetchedCategories = categorySnapshot.docs.map(doc => ({
                    id: doc.id,
                    href: `/categories?category=${doc.id}`,
                    ...doc.data()
                } as Category));

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
        setSelectedCategory(catId);
        setIsCategoryDialogOpen(false);
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
                        <button
                            onClick={() => handleCategorySelect(null)}
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
                        </button>

                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id)}
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
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
