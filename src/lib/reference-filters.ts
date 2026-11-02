import type { Video } from './types';
import type { TabOption, TypeOption, PillOption, MediaOption } from '@/components/FilterBar';

export interface ReferenceFilters {
  tab: TabOption;
  type: TypeOption;
  pill: PillOption;
  query: string;
  scores: Map<string, number>;
  media?: MediaOption;
}

export function filterReferenceCatalog(videos: Video[], { tab, type, pill, query, scores, media = 'all' }: ReferenceFilters): Video[] {
    let result = videos.filter(v => pill === 'shorts' ? v.isShort : !v.isShort);
    if (media !== 'all') result = result.filter(video => {
      const model = video.mediaType === 'model3d' || video.source === 'sketchfab' || Boolean(video.embedUrl);
      if (media === 'model3d') return model;
      if (media === 'video') return Boolean(video.videoUrl) && !model && video.mediaType !== 'image' && video.mediaType !== 'gif';
      return !model && !video.videoUrl;
    });

    // Search Query with Animation Domain Intent & Relevance Scoring
    if (query.trim()) {
      result = result
        .map(v => ({ video: v, score: scores.get(v.id) || 0 }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.video);
    }

    // Helper to get numeric timestamp for sorting (newest first)
    const getVideoTimestamp = (v: Video): number => {
      if (typeof v.createdAt === 'number' && !isNaN(v.createdAt) && v.createdAt > 0) return v.createdAt;
      if (typeof (v as any).updatedAt === 'number' && (v as any).updatedAt > 0) return (v as any).updatedAt;
      if (typeof (v as any).uploadedAt === 'number' && (v as any).uploadedAt > 0) return (v as any).uploadedAt;
      if (typeof (v as any).importedAt === 'number' && (v as any).importedAt > 0) return (v as any).importedAt;
      if (typeof v.createdAt === 'string') {
        const p = Date.parse(v.createdAt);
        if (!isNaN(p)) return p;
      }
      if (v.createdAt?.toMillis && typeof v.createdAt.toMillis === 'function') {
        return v.createdAt.toMillis();
      }
      if (v.createdAt?.seconds) {
        return v.createdAt.seconds * 1000;
      }
      return 0;
    };

    // 2D / 3D
    if (type !== 'all') {
      const typeLower = type.toLowerCase();
      result = result.filter(v => {
        const isModel = v.mediaType === 'model3d' || v.source === 'sketchfab' || v.id.startsWith('sf_');
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const cats = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
        if (isModel) return type === '3D';
        if (type === '2D' && !v.videoUrl) return !tags.some(tag => tag.includes('3d'));
        return tags.some(t => t.includes(typeLower)) || cats.some(c => c.includes(typeLower));
      });
    }

    // Quick Pill Filter
    if (pill !== 'all' && pill !== 'shorts') {
      const pillKeywords: Record<string, string[]> = {
        locomotion: ['locomotion', 'walk', 'run', 'jump', 'parkour', 'sprint', 'crawl', 'stagger'],
        combat: ['combat', 'fight', 'sword', 'punch', 'kick', 'action', 'martial', 'attack'],
        acting: ['acting', 'facial', 'lip sync', 'dialogue', 'expression', 'gesture', 'emotion'],
        creature: ['creature', 'animal', 'quadruped', 'monster', 'dragon', 'dog', 'bird', 'horse'],
        mechanics: ['mechanic', 'body mechanic', 'weight', 'physics', 'push', 'pull', 'lift', 'fall'],
        vfx: ['vfx', 'fx', 'fire', 'water', 'smoke', 'explosion', 'magic', 'energy'],
      };
      const keywords = pillKeywords[pill] || [];
      result = result.filter(v => {
        const tags = v.tags?.map(t => t.toLowerCase()) || [];
        const cats = (v.categoryIds || []).concat(v.categories || []).map(c => c.toLowerCase());
        const fullText = (v.title + ' ' + (v.description || '')).toLowerCase();
        return keywords.some(kw => tags.some(t => t.includes(kw)) || cats.some(c => c.includes(kw)) || fullText.includes(kw));
      });
    }

    // --- Tab Specific Rules ---
    if (tab === 'animations') {
      // Animations: Video clips, animation cuts, sakuga choreography, 2D/3D shots
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        const isVid = !!v.videoUrl && (v.videoUrl.includes('.mp4') || v.videoUrl.includes('.webm') || v.type === 'video');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return !is3D && (isVid || tags.some(t => t.includes('animat') || t.includes('sakuga') || t.includes('cut') || t.includes('clip') || t.includes('smear')) || cats.some(c => c.includes('animat')));
      });
    } else if (tab === '3d-models') {
      // 3D Models: Sketchfab interactive 3D models, rigs, and 3D turnarounds
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return is3D || tags.some(t => t === '3d-model' || t === '3d-models' || t === '3d model' || t.includes('rigged')) || cats.some(c => c === '3d models' || c === '3d model');
      });
    } else if (tab === 'visdev') {
      // VisDev: ArtStation visual development, concept art, backgrounds, matte painting
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const isPin = source === 'pinterest' || v.id.startsWith('pin_');
        const is3D = source === 'sketchfab' || (v as any).mediaType === 'model3d' || !!(v as any).embedUrl || v.id.startsWith('sf_');
        if (isPin || is3D) return false;
        const isArtStation = source === 'artstation' || v.id.startsWith('as_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return isArtStation || tags.some(t => t.includes('visdev') || t.includes('vis-dev') || t.includes('concept') || t.includes('visual development') || t.includes('matte') || t.includes('environment')) || cats.some(c => c.includes('visdev') || c.includes('concept') || c.includes('visual development'));
      });
    } else if (tab === 'character-design') {
      // Character Design: Pinterest model sheets, pose references, anatomy studies
      result = result.filter(v => {
        const source = (v.source || '').toLowerCase();
        const isPin = source === 'pinterest' || v.id.startsWith('pin_');
        const tags = (v.tags || []).map(t => t.toLowerCase());
        const cats = (v.categories || []).concat(v.categoryIds || []).map(c => c.toLowerCase());
        return isPin || tags.some(t => t.includes('character-design') || t.includes('character design') || t.includes('model-sheet') || t.includes('model sheet') || t.includes('pose') || t.includes('anatomy') || t.includes('expression')) || cats.some(c => c.includes('character design') || c.includes('model sheet'));
      });
    } else if (tab === 'community') {
      // Community: Tagged accounts and portfolio / user uploaded references
      result = result.filter(v =>
        !!v.uploader ||
        !!v.author_name ||
        !!v.isPortfolio ||
        v.type === 'social' ||
        (v.type as string) === 'instagram' ||
        !!v.originalUrl
      );
    } else if (tab === 'trending') {
      // Trending: Highest likes & views
      result = [...result].sort((a, b) => {
        const likesA = a.likeCount ?? 0;
        const likesB = b.likeCount ?? 0;
        if (likesB !== likesA) return likesB - likesA;
        const viewsA = a.viewCount ?? 0;
        const viewsB = b.viewCount ?? 0;
        return viewsB - viewsA;
      });
    } else if (tab === 'latest') {
      // Latest: Newest first by timestamp
      result = [...result].sort((a, b) => getVideoTimestamp(b) - getVideoTimestamp(a));
    }
    // Featured: keeps the natural randomized, anime-balanced order from mixReferences

    return result;
}
