'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, Upload, Volume2, VolumeX } from 'lucide-react';
import type { Video } from '@/lib/types';

interface HomeHeroBannerProps {
  video?: Video | null;
}

const FPS = 24;

/** 0-based frame index formatted like a DCC timeline readout: F 0042. */
function frameLabel(seconds: number) {
  return `F ${String(Math.floor(seconds * FPS)).padStart(4, '0')}`;
}

/** Seconds as a timecode — mm:ss:ff at 24fps. */
function timecode(seconds: number) {
  const whole = Math.floor(seconds);
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  const ff = String(Math.floor((seconds - whole) * FPS)).padStart(2, '0');
  return `${mm}:${ss}:${ff}`;
}

/**
 * Streaming-style billboard for one featured reference.
 *
 * The footage is the hero: it plays full-bleed and is only darkened where text
 * needs to sit on it. A live frame counter ticks in the corner — the readout an
 * animator watches while scrubbing — so the banner reads as a reference being
 * studied rather than a stock promo.
 *
 * Replaces a banner that stacked two giant <h1>s over footage dimmed to 55%,
 * and that fell back to Google's "ForBiggerBlazes" sample clip when no
 * reference had loaded. There is no fallback clip now: with no video we show
 * the gradient stage and nothing pretends to be a reference.
 */
export function HomeHeroBanner({ video }: HomeHeroBannerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [muted, setMuted] = React.useState(true);
  const reduce = useReducedMotion();

  let playbackUrl = video?.videoUrl || '';
  if (playbackUrl.includes('playlist.m3u8')) playbackUrl = playbackUrl.replace('playlist.m3u8', 'play_480p.mp4');
  if (playbackUrl.includes('.mp4') && !playbackUrl.includes('#t=')) playbackUrl = `${playbackUrl}#t=0.1`;
  const posterUrl = video?.thumbnailUrl || video?.posterUrl;

  React.useEffect(() => {
    const player = videoRef.current;
    if (!player || !playbackUrl) return;
    player.muted = true;
    player.defaultMuted = true;
    void player.play().catch(() => {});
  }, [playbackUrl]);

  // requestAnimationFrame rather than `timeupdate`, which only fires ~4x a
  // second — too coarse for a frame counter, which should visibly tick.
  React.useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const tick = () => {
      const player = videoRef.current;
      if (player) setTime(player.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const toggleMute = () => {
    const player = videoRef.current;
    if (!player) return;
    player.muted = !player.muted;
    setMuted(player.muted);
  };

  const tags = (video?.tags || []).filter(Boolean).slice(0, 3);
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <section
      aria-label="Featured reference"
      className="edge-lit group/hero relative isolate mb-4 w-full select-none overflow-hidden rounded-[28px] bg-[#0b0a12] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)]"
    >
      {/* Stage: gradient under everything, so there is always a finished frame
          even before the footage decodes. */}
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_70%_20%,rgba(109,74,255,0.35),transparent_55%),linear-gradient(135deg,#0b0a12,#150f24_55%,#0b0a12)]" />

      {playbackUrl && (
        <video
          ref={videoRef}
          data-hero-video
          src={playbackUrl}
          poster={posterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-[1600ms] ease-out-expo group-hover/hero:scale-[1.03]"
        />
      )}

      {/* Scrim only where the copy sits: a left-side wash and a bottom fade.
          The right of the frame — where the motion usually is — stays clear. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b0a12] via-[#0b0a12]/70 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b0a12] via-transparent to-[#0b0a12]/30" />

      {/* Timeline readout, top-right. */}
      {playbackUrl && (
        <div className="absolute right-4 top-4 z-10 hidden items-center gap-2 sm:flex">
          <span className="timecode rounded-lg border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-md">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-rose-500 align-middle shadow-[0_0_8px_rgba(244,63,94,0.9)]" />
            {frameLabel(time)}
          </span>
          <span className="timecode rounded-lg border border-white/10 bg-black/45 px-2.5 py-1 text-[11px] text-white/60 backdrop-blur-md">
            {timecode(time)} · {FPS}fps
          </span>
        </div>
      )}

      <div className="relative flex min-h-[420px] flex-col justify-end px-6 pb-8 pt-24 md:min-h-[480px] md:px-12 md:pb-12">
        <motion.div
          className="max-w-xl space-y-4"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="eyebrow">Featured reference</p>

          {/* h2, not h1: the page already has its heading above this banner. */}
          {/* Reference titles run long and keyword-heavy ("Game Black Desert
              Female Dark Knight Sword Charge Slash…"), so cap at two lines;
              the full title is on the study page. */}
          <h2
            title={video?.title}
            className="line-clamp-2 font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] text-white md:text-[2.6rem]"
          >
            {video?.title || 'Study the motion, frame by frame'}
          </h2>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium capitalize text-zinc-200 backdrop-blur-md"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {video?.id ? (
              <Link
                href={`/video/${video.id}`}
                className="squash shine inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-[#0b0a12] shadow-[0_10px_30px_-10px_rgba(255,255,255,0.7)]"
              >
                <Play className="h-4 w-4 fill-current" />
                Study frame by frame
              </Link>
            ) : null}
            <Link
              href="/profile?tab=portfolio"
              className="squash inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-5 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
            >
              <Upload className="h-4 w-4" />
              Build your portfolio
            </Link>
            {playbackUrl && (
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute featured reference' : 'Mute featured reference'}
                className="squash grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/[0.07] text-white backdrop-blur-md transition-colors hover:bg-white/[0.12]"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Playhead: a thin scrub bar along the bottom edge, like a timeline. */}
      {playbackUrl && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-amber-300 shadow-[0_0_10px_rgba(196,181,253,0.8)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </section>
  );
}
