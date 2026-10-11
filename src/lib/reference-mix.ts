import type { Video } from './types';

// While non-anime references remain, anime may fill only every Nth slot.
const ANIME_EVERY_NTH = 3;

// Sakugabooru imports are ~93% of the catalog and are all anime, so they are
// the signal used to keep browse surfaces from being swamped by them.
export function isAnimeReference(video: Video): boolean {
  return /sakugabooru\.com/i.test(`${video.videoUrl || ''} ${video.originalUrl || ''}`);
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Randomizes references and interleaves anime with everything else so every
 * visit shows a fresh, balanced mix. Call it on the client only (e.g. after a
 * fetch in an effect) — a random order during render breaks hydration.
 */
export function mixReferences(videos: Video[]): Video[] {
  const anime = shuffle(videos.filter(isAnimeReference));
  const other = shuffle(videos.filter((v) => !isAnimeReference(v)));
  const mixed: Video[] = [];
  let a = 0;
  let o = 0;
  while (a < anime.length || o < other.length) {
    const animeTurn = (mixed.length + 1) % ANIME_EVERY_NTH === 0;
    if (o >= other.length || (animeTurn && a < anime.length)) {
      mixed.push(anime[a++]);
    } else {
      mixed.push(other[o++]);
    }
  }
  return mixed;
}
