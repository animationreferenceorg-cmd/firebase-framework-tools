import { describe, expect, it } from 'vitest';
import { isDirectPlayableVideoUrl, getInstagramId } from '@/lib/reference-utils';

describe('social creator attribution and direct playback', () => {
  it('correctly identifies Instagram post IDs from reels and posts', () => {
    expect(getInstagramId('https://www.instagram.com/reel/C-xyz123/?utm_source=ig_web_copy_link')).toBe('C-xyz123');
    expect(getInstagramId('https://instagram.com/p/D_abc999/')).toBe('D_abc999');
    expect(getInstagramId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  it('recognizes direct CDN streams as playable and rejects raw Instagram webpage URLs', () => {
    // Raw Instagram post links cannot be played directly by HTML5 <video>
    expect(isDirectPlayableVideoUrl('https://www.instagram.com/reel/C-xyz123/')).toBe(false);
    expect(isDirectPlayableVideoUrl('https://instagram.com/p/D_abc999/')).toBe(false);

    // Once pulled into Bunny CDN or Firebase Storage or Instagram CDN mp4, it is directly playable
    expect(isDirectPlayableVideoUrl('https://vz-79893c7f-720.b-cdn.net/guid-1234/playlist.m3u8')).toBe(true);
    expect(isDirectPlayableVideoUrl('https://firebasestorage.googleapis.com/v0/b/app/o/video.mp4?alt=media')).toBe(true);
    expect(isDirectPlayableVideoUrl('https://scontent.cdninstagram.com/v/t50.2886-16/123_n.mp4?_nc_ht=scontent')).toBe(true);
  });
});
