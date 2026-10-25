import type { Video } from './types';

// While non-anime references remain, anime may fill only every Nth slot.
const ANIME_EVERY_NTH = 3;

// Sakugabooru imports are ~93% of the catalog and are all anime, so they are
// the signal used to keep browse surfaces from being swamped by them.
export function isAnimeReference(video: Video): boolean {
  return /sakugabooru\.com/i.test(`${video.videoUrl || ''} ${video.originalUrl || ''}`);
}

export function isSpecialReference(video: Video): boolean {
  const is3D = video.source === 'sketchfab' || (video as any).mediaType === 'model3d' || video.id.startsWith('sf_');
  const isVisDev = video.source === 'artstation' || video.id.startsWith('as_');
  const isChar = video.source === 'pinterest' || video.id.startsWith('pin_');
  return is3D || isVisDev || isChar;
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
 * Randomizes references and evenly interleaves 3D models, VisDev, character design,
 * and live reference with anime cuts so the entire stream is balanced and diverse.
 */
export function mixReferences(videos: Video[]): Video[] {
  const special = shuffle(videos.filter(isSpecialReference));
  const anime = shuffle(videos.filter((v) => !isSpecialReference(v) && isAnimeReference(v)));
  const regular = shuffle(videos.filter((v) => !isSpecialReference(v) && !isAnimeReference(v)));

  const mixed: Video[] = [];
  let s = 0;
  let a = 0;
  let r = 0;

  // Pattern: every 4th item insert a special 3D/VisDev/Design card; interleave regular and anime
  while (s < special.length || a < anime.length || r < regular.length) {
    const specialTurn = (mixed.length + 1) % 4 === 0 && s < special.length;
    if (specialTurn) {
      mixed.push(special[s++]);
      continue;
    }

    const animeTurn = (mixed.length + 1) % ANIME_EVERY_NTH === 0 && a < anime.length;
    if (animeTurn) {
      mixed.push(anime[a++]);
      continue;
    }

    if (r < regular.length) {
      mixed.push(regular[r++]);
    } else if (a < anime.length) {
      mixed.push(anime[a++]);
    } else if (s < special.length) {
      mixed.push(special[s++]);
    }
  }

  return mixed;
}
