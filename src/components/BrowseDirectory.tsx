'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Search, 
  X, 
  Film, 
  Sparkles, 
  Play, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Grid, 
  Compass,
  Layers,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Video, Category } from '@/lib/types';
import { buildBrowseIndex, matchScore } from '@/lib/browse-index';
import { useWatchTracker } from '@/hooks/use-watch-tracker';
import { 
  STREAMING_SHELVES, 
  calculateChannelCounts, 
  type StreamingShelf, 
  type StreamingChannelItem 
} from '@/lib/streaming-channels';

interface BrowseDirectoryProps {
    categories: Category[];
    videos: Video[];
    query?: string;
    onQueryChange?: (value: string) => void;
    onSelectCategory?: (catId: string) => void;
    onSelectTag?: (tag: string) => void;
}

export const needsUnoptimized = (url?: string) =>
    !url ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.includes('.b-cdn.net') ||
    url.includes('cdninstagram.com') ||
    url.includes('instagram.com') ||
    url.includes('placehold.co') ||
    url.includes('reflix.dev') ||
    url.includes('ytimg.com');

const formatCount = (count: number) => (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`);

const getPreviewUrl = (url?: string): string => {
    if (!url) return '';
    const trimmed = url.trim();
    if (trimmed.includes('playlist.m3u8')) {
        return trimmed.replace('playlist.m3u8', 'play_480p.mp4');
    }
    return trimmed;
};

const slugifyTag = (tag: string) =>
    tag.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const categoryHref = (cat: Category) =>
    `/category/${cat.slug || cat.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;

export function BrowseDirectory({ 
    categories, 
    videos, 
    query: controlledQuery, 
    onQueryChange, 
    onSelectCategory, 
    onSelectTag 
}: BrowseDirectoryProps) {
    const [internalQuery, setInternalQuery] = useState('');
    const isControlled = controlledQuery !== undefined;
    const query = isControlled ? controlledQuery : internalQuery;
    const setQuery = (value: string) => {
        if (onQueryChange) onQueryChange(value);
        if (!isControlled) setInternalQuery(value);
    };

    const [activeGenreFilter, setActiveGenreFilter] = useState<string>('All Channels');
    const spotlightScrollRef = useRef<HTMLDivElement>(null);
    const shelfScrollRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Live counts computed across snapshot for all streaming channels
    const channelCounts = useMemo(() => calculateChannelCounts(videos), [videos]);

    // Browse index for tags and Firestore categories
    const { categoryCounts, categoryCovers, tags: rawTags } = useMemo(
        () => buildBrowseIndex(categories, videos),
        [categories, videos]
    );

    const q = query.toLowerCase().trim();

    // Scroll helper for horizontal carousel rows
    const scrollShelf = (container: HTMLDivElement | null, direction: 'left' | 'right') => {
        if (container) {
            const amount = direction === 'left' ? -480 : 480;
            container.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    // Genre Filter Pills list
    const genres = useMemo(() => {
        return ['All Channels', ...STREAMING_SHELVES.map((s) => s.genre)];
    }, []);

    // Filter shelves based on selected genre tab
    const visibleShelves = useMemo(() => {
        if (activeGenreFilter === 'All Channels') {
            return STREAMING_SHELVES;
        }
        return STREAMING_SHELVES.filter((s) => s.genre === activeGenreFilter);
    }, [activeGenreFilter]);

    // Top Flagship Spotlight Channels (ArtStation / Streaming Hero Top Row)
    const spotlightChannels = useMemo(() => {
        const pickedIds = [
            'walk-cycles',
            'character-turnarounds',
            'martial-arts-stunts',
            'real-walk-reference',
            'storyboards-and-cinematography',
            'quadruped-walks',
            'smear-frames',
            'visdev-and-concept-art'
        ];
        const allChannels = STREAMING_SHELVES.flatMap((s) => s.channels);
        return pickedIds
            .map((id) => allChannels.find((c) => c.id === id))
            .filter(Boolean) as StreamingChannelItem[];
    }, []);

    // Search Results: When user enters a search query, search channels, categories, and tags
    const searchResults = useMemo(() => {
        if (!q) return [];

        const results: Array<{
            id: string;
            title: string;
            subtitle?: string;
            description?: string;
            href: string;
            coverUrl: string;
            badge: string;
            count: number;
            score: number;
        }> = [];

        const usedCovers = new Set<string>();

        // 1. Search Streaming Channels
        for (const shelf of STREAMING_SHELVES) {
            for (const ch of shelf.channels) {
                const titleScore = matchScore(ch.title.toLowerCase(), q);
                const descScore = matchScore(ch.description.toLowerCase(), q);
                const subScore = matchScore(ch.subtitle.toLowerCase(), q);
                const keyScore = ch.keywords.some((k) => k.toLowerCase().includes(q)) ? 0.9 : 0;
                const maxScore = Math.max(titleScore, descScore, subScore, keyScore);

                if (maxScore > 0.2) {
                    const cnt = channelCounts[ch.id] || 0;
                    usedCovers.add(ch.coverArt);
                    results.push({
                        id: `channel-${ch.id}`,
                        title: ch.title,
                        subtitle: ch.subtitle,
                        description: ch.description,
                        href: ch.href,
                        coverUrl: ch.coverArt,
                        badge: ch.badge,
                        count: cnt,
                        score: maxScore * 1.5, // prioritize curated channels
                    });
                }
            }
        }

        // 2. Search Firestore Categories
        for (const cat of categories) {
            const catScore = matchScore(cat.title.toLowerCase(), q);
            if (catScore > 0.2) {
                const cover = categoryCovers[cat.id] || cat.imageUrl || '';
                const cnt = categoryCounts[cat.id] || 0;
                results.push({
                    id: `cat-${cat.id}`,
                    title: cat.title,
                    subtitle: 'Category',
                    description: cat.description || 'Animation Reference Category',
                    href: categoryHref(cat),
                    coverUrl: cover,
                    badge: 'CATEGORY',
                    count: cnt,
                    score: catScore,
                });
            }
        }

        // 3. Search Tags (Filter out noisy 1-clip tags and deduplicate covers)
        for (const t of rawTags) {
            if (t.count < 2) continue; // Skip noisy single clips
            const tagScore = matchScore(t.tag.toLowerCase(), q);
            if (tagScore > 0.25) {
                let cover = t.coverUrl || '';
                if (usedCovers.has(cover)) {
                    cover = ''; // Avoid repeating duplicate image in search results
                } else if (cover) {
                    usedCovers.add(cover);
                }

                results.push({
                    id: `tag-${t.tag}`,
                    title: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
                    subtitle: 'Tag Topic',
                    description: `${t.count} curated reference clips`,
                    href: `/tags/${slugifyTag(t.tag)}`,
                    coverUrl: cover,
                    badge: 'TAG',
                    count: t.count,
                    score: tagScore,
                });
            }
        }

        return results.sort((a, b) => b.score - a.score || b.count - a.count);
    }, [q, channelCounts, categories, categoryCovers, categoryCounts, rawTags]);

    // Filtered high-quality tags for the bottom archive (filtered against 1-clip noise & deduplicated)
    const curatedTagsArchive = useMemo(() => {
        const used = new Set<string>();
        const list: Array<{ tag: string; count: number; coverUrl?: string; href: string }> = [];

        for (const t of rawTags) {
            if (t.count < 3) continue; // Filter out 1-2 clip raw noise
            let cover = t.coverUrl;
            if (cover && used.has(cover)) {
                cover = undefined; // Deduplicate
            } else if (cover) {
                used.add(cover);
            }
            list.push({
                tag: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
                count: t.count,
                coverUrl: cover,
                href: `/tags/${slugifyTag(t.tag)}`,
            });
            if (list.length >= 24) break;
        }
        return list;
    }, [rawTags]);

    return (
        <div className="space-y-10 text-left w-full max-w-full">
            {/* 1. Header Search Bar (Only shown if hero search is not active or user is typing) */}
            {!isControlled && (
                <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-2xl py-3 px-4 md:px-6 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-between gap-4 w-full">
                    <div className="relative w-full flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-400" />
                        <Input
                            type="text"
                            placeholder="Search body mechanics, vis dev, 3d models, combat, walk cycles..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-12 pl-12 pr-10 rounded-xl bg-black/80 border-white/15 text-white placeholder:text-zinc-400 focus-visible:ring-2 focus-visible:ring-purple-500/80 text-sm md:text-base font-medium shadow-inner"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                                aria-label="Clear"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {q ? (
                        <span className="text-xs font-bold text-purple-300 hidden md:inline shrink-0">
                            {searchResults.length} Results Found
                        </span>
                    ) : (
                        <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 font-semibold shrink-0">
                            <Sparkles className="h-4 w-4 text-purple-400" />
                            <span>Streaming Channel Directory</span>
                        </div>
                    )}
                </div>
            )}

            {/* If user is actively searching, display Search Results View */}
            {q ? (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                                <Search className="h-6 w-6 text-purple-400" /> Results for &ldquo;{query}&rdquo;
                            </h2>
                            <p className="text-sm text-zinc-400 mt-1">
                                Found {searchResults.length} channels, categories, and curated topics.
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuery('')}
                            className="rounded-full bg-white/10 text-white hover:bg-white/20 text-xs font-bold"
                        >
                            <X className="h-3.5 w-3.5 mr-1.5" /> Clear Search
                        </Button>
                    </div>

                    {searchResults.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {searchResults.map((item) => (
                                <ChannelCard
                                    key={item.id}
                                    title={item.title}
                                    subtitle={item.subtitle || ''}
                                    description={item.description || ''}
                                    href={item.href}
                                    coverArt={item.coverUrl}
                                    badge={item.badge}
                                    count={item.count}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center bg-zinc-900/40 rounded-3xl border border-white/10 p-8 space-y-3">
                            <p className="text-lg font-bold text-white">No channels found matching &ldquo;{query}&rdquo;</p>
                            <p className="text-xs text-zinc-400 max-w-md mx-auto">
                                Try searching for <em>Walk Cycle</em>, <em>Turnaround</em>, <em>Storyboards</em>, <em>VisDev</em>, <em>Mecha</em>, or <em>Combat</em>.
                            </p>
                            <Button
                                onClick={() => setQuery('')}
                                className="mt-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                            >
                                Reset Search & Browse All
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                /* Streaming Service Experience: Genre Tabs, Spotlight, and Shelves */
                <div className="space-y-12">
                    {/* 2. Streaming Genre Filter Tabs (Netflix / Disney+ style) */}
                    <div className="sticky top-0 z-20 bg-[#060312]/95 backdrop-blur-xl py-3 border-y border-white/10 -mx-4 px-4 md:-mx-8 md:px-8">
                        <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
                            {genres.map((genre) => {
                                const isSelected = activeGenreFilter === genre;
                                return (
                                    <button
                                        key={genre}
                                        type="button"
                                        onClick={() => setActiveGenreFilter(genre)}
                                        className={cn(
                                            "shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 shadow-sm",
                                            isSelected
                                                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 scale-105 border border-purple-400/50"
                                                : "bg-zinc-900/80 text-zinc-300 border border-white/10 hover:border-white/25 hover:bg-zinc-800 hover:text-white"
                                        )}
                                    >
                                        {genre === 'All Channels' ? (
                                            <Compass className="h-4 w-4 text-purple-300" />
                                        ) : (
                                            <Layers className="h-4 w-4 text-indigo-300" />
                                        )}
                                        <span>{genre}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. Top Featured Art Blasts Carousel (ArtStation / Streaming Hero Spotlight) */}
                    {activeGenreFilter === 'All Channels' && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-amber-400 animate-pulse" />
                                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                                        Spotlight & Art Blasts
                                    </h2>
                                    <span className="text-xs font-semibold text-zinc-400 hidden sm:inline">
                                        • Premier reference channels for industry artists
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => scrollShelf(spotlightScrollRef.current, 'left')}
                                        className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => scrollShelf(spotlightScrollRef.current, 'right')}
                                        className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div
                                ref={spotlightScrollRef}
                                className="flex items-center gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
                            >
                                {spotlightChannels.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className="group relative shrink-0 w-[290px] sm:w-[340px] md:w-[380px] aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/80 hover:shadow-[0_0_35px_-5px_rgba(168,85,247,0.5)] cursor-pointer flex flex-col justify-end p-5"
                                    >
                                        <Image
                                            src={item.coverArt}
                                            alt={item.title}
                                            fill
                                            unoptimized={needsUnoptimized(item.coverArt)}
                                            sizes="400px"
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                                        {/* Badges */}
                                        <div className="absolute top-3.5 left-3.5 z-20">
                                            <span className="px-3 py-1 rounded-md bg-purple-950/80 backdrop-blur-md border border-purple-500/40 text-purple-200 font-mono text-[10px] font-extrabold tracking-wider shadow">
                                                {item.badge}
                                            </span>
                                        </div>

                                        <div className="absolute top-3.5 right-3.5 z-20">
                                            <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-white font-mono text-[10px] font-bold">
                                                {formatCount(channelCounts[item.id] || 0)} clips
                                            </span>
                                        </div>

                                        <div className="relative z-20 space-y-1.5 text-left">
                                            <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md truncate group-hover:text-purple-300 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-zinc-300/90 line-clamp-2 font-medium">
                                                {item.description}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 4. Streaming Shelves (Horizontal Carousel Rows) */}
                    <div className="space-y-12">
                        {visibleShelves.map((shelf) => (
                            <section key={shelf.id} className="space-y-3 group/shelf">
                                {/* Shelf Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                                    <div>
                                        <div className="flex items-center gap-2.5">
                                            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                                {shelf.title}
                                            </h2>
                                            <span className="px-2 py-0.5 rounded-full bg-white/10 text-zinc-300 text-[11px] font-bold">
                                                {shelf.channels.length} Channels
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                                            {shelf.tagline}
                                        </p>
                                    </div>

                                    {/* Scroll Controls */}
                                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => scrollShelf(shelfScrollRefs.current[shelf.id], 'left')}
                                            className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => scrollShelf(shelfScrollRefs.current[shelf.id], 'right')}
                                            className="h-8 w-8 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Horizontal Row Carousel */}
                                <div
                                    ref={(el) => {
                                        shelfScrollRefs.current[shelf.id] = el;
                                    }}
                                    className="flex items-center gap-4 overflow-x-auto pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
                                >
                                    {shelf.channels.map((channel) => (
                                        <div key={channel.id} className="shrink-0 w-[260px] sm:w-[290px] md:w-[320px]">
                                            <ChannelCard
                                                title={channel.title}
                                                subtitle={channel.subtitle}
                                                description={channel.description}
                                                href={channel.href}
                                                coverArt={channel.coverArt}
                                                badge={channel.badge}
                                                count={channelCounts[channel.id] || 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* 5. Clean Tag & Specific Topics Explorer Archive (Bottom of page) */}
                    {activeGenreFilter === 'All Channels' && (
                        <section className="pt-8 border-t border-white/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Grid className="h-5 w-5 text-purple-400" /> Reference Tag Archive
                                    </h3>
                                    <p className="text-xs text-zinc-400">
                                        Curated topic tags with rich video reference clips.
                                    </p>
                                </div>
                                <Link
                                    href="/tags"
                                    className="text-xs font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1 hover:underline"
                                >
                                    View Full A-Z Tag Index <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {curatedTagsArchive.map((item) => (
                                    <Link
                                        key={item.tag}
                                        href={item.href}
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-zinc-950 p-3 flex flex-col justify-end transition-all hover:border-purple-500/70 hover:scale-[1.03] shadow-md"
                                    >
                                        {item.coverUrl ? (
                                            <Image
                                                src={item.coverUrl}
                                                alt={item.tag}
                                                fill
                                                unoptimized={needsUnoptimized(item.coverUrl)}
                                                sizes="200px"
                                                className="object-cover opacity-60 group-hover:opacity-85 transition-opacity duration-300 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-950/60 via-zinc-900 to-black" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

                                        <div className="relative z-20">
                                            <span className="text-[10px] font-mono font-bold text-purple-300 block mb-0.5">
                                                {formatCount(item.count)} clips
                                            </span>
                                            <h4 className="text-xs sm:text-sm font-extrabold text-white truncate group-hover:text-purple-200">
                                                {item.tag}
                                            </h4>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Standard Cinema Card for Streaming Shelves and Search Results.
 * Clean 16:10 aspect ratio with ambient hover glow, play overlay, and metadata.
 */
function ChannelCard({
    title,
    subtitle,
    description,
    href,
    coverArt,
    badge,
    count,
}: {
    title: string;
    subtitle: string;
    description: string;
    href: string;
    coverArt?: string;
    badge: string;
    count: number;
}) {
    const [hasError, setHasError] = useState(false);
    const { beginWatch, endWatch } = useWatchTracker();
    const hoverKey = `hover:channel:${href}`;

    const canUseImage = coverArt && !hasError && !coverArt.includes('cdninstagram.com');

    return (
        <Link
            href={href}
            onMouseEnter={() => beginWatch(hoverKey, 'hover')}
            onMouseLeave={() => endWatch(hoverKey)}
            className="group/card relative aspect-[16/10] rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg transition-all duration-300 text-left hover:-translate-y-1 hover:border-purple-500/80 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] cursor-pointer flex flex-col justify-end p-4 block w-full"
        >
            {canUseImage ? (
                <Image
                    src={coverArt}
                    alt={title}
                    fill
                    unoptimized={needsUnoptimized(coverArt)}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={() => setHasError(true)}
                    className="object-cover transition-transform duration-500 group-hover/card:scale-108"
                />
            ) : (
                <div className="w-full h-full absolute inset-0 bg-gradient-to-br from-purple-950 via-indigo-950 to-zinc-950 flex flex-col items-center justify-center p-3 text-center">
                    <Film className="h-8 w-8 text-purple-400/50 mb-1" />
                    <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider line-clamp-1">{title}</span>
                </div>
            )}

            {/* Quick Play Icon Overlay on Hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                <div className="h-11 w-11 rounded-full bg-purple-600/90 backdrop-blur-md border border-purple-400/50 text-white flex items-center justify-center shadow-2xl group-hover/card:scale-110 transition-transform">
                    <Play className="h-5 w-5 fill-white ml-0.5" />
                </div>
            </div>

            {/* Badges in Top Bar */}
            <div className="absolute top-2.5 left-2.5 z-20">
                <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[9px] font-extrabold tracking-wider shadow">
                    {badge}
                </span>
            </div>

            {count > 0 && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-bold text-white z-20 shadow">
                    {formatCount(count)}
                </div>
            )}

            {/* Gradient Overlay & Content */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />

            <div className="relative z-20 space-y-1">
                <h3 className="font-extrabold text-white text-sm sm:text-base leading-tight drop-shadow-md truncate group-hover/card:text-purple-300 transition-colors">
                    {title}
                </h3>
                {subtitle && (
                    <p className="text-[11px] font-semibold text-purple-200/90 truncate">
                        {subtitle}
                    </p>
                )}
                {description && (
                    <p className="text-[10px] text-zinc-300/80 line-clamp-1 font-normal">
                        {description}
                    </p>
                )}
            </div>
        </Link>
    );
}
