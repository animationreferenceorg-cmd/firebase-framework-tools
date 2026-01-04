'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video, Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowRight, Construction } from 'lucide-react';
import { BrowseHero } from '@/components/BrowseHero';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterBar, TabOption, TypeOption } from '@/components/FilterBar';
import { VideoGrid } from '@/components/VideoGrid';
import { LikedVideoRow, LikedCategoryRow } from '@/components/RecentlyViewed';
import Link from 'next/link';

export default function BetaPage() {
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    // "Featured" is the new default tab
    const [activeTab, setActiveTab] = useState<TabOption>('featured');
    const [activeType, setActiveType] = useState<TypeOption>('all');
    const [columns, setColumns] = useState<number>(3);

    // Mock Liked History (In a real app, this would come from local storage or user profile)
    const [likedVideos, setLikedVideos] = useState<Video[]>([]);
    const [likedCategories, setLikedCategories] = useState<Category[]>([]);

    // Data Fetching
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Videos
                const videosQuery = query(collection(db, "videos"), limit(1200));

                // Fetch Categories
                const categoriesQuery = query(collection(db, "categories"), where("status", "==", "published"), limit(100));

                const [videoSnapshot, categorySnapshot] = await Promise.all([
                    getDocs(videosQuery),
                    getDocs(categoriesQuery)
                ]);

                const videos = videoSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Video));

                const fetchedCategories = categorySnapshot.docs.map(doc => ({
                    id: doc.id,
                    href: `/browse?category=${doc.id}`,
                    ...doc.data()
                } as Category));

                // Fallback: If category has no thumbnail, use a video thumbnail from that category
                fetchedCategories.forEach(cat => {
                    if (!cat.imageUrl) {
                        const match = videos.find(v => {
                            const inCategoryIds = (v.categoryIds || []).includes(cat.id);
                            const inCategories = (v.categories || []).includes(cat.id);

                            const catTitleLower = cat.title.toLowerCase();
                            const inCategoriesByTitle = (v.categories || []).some(c => c.toLowerCase() === catTitleLower);

                            // Check tags for looser matching
                            const inTagsByTitle = (v.tags || []).some(t => t.toLowerCase() === catTitleLower);
                            const inTagsById = (v.tags || []).some(t => t.toLowerCase() === cat.id.toLowerCase());

                            return inCategoryIds || inCategories || inCategoriesByTitle || inTagsByTitle || inTagsById;
                        });

                        if (match) {
                            cat.imageUrl = match.thumbnailUrl || match.posterUrl;
                        }
                    }
                });

                setAllVideos(videos);
                setCategories(fetchedCategories);

                // Simulate Liked Items (Take first few)
                setLikedVideos(videos.filter(v => !v.isShort).slice(0, 5));
                setLikedCategories(fetchedCategories.slice(0, 6));

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Filter Logic
    const filteredVideos = useMemo(() => {
        // 0. Global Filter: Remove Shorts
        let result = allVideos.filter(v => !v.isShort);

        // 1. Filter by Type (2D / 3D)
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

        // 2. Sort by Tab
        if (activeTab === 'featured') {
            // For now, simulate "Featured" by picking items with high play counts or just "trending" logic + some editorial picks
            // Since we don't have a 'featured' flag, we'll randomize efficiently
            // Ideally this should use a 'featured' field from DB
            result = [...result].sort(() => 0.5 - Math.random());
        } else if (activeTab === 'latest') {
            result = [...result].reverse();
        } else if (activeTab === 'trending') {
            result = [...result].sort(() => 0.5 - Math.random());
        }
        // 'community' is default order for now

        return result;
    }, [allVideos, activeType, activeTab]);


    // Hero Video
    const heroVideo = useMemo(() => {
        if (allVideos.length === 0) return null;
        const candidates = allVideos.filter(v => !v.isShort);
        if (candidates.length === 0) return allVideos[0];
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return candidates[randomIndex];
    }, [allVideos]);


    if (loading) {
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
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-20 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)] group hover:scale-105 transition-transform duration-300">
                                <Construction className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Preview Build</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1] md:leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
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
                            Filter by 2D, 3D, source, and more.
                        </p>

                        {/* CTA Button */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Button
                                onClick={() => document.getElementById('content')?.scrollIntoView({ behavior: 'smooth' })}
                                className="h-16 px-10 rounded-2xl text-lg font-semibold bg-white text-black hover:bg-white/90 shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)] border border-white/20 transition-all duration-300 group hover:scale-105"
                            >
                                Start Browsing
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </BrowseHero>
            ) : null}


            <div className="px-4 md:px-8 max-w-[1800px] mx-auto mt-8" id="content">

                {/* 2. Recently Viewed Section (Rebranded to Liked) */}
                <div className="mb-8">
                    <LikedCategoryRow categories={likedCategories} />
                    <LikedVideoRow videos={likedVideos} />
                </div>

                {/* 3. Filter Bar (Cleaned up, no ChannelBar) */}
                <div className="mt-4 mb-4">
                    <FilterBar
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        activeType={activeType}
                        setActiveType={setActiveType}
                        columns={columns}
                        setColumns={setColumns}
                    />
                </div>

                {/* 4. Main Content Grid */}
                <div className="min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-zinc-200">
                            {activeTab === 'featured' ? 'Featured Picks' :
                                activeTab === 'trending' ? 'Trending Now' :
                                    activeTab === 'latest' ? 'Fresh Drops' : 'Community Feed'}
                        </h2>
                        <span className="text-sm text-zinc-500 font-medium">{filteredVideos.length} Results</span>
                    </div>

                    <VideoGrid title="" videos={filteredVideos} columns={columns} />

                    {filteredVideos.length === 0 && (
                        <div className="py-20 text-center text-zinc-500">
                            No videos found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
