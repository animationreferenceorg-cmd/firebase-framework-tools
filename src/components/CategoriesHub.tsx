'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video, Category } from '@/lib/types';
import { BrowseDirectory } from '@/components/BrowseDirectory';
import { BrowseHero } from '@/components/BrowseHero';
import { Input } from '@/components/ui/input';
import { Search, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const slugify = (text: string) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

export function CategoriesHub() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const prevQuery = useRef('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [vids, catSnap] = await Promise.all([
                    getSnapshotVideos(),
                    getDocs(query(collection(db, 'categories'), where('status', '==', 'published'), limit(100))),
                ]);
                if (cancelled) return;
                setVideos((vids as Video[]).filter((v) => !v.isShort));
                setCategories(
                    catSnap.docs.map((d) => {
                        const data = d.data();
                        const s = data.slug || slugify(data.title || '');
                        return { id: d.id, ...data, slug: s, href: `/category/${s}` } as Category;
                    })
                );
            } catch (e) {
                console.error('Failed to load categories hub:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // A random clip powers the hero video background, matching the home screen.
    const heroVideo = useMemo(() => {
        if (videos.length === 0) return null;
        return videos[Math.floor(Math.random() * videos.length)];
    }, [videos]);

    // As soon as the user types in the hero search, jump down to the results.
    useEffect(() => {
        if (!prevQuery.current && searchQuery) {
            document.getElementById('browse-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        prevQuery.current = searchQuery;
    }, [searchQuery]);

    return (
        <div className="min-h-screen bg-transparent text-white overflow-x-hidden font-sans pb-24 -mt-32 pt-32">
            {/* 1. Hero — same video-background treatment as the home screen */}
            {heroVideo && (
                <BrowseHero video={heroVideo}>
                    <div className="w-full h-full flex flex-col justify-center items-center text-center pb-20 animate-fade-in-up">
                        {/* Badge */}
                        <div className="flex justify-center mb-8 animate-fade-in">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-md shadow-[0_0_30px_-5px_rgba(109,40,217,0.3)]">
                                <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
                                <span className="text-sm font-medium text-purple-100/90">Study & Showcase Your Work</span>
                            </div>
                        </div>

                        {/* Headline */}
                        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight mb-6 leading-[1.1] max-w-5xl mx-auto drop-shadow-2xl">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/70">
                                Browse Animation
                            </span>{' '}
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 animate-gradient-x">
                                References
                            </span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-zinc-100 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-lg font-medium">
                            Discover thousands of animation clips organized by category and tag. Study the best animation, then build and share your portfolio.
                        </p>

                        {/* Category search bar */}
                        <div className="w-full max-w-2xl mx-auto px-3 sm:px-0 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                            <div className="relative">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-5 sm:h-6 w-5 sm:w-6 text-zinc-400 group-focus-within:text-purple-400 transition-colors" />
                                <Input
                                    placeholder="Search categories & tags..."
                                    className="pl-12 sm:pl-14 h-12 sm:h-16 bg-black/60 backdrop-blur-xl border-white/10 text-sm sm:text-base md:text-lg lg:text-xl rounded-2xl focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all placeholder:text-zinc-400 text-white shadow-2xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </BrowseHero>
            )}

            {/* 2. Directory — full width, driven by the hero search */}
            <div id="browse-directory" className="w-full px-4 md:px-8 py-8 scroll-mt-24">
                {loading && videos.length === 0 ? (
                    <div className="space-y-8">
                        <Skeleton className="h-12 w-full max-w-2xl rounded-xl bg-zinc-900" />
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <Skeleton key={i} className="aspect-[4/3] rounded-xl bg-zinc-900" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <BrowseDirectory
                        categories={categories}
                        videos={videos}
                        query={searchQuery}
                        onQueryChange={setSearchQuery}
                    />
                )}
            </div>
        </div>
    );
}
