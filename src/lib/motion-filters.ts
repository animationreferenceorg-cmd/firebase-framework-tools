import type { Video } from '@/lib/types';

/**
 * Motion categories used across the home page — the quick-filter pills, the
 * "Browse by motion" tiles and the genre shelves. One definition, so a clip
 * counted under "Combat" on a tile is the same clip the Combat filter shows.
 */
export type MotionCategory = 'locomotion' | 'combat' | 'acting' | 'creature' | 'mechanics' | 'vfx';

export const MOTION_KEYWORDS: Record<MotionCategory, string[]> = {
  locomotion: ['locomotion', 'walk', 'run', 'jump', 'parkour', 'sprint', 'crawl', 'stagger'],
  combat: ['combat', 'fight', 'sword', 'punch', 'kick', 'action', 'martial', 'attack'],
  acting: ['acting', 'facial', 'lip sync', 'dialogue', 'expression', 'gesture', 'emotion'],
  creature: ['creature', 'animal', 'quadruped', 'monster', 'dragon', 'dog', 'bird', 'horse'],
  mechanics: ['mechanic', 'body mechanic', 'weight', 'physics', 'push', 'pull', 'lift', 'fall'],
  vfx: ['vfx', 'fx', 'fire', 'water', 'smoke', 'explosion', 'magic', 'energy'],
};

export const MOTION_CATEGORIES: { id: MotionCategory; label: string; blurb: string }[] = [
  { id: 'combat', label: 'Combat', blurb: 'Swings, hits and recoveries' },
  { id: 'locomotion', label: 'Locomotion', blurb: 'Walks, runs and jumps' },
  { id: 'acting', label: 'Acting', blurb: 'Faces, gestures, dialogue' },
  { id: 'mechanics', label: 'Body mechanics', blurb: 'Weight, push, pull, fall' },
  { id: 'creature', label: 'Creature', blurb: 'Quadrupeds and beasts' },
  { id: 'vfx', label: 'VFX', blurb: 'Fire, smoke, energy' },
];

export function matchesMotion(video: Video, category: MotionCategory): boolean {
  const keywords = MOTION_KEYWORDS[category];
  const tags = (video.tags || []).map((t) => t.toLowerCase());
  const cats = (video.categoryIds || []).concat(video.categories || []).map((c) => c.toLowerCase());
  const text = `${video.title} ${video.description || ''}`.toLowerCase();
  return keywords.some((kw) => tags.some((t) => t.includes(kw)) || cats.some((c) => c.includes(kw)) || text.includes(kw));
}

/** A direct file a <video> element can play — not an embed or social page. */
export function isDirectVideo(url?: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return !u.startsWith('<iframe') && (u.includes('.mp4') || u.includes('.webm'));
}

/** Seconds-precise preview URL: seeking a hair in makes browsers paint a frame. */
export function previewSrc(url?: string): string | undefined {
  if (!url) return undefined;
  let out = url.includes('playlist.m3u8') ? url.replace('playlist.m3u8', 'play_480p.mp4') : url;
  if (out.includes('.mp4') && !out.includes('#t=')) out = `${out}#t=0.1`;
  return out;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
