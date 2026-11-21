'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getSnapshotVideos } from '@/lib/videoSnapshot';
import type { Video, Category } from '@/lib/types';
import { BrowseDirectory } from '@/components/BrowseDirectory';
import { Input } from '@/components/ui/input';
import { ArrowDown, Play, Search, Sparkles, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { filterAvailableVideos, isVideoSourceAvailable } from '@/lib/video-availability';

const slugify = (text: string) =>
    text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/&/g, '-and-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');

const POPULAR_SHORTCUTS = [
    { label: 'Walk Cycles', href: '/category/walk-cycles' },
    { label: 'Combat & Stunts', href: '/category/martial-arts-stunts' },
    { label: 'Acting & Facial', href: '/category/acting-and-dialogue' },
    { label: 'Quadrupeds', href: '/category/quadruped-walks' },
    { label: '2D Smear Frames', href: '/category/smear-frames' },
    { label: 'Character Turnarounds', href: '/category/character-turnarounds' },
];

function getCleanHeroMp4(url?: string): string | undefined {
    if (!url) return undefined;
    let target = url.trim();
    if (target.includes('playlist.m3u8')) target = target.replace('playlist.m3u8', 'play_480p.mp4');
    if (target.includes('b-cdn.net')) {
        target = target.replace('play_1080p.mp4', 'play_480p.mp4').replace('play_720p.mp4', 'play_480p.mp4');
    }
    if (target.toLowerCase().includes('.mp4') || target.toLowerCase().includes('.webm')) return target;
    return undefined;
}

export function CategoriesHub() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [vids, catSnap] = await Promise.all([
                    getSnapshotVideos(),
                    getDocs(query(collection(db, 'categories'), where('status', '==', 'published'), limit(100))),
                ]);
                if (cancelled) return;
                const availableVideos = filterAvailableVideos(
                    (vids as Video[]).filter((v) => !v.isShort)
                );
                setVideos(availableVideos);
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

    // Deterministic landscape playable clip for the full-screen cinema backdrop
    const heroVideo = useMemo(() => {
        if (videos.length === 0) return null;
        const playable = videos.filter((v) => isVideoSourceAvailable(v.videoUrl) && Boolean(getCleanHeroMp4(v.videoUrl)));
        if (playable.length === 0) return null;
        const reliable = playable.filter((v) => {
            const u = (v.videoUrl || '').toLowerCase();
            return u.includes('storage.googleapis.com') || u.includes('firebasestorage.googleapis.com') || u.includes('b-cdn.net');
        });
        const landscape = (reliable.length > 0 ? reliable : playable).filter((v) => !v.width || !v.height || v.width >= v.height);
        const pool = landscape.length > 0 ? landscape : playable;
        return pool[0] || null;
    }, [videos]);

    const heroMp4 = getCleanHeroMp4(heroVideo?.videoUrl);
    const heroPoster = heroVideo?.thumbnailUrl || heroVideo?.posterUrl;

    const scrollToDirectory = () => {
        document.getElementById('browse-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-transparent text-white font-sans pb-24">
            {/* 1. Full-Screen Cinema Hero (Matches Home Screen Vibe, Left-Aligned Netflix/ArtStation Readability) */}
            <section className="relative -mx-4 -mt-2 min-h-[82svh] overflow-hidden bg-[#08060d] md:-mx-8 flex items-center">
                {/* Full-bleed motion backdrop */}
                <div className="pointer-events-none absolute inset-0">
                    {heroPoster && (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-75"
                            style={{ backgroundImage: `url(${heroPoster})` }}
                        />
                    )}
                    {heroMp4 && (
                        <video
                            src={heroMp4}
                            poster={heroPoster}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    )}
                    {/* High-contrast Netflix/Cinema left-to-right + bottom scrims for effortless readability */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,6,14,0.97)_0%,rgba(8,6,14,0.85)_42%,rgba(8,6,14,0.35)_75%,rgba(8,6,14,0.55)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,14,0.6)_0%,transparent_28%,rgba(8,6,14,0.25)_65%,rgba(8,6,14,0.98)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_45%,rgba(124,58,237,0.22),transparent_45%)]" />
                </div>

                {/* Left-Aligned Editorial Content */}
                <div className="relative z-10 flex w-full flex-col justify-center px-6 pb-20 pt-32 sm:px-10 md:px-14 lg:px-16">
                    <div className="max-w-3xl space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/15 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-200 backdrop-blur-md">
                            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                            <span>Motion Collections · 30 Curated Channels</span>
                        </div>

                        <h1 className="font-display text-5xl font-black leading-[0.94] tracking-[-0.045em] text-white sm:text-6xl md:text-7xl">
                            Explore by
                            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                                Animation Discipline.
                            </span>
                        </h1>

                        <p className="max-w-xl text-base font-medium leading-relaxed text-zinc-200/85 sm:text-lg">
                            Cleanly organized reference collections for body mechanics, combat, acting, creatures, 2D sakuga, and 3D character turnarounds — ready for frame-by-frame study.
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl relative group">
                            <div className="relative flex items-center rounded-2xl border border-white/15 bg-black/55 backdrop-blur-2xl shadow-2xl focus-within:border-violet-400/60 focus-within:bg-black/75 transition-all">
                                <Search className="pointer-events-none ml-4 h-5 w-5 shrink-0 text-violet-300" />
                                <Input
                                    placeholder="Search categories or movements (e.g. walk, sword, acting, quadruped)…"
                                    className="h-14 border-0 bg-transparent px-3 pr-12 text-sm sm:text-base font-medium text-white placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') scrollToDirectory();
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear search"
                                        className="mr-3 rounded-full p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick-Jump Popular Category Pills */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1">Popular:</span>
                            {POPULAR_SHORTCUTS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-xs font-bold text-zinc-100 backdrop-blur-md hover:border-violet-400/60 hover:bg-violet-600/35 hover:text-white transition-all"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Primary Hero Action */}
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                                type="button"
                                onClick={scrollToDirectory}
                                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#0b0911] shadow-xl transition-transform hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span>Browse All Categories</span>
                                <ArrowDown className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Full-Width Editorial Bento Directory */}
            <div id="browse-directory" className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-10 scroll-mt-24">
                {loading && videos.length === 0 ? (
                    <div className="space-y-6">
                        <div className="flex gap-2 overflow-hidden">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 w-36 rounded-full bg-white/5 shrink-0" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
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
