import type { CanvasSize, Frame } from './types';
import { createLayerCanvas } from './engine';

/**
 * Renders an animation with its pinned reference video underneath, matching
 * the tracing view: black stage, reference drawn "cover" at the tracing
 * opacity, drawing layers on top. Frame i shows the reference at i / fps,
 * the same time the timeline syncs the pinned video to.
 *
 * Rendering happens in two passes. Seeking a video to each frame takes longer
 * than a frame lasts, so recording while seeking would stretch the timing.
 * Pass 1 composites every frame to a JPEG; pass 2 plays those back into the
 * recorder on a fixed clock.
 */

export interface ReferenceExportOptions {
  videoUrl: string;
  opacity: number;
}

/** Bunny HLS playlists can't load in a plain <video>; try its MP4 renditions instead. */
export function referenceSourceCandidates(url: string): string[] {
  if (!url.includes('playlist.m3u8')) return [url];
  const base = url.slice(0, url.indexOf('playlist.m3u8'));
  return [720, 480, 360, 240, 1080].map((h) => `${base}play_${h}p.mp4`);
}

function waitForEvent(el: HTMLVideoElement, event: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error(`timeout waiting for ${event}`)), timeoutMs);
    const ok = () => finish();
    const fail = () => finish(new Error('video failed to load'));
    function finish(err?: Error) {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener('error', fail);
      if (err) reject(err);
      else resolve();
    }
    el.addEventListener(event, ok, { once: true });
    el.addEventListener('error', fail, { once: true });
  });
}

async function loadReference(url: string): Promise<HTMLVideoElement> {
  for (const candidate of referenceSourceCandidates(url)) {
    const video = document.createElement('video');
    // Required: without CORS the canvas is tainted and can't be recorded.
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    const ready = waitForEvent(video, 'loadeddata', 15000);
    video.src = candidate;
    try {
      await ready;
      return video;
    } catch {
      video.removeAttribute('src');
      video.load();
    }
  }
  throw new Error('The reference video could not be loaded for export.');
}

async function seek(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.max(0, Math.min(time, (video.duration || 0) - 0.001));
  if (Math.abs(video.currentTime - target) < 1e-4 && video.readyState >= 2) return;
  const done = waitForEvent(video, 'seeked', 10000);
  video.currentTime = target;
  await done;
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) {
  const vw = video.videoWidth || w;
  const vh = video.videoHeight || h;
  const scale = Math.max(w / vw, h / vh);
  const dw = vw * scale;
  const dh = vh * scale;
  ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawLayers(ctx: CanvasRenderingContext2D, frame: Frame) {
  for (const layer of frame.layers || []) {
    if (!layer.visible || !layer.canvas) continue;
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode as GlobalCompositeOperation;
    ctx.drawImage(layer.canvas, 0, 0);
    ctx.restore();
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Frame encoding failed.'))), 'image/jpeg', 0.92);
    } catch {
      reject(new Error('This reference video’s host does not allow it to be exported.'));
    }
  });
}

/** Pass 1: composite every frame (reference + drawing) to a JPEG. */
export async function renderFramesWithReference(
  frames: Frame[],
  canvasSize: CanvasSize,
  fps: number,
  reference: ReferenceExportOptions,
  onProgress: (fraction: number) => void,
): Promise<Blob[]> {
  const video = await loadReference(reference.videoUrl);
  const canvas = createLayerCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext('2d')!;
  const out: Blob[] = [];
  try {
    for (let i = 0; i < frames.length; i++) {
      await seek(video, i / Math.max(1, fps));
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = Math.max(0, Math.min(1, reference.opacity));
      drawCover(ctx, video, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      drawLayers(ctx, frames[i]);
      out.push(await toJpeg(canvas));
      onProgress((i + 1) / frames.length);
    }
  } finally {
    video.removeAttribute('src');
    video.load();
  }
  return out;
}

/**
 * Pass 2: play pre-rendered frames into a canvas on an exact fps clock while
 * it is recorded. Decodes a few frames ahead so each one is ready on time.
 */
export async function playFramesIntoCanvas(
  blobs: Blob[],
  canvas: HTMLCanvasElement,
  fps: number,
  onProgress: (fraction: number) => void,
): Promise<void> {
  const ctx = canvas.getContext('2d')!;
  const frameMs = 1000 / Math.max(1, fps);
  const LOOKAHEAD = 4;
  const decoded: Promise<ImageBitmap>[] = [];
  const decode = (i: number) => {
    if (i < blobs.length && !decoded[i]) decoded[i] = createImageBitmap(blobs[i]);
  };
  for (let i = 0; i < LOOKAHEAD; i++) decode(i);

  const start = performance.now();
  for (let i = 0; i < blobs.length; i++) {
    decode(i + LOOKAHEAD);
    const bitmap = await decoded[i];
    const due = start + i * frameMs;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    onProgress((i + 1) / blobs.length);
  }
  // Hold the last frame for its full duration before the recorder stops.
  await new Promise((r) => setTimeout(r, frameMs));
}
