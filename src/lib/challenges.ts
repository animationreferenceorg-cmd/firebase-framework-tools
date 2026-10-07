/**
 * Monthly reference challenges. Each month has one theme: animators film or
 * make reference for it and upload it publicly; the community votes by saving
 * entries to their boards. Entries are reference_clips with `challengeId`.
 *
 * Prizes go to reference people made themselves (filmed, animated, mocap
 * they own), never to clips cut from films, games or shows.
 *
 * To add a month, append an entry. `month` is "YYYY-MM" (UTC).
 */

export interface Challenge {
  slug: string;
  month: string;
  title: string;
  tagline: string;
  brief: string;
  ideas: string[];
}

export const CHALLENGES: Challenge[] = [
  {
    slug: 'heavy-lifts-2026-10',
    month: '2026-10',
    title: 'Heavy Lifts',
    tagline: 'Sell the weight before the object moves.',
    brief: 'Film yourself (or a friend) lifting, dragging or carrying something genuinely heavy. We want the anticipation, the strain, the weight shift and the recovery.',
    ideas: ['Lifting a full box from the floor to a shelf', 'Dragging a heavy bag across the room', 'Two people carrying a table', 'A failed lift and a second attempt'],
  },
  {
    slug: 'sword-draws-2026-11',
    month: '2026-11',
    title: 'Sword Draws',
    tagline: 'From sheathed to ready in one clean motion.',
    brief: 'Film a draw, a ready stance and a sheathe with a prop sword, a stick or a broom. Show the hips leading and the overlap in the follow-through.',
    ideas: ['Quick draw into a guard', 'A slow, threatening draw', 'Two-handed draw from the back', 'Sheathe with a flourish'],
  },
  {
    slug: 'nervous-waiting-2026-12',
    month: '2026-12',
    title: 'Nervous Waiting',
    tagline: 'Acting with nothing to do but wait.',
    brief: 'Film a character waiting for news, a date or an interview. Small fidgets, glances and settles are the whole performance.',
    ideas: ['Waiting for a phone call', 'Sitting outside an office', 'Checking the time again and again', 'Rehearsing what to say'],
  },
  {
    slug: 'animal-runs-2027-01',
    month: '2027-01',
    title: 'Animal Runs',
    tagline: 'Four legs, real timing.',
    brief: 'Film your own pets or animals you can safely record running, trotting or pouncing. Side-on footage at a steady camera is gold.',
    ideas: ['A dog sprinting side-on', 'A cat pouncing on a toy', 'A horse trotting', 'Birds taking off'],
  },
];

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getChallenge(slug: string | null | undefined): Challenge | null {
  if (!slug) return null;
  return CHALLENGES.find((c) => c.slug === slug) ?? null;
}

export function challengeStatus(challenge: Challenge, now: Date = new Date()): 'upcoming' | 'active' | 'ended' {
  const current = monthKey(now);
  if (challenge.month === current) return 'active';
  return challenge.month > current ? 'upcoming' : 'ended';
}

export function getActiveChallenge(now: Date = new Date()): Challenge | null {
  return CHALLENGES.find((c) => challengeStatus(c, now) === 'active') ?? null;
}

/** Days left in the challenge month (UTC), at least 0. */
export function daysLeft(challenge: Challenge, now: Date = new Date()): number {
  const [year, month] = challenge.month.split('-').map(Number);
  const end = Date.UTC(year, month, 1);
  return Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000));
}

/** Ranks entries by votes (saves), newest first on ties. */
export function rankEntries<T extends { saveCount?: number; createdAt?: unknown }>(entries: T[]): T[] {
  const ms = (v: unknown) => {
    const x = v as { toMillis?: () => number; seconds?: number } | number | undefined;
    if (typeof x === 'number') return x;
    if (x && typeof x.toMillis === 'function') return x.toMillis();
    if (x && typeof x.seconds === 'number') return x.seconds * 1000;
    return 0;
  };
  return [...entries].sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0) || ms(b.createdAt) - ms(a.createdAt));
}
