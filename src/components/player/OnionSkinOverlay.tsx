'use client';

import * as React from 'react';

export interface OnionSettings {
  /** Ghost frames on each side of the current frame (1–3). */
  frames: number;
  /** Distance between ghosts, in frames (1 = every frame, 2 = on twos). */
  step: number;
}

export type OnionStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface OnionSkinHandle {
  /** Renders the current frame plus ghosts at source resolution. Rejects if the source forbids export. */
  exportPng: () => Promise<Blob>;
}

interface OnionSkinOverlayProps {
  src: string;
  /** The on-screen <video>; its seeks drive which frame the ghosts surround. */
  mediaEl: HTMLVideoElement | null;
  fps: number;
  settings: OnionSettings;
  /** Onion skin is switched on: keep the hidden decoding video loaded. */
  enabled: boolean;
  /** Ghosts are drawn only while paused; during playback the overlay is empty. */
  paused: boolean;
  onStatusChange?: (status: OnionStatus, exportable: boolean) => void;
}

export const ONION_PAST_COLOR = '#ff4d6d';
export const ONION_FUTURE_COLOR = '#2dd4bf';
const MAX_CACHE = 40;
const CACHE_MAX_WIDTH = 1280;
const SEEK_TIMEOUT_MS = 8000;

/** Bunny HLS playlists can't be decoded by a plain <video>; use their MP4 rendition. */
export function onionSourceFor(url: string): string {
  return url.includes('playlist.m3u8') ? url.replace('playlist.m3u8', 'play_720p.mp4') : url;
}

function containRect(cw: number, ch: number, vw: number, vh: number) {
  const scale = Math.min(cw / vw, ch / vh);
  const w = vw * scale;
  const h = vh * scale;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

function waitFor(el: HTMLVideoElement, event: string, timeoutMs = SEEK_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => done(new Error('timeout')), timeoutMs);
    const onEvent = () => done();
    const onError = () => done(new Error('media error'));
    function done(err?: Error) {
      clearTimeout(timer);
      el.removeEventListener(event, onEvent);
      el.removeEventListener('error', onError);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, onEvent, { once: true });
    el.addEventListener('error', onError, { once: true });
  });
}

async function loadGhost(src: string, cors: boolean): Promise<HTMLVideoElement> {
  const el = document.createElement('video');
  el.muted = true;
  el.playsInline = true;
  el.preload = 'auto';
  if (cors) el.crossOrigin = 'anonymous';
  const ready = waitFor(el, 'loadeddata', 15000);
  el.src = src;
  el.load();
  try {
    await ready;
    return el;
  } catch (err) {
    el.removeAttribute('src');
    el.load();
    throw err;
  }
}

async function seekGhost(el: HTMLVideoElement, time: number): Promise<void> {
  if (Math.abs(el.currentTime - time) < 1e-4 && el.readyState >= 2) return;
  const seeked = waitFor(el, 'seeked');
  el.currentTime = time;
  await seeked;
}

function snapshot(el: HTMLVideoElement, maxWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / el.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(el.videoWidth * scale));
  canvas.height = Math.max(1, Math.round(el.videoHeight * scale));
  canvas.getContext('2d')!.drawImage(el, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Recolours a frame while keeping its luminance, so the ghost reads as a tinted copy. */
function tint(frame: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(frame, 0, 0);
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

interface Ghost {
  offset: number; // signed frame offset from the current frame
  time: number;
}

/** Ghost times around `time`, farthest first so nearer ghosts paint on top. */
export function ghostTimes(time: number, duration: number, fps: number, settings: OnionSettings): Ghost[] {
  const frameDur = 1 / fps;
  const last = Math.max(0, duration - frameDur / 2);
  const out: Ghost[] = [];
  for (let k = settings.frames; k >= 1; k--) {
    for (const sign of [-1, 1]) {
      const offset = sign * k * settings.step;
      const t = time + offset * frameDur;
      if (t < 0 || t > last) continue;
      out.push({ offset, time: t });
    }
  }
  return out;
}

function ghostAlpha(offset: number, settings: OnionSettings): number {
  const distance = Math.abs(offset) / settings.step; // 1..frames
  return 0.5 - ((distance - 1) / Math.max(1, settings.frames)) * 0.3;
}

export const OnionSkinOverlay = React.forwardRef<OnionSkinHandle, OnionSkinOverlayProps>(function OnionSkinOverlay(
  { src, mediaEl, fps, settings, enabled, paused, onStatusChange },
  ref,
) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ghostRef = React.useRef<HTMLVideoElement | null>(null);
  const exportableRef = React.useRef(false);
  const cacheRef = React.useRef<Map<number, HTMLCanvasElement>>(new Map());
  const lockRef = React.useRef<Promise<unknown>>(Promise.resolve());
  const generationRef = React.useRef(0);
  const [status, setStatus] = React.useState<OnionStatus>('idle');
  const [time, setTime] = React.useState<number | null>(null);
  const [size, setSize] = React.useState({ w: 0, h: 0, dpr: 1 });

  const onStatusRef = React.useRef(onStatusChange);
  onStatusRef.current = onStatusChange;

  // Serialize every use of the single hidden <video>: two seeks in flight would race.
  const exclusive = React.useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = lockRef.current.then(task, task);
    lockRef.current = run.catch(() => undefined);
    return run;
  }, []);

  const active = enabled && paused;

  // Load the hidden decoding video only while onion skin is on, and free it when off.
  React.useEffect(() => {
    if (!enabled || !src) {
      setStatus('idle');
      return;
    }
    let cancelled = false;
    const source = onionSourceFor(src);
    const cache = cacheRef.current;
    cache.clear();
    setStatus('loading');

    (async () => {
      let ghost: HTMLVideoElement | null = null;
      let exportable = true;
      try {
        ghost = await loadGhost(source, true);
      } catch {
        // Host without CORS headers: still viewable, but the canvas can't be exported.
        exportable = false;
        try {
          ghost = await loadGhost(source, false);
        } catch {
          ghost = null;
        }
      }
      if (cancelled) {
        if (ghost) {
          ghost.removeAttribute('src');
          ghost.load();
        }
        return;
      }
      ghostRef.current = ghost;
      exportableRef.current = Boolean(ghost) && exportable;
      const next: OnionStatus = ghost ? 'ready' : 'unavailable';
      setStatus(next);
      onStatusRef.current?.(next, exportableRef.current);
    })();

    return () => {
      cancelled = true;
      const ghost = ghostRef.current;
      ghostRef.current = null;
      if (ghost) {
        ghost.removeAttribute('src');
        ghost.load();
      }
      cache.clear();
    };
  }, [enabled, src]);

  React.useEffect(() => {
    cacheRef.current.clear();
  }, [fps]);

  // Track the on-screen frame precisely from the media element's own events.
  React.useEffect(() => {
    if (!mediaEl) {
      setTime(null);
      return;
    }
    const update = () => setTime(mediaEl.currentTime);
    update();
    const events = ['seeked', 'pause', 'loadeddata'] as const;
    events.forEach((e) => mediaEl.addEventListener(e, update));
    return () => events.forEach((e) => mediaEl.removeEventListener(e, update));
  }, [mediaEl]);

  // Keep the canvas backing store matched to its on-screen size.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      setSize({ w: canvas.clientWidth, h: canvas.clientHeight, dpr });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const frameAt = React.useCallback(async (t: number, generation: number): Promise<HTMLCanvasElement | null> => {
    const key = Math.round(t * fps);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    const ghost = ghostRef.current;
    if (!ghost || generation !== generationRef.current) return null;
    await seekGhost(ghost, t);
    if (generation !== generationRef.current) return null;
    const frame = snapshot(ghost, CACHE_MAX_WIDTH);
    cacheRef.current.set(key, frame);
    if (cacheRef.current.size > MAX_CACHE) {
      cacheRef.current.delete(cacheRef.current.keys().next().value as number);
    }
    return frame;
  }, [fps]);

  // Render ghosts whenever the paused frame, settings or size change.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const generation = ++generationRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clear = () => {
      canvas.width = Math.max(1, Math.round(size.w * size.dpr));
      canvas.height = Math.max(1, Math.round(size.h * size.dpr));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    if (!active || status !== 'ready' || time === null || !mediaEl || !size.w || !size.h) {
      clear();
      return;
    }

    const duration = mediaEl.duration;
    if (!Number.isFinite(duration) || duration <= 0) {
      clear();
      return;
    }

    const ghosts = ghostTimes(time, duration, fps, settings);
    exclusive(async () => {
      const frames: { ghost: Ghost; frame: HTMLCanvasElement }[] = [];
      for (const ghost of ghosts) {
        if (generation !== generationRef.current) return;
        const frame = await frameAt(ghost.time, generation);
        if (!frame) return;
        frames.push({ ghost, frame });
      }
      if (generation !== generationRef.current) return;

      // Paint everything in one pass so stepping never shows a half-drawn state.
      clear();
      for (const { ghost, frame } of frames) {
        const rect = containRect(canvas.width, canvas.height, frame.width, frame.height);
        ctx.globalAlpha = ghostAlpha(ghost.offset, settings);
        ctx.drawImage(tint(frame, ghost.offset < 0 ? ONION_PAST_COLOR : ONION_FUTURE_COLOR), rect.x, rect.y, rect.w, rect.h);
      }
      ctx.globalAlpha = 1;
    }).catch(() => {
      if (generation === generationRef.current) clear();
    });
  }, [active, status, time, mediaEl, size, fps, settings, exclusive, frameAt]);

  React.useImperativeHandle(ref, () => ({
    exportPng: () => exclusive(async () => {
      const ghost = ghostRef.current;
      if (!ghost || !mediaEl) throw new Error('Onion skin is not ready yet.');
      if (!exportableRef.current) throw new Error('This video’s host does not allow frame export.');

      const current = mediaEl.currentTime;
      const ghosts = ghostTimes(current, mediaEl.duration, fps, settings);
      await seekGhost(ghost, current);
      const base = snapshot(ghost, 1920);
      const out = document.createElement('canvas');
      out.width = base.width;
      out.height = base.height;
      const ctx = out.getContext('2d')!;
      ctx.drawImage(base, 0, 0);
      for (const g of ghosts) {
        await seekGhost(ghost, g.time);
        ctx.globalAlpha = ghostAlpha(g.offset, settings);
        ctx.drawImage(tint(snapshot(ghost, 1920), g.offset < 0 ? ONION_PAST_COLOR : ONION_FUTURE_COLOR), 0, 0, out.width, out.height);
      }
      ctx.globalAlpha = 1;

      // Small legend so the sheet still makes sense once it leaves the site.
      const frame = Math.round(current * fps);
      const label = `Frame ${frame} · ±${settings.frames} ghosts on ${settings.step === 1 ? 'ones' : 'twos'} · ${fps} fps`;
      const pad = Math.round(out.width * 0.012);
      const fontSize = Math.max(12, Math.round(out.width * 0.016));
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(pad, out.height - fontSize * 2 - pad, textWidth + fontSize * 1.5, fontSize * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, pad + fontSize * 0.75, out.height - pad - fontSize * 0.6);

      return new Promise<Blob>((resolve, reject) => {
        try {
          out.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Export failed.'))), 'image/png');
        } catch {
          reject(new Error('This video’s host does not allow frame export.'));
        }
      });
    }),
  }), [exclusive, mediaEl, fps, settings]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
});
