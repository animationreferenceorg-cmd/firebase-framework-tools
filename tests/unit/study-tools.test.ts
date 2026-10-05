import { describe, expect, it } from 'vitest';
import { resolveLoop, shouldWrapLoop } from '@/lib/loop-range';
import { ghostTimes, onionSourceFor } from '@/components/player/OnionSkinOverlay';
import { nextViewMode } from '@/components/player/StudyToolsPanel';

const FPS = 24;
const F = 1 / FPS;

describe('resolveLoop', () => {
  it('is inactive with no points', () => {
    expect(resolveLoop(null, null, 10, FPS).active).toBe(false);
  });

  it('loops from the in point to the end when only an in point is set', () => {
    expect(resolveLoop(2, null, 10, FPS)).toEqual({ start: 2, end: 10, active: true });
  });

  it('loops from the start to the out point when only an out point is set', () => {
    expect(resolveLoop(null, 3, 10, FPS)).toEqual({ start: 0, end: 3, active: true });
  });

  it('needs at least one frame between in and out', () => {
    expect(resolveLoop(2, 2, 10, FPS).active).toBe(false);
    expect(resolveLoop(2, 2 + F, 10, FPS).active).toBe(true);
  });

  it('is inactive until the duration is known', () => {
    expect(resolveLoop(1, 2, 0, FPS).active).toBe(false);
  });
});

describe('shouldWrapLoop', () => {
  const range = resolveLoop(1, 2, 10, FPS);

  it('keeps playing inside the loop, including the out frame', () => {
    expect(shouldWrapLoop(1.5, range, 10, FPS)).toBe(false);
    expect(shouldWrapLoop(2 + F / 2, range, 10, FPS)).toBe(false);
  });

  it('wraps once playback passes the out frame', () => {
    expect(shouldWrapLoop(2 + F, range, 10, FPS)).toBe(true);
  });

  it('wraps when playback is before the in point', () => {
    expect(shouldWrapLoop(0.5, range, 10, FPS)).toBe(true);
  });

  it('leaves a loop ending on the last frame to the ended event', () => {
    const toEnd = resolveLoop(8, null, 10, FPS);
    expect(shouldWrapLoop(9.999, toEnd, 10, FPS)).toBe(false);
  });

  it('never wraps when the loop is inactive', () => {
    expect(shouldWrapLoop(5, resolveLoop(null, null, 10, FPS), 10, FPS)).toBe(false);
  });
});

describe('ghostTimes', () => {
  it('returns past and future ghosts, farthest first', () => {
    const ghosts = ghostTimes(1, 10, FPS, { frames: 2, step: 1 });
    expect(ghosts.map((g) => g.offset)).toEqual([-2, 2, -1, 1]);
    expect(ghosts[0].time).toBeCloseTo(1 - 2 * F);
  });

  it('spaces ghosts by the step when on twos', () => {
    const ghosts = ghostTimes(1, 10, FPS, { frames: 1, step: 2 });
    expect(ghosts.map((g) => g.offset)).toEqual([-2, 2]);
  });

  it('drops ghosts before the first frame or after the last', () => {
    expect(ghostTimes(0, 10, FPS, { frames: 2, step: 1 }).every((g) => g.offset > 0)).toBe(true);
    expect(ghostTimes(10, 10, FPS, { frames: 2, step: 1 }).every((g) => g.offset < 0)).toBe(true);
  });
});

describe('onionSourceFor', () => {
  it('uses the MP4 rendition for Bunny HLS playlists', () => {
    expect(onionSourceFor('https://x.b-cdn.net/abc/playlist.m3u8')).toBe('https://x.b-cdn.net/abc/play_720p.mp4');
  });

  it('leaves direct files alone', () => {
    expect(onionSourceFor('https://cdn.example.com/a.mp4')).toBe('https://cdn.example.com/a.mp4');
  });
});

describe('nextViewMode', () => {
  it('cycles through every mode and back to normal', () => {
    expect(nextViewMode('normal')).toBe('contrast');
    expect(nextViewMode('contrast')).toBe('silhouette');
    expect(nextViewMode('silhouette')).toBe('inverted');
    expect(nextViewMode('inverted')).toBe('normal');
  });
});
