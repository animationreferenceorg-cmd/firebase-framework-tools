import { describe, expect, it } from 'vitest';
import { referenceSourceCandidates } from '@/lib/paint/reference-export';

describe('referenceSourceCandidates', () => {
  it('tries Bunny MP4 renditions for an HLS playlist, most common first', () => {
    expect(referenceSourceCandidates('https://vz-1.b-cdn.net/g/playlist.m3u8')).toEqual([
      'https://vz-1.b-cdn.net/g/play_720p.mp4',
      'https://vz-1.b-cdn.net/g/play_480p.mp4',
      'https://vz-1.b-cdn.net/g/play_360p.mp4',
      'https://vz-1.b-cdn.net/g/play_240p.mp4',
      'https://vz-1.b-cdn.net/g/play_1080p.mp4',
    ]);
  });

  it('uses direct files as-is', () => {
    expect(referenceSourceCandidates('https://storage.googleapis.com/b/videos/a.mp4')).toEqual(['https://storage.googleapis.com/b/videos/a.mp4']);
  });
});
