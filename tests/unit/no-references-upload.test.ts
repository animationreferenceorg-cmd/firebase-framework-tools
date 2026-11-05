import { describe, expect, it } from 'vitest';
import { discoverySources } from '@/lib/reference-feed';

describe('Video embeds removal and clean animation discovery', () => {
  it('excludes low-quality YouTube and Vimeo scrapers from animation discovery sources', () => {
    const animationSources = discoverySources('animations');
    expect(animationSources).not.toContain('youtube');
    expect(animationSources).not.toContain('vimeo');
    expect(animationSources).toContain('sakugabooru');
    expect(animationSources).toContain('wikimedia');
  });

  it('excludes YouTube and Vimeo from dedicated video media filter', () => {
    const videoSources = discoverySources('featured', 'all', 'video');
    expect(videoSources).not.toContain('youtube');
    expect(videoSources).not.toContain('vimeo');
    expect(videoSources).toContain('sakugabooru');
    expect(videoSources).toContain('wikimedia');
  });
});

