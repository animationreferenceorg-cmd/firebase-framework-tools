'use client';

import React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, BookOpen, Sparkles, UserRound } from 'lucide-react';
import { db } from '@/lib/firebase';
import type { BlogPost, PortfolioItem, Video } from '@/lib/types';
import { getPublicPortfolioItems } from '@/lib/portfolio-service';
import { launches } from '@/components/home/HomeProductLaunchAnnouncement';
import { isDirectVideo, previewSrc, shuffle } from '@/lib/motion-filters';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────
   Slide model
   ───────────────────────────────────────────────────────────────────────── */

type SlideKind = 'reference' | 'community' | 'feature' | 'journal';

interface Slide {
  id: string;
  kind: SlideKind;
  title: string;
  description?: string;
  image?: string;
  video?: string;
  chips: string[];
  author?: { name: string; avatar?: string };
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

const KIND_META: Record<SlideKind, { label: string; Icon: React.ElementType; tint: string }> = {
  reference: { label: 'Featured reference', Icon: Play, tint: 'text-violet-200 bg-violet-500/15 ring-violet-300/25' },
  community: { label: 'Community spotlight', Icon: UserRound, tint: 'text-sky-200 bg-sky-500/15 ring-sky-300/25' },
  feature: { label: 'New on Animation Reference', Icon: Sparkles, tint: 'text-amber-200 bg-amber-500/15 ring-amber-300/25' },
  journal: { label: 'From the journal', Icon: BookOpen, tint: 'text-emerald-200 bg-emerald-500/15 ring-emerald-300/25' },
};

/** How long each slide holds before advancing. */
const SLIDE_MS = 8000;

/**
 * Descriptions are often scraped source metadata ("Source: … Original post:
 * https://… Rating: s, Score: 3"). Show a description only when it reads as
 * prose: no URLs and no key-value scrape markers.
 */
function readableDescription(text?: string): string | undefined {
  const t = (text || '').trim();
  if (!t) return undefined;
  if (/https?:\/\//i.test(t) || /\b(rating|score|source)\s*:/i.test(t)) return undefined;
  return t.length > 180 ? `${t.slice(0, 177).trimEnd()}…` : t;
}

function referenceSlides(videos: Video[], count: number): Slide[] {
  // Only clips that can actually play and have a poster to show while they load.
  const candidates = videos.filter(
    (v) =>
      !v.isShort &&
      isDirectVideo(v.videoUrl) &&
      (v.thumbnailUrl || v.posterUrl) &&
      v.status !== 'draft' &&
      // Import placeholders ("Video by someone") and catalogue codes
      // ("#03 (SB/ED/AD: …)") are not headlines.
      !/^video by /i.test(v.title || '') &&
      !/^\s*#/.test(v.title || '')
  );
  // Bias toward well-liked clips, but shuffle within that pool so the
  // billboard is different on every visit.
  const ranked = [...candidates].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)).slice(0, 250);
  // Several sources reuse one title across many clips; two slides with the
  // same headline read as a bug.
  const seenTitles = new Set<string>();
  const picks = shuffle(ranked).filter((v) => {
    const key = v.title.trim().toLowerCase();
    if (seenTitles.has(key)) return false;
    seenTitles.add(key);
    return true;
  });
  return picks.slice(0, count).map((v) => ({
    id: `ref-${v.id}`,
    kind: 'reference',
    title: v.title,
    description: readableDescription(v.description),
    image: v.thumbnailUrl || v.posterUrl,
    video: previewSrc(v.videoUrl),
    chips: (v.tags || []).filter(Boolean).slice(0, 3),
    primary: { label: 'Study frame by frame', href: `/video/${v.id}` },
    secondary: { label: 'Browse the library', href: '#library' },
  }));
}

function communitySlides(items: PortfolioItem[], count: number): Slide[] {
  const usable = items.filter((i) => i.thumbnailUrl || i.mediaType === 'image' || i.mediaType === 'gif');
  const featuredFirst = [...shuffle(usable.filter((i) => i.isFeatured)), ...shuffle(usable.filter((i) => !i.isFeatured))];
  // One slide per animator, so a single prolific uploader cannot take over.
  const seen = new Set<string>();
  const picks: PortfolioItem[] = [];
  for (const item of featuredFirst) {
    if (seen.has(item.userId)) continue;
    seen.add(item.userId);
    picks.push(item);
    if (picks.length === count) break;
  }
  return picks.map((i) => ({
    id: `pf-${i.id}`,
    kind: 'community',
    title: i.title,
    description: readableDescription(i.description),
    image: i.thumbnailUrl || i.mediaUrl,
    video: i.mediaType === 'video_file' && isDirectVideo(i.mediaUrl) ? i.mediaUrl : undefined,
    chips: [...(i.software || []), ...(i.tags || [])].filter(Boolean).slice(0, 3),
    author: { name: i.authorName, avatar: i.authorAvatar },
    primary: { label: 'Watch the work', href: `/feed?item=${i.id}` },
    secondary: { label: 'Share yours', href: '/profile?tab=portfolio' },
  }));
}

function featureSlides(count: number): Slide[] {
  return launches.slice(0, count).map((l) => ({
    id: `ft-${l.title}`,
    kind: 'feature',
    title: l.title,
    description: l.description,
    image: l.image,
    chips: [l.eyebrow, l.badge].filter(Boolean) as string[],
    primary: { label: `Open ${l.title}`, href: l.href },
  }));
}

function journalSlides(posts: BlogPost[]): Slide[] {
  return posts
    .filter((p) => p.coverImage)
    .map((p) => ({
      id: `bl-${p.id}`,
      kind: 'journal',
      title: p.title,
      description: (p.excerpt || p.seoDescription || '').slice(0, 180) || undefined,
      image: p.coverImage,
      chips: (p.keywords || []).slice(0, 3),
      author: p.author ? { name: p.author } : undefined,
      primary: { label: 'Read the guide', href: `/blog/${p.slug}` },
    }));
}

/** Interleave the pools so no two slides of the same kind sit side by side. */
function weave(pools: Slide[][]): Slide[] {
  const out: Slide[] = [];
  const max = Math.max(0, ...pools.map((p) => p.length));
  for (let i = 0; i < max; i++) for (const pool of pools) if (pool[i]) out.push(pool[i]);
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────
   Billboard
   ───────────────────────────────────────────────────────────────────────── */

export function HomeBillboard({ videos, ready = true }: { videos: Video[]; /** False until media-host health is known. */ ready?: boolean }) {
  const reduce = useReducedMotion();
  const [portfolio, setPortfolio] = React.useState<PortfolioItem[]>([]);
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [index, setIndex] = React.useState(0);
  const [hovering, setHovering] = React.useState(false);
  const [userPaused, setUserPaused] = React.useState(false);
  const [tabHidden, setTabHidden] = React.useState(false);
  const [muted, setMuted] = React.useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const swipeStart = React.useRef<number | null>(null);

  React.useEffect(() => {
    getPublicPortfolioItems({ limitCount: 40 }).then(setPortfolio).catch(() => {});
    getDocs(query(collection(db, 'blogPosts'), where('status', '==', 'published'), limit(6)))
      .then((snap) => setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlogPost))))
      .catch(() => {});
  }, []);

  // Slides are built once per data arrival — not on every render — so the
  // random picks stay put while the carousel is running.
  const slides = React.useMemo(
    () =>
      !ready ? [] : weave([
        referenceSlides(videos, 3),
        communitySlides(portfolio, 2),
        featureSlides(1),
        journalSlides(posts).slice(0, 1),
      ]),
    [ready, videos, portfolio, posts]
  );

  React.useEffect(() => {
    if (index >= slides.length && slides.length > 0) setIndex(0);
  }, [slides.length, index]);

  React.useEffect(() => {
    const onVisibility = () => setTabHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const go = React.useCallback(
    (next: number) => {
      if (slides.length === 0) return;
      setIndex(((next % slides.length) + slides.length) % slides.length);
    },
    [slides.length]
  );

  // Auto-advance is off under reduced motion. It has to be: the global
  // reduced-motion rule shortens the timer animation to ~0ms, which would
  // otherwise fire animationend immediately and flip slides continuously.
  const autoplay = !reduce;
  const paused = hovering || userPaused || tabHidden;

  const slide = slides[index];
  const upNext = slides.length > 1 ? [1, 2, 3].map((o) => slides[(index + o) % slides.length]).filter((s, i, a) => s && a.indexOf(s) === i && s !== slide) : [];

  React.useEffect(() => {
    const player = videoRef.current;
    if (!player) return;
    player.muted = muted;
    if (paused && !hovering) player.pause();
    else void player.play().catch(() => {});
  }, [slide?.id, muted, paused, hovering]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured on Animation Reference"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
      onPointerDown={(e) => { swipeStart.current = e.clientX; }}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const dx = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(dx) > 60 && e.pointerType !== 'mouse') go(index + (dx < 0 ? 1 : -1));
      }}
      className="group/bb relative -mx-4 -mt-[88px] h-[clamp(560px,84vh,880px)] overflow-hidden outline-none md:-mx-8"
    >
      {/* ── Background layers ─────────────────────────────────────────── */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_20%,rgba(109,74,255,0.35),transparent_55%),linear-gradient(135deg,#0b0a12,#150f24_55%,#08070d)]" />

      <AnimatePresence initial={false}>
        {slide && (
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 1.1, ease: [0.65, 0, 0.35, 1] }}
          >
            {slide.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.image}
                alt=""
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="absolute inset-0 h-full w-full object-cover animate-ken-burns"
                style={{ animationDuration: `${SLIDE_MS + 2000}ms`, animationTimingFunction: 'ease-out', animationFillMode: 'both' }}
              />
            )}
            {slide.video && (
              <video
                ref={videoRef}
                src={slide.video}
                poster={slide.image}
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrims: dark only where type sits, so the motion in the frame stays
          readable. Top for the floating header, left for the copy, bottom so
          the billboard dissolves into the page instead of ending on an edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#08070d]/80 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#08070d] via-[#08070d]/65 to-transparent md:via-[#08070d]/45" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#08070d] via-[#08070d]/70 to-transparent" />

      {/* ── Copy ─────────────────────────────────────────────────────── */}
      <div className="relative flex h-full items-end px-6 pb-40 md:px-14 md:pb-44">
        <AnimatePresence mode="wait" initial={false}>
          {slide ? (
            <motion.div
              key={slide.id}
              className="max-w-2xl"
              initial="hidden"
              animate="show"
              exit="exit"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: reduce ? 0 : 0.15 } },
                exit: { opacity: 0, y: reduce ? 0 : -8, transition: { duration: 0.25 } },
              }}
            >
              <SlideCopy slide={slide} reduce={!!reduce} />
            </motion.div>
          ) : (
            <div className="max-w-2xl space-y-4">
              <div className="skeleton-shimmer h-6 w-44 rounded-full" />
              <div className="skeleton-shimmer h-14 w-[min(520px,80vw)] rounded-xl" />
              <div className="skeleton-shimmer h-5 w-80 rounded-lg" />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Up next rail (desktop) ───────────────────────────────────── */}
      {upNext.length > 0 && (
        <div className="absolute bottom-44 right-6 z-10 hidden w-[260px] flex-col gap-2 xl:flex">
          <p className="eyebrow mb-1 text-right">Up next</p>
          {upNext.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => go(slides.indexOf(s))}
              className="squash group/next flex items-center gap-3 rounded-xl border border-white/[0.08] bg-black/40 p-2 text-left backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-black/60"
            >
              <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-white/5">
                {s.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.image} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} className="h-full w-full object-cover transition-transform duration-500 ease-out-expo group-hover/next:scale-110" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{KIND_META[s.kind].label}</span>
                <span className="line-clamp-2 text-xs font-semibold leading-snug text-white">{s.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Transport: progress segments, pause, mute, arrows ──────────── */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-28 z-10 flex items-center gap-4 px-6 md:bottom-32 md:px-14">
          <div className="flex flex-1 items-center gap-1.5 md:max-w-md" role="tablist" aria-label="Choose a slide">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${KIND_META[s.kind].label}: ${s.title}`}
                onClick={() => go(i)}
                className="group/seg relative h-6 flex-1"
              >
                <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/20 transition-[height] duration-200 group-hover/seg:h-[5px]">
                  {i < index && <span className="absolute inset-0 bg-white/70" />}
                  {i === index && (
                    autoplay ? (
                      <span
                        key={`${s.id}-${index}`}
                        className="absolute inset-0 origin-left bg-white"
                        style={{
                          animation: `progress ${SLIDE_MS}ms linear forwards`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                        onAnimationEnd={() => go(index + 1)}
                      />
                    ) : (
                      <span className="absolute inset-0 bg-white" />
                    )
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {autoplay && (
              <TransportButton
                label={userPaused ? 'Resume slideshow' : 'Pause slideshow'}
                onClick={() => setUserPaused((p) => !p)}
              >
                {userPaused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5 fill-current" />}
              </TransportButton>
            )}
            {slide?.video && (
              <TransportButton label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted((m) => !m)}>
                {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              </TransportButton>
            )}
            <span className="timecode ml-1 hidden text-[11px] text-white/50 sm:inline">
              {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
        </div>
      )}

      {slides.length > 1 && (
        <>
          <EdgeArrow side="left" onClick={() => go(index - 1)} />
          <EdgeArrow side="right" onClick={() => go(index + 1)} />
        </>
      )}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

const rise: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

function SlideCopy({ slide, reduce }: { slide: Slide; reduce: boolean }) {
  const meta = KIND_META[slide.kind];
  // With no variants a motion.div just renders in place, which is exactly
  // what reduced motion wants.
  const Item = motion.div;
  const itemProps = { variants: reduce ? undefined : rise };

  return (
    <div className="space-y-4">
      <Item {...itemProps}>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 backdrop-blur-md', meta.tint)}>
          <meta.Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </Item>

      <Item {...itemProps}>
        {/* h2: the page's single h1 lives in the command bar below. */}
        <h2
          title={slide.title}
          className="line-clamp-2 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.035em] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] sm:text-5xl lg:text-[4.25rem]"
        >
          {slide.title}
        </h2>
      </Item>

      {(slide.author || slide.chips.length > 0) && (
        <Item {...itemProps} className="flex flex-wrap items-center gap-2">
          {slide.author && (
            <span className="inline-flex items-center gap-2 pr-1 text-sm font-semibold text-white">
              {slide.author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.author.avatar} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-6 w-6 rounded-full object-cover ring-1 ring-white/30" />
              ) : (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 text-[11px]">{slide.author.name.charAt(0)}</span>
              )}
              {slide.author.name}
            </span>
          )}
          {slide.chips.map((chip) => (
            <span key={chip} className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-0.5 text-[11px] font-medium capitalize text-zinc-200 backdrop-blur-md">
              {chip}
            </span>
          ))}
        </Item>
      )}

      {slide.description && (
        <Item {...itemProps}>
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-zinc-300 md:text-base">{slide.description}</p>
        </Item>
      )}

      <Item {...itemProps} className="flex flex-wrap items-center gap-2.5 pt-1">
        <Link
          href={slide.primary.href}
          className="squash shine inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#0b0a12] shadow-[0_10px_30px_-10px_rgba(255,255,255,0.7)]"
        >
          <Play className="h-4 w-4 fill-current" />
          {slide.primary.label}
        </Link>
        {slide.secondary && (
          <Link
            href={slide.secondary.href}
            className="squash inline-flex h-12 items-center rounded-full border border-white/15 bg-white/[0.08] px-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/[0.14]"
          >
            {slide.secondary.label}
          </Link>
        )}
      </Item>
    </div>
  );
}

function TransportButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="squash grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-xl transition-colors hover:bg-white/15"
    >
      {children}
    </button>
  );
}

function EdgeArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous slide' : 'Next slide'}
      className={cn(
        'squash absolute top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/40 text-white opacity-0 backdrop-blur-xl transition-all duration-300 hover:bg-white/15 focus-visible:opacity-100 group-hover/bb:opacity-100 md:grid',
        side === 'left' ? 'left-4 md:left-6' : 'right-4 md:right-6'
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
