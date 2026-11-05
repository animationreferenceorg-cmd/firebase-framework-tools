import { describe, expect, it } from 'vitest';
import {
  animationVideoQueries,
  scoreAnimationTitle,
  isRejectedAnimationTitle,
  parseBingVideoResults,
} from '@/lib/reference-animation-videos';

describe('reference animation videos discovery', () => {
  it('rewrites queries toward animation craft references', () => {
    expect(animationVideoQueries('cat', 'animations')).toEqual([
      'cat animation reference',
      'cat animation',
    ]);
    expect(animationVideoQueries('walk cycle', 'animations')).toEqual([
      'walk cycle',
      'walk cycle reference',
    ]);
  });

  it('filters out AI-generated content, nursery songs, and off-topic media', () => {
    expect(isRejectedAnimationTitle('Realistic Cat AI Generated Animation Sora')).toBe(true);
    expect(isRejectedAnimationTitle('Baby Shark Nursery Rhymes for Kids')).toBe(true);
    expect(isRejectedAnimationTitle('Full Album Gameplay Walkthrough 2026')).toBe(true);
    expect(isRejectedAnimationTitle('Cat Walk Cycle Animation Reference 24fps')).toBe(false);
    expect(isRejectedAnimationTitle('Spider-Verse Body Mechanics Breakdown Maya')).toBe(false);
  });

  it('rewards high-value craft animation signals in scoring', () => {
    const cycleScore = scoreAnimationTitle('Cat Run Cycle Reference 24fps');
    const genericScore = scoreAnimationTitle('Just a video');
    expect(cycleScore).toBeGreaterThan(genericScore);
    expect(scoreAnimationTitle('Maya 3D Character Body Mechanics Breakdown Tutorial')).toBeGreaterThan(40);
  });

  it('parses bing video html and extracts valid metadata', () => {
    const html = `
      <div vrhm="{&quot;murl&quot;:&quot;https://www.youtube.com/watch?v=dQw4w9WgXcQ&quot;,&quot;vt&quot;:&quot;Quadruped Walk Cycle Reference&quot;,&quot;du&quot;:&quot;1:24&quot;,&quot;capt&quot;:{&quot;crtnamemore&quot;:&quot;More Animator Channel&quot;}}"></div>
    `;
    const results = parseBingVideoResults(html);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Quadruped Walk Cycle Reference');
    expect(results[0].duration).toBe('1:24');
    expect(results[0].channel).toBe('Animator Channel');
  });
});

