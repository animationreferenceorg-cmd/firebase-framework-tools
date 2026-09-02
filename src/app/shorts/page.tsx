'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Video } from '@/lib/types';
import {
  Play,
  Flame,
  ChevronRight,
  ChevronLeft,
  Film,
  Heart,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoCard } from '@/components/VideoCard';

/* ─── Helpers ─── */

/** Best available cover for a film. posterUrl is the vertical art, thumbnailUrl
 * the landscape still; either is a real frame from the film itself. */
function coverFor(video: Video, orientation: 'portrait' | 'landscape'): string | null {
  const preferred = orientation === 'portrait' ? video.posterUrl : video.thumbnailUrl;
  return preferred || video.thumbnailUrl || video.posterUrl || null;
}

/**
 * Cover art for a film, falling back to the film's own first frame when no
 * poster or thumbnail has been set. The #t=0.1 fragment makes the browser seek
 * a hair into the file so it paints an actual frame rather than black.
 *
 * Deliberately never renders a generic stock photo — a wrong image is worse
 * than an honest empty slate, because it misrepresents someone's film.
 */
function FilmCover({
  video,
  orientation,
  className = '',
}: {
  video: Video;
  orientation: 'portrait' | 'landscape';
  className?: string;
}) {
  const cover = coverFor(video, orientation);

  if (cover) {
    return (
      <img
        src={cover}
        alt={video.title}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  if (video.videoUrl) {
    return (
      <video
        src={`${video.videoUrl}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        aria-label={video.title}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div className={`grid h-full w-full place-items-center bg-zinc-900 ${className}`}>
      <Film className="h-6 w-6 text-zinc-700" />
    </div>
  );
}

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
  const recommendedScroll = useHorizontalScroll();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'videos'), where('isShort', '==', true), limit(60));
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Video));

        // Drafts were previously shown alongside published films. Treat a
        // missing status as published so older records aren't dropped.
        const published = rows.filter((v) => (v.status ?? 'published') === 'published');

        // Collapse duplicates — the same film re-imported under a second doc
        // shows up twice otherwise. Same source URL, or the same title, is the
        // same film; keep whichever copy has the better artwork.
        const byKey = new Map<string, Video>();
        for (const video of published) {
          const key = (video.videoUrl || video.originalUrl || video.title || video.id)
            .trim()
            .toLowerCase();
          const existing = byKey.get(key);
          if (!existing) {
            byKey.set(key, video);
            continue;
          }
          const existingHasArt = Boolean(coverFor(existing, 'landscape'));
          const candidateHasArt = Boolean(coverFor(video, 'landscape'));
          if (!existingHasArt && candidateHasArt) byKey.set(key, video);
        }

        setAllShorts([...byKey.values()]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // The hero needs landscape artwork to fill a 16/7 frame, so it only features
  // films that actually have some.
  const heroFilms = useMemo(
    () => allShorts.filter((v) => Boolean(v.thumbnailUrl || v.posterUrl)).slice(0, 5),
    [allShorts]
  );

  const mostWatched = useMemo(
    () =>
      [...allShorts]
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0) || (b.likeCount || 0) - (a.likeCount || 0))
        .slice(0, 12),
    [allShorts]
  );

  const hero = heroFilms[heroIndex] || null;

  useEffect(() => {
    if (heroFilms.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroFilms.length), 8000);
    return () => clearInterval(t);
  }, [heroFilms.length]);

  // Keep the index valid if the film list shrinks between renders.
  useEffect(() => {
    if (heroIndex >= heroFilms.length) setHeroIndex(0);
  }, [heroFilms.length, heroIndex]);

  if (!loading && allShorts.length === 0) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-500/10">
            <Film className="h-7 w-7 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">No short films yet</h1>
          <p className="text-sm text-zinc-400">
            Published short films will appear here. Add one from the admin dashboard to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 pb-24">

      {/* ──────────────── HERO SPOTLIGHT ──────────────── */}
      {hero && (
        <section className="relative aspect-[16/7] max-h-[520px] min-h-[380px] w-full overflow-hidden rounded-[32px]">
          <Image
            src={(hero.thumbnailUrl || hero.posterUrl) as string}
            alt={hero.title}
            fill
            priority
            className="object-cover"
            unoptimized
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a14] via-[#0a0a14]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a14]/90 via-[#0a0a14]/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-extrabold text-black shadow-lg">
                <Flame className="h-3.5 w-3.5" />
                Featured
              </span>
            </div>

            <div className="max-w-xl space-y-3">
              {(hero.categories?.length || hero.tags?.length) ? (
                <div className="flex flex-wrap items-center gap-2">
                  {(hero.categories?.length ? hero.categories : hero.tags).slice(0, 3).map((g) => (
                    <span
                      key={g}
                      className="rounded-lg border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              ) : null}

              <h1 className="text-3xl font-black leading-[1.1] tracking-tight text-white sm:text-4xl md:text-[3.2rem]">
                {hero.title}
              </h1>

              {hero.description ? (
                <p className="line-clamp-2 max-w-lg text-sm leading-relaxed text-zinc-300">
                  {hero.description}
                </p>
              ) : null}

              {hero.author_name ? (
                <p className="text-xs font-medium text-zinc-400">by {hero.author_name}</p>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <Button
                  asChild
                  className="h-11 gap-2 rounded-xl bg-purple-600 px-6 text-sm font-bold text-white shadow-xl shadow-purple-900/60 hover:bg-purple-500"
                >
                  <Link href={`/shorts/${hero.id}`}>
                    <Play className="h-4 w-4 fill-white" />
                    Watch Now
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {heroFilms.length > 1 && (
            <div className="absolute bottom-6 right-8 z-10 flex items-center gap-2">
              {heroFilms.map((film, i) => (
                <button
                  key={film.id}
                  onClick={() => setHeroIndex(i)}
                  aria-label={`Show ${film.title}`}
                  className={`rounded-full transition-all duration-300 ${
                    heroIndex === i ? 'h-2.5 w-7 bg-purple-500' : 'h-2.5 w-2.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ──────────────── MOST WATCHED ──────────────── */}
      {mostWatched.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Most Watched</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => recommendedScroll.scroll('left')}
                aria-label="Scroll left"
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => recommendedScroll.scroll('right')}
                aria-label="Scroll right"
                className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div ref={recommendedScroll.ref} className="flex snap-x gap-4 overflow-x-auto pb-2 scrollbar-none">
            {mostWatched.map((item) => (
              <Link
                key={item.id}
                href={`/shorts/${item.id}`}
                className="group w-[200px] shrink-0 snap-start sm:w-[220px]"
              >
                <div className="relative mb-2 aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900">
                  <FilmCover
                    video={item}
                    orientation="portrait"
                    className="transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  {/* Real engagement numbers only — no invented ratings. */}
                  {(item.viewCount || item.likeCount) ? (
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-2 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
                      {item.viewCount ? (
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {item.viewCount}
                        </span>
                      ) : null}
                      {item.likeCount ? (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3 fill-current text-pink-400" />
                          {item.likeCount}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <h4 className="truncate text-xs font-bold text-white transition-colors group-hover:text-purple-300">
                  {item.title}
                </h4>
                {item.author_name ? (
                  <p className="truncate text-[10px] text-zinc-500">{item.author_name}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ──────────────── CATEGORY ROWS ──────────────── */}
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
        <h2 className="group flex cursor-pointer items-center gap-1.5 text-lg font-bold text-white transition-colors hover:text-purple-300">
          {title}
          <ChevronRight className="h-4 w-4 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => scroll('left')} aria-label="Scroll left" className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll('right')} aria-label="Scroll right" className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
        {videos.map((v) => (
          <div key={v.id} className="w-[180px] shrink-0 snap-start sm:w-[200px]">
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
