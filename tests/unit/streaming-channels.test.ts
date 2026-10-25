import { describe, it, expect } from 'vitest';
import { STREAMING_SHELVES, calculateChannelCounts } from '@/lib/streaming-channels';

describe('Streaming Channels Catalog', () => {
  it('contains well-structured shelves with non-empty channels', () => {
    expect(STREAMING_SHELVES.length).toBeGreaterThanOrEqual(6);
    for (const shelf of STREAMING_SHELVES) {
      expect(shelf.id).toBeTruthy();
      expect(shelf.genre).toBeTruthy();
      expect(shelf.title).toBeTruthy();
      expect(shelf.tagline).toBeTruthy();
      expect(shelf.channels.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('ensures every channel has a unique ID and unique cover art', () => {
    const seenIds = new Set<string>();
    const seenCovers = new Set<string>();

    for (const shelf of STREAMING_SHELVES) {
      for (const channel of shelf.channels) {
        // Unique channel ID
        expect(seenIds.has(channel.id)).toBe(false);
        seenIds.add(channel.id);

        // Unique cover art image (no duplicates)
        expect(seenCovers.has(channel.coverArt)).toBe(false);
        seenCovers.add(channel.coverArt);

        // Valid URLs and metadata
        expect(channel.href.startsWith('/')).toBe(true);
        expect(channel.coverArt.startsWith('http')).toBe(true);
        expect(channel.badge.length).toBeGreaterThan(0);
        expect(channel.keywords.length).toBeGreaterThan(0);
      }
    }
  });

  it('calculates counts correctly against sample videos', () => {
    const mockVideos = [
      {
        id: 'v1',
        title: 'Ninja Sword Fight Duel',
        tags: ['sword', 'combat', 'katana'],
        categoryIds: ['m0CyxY6mfwH1NA4cODUE'],
      },
      {
        id: 'v2',
        title: 'Female Walk Cycle 24fps',
        tags: ['walk', 'walk cycle', 'mechanics'],
        categoryIds: ['0r59cXoM1zJD0JE73hlY'],
      },
      {
        id: 'v3',
        title: 'Tiger Prowl Quadruped Animal',
        tags: ['animals', 'quadruped', 'creature animation'],
        categoryIds: ['AdnmZ4NrkTfuRcDbh2zV'],
      },
    ] as any[];

    const counts = calculateChannelCounts(mockVideos);
    expect(counts['walk-cycles']).toBeGreaterThanOrEqual(1);
    expect(counts['swordplay-and-weapons']).toBeGreaterThanOrEqual(1);
    expect(counts['quadruped-walks']).toBeGreaterThanOrEqual(1);
  });
});
