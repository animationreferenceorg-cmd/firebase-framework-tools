import type { ClipSourcePlatform } from './types';

export function normalizeHttpUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) video URLs are supported.');
  url.hash = '';
  return url.toString();
}

export function detectClipPlatform(value: string): ClipSourcePlatform {
  const host = new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be' || host.endsWith('youtube.com')) return 'youtube';
  if (host.endsWith('vimeo.com')) return 'vimeo';
  if (host === 'x.com' || host.endsWith('twitter.com')) return 'x';
  if (host.endsWith('tiktok.com')) return 'tiktok';
  if (host.endsWith('instagram.com')) return 'instagram';
  return 'web';
}

export function slugifyReference(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72) || 'untitled';
}

export function isProProfile(profile: { role?: string; tier?: string; isPremium?: boolean } | null | undefined): boolean {
  return profile?.role === 'admin' || (profile?.isPremium === true && profile?.tier === 'tier5');
}

export function secondsLabel(seconds: number): string {
  const total = Math.max(0, Math.round(seconds * 10) / 10);
  const minutes = Math.floor(total / 60);
  const remainder = (total % 60).toFixed(total % 1 ? 1 : 0).padStart(2, '0');
  return `${minutes}:${remainder}`;
}
