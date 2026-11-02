import { describe, expect, it } from 'vitest';
import { discoverySources, discoveryQuery, mergeReferenceVideos } from '@/lib/reference-feed';
import { filterReferenceCatalog } from '@/lib/reference-filters';
import type { Video } from '@/lib/types';

const model = { id: 'sf_model', title: 'Dragon', mediaType: 'model3d', source: 'sketchfab', tags: ['dragon'], videoUrl: '' } as Video;
const art = { id: 'as_art', title: 'Character turnaround', source: 'artstation', tags: ['turnaround', 'character-design', 'visdev'], videoUrl: '' } as Video;
const pin = { id: 'pin_pin', title: 'Pose sheet', source: 'pinterest', tags: ['character-design'], videoUrl: '' } as Video;

describe('reference feed filtering', () => {
  it('selects providers for the active tab and builds query-aware browse seeds', () => {
    expect(discoverySources('visdev')).toEqual(['artstation']);
    expect(discoverySources('3d-models')).toContain('sketchfab');
    expect(discoverySources('character-design')).toContain('pinterest');
    expect(discoverySources('community')).toEqual([]);
    expect(discoveryQuery('', 'visdev', 'all')).toBe('visual development');
    expect(discoveryQuery('dragon', 'visdev', 'all')).toBe('dragon');
    expect(discoveryQuery('', 'visdev', 'combat')).toBe('combat action');
  });

  it('applies tabs to external and local results together without mistaking 2D turnarounds for 3D models', () => {
    const filters = { tab: '3d-models' as const, type: 'all' as const, pill: 'all' as const, query: '', scores: new Map<string, number>() };
    expect(filterReferenceCatalog([model, art, pin], filters)).toEqual([model]);
    expect(filterReferenceCatalog([model, art, pin], { ...filters, tab: 'visdev' })).toEqual([art]);
    expect(filterReferenceCatalog([model, art, pin], { ...filters, tab: 'character-design' })).toEqual([art, pin]);
    expect(filterReferenceCatalog([model], { ...filters, type: '3D' })).toEqual([model]);
  });

  it('appends new references without duplicating or moving existing cards', () => {
    expect(mergeReferenceVideos([art, model], [model, pin]).map(video => video.id)).toEqual(['as_art', 'sf_model', 'pin_pin']);
  });

  it('recognizes an already imported provider reference under a different ID', () => {
    const local = { ...art, originalUrl: 'https://www.artstation.com/artwork/project/?utm_source=feed' };
    const remote = { ...art, id: 'remote', sourceUrl: 'https://artstation.com/artwork/project' };
    expect(mergeReferenceVideos([local], [remote])).toEqual([local]);
  });

  it('makes the media filter select real images, videos and interactive models', () => {
    const video = { ...art, id: 'video', mediaType: 'video' as const, videoUrl: 'https://cdn.test/video.mp4' };
    const filters = { tab: 'featured' as const, type: 'all' as const, pill: 'all' as const, query: '', scores: new Map<string, number>() };
    expect(filterReferenceCatalog([model, art, video], { ...filters, media: 'image' })).toEqual([art]);
    expect(filterReferenceCatalog([model, art, video], { ...filters, media: 'video' })).toEqual([video]);
    expect(filterReferenceCatalog([model, art, video], { ...filters, media: 'model3d' })).toEqual([model]);
    expect(discoverySources('featured', 'all', 'image')).not.toContain('sketchfab');
  });
});
