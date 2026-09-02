'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { 
  Sword, 
  Activity, 
  PawPrint, 
  Smile, 
  Zap, 
  Film, 
  Layers,
  ChevronRight
} from 'lucide-react';
import type { Category, Video } from '@/lib/types';
import { findCategoryThumbnailMatch } from '@/lib/category-utils';

export interface CategoryCapsuleConfig {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  fallbackCount: string;
  icon: any;
  colorGradient: string;
  borderColor: string;
  keywords: string[];
  fallbackImage: string;
}

const CATEGORY_CONFIGS: CategoryCapsuleConfig[] = [
  {
    id: 'cat-combat',
    slug: 'combat',
    title: 'Combat & Stunts',
    subtitle: 'Swords, Martial Arts & Hits',
    fallbackCount: '1,420 Clips',
    icon: Sword,
    colorGradient: 'from-[#4a1c0d] via-[#2a0e05] to-[#120602]',
    borderColor: 'border-orange-500/25',
    keywords: ['combat', 'fight', 'sword', 'punch', 'kick', 'action', 'martial', 'attack', 'stunt', 'duel'],
    fallbackImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-locomotion',
    slug: 'locomotion',
    title: 'Locomotion & Parkour',
    subtitle: 'Walks, Runs, Jumps & Sprints',
    fallbackCount: '890 Clips',
    icon: Activity,
    colorGradient: 'from-[#072c44] via-[#041a2a] to-[#020b12]',
    borderColor: 'border-cyan-500/25',
    keywords: ['locomotion', 'walk', 'run', 'jump', 'parkour', 'sprint', 'crawl', 'stagger', 'dash'],
    fallbackImage: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-creature',
    slug: 'creature',
    title: 'Creature & Quadrupeds',
    subtitle: 'Felines, Canines & Dragons',
    fallbackCount: '640 Clips',
    icon: PawPrint,
    colorGradient: 'from-[#063f2e] via-[#032319] to-[#010f0a]',
    borderColor: 'border-emerald-500/25',
    keywords: ['creature', 'animal', 'quadruped', 'monster', 'dragon', 'dog', 'bird', 'horse', 'feline', 'wolf'],
    fallbackImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-acting',
    slug: 'acting',
    title: 'Acting & Lip Sync',
    subtitle: 'Facial Expressions & Dialogue',
    fallbackCount: '520 Clips',
    icon: Smile,
    colorGradient: 'from-[#3e145e] via-[#240a38] to-[#0e0317]',
    borderColor: 'border-purple-500/25',
    keywords: ['acting', 'facial', 'lip sync', 'dialogue', 'expression', 'gesture', 'emotion', 'talk', 'conversation'],
    fallbackImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-smears',
    slug: 'vfx',
    title: '2D/3D Smears & FX',
    subtitle: 'Speedlines, Impacts & Magic',
    fallbackCount: '380 Clips',
    icon: Zap,
    colorGradient: 'from-[#542a08] via-[#311603] to-[#140801]',
    borderColor: 'border-amber-500/25',
    keywords: ['vfx', 'fx', 'smear', 'speedline', 'impact', 'magic', 'explosion', 'particles', 'energy', 'fire', 'water'],
    fallbackImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'cat-shorts',
    slug: 'shorts',
    title: 'Short Films Theater',
    subtitle: 'Award-Winning Indie Shorts',
    fallbackCount: '150 Films',
    icon: Film,
    colorGradient: 'from-[#520c22] via-[#2e0512] to-[#120106]',
    borderColor: 'border-rose-500/25',
    keywords: ['short', 'film', 'theater', 'indie', 'story'],
    fallbackImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
  },
];

interface CuratedCategoryPillsShelfProps {
  onSelectPill?: (pill: string) => void;
  categories?: Category[];
  videos?: Video[];
}

export function CuratedCategoryPillsShelf({ onSelectPill, categories = [], videos = [] }: CuratedCategoryPillsShelfProps) {
  // Dynamically resolve actual category thumbnails and counts from the live database
  const resolvedCapsules = useMemo(() => {
    return CATEGORY_CONFIGS.map((cfg) => {
      // 1. Find matching category in the DB
      const matchedCategory = categories.find((c) => {
        const catSlug = (c.slug || c.id || '').toLowerCase();
        const catTitle = (c.title || '').toLowerCase();
        return (
          catSlug === cfg.slug ||
          catTitle.includes(cfg.slug) ||
          cfg.keywords.some((kw) => catTitle.includes(kw) || catSlug.includes(kw))
        );
      });

      // 2. Count matching videos
      const matchingVideos = videos.filter((v) => {
        if (cfg.slug === 'shorts') return v.isShort;
        const tags = (v.tags || []).map((t) => t.toLowerCase());
        const cats = (v.categoryIds || []).concat(v.categories || []).map((c) => c.toLowerCase());
        const titleAndDesc = (v.title + ' ' + (v.description || '')).toLowerCase();
        return cfg.keywords.some(
          (kw) => tags.some((t) => t.includes(kw)) || cats.some((c) => c.includes(kw)) || titleAndDesc.includes(kw)
        );
      });

      const count = matchingVideos.length > 0 ? `${matchingVideos.length.toLocaleString()} ${cfg.slug === 'shorts' ? 'Films' : 'Clips'}` : cfg.fallbackCount;

      // 3. Resolve actual thumbnail from category or matching video
      let actualImageUrl = cfg.fallbackImage;
      if (matchedCategory?.imageUrl && !matchedCategory.imageUrl.includes('placehold.co')) {
        actualImageUrl = matchedCategory.imageUrl;
      } else if (matchedCategory) {
        const videoMatch = findCategoryThumbnailMatch(matchedCategory, videos);
        if (videoMatch?.thumbnailUrl || videoMatch?.posterUrl) {
          actualImageUrl = videoMatch.thumbnailUrl || videoMatch.posterUrl;
        }
      }

      // If no category image yet, pick from matching videos
      if (actualImageUrl === cfg.fallbackImage && matchingVideos.length > 0) {
        const firstVideoWithThumb = matchingVideos.find((v) => v.thumbnailUrl || v.posterUrl);
        if (firstVideoWithThumb) {
          actualImageUrl = firstVideoWithThumb.thumbnailUrl || firstVideoWithThumb.posterUrl;
        }
      }

      return {
        ...cfg,
        displayCount: count,
        resolvedImage: actualImageUrl,
        targetHref: cfg.slug === 'shorts' ? '/shorts' : `/categories?category=${matchedCategory?.id || cfg.slug}`,
      };
    });
  }, [categories, videos]);

  return (
    <section className="space-y-4 text-left">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Browse Reference Specialties
          </h3>
        </div>

        <Link
          href="/categories"
          className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          <span>Explore All Categories</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 6-Card Category Shelf Grid */}
      <div className="flex touch-pan-x snap-x snap-mandatory gap-3.5 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 lg:grid-cols-6">
        {resolvedCapsules.map((cat) => {
          const Icon = cat.icon;
          return (
            <Link
              key={cat.id}
              href={cat.targetHref}
              onClick={() => onSelectPill?.(cat.slug)}
              className={`group relative flex min-h-[140px] w-[72vw] max-w-[280px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl border ${cat.borderColor} bg-gradient-to-b ${cat.colorGradient} p-4 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:w-auto sm:max-w-none`}
            >
              {/* Background Art Overlay from Real Database Thumbnail */}
              <div className="absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity mix-blend-luminosity">
                <img
                  src={cat.resolvedImage}
                  alt={cat.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

              {/* Top Row: Icon & Count */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="p-2 rounded-xl bg-black/40 text-white backdrop-blur-md shadow-sm border border-white/10">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono font-bold text-white/90 drop-shadow">
                  {cat.displayCount}
                </span>
              </div>

              {/* Bottom Row: Title & Subtitle */}
              <div className="relative z-10 space-y-0.5 mt-auto">
                <h4 className="text-sm font-black text-white leading-tight drop-shadow-sm">
                  {cat.title}
                </h4>
                <p className="text-[10px] text-white/75 truncate font-medium">
                  {cat.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
