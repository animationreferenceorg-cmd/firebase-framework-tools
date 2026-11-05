import { describe, it, expect } from 'vitest';
import { isBlockedReference, filterBlockedReferences } from '@/lib/blocked-references';

describe('Blocked references filtering', () => {
  it('blocks the Wikimedia file requested by the user', () => {
    expect(isBlockedReference({
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jason_Woodhead_and_Philip_Currie.jpg',
    })).toBe(true);

    expect(isBlockedReference({
      originalUrl: 'https://commons.wikimedia.org/wiki/File:Jason_Woodhead_and_Philip_Currie.jpg',
    })).toBe(true);

    expect(isBlockedReference({
      mediaUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Jason_Woodhead_and_Philip_Currie.jpg',
    })).toBe(true);

    expect(isBlockedReference({
      id: 'wiki_36920784',
      title: 'Jason Woodhead and Philip Currie',
    })).toBe(true);
  });

  it('filters out blocked items from an array of references', () => {
    const list = [
      { id: '1', title: 'Dog Walk Cycle', sourceUrl: 'https://example.com/dog.mp4' },
      { id: 'wiki_36920784', title: 'Jason Woodhead and Philip Currie', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jason_Woodhead_and_Philip_Currie.jpg' },
      { id: '2', title: 'Cat Run Cycle', sourceUrl: 'https://example.com/cat.mp4' },
    ];

    const filtered = filterBlockedReferences(list);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(x => x.id)).toEqual(['1', '2']);
  });

  it('allows normal animation references through', () => {
    expect(isBlockedReference({
      id: 'wiki_132050025',
      title: 'Animal Locomotion I, Plate 27',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Animal_Locomotion_I,_Plate_27.gif',
    })).toBe(false);

    expect(isBlockedReference({
      id: 'as_12345',
      title: 'Dragon Turnaround',
      sourceUrl: 'https://www.artstation.com/artwork/dragon',
    })).toBe(false);
  });
});

