import { describe, expect, it } from 'vitest';
import { scoreReferences } from '@/lib/reference-search';
import type { Video } from '@/lib/types';

describe('background reference search', () => {
  it('returns matching IDs and relevance without changing catalog order or duplicating entries', () => {
    const videos = [
      { id: 'walk', title: 'Walk cycle', tags: ['walk cycle'] },
      { id: 'combat', title: 'Sword combat', tags: ['combat'] },
    ] as Video[];
    const scores = scoreReferences(videos, 'walk cycle');
    expect(scores.map(([id]) => id)).toEqual(['walk']);
    expect(scores[0][1]).toBeGreaterThan(0);
    expect(videos.map(video => video.id)).toEqual(['walk', 'combat']);
  });
});
