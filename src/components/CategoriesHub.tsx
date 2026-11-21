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
            {/* 1. Full-Screen Cinema Hero (Exact Spacing, Scrims & Theme Match with Home Screen) */}
            <section className="relative -mx-4 -mt-2 min-h-[100svh] overflow-hidden bg-[#08060d] md:-mx-8 flex items-center">
                {/* Full-bleed motion backdrop */}
                <div className="pointer-events-none absolute inset-0">
                    {heroPoster && (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-80"
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
                    {/* Exact Home Screen Cinema Gradient Scrims */}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,5,12,0.96)_0%,rgba(7,5,12,0.78)_35%,rgba(7,5,12,0.2)_70%,rgba(7,5,12,0.45)_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,12,0.62)_0%,transparent_30%,rgba(7,5,12,0.12)_55%,rgba(7,5,12,0.96)_100%)]" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_46%,rgba(124,58,237,0.2),transparent_42%)]" />
                </div>

                {/* Left-Aligned Editorial Content (Exact Home Hero Padding & Type Scale) */}
                <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-[1640px] flex-col justify-center px-6 pb-32 pt-36 sm:px-10 md:px-14 lg:px-20">
                    <div className="max-w-3xl">
                        <div className="mb-5 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-violet-200/80">
                            <span className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                </span>
                                Motion Collections • 30 Curated Channels
                            </span>
                        </div>

                        <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.9] tracking-[-0.055em] text-white sm:text-6xl md:text-7xl lg:text-[5.2rem]">
                            Explore by
                            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-200 bg-clip-text text-transparent">
                                Animation Discipline.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-xl text-base font-medium leading-relaxed text-white/70 sm:text-lg">
                            Cleanly organized reference collections for body mechanics, combat, acting, creatures, 2D sakuga, and 3D character turnarounds — ready for frame-by-frame study.
                        </p>

                        {/* Search Bar (Exact Home Screen Styling) */}
                        <div className="mt-8 max-w-2xl relative z-40">
                            <div className="relative overflow-hidden rounded-2xl bg-black/45 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.9)] backdrop-blur-2xl focus-within:bg-black/60 border border-white/10 focus-within:border-violet-500/50 transition-all flex items-center">
                                <Search className="pointer-events-none ml-5 h-5 w-5 shrink-0 text-violet-200" />
                                <Input
                                    placeholder="Search categories or movements (e.g. walk, sword, acting, quadruped)…"
                                    className="h-16 border-0 bg-transparent px-4 pr-12 text-base font-medium text-white placeholder:text-white/40 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                                        className="mr-4 rounded-full bg-white/10 p-1.5 text-zinc-300 hover:bg-white/20 hover:text-white transition cursor-pointer"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick-Jump Popular Category Pills */}
                        <div className="mt-4 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-zinc-400 mr-1">Popular:</span>
                            {POPULAR_SHORTCUTS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-violet-600/30 hover:border-violet-500/50 hover:text-white transition-all"
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Primary Hero Action */}
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={scrollToDirectory}
                                className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-black text-[#0b0911] transition-transform hover:scale-[1.03] cursor-pointer"
                            >
                                <Play className="h-4 w-4 fill-current" />
                                <span>Browse all categories</span>
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
