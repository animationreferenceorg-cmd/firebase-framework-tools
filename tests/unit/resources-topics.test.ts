import { describe, it, expect } from 'vitest';
import { TOPICS, TOPIC_SLUGS } from '@/lib/resource-topics';

describe('Resource Landing Pages & Niche Topics', () => {
  it('defines all key niche animation topics', () => {
    const requiredSlugs = [
      'human-walk-cycle-animation-reference',
      'real-life-animation-reference',
      'walk-cycle-animation-reference',
      'character-turnaround-animation-reference',
      'storyboard-animation-reference',
      'transformers-mecha-animation-reference',
      'spider-man-acrobatic-animation-reference',
      'squash-and-stretch-animation-reference',
      'martial-arts-combat-animation-reference',
      'quadruped-animal-walk-cycle-reference',
      'dance-and-parkour-animation-reference',
    ];

    for (const slug of requiredSlugs) {
      expect(TOPIC_SLUGS).toContain(slug);
      const topic = TOPICS[slug];
      expect(topic).toBeDefined();
      expect(topic.title.length).toBeGreaterThan(10);
      expect(topic.description.length).toBeGreaterThan(20);
      expect(topic.intro.length).toBeGreaterThan(30);
      expect(topic.sections.length).toBeGreaterThanOrEqual(2);
      expect(topic.tags.length).toBeGreaterThanOrEqual(1);
      expect(topic.faqs.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('human walk cycle topic includes real reference and locomotion tags', () => {
    const topic = TOPICS['human-walk-cycle-animation-reference'];
    expect(topic.tags.map(t => t.slug)).toContain('walk');
    expect(topic.queryKeywords).toBeDefined();
    expect(topic.priorityVideoIds).toBeDefined();
    expect(topic.priorityVideoIds?.length).toBeGreaterThan(0);
  });

  it('character turnaround topic includes turntable keywords', () => {
    const topic = TOPICS['character-turnaround-animation-reference'];
    expect(topic.queryKeywords).toContain('turnaround');
    expect(topic.tags.map(t => t.slug)).toContain('turnaround');
  });

  it('transformers topic contains mecha search intent', () => {
    const topic = TOPICS['transformers-mecha-animation-reference'];
    expect(topic.queryKeywords).toContain('transformers');
    expect(topic.queryKeywords).toContain('mecha');
  });
});
