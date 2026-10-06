import { describe, expect, it } from 'vitest';
import { filterAvailableVideos, isVideoSourceAvailable } from '@/lib/video-availability';

describe('video availability', () => {
  it('treats videos on offline hosts as unavailable', () => {
    expect(isVideoSourceAvailable('https://assets.reflix.dev/previews/L3TR52T22TPVR.mp4')).toBe(false);
    expect(isVideoSourceAvailable('https://ASSETS.REFLIX.DEV/previews/x.mp4')).toBe(false);
  });

  it('keeps working hosts, embeds and empty URLs', () => {
    expect(isVideoSourceAvailable('https://storage.googleapis.com/b/videos/a.mp4')).toBe(true);
    expect(isVideoSourceAvailable('https://vz-1.b-cdn.net/g/playlist.m3u8')).toBe(true);
    expect(isVideoSourceAvailable('<iframe src="https://player.vimeo.com/x"></iframe>')).toBe(true);
    expect(isVideoSourceAvailable(undefined)).toBe(true);
  });

  it('does not match look-alike hosts', () => {
    expect(isVideoSourceAvailable('https://assets.reflix.dev.example.com/a.mp4')).toBe(true);
  });

  it('filters lists', () => {
    const list = [{ videoUrl: 'https://assets.reflix.dev/a.mp4' }, { videoUrl: 'https://storage.googleapis.com/a.mp4' }];
    expect(filterAvailableVideos(list)).toEqual([{ videoUrl: 'https://storage.googleapis.com/a.mp4' }]);
  });
});
