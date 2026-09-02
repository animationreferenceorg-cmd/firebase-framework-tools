'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  X, 
  Film, 
  LayoutGrid, 
  ChevronDown, 
  ArrowRight, 
  Clock, 
  Sparkles, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  SlidersHorizontal,
  Grid,
  TrendingUp,
  Clock3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Video, Category } from '@/lib/types';
import { buildBrowseIndex, matchScore, scoreCategory, type TagEntry } from '@/lib/browse-index';
import { getRecentCategoryIds } from '@/lib/recent-categories';

interface BrowseDirectoryProps {
    categories: Category[];
    videos: Video[];
    query?: string;
    onQueryChange?: (value: string) => void;
    onSelectCategory?: (catId: string) => void;
    onSelectTag?: (tag: string) => void;
}

const DEFAULT_ITEMS_LIMIT = 48;
const ITEMS_STEP = 36;

const needsUnoptimized = (url?: string) =>
    !!url && (url.includes('.b-cdn.net') || url.includes('cdninstagram.com') || url.includes('instagram.com'));

const formatCount = (count: number) => (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`);

const slugifyTag = (tag: string) =>
    tag.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categoryHref = (cat: Category) =>
    `/category/${cat.slug || cat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

export interface UnifiedCategoryCardItem {
    id: string;
    rawId?: string;
    isTag?: boolean;
    href: string;
    title: string;
    coverUrl?: string;
    count: number;
    description?: string;
    badge?: string;
}

export function BrowseDirectory({ categories, videos, query: controlledQuery, onQueryChange, onSelectCategory, onSelectTag }: BrowseDirectoryProps) {
    const [internalQuery, setInternalQuery] = useState('');
    const isControlled = controlledQuery !== undefined;
    const query = isControlled ? controlledQuery : internalQuery;
    const setQuery = (value: string) => {
        if (onQueryChange) onQueryChange(value);
        if (!isControlled) setInternalQuery(value);
    };
    const [activeChannelFilter, setActiveChannelFilter] = useState<string | null>(null);
    const [activeSortMode, setActiveSortMode] = useState<'all' | 'trending' | 'latest'>('all');
    const [visibleLimit, setVisibleLimit] = useState(DEFAULT_ITEMS_LIMIT);
    const [recentCatIds, setRecentCatIds] = useState<string[]>([]);

    const featureScrollRef = useRef<HTMLDivElement>(null);
    const channelPillScrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setRecentCatIds(getRecentCategoryIds());
    }, []);

    // Reset pagination whenever the (possibly external) search query changes.
    useEffect(() => {
        setVisibleLimit(DEFAULT_ITEMS_LIMIT);
    }, [query]);

    const { categoryCounts, categoryCovers, tags: tagEntries } = useMemo(
        () => buildBrowseIndex(categories, videos),
        [categories, videos]
    );

    const recentCategories = useMemo(
        () => recentCatIds.map((id) => categories.find((c) => c.id === id)).filter(Boolean).slice(0, 6) as Category[],
        [recentCatIds, categories]
    );

    const q = query.toLowerCase().trim();

    // Unified List: Combine categories and tag topics into a single "Channels" library
    const unifiedList = useMemo(() => {
        const catItems: UnifiedCategoryCardItem[] = categories.map((c, idx) => ({
            id: `cat-${c.id}`,
            rawId: c.id,
            isTag: false,
            href: categoryHref(c),
            title: c.title,
            coverUrl: categoryCovers[c.id] || c.imageUrl,
            count: categoryCounts[c.id] || 0,
            description: c.description || 'Animation Reference Channel',
            badge: idx % 3 === 0 ? 'ART BLAST' : idx % 2 === 0 ? 'FEATURED' : 'SPOTLIGHT',
        }));

        const tagItems: UnifiedCategoryCardItem[] = tagEntries.map((t, idx) => ({
            id: `tag-${t.tag}`,
            rawId: t.tag,
            isTag: true,
            href: `/tags/${slugifyTag(t.tag)}`,
            title: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
            coverUrl: t.coverUrl,
            count: t.count,
            description: `${t.count} reference clips`,
            badge: idx % 4 === 0 ? 'FEATURED' : 'TRENDING',
        }));

        const seenTitles = new Set<string>();
        const combined: UnifiedCategoryCardItem[] = [];

        for (const item of catItems) {
            seenTitles.add(item.title.toLowerCase().trim());
            combined.push(item);
        }
        for (const item of tagItems) {
            if (!seenTitles.has(item.title.toLowerCase().trim())) {
                seenTitles.add(item.title.toLowerCase().trim());
                combined.push(item);
            }
        }

        return combined;
    }, [categories, categoryCovers, categoryCounts, tagEntries]);

    // ArtStation Style Featured Top Banners (Top 6 Items)
    const featuredBanners = useMemo(() => {
        return [...unifiedList].sort((a, b) => b.count - a.count).slice(0, 7);
    }, [unifiedList]);

    // Top Channel Filter Pills with thumbnails
    const channelPillItems = useMemo(() => {
        return [...unifiedList].sort((a, b) => b.count - a.count).slice(0, 18);
    }, [unifiedList]);

    // Filter & Sort Channels List
    const processedChannels = useMemo(() => {
        let result = [...unifiedList];

        // 1. Search Filter
        if (q) {
            result = result
                .map((item) => {
                    const titleScore = matchScore(item.title.toLowerCase(), q);
                    const descScore = item.description ? matchScore(item.description.toLowerCase(), q) : 0;
                    return { item, score: Math.max(titleScore, descScore) };
                })
                .filter((x) => x.score > 0)
                .sort((a, b) => b.score - a.score || b.item.count - a.item.count)
                .map((x) => x.item);
            return result;
        }

        // 2. Channel Filter Pill
        if (activeChannelFilter) {
            result = result.filter(item => item.id === activeChannelFilter || item.title.toLowerCase() === activeChannelFilter.toLowerCase());
        }

        // 3. Sorting Tabs
        if (activeSortMode === 'trending') {
            result.sort((a, b) => b.count - a.count);
        } else if (activeSortMode === 'latest') {
            result.reverse();
        }

        return result;
    }, [unifiedList, q, activeChannelFilter, activeSortMode]);

    const visibleChannels = processedChannels.slice(0, visibleLimit);
    const hiddenCount = processedChannels.length - visibleChannels.length;

    const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
        if (ref.current) {
            const amount = direction === 'left' ? -400 : 400;
            ref.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    return (
        <div className="space-y-6 text-left">
            {/* 1. Header Search Bar — hidden when the hero search controls the query */}
            {!isControlled && (
            <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-2xl py-3 px-4 md:px-6 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between gap-4 w-full">
                <div className="relative w-full flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                    <Input
                        type="text"
                        placeholder="Search channels, categories, and tags in real-time..."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setVisibleLimit(DEFAULT_ITEMS_LIMIT);
                        }}
                        className="h-12 pl-12 pr-10 rounded-xl bg-black/80 border-white/15 text-white placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-purple-500/80 text-sm md:text-base font-medium shadow-inner"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setVisibleLimit(DEFAULT_ITEMS_LIMIT);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                            aria-label="Clear"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {q ? (
                    <span className="text-xs font-bold text-purple-300 hidden md:inline shrink-0">
                        {processedChannels.length} Channels Found
                    </span>
                ) : (
                    <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-semibold shrink-0">
                        <Sparkles className="h-4 w-4 text-purple-400" />
                        <span>{unifiedList.length} Reference Channels</span>
                    </div>
                )}
            </div>
            )}

            {/* 2. Top Feature Banner Carousel Cards (ArtStation Style Widescreen Hero Banners) */}
            {!q && (
                <div className="relative space-y-2 group/features">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Flame className="h-3.5 w-3.5 text-amber-400" /> Featured Art Blasts & Spotlights
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => scrollContainer(featureScrollRef, 'left')}
                                className="h-7 w-7 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => scrollContainer(featureScrollRef, 'right')}
                                className="h-7 w-7 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div
                        ref={featureScrollRef}
                        className="flex items-center gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
                    >
                        {featuredBanners.map((banner, idx) => (
                            <Link
                                key={banner.id}
                                href={banner.href}
                                className="group relative shrink-0 w-[280px] md:w-[320px] lg:w-[360px] aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/70 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] cursor-pointer flex flex-col justify-end p-4"
                            >
                                {banner.coverUrl ? (
                                    <Image
                                        src={banner.coverUrl}
                                        alt={banner.title}
                                        fill
                                        unoptimized={needsUnoptimized(banner.coverUrl)}
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-950 to-black" />
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                                {/* Top Floating Badge */}
                                <div className="absolute top-3 left-3 z-20">
                                    <span className="px-2.5 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] font-extrabold shadow">
                                        {banner.badge}
                                    </span>
                                </div>

                                <div className="absolute top-3 right-3 z-20">
                                    <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] font-bold">
                                        {formatCount(banner.count)} clips
                                    </span>
                                </div>

                                <div className="relative z-20 space-y-1 text-left">
                                    <h3 className="text-base md:text-lg font-extrabold text-white leading-tight drop-shadow-md truncate group-hover:text-purple-300 transition-colors">
                                        {banner.title}
                                    </h3>
                                    <p className="text-[11px] text-zinc-300/80 line-clamp-1 font-medium">
                                        {banner.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* 3. Horizontal Channel Filter Pills Bar (ArtStation Style Thumbnail Pills) */}
            {!q && (
                <div className="relative space-y-2">
                    <div className="flex items-center justify-between">
                        <div
                            ref={channelPillScrollRef}
                            className="flex items-center gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth w-full"
                        >
                            {/* All Channels — navigate to /tags (the full A-Z index) */}
                            <Link
                                href="/tags"
                                className={cn(
                                    "shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shadow-md bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-white/20 hover:bg-zinc-800 hover:text-white"
                                )}
                            >
                                <Grid className="h-4 w-4 text-purple-300" />
                                <span>All Channels</span>
                            </Link>

                            {/* Thumbnail Category Pills */}
                            {channelPillItems.map((item) => {
                                const isSelected = activeChannelFilter === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setActiveChannelFilter(isSelected ? null : item.id)}
                                        className={cn(
                                            "shrink-0 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-md group/pill",
                                            isSelected
                                                ? "bg-purple-600 text-white border-purple-500 shadow-purple-600/30 scale-105"
                                                : "bg-zinc-900/90 text-zinc-300 border-white/10 hover:border-purple-500/50 hover:bg-zinc-800 hover:text-white"
                                        )}
                                    >
                                        <div className="relative h-6 w-6 rounded-md overflow-hidden bg-black shrink-0 border border-white/10">
                                            {item.coverUrl ? (
                                                <Image src={item.coverUrl} alt={item.title} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                    <Film className="h-3 w-3 text-white/50" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="truncate max-w-[140px]">{item.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Section Header Title & Sub-Filter Bar (ArtStation Style "All Channels") */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-white/10">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {activeChannelFilter
                            ? unifiedList.find(i => i.id === activeChannelFilter)?.title || 'Selected Channel'
                            : 'All Channels'}
                    </h2>
                    {activeChannelFilter && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveChannelFilter(null)}
                            className="h-7 px-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 text-xs font-bold cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5 mr-1" /> Reset Filter
                        </Button>
                    )}
                </div>

                {/* ArtStation Style Bottom Sorting Pills ([All], [Trending], [Latest]) */}
                <div className="flex items-center gap-1 bg-black/60 p-1 rounded-2xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => setActiveSortMode('all')}
                        className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer",
                            activeSortMode === 'all'
                                ? "bg-white text-black shadow-md"
                                : "text-zinc-400 hover:text-white"
                        )}
                    >
                        Community
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSortMode('trending')}
                        className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                            activeSortMode === 'trending'
                                ? "bg-white text-black shadow-md"
                                : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Trending
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSortMode('latest')}
                        className={cn(
                            "px-4 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1",
                            activeSortMode === 'latest'
                                ? "bg-white text-black shadow-md"
                                : "text-zinc-400 hover:text-white"
                        )}
                    >
                        <Clock3 className="h-3.5 w-3.5" />
                        Latest
                    </button>
                </div>
            </div>

            {/* 5. Rich Multi-Column Grid (ArtStation Masonry Square Grid - Full Width 8 Columns) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3 md:gap-4 w-full">
                {visibleChannels.map((item) => (
                    <BrowseCard
                        key={item.id}
                        href={item.href}
                        title={item.title}
                        coverUrl={item.coverUrl}
                        count={item.count}
                        description={item.description}
                        onClick={(e) => {
                            if (onSelectCategory && item.rawId && !item.isTag) {
                                e.preventDefault();
                                onSelectCategory(item.rawId);
                            } else if (onSelectTag && item.rawId && item.isTag) {
                                e.preventDefault();
                                onSelectTag(item.rawId);
                            }
                        }}
                    />
                ))}
            </div>

            {/* Load More Channels */}
            {hiddenCount > 0 && (
                <div className="flex justify-center pt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setVisibleLimit((prev) => prev + ITEMS_STEP)}
                        className="rounded-2xl border-white/10 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-300 hover:text-white px-8 py-3.5 flex items-center gap-2 shadow-2xl cursor-pointer"
                    >
                        <ChevronDown className="h-4 w-4 text-purple-400" />
                        Load More Channels ({hiddenCount.toLocaleString()} remaining)
                    </Button>
                </div>
            )}

            {/* Empty State */}
            {processedChannels.length === 0 && (
                <div className="py-16 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
                    <p className="text-base font-bold text-white">No channels found matching “{query}”</p>
                    <p className="text-xs text-zinc-400">Try searching for <em>Character Animation</em>, <em>Run Cycle</em>, <em>Lip Sync</em>, or <em>VFX</em>.</p>
                </div>
            )}
        </div>
    );
}

import { useWatchTracker } from '@/hooks/use-watch-tracker';

// ArtStation Style Square Category / Channel Card
function BrowseCard({
    href,
    title,
    coverUrl,
    count,
    description,
    onClick,
}: {
    href: string;
    title: string;
    coverUrl?: string;
    count: number;
    description?: string;
    onClick?: (e: React.MouseEvent) => void;
}) {
    const [hasError, setHasError] = useState(false);
    const { beginWatch, endWatch } = useWatchTracker();
    const hoverKey = `hover:browse:${href}`;

    return (
        <Link
            href={href}
            onClick={onClick}
            onMouseEnter={() => beginWatch(hoverKey, 'hover')}
            onMouseLeave={() => endWatch(hoverKey)}
            className="group/card relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg transition-all duration-300 text-left hover:-translate-y-1 hover:border-purple-500/80 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.5)] cursor-pointer block w-full"
        >
            {coverUrl && !hasError ? (
                <Image
                    src={coverUrl}
                    alt={title}
                    fill
                    unoptimized={needsUnoptimized(coverUrl)}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    onError={() => setHasError(true)}
                    className="object-cover transition-transform duration-500 group-hover/card:scale-110"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-950 via-indigo-950 to-zinc-950 flex flex-col items-center justify-center p-3 text-center">
                    <Film className="h-8 w-8 text-purple-400/50 mb-1" />
                    <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider line-clamp-1">{title}</span>
                </div>
            )}

            {/* Quick Hover Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="h-10 w-10 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl group-hover/card:scale-110 transition-transform">
                    <Play className="h-4 w-4 fill-white ml-0.5" />
                </div>
            </div>

            {count > 0 && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-extrabold text-white z-20 shadow-md">
                    {formatCount(count)}
                </div>
            )}

            {/* Gradient Overlay & Title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-3 flex flex-col justify-end z-10">
                <h3 className="font-extrabold text-white text-sm leading-tight line-clamp-2 capitalize transition-colors drop-shadow-md group-hover/card:text-purple-300">
                    {title}
                </h3>
            </div>
        </Link>
    );
}
