'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const FPS = 24;

/**
 * Plays an animator's reference and final shot side by side, locked
 * together: one play button, one scrubber, frame stepping on both.
 */
export function RefVsFinalPlayer({ referenceUrl, finalUrl, poster, referenceClipId }: { referenceUrl: string; finalUrl: string; poster?: string; referenceClipId?: string }) {
  const refVideo = useRef<HTMLVideoElement | null>(null);
  const finalVideo = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const both = () => [refVideo.current, finalVideo.current].filter((v): v is HTMLVideoElement => Boolean(v));

  // Bunny-hosted clips are HLS playlists; Safari plays them natively, other browsers need hls.js.
  useEffect(() => {
    const instances: { destroy(): void }[] = [];
    let cancelled = false;
    for (const [el, src] of [[refVideo.current, referenceUrl], [finalVideo.current, finalUrl]] as const) {
      if (!el || !src.includes('.m3u8')) continue;
      if (el.canPlayType('application/vnd.apple.mpegurl')) { el.src = src; continue; }
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled || !Hls.isSupported()) return;
        const hls = new Hls();
        hls.loadSource(src);
        hls.attachMedia(el);
        instances.push(hls);
      }).catch(() => {});
    }
    return () => { cancelled = true; instances.forEach((h) => h.destroy()); };
  }, [referenceUrl, finalUrl]);

  useEffect(() => {
    const final = finalVideo.current;
    if (!final) return;
    const onTime = () => {
      setTime(final.currentTime);
      // Keep the reference within a frame of the final shot.
      const ref = refVideo.current;
      if (ref && Math.abs(ref.currentTime - final.currentTime) > 1 / FPS && final.currentTime <= (ref.duration || Infinity)) {
        ref.currentTime = final.currentTime;
      }
    };
    const onMeta = () => setDuration(Math.max(final.duration || 0, refVideo.current?.duration || 0));
    const onEnded = () => setPlaying(false);
    final.addEventListener('timeupdate', onTime);
    final.addEventListener('loadedmetadata', onMeta);
    final.addEventListener('ended', onEnded);
    return () => {
      final.removeEventListener('timeupdate', onTime);
      final.removeEventListener('loadedmetadata', onMeta);
      final.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    if (playing) {
      both().forEach((v) => v.pause());
      setPlaying(false);
    } else {
      both().forEach((v) => { v.play().catch(() => {}); });
      setPlaying(true);
    }
  };

  const seek = (t: number) => {
    both().forEach((v) => { v.currentTime = Math.min(t, v.duration || t); });
    setTime(t);
  };

  const step = (frames: number) => {
    both().forEach((v) => v.pause());
    setPlaying(false);
    seek(Math.max(0, Math.min(duration, time + frames / FPS)));
  };

  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          { label: 'Reference', ref: refVideo, src: referenceUrl, poster: undefined },
          { label: 'Final', ref: finalVideo, src: finalUrl, poster },
        ].map(({ label, ref, src, poster: p }) => (
          <div key={label} className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video ref={ref} src={src.includes('.m3u8') ? undefined : src} poster={p} muted={label === 'Reference'} playsInline preload="auto" className="h-full w-full object-contain" onClick={toggle} />
            <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-2">
        <button type="button" onClick={() => step(-1)} className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10" aria-label="Previous frame"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={toggle} className="rounded-lg bg-purple-600 p-2 text-white hover:bg-purple-500" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button type="button" onClick={() => step(1)} className="rounded-lg p-1.5 text-zinc-300 hover:bg-white/10" aria-label="Next frame"><ChevronRight className="h-4 w-4" /></button>
        <input type="range" min={0} max={duration || 0} step={1 / FPS} value={time} onChange={(e) => seek(Number(e.target.value))} className="flex-1 accent-purple-500" aria-label="Scrub" />
        <span className="w-16 text-right font-mono text-[11px] tabular-nums text-zinc-400">{Math.round(time * FPS)}f</span>
      </div>
      {referenceClipId && (
        <p className="text-xs text-zinc-500">Reference shared to the community library · <Link href={`/clip/${referenceClipId}`} className="text-purple-300 hover:underline">open it</Link></p>
      )}
    </div>
  );
}
