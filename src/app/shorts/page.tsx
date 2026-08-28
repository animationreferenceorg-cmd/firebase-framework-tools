'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import { 
  Play, 
  Search, 
  Flame, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Download, 
  MoreHorizontal,
  PenTool,
  Film,
  Star,
  Heart,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VideoCard } from '@/components/VideoCard';

/* ─── Mock Data ─── */

interface FeaturedFilm {
  id: string;
  title: string;
  logline: string;
  genres: string[];
  director: string;
  studio: string;
  duration: string;
  year: string;
  rating: number;
  imageUrl: string;
  videoUrl: string;
}

const HERO_FILMS: FeaturedFilm[] = [
  {
    id: 'hero-1',
    title: 'Dimensional Kids on an Adventure',
    logline: 'When two curious kids stumble into a hidden portal, they travel across magical dimensions while trying to find their way home....',
    genres: ['Drama', 'Fantasy'],
    director: 'Gobelins Masters',
    studio: 'Gobelins',
    duration: '6:42',
    year: '2025',
    rating: 4.9,
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
  {
    id: 'hero-2',
    title: 'Cyber Ronin: Neon Protocol',
    logline: 'A lone cybernetic swordsman faces waves of synthetic defense units in subterranean Neo-Tokyo with extreme kinetic smears.',
    genres: ['Sci-Fi', 'Action'],
    director: 'Marcus Vance',
    studio: 'Trigger Inspired',
    duration: '4:15',
    year: '2026',
    rating: 4.8,
    imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  },
  {
    id: 'hero-3',
    title: 'Kitsune: Whispers of the Shrine',
    logline: 'A young forest spirit discovers ancient shapeshifting forms while protecting the sacred torii gate from darkness.',
    genres: ['Mythic', 'Creature'],
    director: 'Elena Rostova',
    studio: 'Fortiche Collab',
    duration: '5:50',
    year: '2026',
    rating: 5.0,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  },
];

interface ContinueItem {
  id: string;
  title: string;
  episode: string;
  duration: string;
  progress: number;
  imageUrl: string;
  videoUrl: string;
}

const CONTINUE_ITEMS: ContinueItem[] = [
  { id: 'cw-1', title: 'Midnight Mischief Squad', episode: 'S1, Ep-3', duration: '30min 55sec', progress: 65, imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80', videoUrl: '' },
  { id: 'cw-2', title: 'Legends of the Emerald Mist', episode: 'S1, Ep-3', duration: '30min 55sec', progress: 40, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80', videoUrl: '' },
  { id: 'cw-3', title: 'Rise of the Last Guardian', episode: 'S1, Ep-3', duration: '30min 55sec', progress: 85, imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80', videoUrl: '' },
  { id: 'cw-4', title: 'The Boy Who Dreamed', episode: 'S1, Ep-1', duration: '25min 10sec', progress: 20, imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80', videoUrl: '' },
];

interface RecommendedItem {
  id: string;
  title: string;
  subtitle: string;
  rating: number;
  imageUrl: string;
}

const RECOMMENDED: RecommendedItem[] = [
  { id: 'rec-1', title: 'Transformers: Smear Mech', subtitle: 'Mecha Action', rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80' },
  { id: 'rec-2', title: 'Joker: Silhouette Madness', subtitle: 'Dark Expression', rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80' },
  { id: 'rec-3', title: 'Kokosnuss: Forest Spirits', subtitle: 'Stylized 3D', rating: 4.9, imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80' },
  { id: 'rec-4', title: 'Gobelins Showcase 2026', subtitle: 'Festival Winners', rating: 5.0, imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80' },
  { id: 'rec-5', title: 'The Silent Lighthouse', subtitle: 'Atmospheric Drama', rating: 4.7, imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80' },
  { id: 'rec-6', title: 'Creature Locomotion Reel', subtitle: 'Quadruped Study', rating: 4.8, imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80' },
];

/* ─── Horizontal Scroll Hook ─── */
function useHorizontalScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    ref.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };
  return { ref, scroll };
}

/* ─── Page ─── */
export default function ShortFilmsStreamingPage() {
  const [heroIndex, setHeroIndex] = useState(0);
  const [allShorts, setAllShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const continueScroll = useHorizontalScroll();
  const recommendedScroll = useHorizontalScroll();

  const hero = HERO_FILMS[heroIndex];

  // Auto-rotate hero
  useEffect(() => {
    const t = setInterval(() => setHeroIndex(i => (i + 1) % HERO_FILMS.length), 8000);
    return () => clearInterval(t);
  }, []);

  // Fetch real shorts from Firestore
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'videos'), where('isShort', '==', true), limit(60));
        const snap = await getDocs(q);
        setAllShorts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Video)));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="min-h-screen pb-24 space-y-8">

      {/* ──────────────── HERO SPOTLIGHT ──────────────── */}
      <section className="relative w-full aspect-[16/7] min-h-[380px] max-h-[520px] rounded-[32px] overflow-hidden">
        {/* BG image */}
        <Image src={hero.imageUrl} alt={hero.title} fill priority className="object-cover" />

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14]/90 via-[#0a0a14]/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10">
          {/* Top row — badge */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-black text-[11px] font-extrabold shadow-lg">
              <Flame className="w-3.5 h-3.5" />
              Now Trending
            </span>
          </div>

          {/* Bottom row — info */}
          <div className="max-w-xl space-y-3">
            {/* Genre pills */}
            <div className="flex items-center gap-2">
              {hero.genres.map(g => (
                <span key={g} className="px-3 py-1 rounded-lg bg-white/15 backdrop-blur-md text-white text-[11px] font-semibold border border-white/20">
                  {g}
                </span>
              ))}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[3.2rem] font-black text-white leading-[1.1] tracking-tight">
              {hero.title}
            </h1>

            <p className="text-sm text-zinc-300 leading-relaxed line-clamp-2 max-w-lg">
              {hero.logline}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                onClick={() => window.open(hero.videoUrl, '_blank')}
                className="h-11 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-xl shadow-purple-900/60 gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                Watch Now
              </Button>

              <button className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </button>

              <button className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white flex items-center justify-center transition-colors" title="More">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Slide dots — bottom right */}
        <div className="absolute bottom-6 right-8 flex items-center gap-2 z-10">
          {HERO_FILMS.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                heroIndex === i
                  ? 'w-7 h-2.5 bg-purple-500'
                  : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ──────────────── CONTINUE WATCHING ──────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Continue Watching</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-400 hover:text-white cursor-pointer transition-colors">See All</span>
            <button onClick={() => continueScroll.scroll('left')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => continueScroll.scroll('right')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={continueScroll.ref} className="flex gap-4 overflow-x-auto scrollbar-none snap-x pb-2">
          {CONTINUE_ITEMS.map(item => (
            <div key={item.id} className="group shrink-0 w-[280px] sm:w-[320px] snap-start cursor-pointer">
              {/* Thumbnail */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-zinc-900">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                    <Play className="w-5 h-5 text-black fill-black ml-0.5" />
                  </div>
                </div>

                {/* Bottom overlay — title & info inside the image */}
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-1.5">
                  <h4 className="text-sm font-bold text-white leading-tight truncate drop-shadow-md">
                    {item.title}
                  </h4>
                  <div className="flex items-center justify-between text-[10px] text-zinc-300 font-medium">
                    <span className="bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">{item.episode}</span>
                    <span>{item.duration}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── YOU MIGHT LIKE ──────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">You Might Like</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-purple-400 hover:text-white cursor-pointer transition-colors">See All</span>
            <button onClick={() => recommendedScroll.scroll('left')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => recommendedScroll.scroll('right')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={recommendedScroll.ref} className="flex gap-4 overflow-x-auto scrollbar-none snap-x pb-2">
          {RECOMMENDED.map(item => (
            <div key={item.id} className="group shrink-0 w-[200px] sm:w-[220px] snap-start cursor-pointer">
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 mb-2">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Rating badge */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold border border-white/10">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {item.rating} IMDB
                </div>
              </div>
              <h4 className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">{item.title}</h4>
              <p className="text-[10px] text-zinc-500">{item.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── NETFLIX-STYLE CATEGORY ROWS ──────────────── */}
      {!loading && <CategoryRows videos={allShorts} />}
    </div>
  );
}

/* ─── Reusable Horizontal Category Row ─── */
function CategoryRow({ title, videos }: { title: string; videos: Video[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -600 : 600, behavior: 'smooth' });
  };

  if (videos.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white hover:text-purple-300 transition-colors cursor-pointer group flex items-center gap-1.5">
          {title}
          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => scroll('left')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll('right')} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-none snap-x pb-1 -mx-1 px-1">
        {videos.map(v => (
          <div key={v.id} className="shrink-0 w-[180px] sm:w-[200px] snap-start">
            <VideoCard video={v} />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Category Rows Builder ─── */
function CategoryRows({ videos }: { videos: Video[] }) {
  const match = (v: Video, keywords: string[]) => {
    const blob = [v.title, v.description || '', ...(v.tags || []), ...(v.categories || [])].join(' ').toLowerCase();
    return keywords.some(kw => blob.includes(kw));
  };

  const categories = useMemo(() => [
    { title: '🔥 Trending Now',               filter: () => videos.slice(0, 12) },
    { title: '⚔️ Action & Combat',            filter: () => videos.filter(v => match(v, ['action', 'combat', 'fight', 'sword', 'martial', 'attack', 'chase'])) },
    { title: '✨ Fantasy & Magic',             filter: () => videos.filter(v => match(v, ['fantasy', 'magic', 'mythic', 'fairy', 'dragon', 'enchant'])) },
    { title: '🛸 Sci-Fi & Cyberpunk',          filter: () => videos.filter(v => match(v, ['sci-fi', 'cyber', 'space', 'robot', 'mech', 'future', 'steampunk'])) },
    { title: '🎭 Drama & Storytelling',        filter: () => videos.filter(v => match(v, ['drama', 'story', 'emotion', 'artistic', 'cultural', 'journey'])) },
    { title: '😂 Comedy & Slapstick',          filter: () => videos.filter(v => match(v, ['comedy', 'humor', 'funny', 'slapstick', 'dark humor'])) },
    { title: '🐾 Creature & Nature',           filter: () => videos.filter(v => match(v, ['creature', 'animal', 'nature', 'quadruped', 'bird', 'dog', 'cat'])) },
    { title: '🏆 Award-Winning & Festival',    filter: () => videos.filter(v => match(v, ['award', 'festival', 'curated', 'gobelins', 'annecy'])) },
    { title: '🎨 Experimental & Abstract',     filter: () => videos.filter(v => match(v, ['experimental', 'abstract', 'surreal', 'art', 'visual'])) },
    { title: '🆕 Recently Added',              filter: () => [...videos].reverse().slice(0, 12) },
  ], [videos]);

  return (
    <div className="space-y-8">
      {categories.map(cat => {
        const filtered = cat.filter();
        return <CategoryRow key={cat.title} title={cat.title} videos={filtered} />;
      })}
    </div>
  );
}
