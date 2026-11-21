'use client';

import { NoReferencesUploadCard } from '@/components/reference/NoReferencesUploadCard';
import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  X,
  Film,
  ArrowRight,
  Tag,
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
  calculateChannelCovers,
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

const formatCount = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`;

const slugifyTag = (tag: string) =>
  tag
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const categoryHref = (cat: Category) =>
  `/category/${
    cat.slug ||
    cat.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }`;

/**
 * AnimationReference.org studio brand palette per discipline
 * (Obsidian dark + signature violet, indigo, fuchsia, cyan, emerald & rose).
 */
const GENRE_ACCENTS: Record<string, string> = {
  All: '#8B5CF6',
  'Body Mechanics': '#A78BFA',
  'VisDev & 3D': '#38BDF8',
  'Combat & Action': '#E879F9',
  'Acting & Dialogue': '#818CF8',
  'Creatures & Animals': '#34D399',
  'Principles & VFX': '#C084FC',
};

function getAccent(genre: string): string {
  return GENRE_ACCENTS[genre] || '#A78BFA';
}

interface FlatCollection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  coverArt: string;
  genre: string;
  accent: string;
  count: number;
}

export function BrowseDirectory({
  categories,
  videos,
  query: controlledQuery,
  onQueryChange,
}: BrowseDirectoryProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const isControlled = controlledQuery !== undefined;
  const query = isControlled ? controlledQuery : internalQuery;
  const setQuery = (value: string) => {
    if (onQueryChange) onQueryChange(value);
    if (!isControlled) setInternalQuery(value);
  };

  const [activeGroup, setActiveGroup] = useState<string>('All');

  const channelCounts = useMemo(() => calculateChannelCounts(videos), [videos]);
  const channelCovers = useMemo(() => calculateChannelCovers(videos), [videos]);

  const { categoryCounts, categoryCovers, tags: rawTags } = useMemo(
    () => buildBrowseIndex(categories, videos),
    [categories, videos]
  );

  const q = query.toLowerCase().trim();

  // Flatten all curated channels into editorial collection entries with semantic accents
  const allCollections = useMemo<FlatCollection[]>(() => {
    const list: FlatCollection[] = [];
    for (const shelf of STREAMING_SHELVES) {
      const accent = getAccent(shelf.genre);
      for (const ch of shelf.channels) {
        list.push({
          id: ch.id,
          title: ch.title,
          subtitle: ch.subtitle,
          description: ch.description,
          href: ch.href,
          coverArt: channelCovers[ch.id] || ch.coverArt,
          genre: shelf.genre,
          accent,
          count: channelCounts[ch.id] || 0,
        });
      }
    }
    return list;
  }, [channelCovers, channelCounts]);

  // Featured split spotlight card (top collection for active filter)
  const visibleCollections = useMemo(() => {
    if (activeGroup === 'All') return allCollections;
    return allCollections.filter((c) => c.genre === activeGroup);
  }, [allCollections, activeGroup]);

  const featuredCollection = visibleCollections[0] || null;
  const gridCollections = visibleCollections.slice(1);

  // Discipline Filter Pills with semantic color dots
  const groups = useMemo(() => {
    return [
      { id: 'All', label: 'All collections', accent: getAccent('All') },
      ...STREAMING_SHELVES.map((s) => ({
        id: s.genre,
        label: s.genre,
        accent: getAccent(s.genre),
      })),
    ];
  }, []);

  // Unified Search Results
  const searchResults = useMemo<FlatCollection[]>(() => {
    if (!q) return [];
    const results: Array<FlatCollection & { score: number }> = [];
    const usedCovers = new Set<string>();

    for (const shelf of STREAMING_SHELVES) {
      const accent = getAccent(shelf.genre);
      for (const ch of shelf.channels) {
        const titleScore = matchScore(ch.title.toLowerCase(), q);
        const descScore = matchScore(ch.description.toLowerCase(), q);
        const subScore = matchScore(ch.subtitle.toLowerCase(), q);
        const keyScore = ch.keywords.some((k) => k.toLowerCase().includes(q)) ? 0.9 : 0;
        const maxScore = Math.max(titleScore, descScore, subScore, keyScore);

        if (maxScore > 0.2) {
          const cover = channelCovers[ch.id] || ch.coverArt;
          usedCovers.add(cover);
          results.push({
            id: `channel-${ch.id}`,
            title: ch.title,
            subtitle: ch.subtitle,
            description: ch.description,
            href: ch.href,
            coverArt: cover,
            genre: shelf.genre,
            accent,
            count: channelCounts[ch.id] || 0,
            score: maxScore * 1.5,
          });
        }
      }
    }

    for (const cat of categories) {
      const catScore = matchScore(cat.title.toLowerCase(), q);
      if (catScore > 0.2) {
        results.push({
          id: `cat-${cat.id}`,
          title: cat.title,
          subtitle: 'Collection',
          description: cat.description || 'Curated animation reference collection.',
          href: categoryHref(cat),
          coverArt: categoryCovers[cat.id] || cat.imageUrl || '',
          genre: 'Collection',
          accent: '#A78BFA',
          count: categoryCounts[cat.id] || 0,
          score: catScore,
        });
      }
    }

    for (const t of rawTags) {
      if (t.count < 2) continue;
      const tagScore = matchScore(t.tag.toLowerCase(), q);
      if (tagScore > 0.25) {
        let cover = t.coverUrl || '';
        if (usedCovers.has(cover)) cover = '';
        else if (cover) usedCovers.add(cover);

        results.push({
          id: `tag-${t.tag}`,
          title: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
          subtitle: 'Topic Tag',
          description: `${t.count} curated reference clips ready for frame-by-frame study.`,
          href: `/tags/${slugifyTag(t.tag)}`,
          coverArt: cover,
          genre: 'Topic Tag',
          accent: '#2EC4A5',
          count: t.count,
          score: tagScore,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score || b.count - a.count);
  }, [q, channelCounts, channelCovers, categories, categoryCovers, categoryCounts, rawTags]);

  const popularTags = useMemo(() => {
    return rawTags
      .filter((t) => t.count >= 3)
      .slice(0, 32)
      .map((t) => ({
        tag: t.tag.charAt(0).toUpperCase() + t.tag.slice(1),
        count: t.count,
        href: `/tags/${slugifyTag(t.tag)}`,
      }));
  }, [rawTags]);

  return (
    <div className="space-y-9 text-left w-full">
      {/* Standalone Search Bar when not controlled by hero */}
      {!isControlled && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9A9893]" />
          <Input
            type="text"
            placeholder="Search collections & topics…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-10 pr-10 rounded-lg bg-[#181722] border-[#2A2838] text-[#F2F0EA] placeholder:text-[#9A9893] focus-visible:ring-1 focus-visible:ring-violet-400 text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A9893] hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Search Results View */}
      {q ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#252334] pb-4">
            <div>
              <h2 className="text-2xl font-black text-[#F2F0EA] tracking-tight">
                Results for &ldquo;{query}&rdquo;
              </h2>
              <p className="text-sm text-[#9A9893] mt-0.5">
                {searchResults.length} {searchResults.length === 1 ? 'collection' : 'collections & topics'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('')}
              className="rounded-full bg-[#1C1B28] border border-[#2C2A3D] text-[#F2F0EA] hover:bg-[#262436] text-xs font-bold cursor-pointer"
            >
              <X className="h-3.5 w-3.5 mr-1.5" /> Clear search
            </Button>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              {searchResults.map((item) => (
                <EditorialCategoryCard key={item.id} item={item} variant="standard" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <NoReferencesUploadCard query={query} mediaType="video" />
              <div className="text-center">
                <Button
                  onClick={() => setQuery('')}
                  variant="outline"
                  className="rounded-full border-[#2C2A3D] bg-[#181722] hover:bg-[#222030] text-[#D2D0CA] hover:text-white text-xs cursor-pointer"
                >
                  Show all collections
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-9">
          {/* 1. Featured 60/40 Split Spotlight Card (anim.works/blog signature) */}
          {featuredCollection && <FeaturedSplitCard item={featuredCollection} />}

          {/* 2. Single-Row Color-Dot Filter Pill Bar + Right-Aligned Count */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {groups.map((grp) => {
              const isSelected = activeGroup === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => setActiveGroup(grp.id)}
                  aria-pressed={isSelected}
                  style={
                    isSelected
                      ? { backgroundColor: '#7C3AED', borderColor: '#A78BFA', color: '#FFFFFF' }
                      : undefined
                  }
                  className={cn(
                    'inline-flex h-[38px] items-center gap-2 rounded-full border px-4 text-xs font-bold transition-all duration-150 active:scale-[0.96] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
                    isSelected
                      ? 'shadow-lg shadow-violet-900/40'
                      : 'border-white/10 bg-[#131020] text-zinc-200 hover:border-violet-400/50 hover:bg-[#1b162e] hover:text-white'
                  )}
                >
                  <span
                    className="h-[7px] w-[7px] rounded-full shrink-0"
                    style={{ backgroundColor: isSelected ? '#FFFFFF' : grp.accent }}
                  />
                  <span>{grp.label}</span>
                </button>
              );
            })}

            <span className="ml-auto text-xs font-medium text-[#9A9893] pl-2">
              {visibleCollections.length} {visibleCollections.length === 1 ? 'collection' : 'collections'}
            </span>
          </div>

          {/* 3. Rhythmic 12-Column Editorial Bento Grid (Mix of Wide 8-col & Standard 4-col Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 [grid-auto-flow:dense]">
            {gridCollections.map((item, index) => {
              // Every 6th item (index 0, 6, 12...) becomes a Wide 2/3 editorial split card for rhythm
              const isWide = gridCollections.length >= 4 && index % 7 === 0;
              return (
                <EditorialCategoryCard
                  key={item.id}
                  item={item}
                  variant={isWide ? 'wide' : 'standard'}
                />
              );
            })}
          </div>

          {/* 4. Clean Matte Tag Index Section */}
          {activeGroup === 'All' && popularTags.length > 0 && (
            <section className="rounded-[18px] border border-[#282636] bg-[#15141F] p-6 sm:p-8 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242232] pb-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E1C2C] border border-[#2E2B42] text-[#A78BFA]">
                    <Tag className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-[#F2F0EA]">Popular Motion Tags</h3>
                    <p className="text-xs text-[#9A9893]">Jump directly to specific actions, props, and styles.</p>
                  </div>
                </div>
                <Link
                  href="/tags"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#2E2B42] bg-[#1C1A29] px-4 py-2 text-xs font-bold text-[#F2F0EA] hover:border-[#A78BFA] hover:text-white transition"
                >
                  <span>Full A–Z Tag Index</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {popularTags.map((item) => (
                  <Link
                    key={item.tag}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#2A2838] bg-[#111018] px-3.5 py-1.5 text-xs font-semibold text-[#D2D0CA] hover:border-[#A78BFA] hover:text-white transition-colors"
                  >
                    <span>#{item.tag}</span>
                    <span className="text-[10px] font-mono text-[#9A9893]">{formatCount(item.count)}</span>
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
 * 60/40 Featured Split Spotlight Card (inspired directly by anim.works/blog .awb-feat).
 */
function FeaturedSplitCard({ item }: { item: FlatCollection }) {
  const [hasError, setHasError] = useState(false);
  const canUseImage = item.coverArt && !hasError && !item.coverArt.includes('cdninstagram.com');

  return (
    <Link
      href={item.href}
      style={{ ['--cat-c' as string]: item.accent }}
      className="group relative flex flex-col lg:flex-row overflow-hidden rounded-[18px] border border-white/10 bg-[#131020] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-violet-400/80 hover:shadow-[0_22px_50px_-14px_rgba(124,58,237,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 min-h-[380px]"
    >
      {/* Left 60% Unobstructed Media */}
      <div className="relative lg:w-[58%] min-h-[240px] lg:min-h-[380px] overflow-hidden bg-[#0b0914]">
        {canUseImage ? (
          <Image
            src={item.coverArt}
            alt={item.title}
            fill
            unoptimized={needsUnoptimized(item.coverArt)}
            sizes="(max-width: 1024px) 100vw, 60vw"
            onError={() => setHasError(true)}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1f1b33] to-[#0b0914] flex items-center justify-center">
            <Film className="h-10 w-10 text-violet-400/40" />
          </div>
        )}

        {/* Single crisp brand-violet corner badge */}
        <span className="absolute top-4 left-4 inline-flex h-[26px] items-center rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-white shadow-lg shadow-violet-950/60">
          Featured
        </span>
      </div>

      {/* Right 40% Calm Editorial Content */}
      <div className="flex flex-1 flex-col justify-center gap-4 p-7 sm:p-10 lg:p-11">
        <div className="inline-flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-[2px] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-110"
            style={{ backgroundColor: item.accent }}
          />
          <span
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: item.accent }}
          >
            {item.genre}
          </span>
        </div>

        <h2 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-white leading-[1.06] text-pretty group-hover:text-violet-200 transition-colors">
          {item.title}
        </h2>

        <p className="text-[15px] leading-[1.6] text-zinc-300 text-pretty line-clamp-3">
          {item.description}
        </p>

        <div className="flex items-center justify-between gap-4 pt-2">
          <span className="text-xs font-medium text-zinc-400">
            {item.count > 0 ? `${formatCount(item.count)} curated reference clips` : 'Curated studio collection'}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-violet-300 group-hover:text-violet-200 transition-transform duration-200 group-hover:translate-x-1">
            <span>Explore collection</span>
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/**
 * Editorial Category Card (Standard 4-col vertical OR Wide 8-col horizontal split).
 * Pure unobstructed media + solid matte dark body + anim.works hover micro-interactions.
 */
function EditorialCategoryCard({
  item,
  variant = 'standard',
}: {
  item: FlatCollection;
  variant?: 'standard' | 'wide';
}) {
  const [hasError, setHasError] = useState(false);
  const { beginWatch, endWatch } = useWatchTracker();
  const hoverKey = `hover:channel:${item.href}`;
  const canUseImage = item.coverArt && !hasError && !item.coverArt.includes('cdninstagram.com');
  const isWide = variant === 'wide';

  return (
    <Link
      href={item.href}
      onMouseEnter={() => beginWatch(hoverKey, 'hover')}
      onMouseLeave={() => endWatch(hoverKey)}
      style={{ ['--cat-c' as string]: item.accent }}
      className={cn(
        'group relative flex overflow-hidden rounded-[18px] border border-white/10 bg-[#131020] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-violet-400/80 hover:shadow-[0_20px_48px_-14px_rgba(124,58,237,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400',
        isWide ? 'lg:col-span-8 flex-col lg:flex-row min-h-[340px]' : 'lg:col-span-4 flex-col'
      )}
    >
      {/* Unobstructed Media Region */}
      <div
        className={cn(
          'relative overflow-hidden bg-[#0b0914] shrink-0',
          isWide ? 'aspect-video lg:aspect-auto lg:w-[55%] min-h-[220px]' : 'aspect-video w-full'
        )}
      >
        {canUseImage ? (
          <Image
            src={item.coverArt}
            alt={item.title}
            fill
            unoptimized={needsUnoptimized(item.coverArt)}
            sizes={isWide ? '(max-width: 1024px) 100vw, 45vw' : '(max-width: 768px) 100vw, 33vw'}
            onError={() => setHasError(true)}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1f1b33] to-[#0b0914] flex items-center justify-center">
            <Film className="h-8 w-8 text-violet-400/40" />
          </div>
        )}

        {/* Single compact top-left clip count badge in brand obsidian + violet */}
        {item.count > 0 && (
          <div className="pointer-events-none absolute top-3.5 left-3.5 rounded-[10px] border border-violet-400/40 bg-[#0d0a18]/85 px-2.5 py-1 text-center shadow-md backdrop-blur-md">
            <div className="font-mono text-xs font-black leading-none text-white">{formatCount(item.count)}</div>
            <div className="text-[9px] font-extrabold uppercase tracking-wider leading-tight text-violet-300">clips</div>
          </div>
        )}
      </div>

      {/* Matte Dark Editorial Text Body */}
      <div
        className={cn(
          'flex flex-1 flex-col justify-between gap-4',
          isWide ? 'p-7 sm:p-9' : 'p-6'
        )}
      >
        <div className="space-y-2.5">
          {/* Category Eyebrow with rotating diamond dot */}
          <div className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-[2px] transition-transform duration-300 group-hover:rotate-45 group-hover:scale-115"
              style={{ backgroundColor: item.accent }}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{ color: item.accent }}
            >
              {item.genre}
            </span>
          </div>

          {/* Crisp Pure-White Title */}
          <h3
            className={cn(
              'font-bold text-white leading-[1.2] text-pretty group-hover:text-violet-200 transition-colors',
              isWide ? 'font-display text-2xl sm:text-3xl font-black tracking-tight' : 'text-[19px]'
            )}
          >
            {item.title}
          </h3>

          {/* Warm High-Readability Excerpt */}
          {item.description && (
            <p className="text-[14px] leading-[1.6] text-zinc-300/90 line-clamp-2 text-pretty">
              {item.description}
            </p>
          )}
        </div>

        {/* Clean Footer Row: Subtle Subtitle Left + Brand Violet Circular Arrow Button Right */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
          <span className="text-xs font-medium text-zinc-400 truncate">
            {item.subtitle || 'Frame-by-frame motion study'}
          </span>

          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-zinc-200 transition-all duration-300 group-hover:border-violet-400 group-hover:bg-violet-600 group-hover:text-white group-hover:-rotate-45 group-hover:shadow-lg group-hover:shadow-violet-600/40">
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
