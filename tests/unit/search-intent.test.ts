import { describe, expect, it } from 'vitest';
import { classifyText, generateRichTags, parseSearchIntent, scoreVideoRelevance } from '@/lib/search-intent';
import type { Video } from '@/lib/types';

function ref(id: string, title: string, extra: Partial<Video> & Record<string, unknown> = {}): Video {
  return { id, title, tags: [], description: '', ...extra } as Video;
}

const LIBRARY: Video[] = [
  ref('sb1', 'Opening Sequence Storyboard', { tags: ['story'] }),
  ref('sb2', 'Shot 14 panels', { tags: ['storyboards', 'film'] }),
  ref('ta1', 'Knight Character Turnaround'),
  ref('ta2', 'Robot model sheet front side back'),
  ref('ta3', 'Female hero turn-around', { tags: ['character'] }),
  ref('w1', 'Heavy walk cycle', { tags: ['walking'] }),
  ref('r1', 'Sprint loop', { tags: ['running'] }),
  ref('f1', 'Sword duel choreography', { tags: ['fighting'] }),
  ref('3d1', 'Stylized knight', { source: 'sketchfab', mediaType: 'model3d', tags: ['3d-model', 'sketchfab'] } as any),
  ref('3d2', 'Rigged fox', { source: 'sketchfab', mediaType: 'model3d', tags: ['3d-model', 'rigged'] } as any),
  ref('vd1', 'Forest environment concept art', { source: 'artstation', tags: ['artstation', 'visdev'] } as any),
  ref('pin1', 'Cute character design ideas', { source: 'pinterest', tags: ['pinterest', 'character-design'] } as any),
  ref('saku1', 'Naruto — #1234', { tags: ['sakugabooru', '2d', 'smears', 'effects'] }),
  ref('desc1', 'Random acting clip', { description: 'He runs out the door after the dialogue' }),
];

function search(q: string): string[] {
  const intent = parseSearchIntent(q);
  return LIBRARY.map((v) => ({ id: v.id, s: scoreVideoRelevance(v, intent) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.id);
}

describe('search intent — strict concept matching', () => {
  it('storyboard returns only storyboards', () => {
    expect(search('storyboard').sort()).toEqual(['sb1', 'sb2']);
    expect(search('storyboards reference').sort()).toEqual(['sb1', 'sb2']);
    expect(search('story board').sort()).toEqual(['sb1', 'sb2']);
  });

  it('character turnaround returns only turnarounds (no random 3D models or pins)', () => {
    expect(search('character turnaround').sort()).toEqual(['ta1', 'ta2', 'ta3']);
    expect(search('turn around').sort()).toEqual(['ta1', 'ta2', 'ta3']);
    expect(search('model sheet').sort()).toEqual(['ta1', 'ta2', 'ta3']);
  });

  it('extra words rank but do not exclude when a concept is present', () => {
    expect(search('female character turnaround')[0]).toBe('ta3');
    expect(search('knight turnaround')[0]).toBe('ta1');
  });

  it('walk and run are separate concepts', () => {
    expect(search('walk cycle')).toEqual(['w1']);
    expect(search('run cycle')).toEqual(['r1']);
  });

  it('description mentions of common verbs do not leak in', () => {
    expect(search('run')).not.toContain('desc1');
  });

  it('3d model searches use structural evidence', () => {
    expect(search('3d model').sort()).toEqual(['3d1', '3d2']);
    expect(search('rig')).toEqual(['3d2']);
  });

  it('combining concepts requires both', () => {
    expect(search('3d turnaround')).toEqual([]);
    expect(search('combat')).toEqual(['f1']);
  });

  it('broad concepts gate when alone', () => {
    expect(search('character design')).toEqual(['pin1']);
    expect(search('visdev')).toEqual(['vd1']);
  });

  it('smears map to sakuga tags', () => {
    expect(search('smear frames')).toEqual(['saku1']);
  });

  it('free text requires every meaningful word', () => {
    expect(search('forest environment')).toEqual(['vd1']);
    expect(search('knight')).toEqual(expect.arrayContaining(['ta1', '3d1']));
    expect(search('zebra unicorn')).toEqual([]);
  });

  it('classifyText produces clean concept tags', () => {
    expect(classifyText('Opening storyboard panels')).toContain('storyboard');
    expect(classifyText('Knight Character Turnaround')).toContain('turnaround');
    expect(classifyText('Knight Character Turnaround')).not.toContain('storyboard');
  });

  it('recognizes animation franchises and studios dynamically', () => {
    expect(classifyText('Optimus Prime transform clip')).toContain('ip-transformers');
    expect(classifyText('Woody and Buzz Lightyear character study')).toContain('ip-toystory');
    expect(classifyText('Pixar stylized character walk')).toContain('studio-pixar');
    expect(classifyText('Spider-Verse web-slinging dive')).toContain('studio-sony');
    expect(classifyText('Spider-Man swing')).toContain('ip-spider-man');
    expect(classifyText('Heavy ball bounce squash and stretch')).toContain('principle-squash-stretch');
  });

  it('generateRichTags produces clean taxonomy tags for artists', () => {
    const tags = generateRichTags({
      title: 'Optimus Prime Transformation Model Sheet',
      tags: ['robot', 'mecha'],
      description: 'Studio breakdown of transformation mechanics',
    });
    expect(tags).toContain('ip-transformers');
    expect(tags).toContain('turnaround');
    expect(tags).toContain('robot');
  });
});
