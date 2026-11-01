import type { Video } from './types';
import { parseSearchIntent, scoreVideoRelevance } from './search-intent';

export function scoreReferences(videos: Video[], query: string): Array<[string, number]> {
  const intent = parseSearchIntent(query);
  return videos.flatMap(video => {
    const score = scoreVideoRelevance(video, intent);
    return score > 0 ? [[video.id, score] as [string, number]] : [];
  });
}
