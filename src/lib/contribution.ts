/**
 * Counts how many public references a user shared today (local time), which
 * earns free users extra daily library views (see contributionBonus in plans).
 */

interface SharedClipLike {
  isPrivate?: boolean;
  removedFromCreatorAt?: unknown;
  createdAt?: unknown;
}

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') { const t = Date.parse(value); return Number.isNaN(t) ? null : t; }
  const v = value as { toMillis?: () => number; seconds?: number };
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  return null;
}

export function countPublicSharesToday(clips: SharedClipLike[], now: Date = new Date()): number {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return clips.filter((clip) => {
    if (clip.isPrivate || clip.removedFromCreatorAt) return false;
    const created = toMillis(clip.createdAt);
    return created !== null && created >= start;
  }).length;
}
