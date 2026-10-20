import type { ClipSourcePlatform } from './types';
import { getEntitlements, type EntitlementProfile } from './plans';

export function normalizeHttpUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) video URLs are supported.');
  url.hash = '';
  return url.toString();
}

export function detectClipPlatform(value: string): ClipSourcePlatform {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'youtube';
    if (host.endsWith('vimeo.com')) return 'vimeo';
    if (host === 'x.com' || host.endsWith('twitter.com')) return 'x';
    if (host.endsWith('tiktok.com')) return 'tiktok';
    if (host.endsWith('instagram.com')) return 'instagram';
    if (host.endsWith('pinterest.com') || host === 'pin.it') return 'pinterest';
    if (host.endsWith('artstation.com')) return 'artstation';
    if (host.endsWith('sakugabooru.com')) return 'sakugabooru';
    if (host.endsWith('sketchfab.com')) return 'sketchfab';
    if (host.endsWith('giphy.com')) return 'giphy';
    if (host.endsWith('unsplash.com')) return 'unsplash';
    if (host.endsWith('pexels.com')) return 'pexels';
    if (host.endsWith('archive.org')) return 'archive';
    return 'web';
  } catch {
    return 'web';
  }
}

export function slugifyReference(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'untitled';
}

export function isProProfile(profile: EntitlementProfile | null | undefined): boolean {
  return getEntitlements(profile).isPro;
}

export function secondsLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  const minutes = Math.floor(total / 60);
  const remainder = (total % 60).toFixed(total % 1 ? 1 : 0).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? match[1] : null;
}

export function getInstagramId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+))/i);
  return match ? match[1] : null;
}

export function getVimeoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?([0-9]+))/i);
  return match ? match[1] : null;
}

export function isDirectPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.toLowerCase();
  if (clean.includes('reflix.dev')) return false;

  // Direct video file extensions & HLS manifests from any CDN (Instagram CDN, Sakugabooru, Pinterest, Archive.org, Firebase, Bunny, etc.)
  if (
    clean.includes('.mp4') ||
    clean.includes('.webm') ||
    clean.includes('.mov') ||
    clean.includes('.m4v') ||
    clean.includes('playlist.m3u8') ||
    clean.includes('.m3u8') ||
    clean.startsWith('blob:')
  ) {
    return true;
  }

  // Webpage post URLs that aren't raw video files
  if (
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('vimeo.com') ||
    clean.includes('instagram.com/p/') ||
    clean.includes('instagram.com/reel/') ||
    clean.includes('tiktok.com/@')
  ) {
    return false;
  }

  if (
    clean.includes('b-cdn.net') ||
    clean.includes('firebasestorage.googleapis.com') ||
    clean.includes('storage.googleapis.com') ||
    clean.includes('cloudinary.com')
  ) {
    return true;
  }
  return false;
}

