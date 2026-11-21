import sharp from 'sharp';

type DiscoveryInput = {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  sourcePlatform?: string | null;
  imageUrl?: string | null;
  imageBuffer?: Buffer | null;
};

const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'video', 'reference', 'animation', 'clip', 'post', 'reel', 'short']);

const CATEGORY_RULES: Array<{ category: string; keywords: string[]; extraTags: string[] }> = [
  {
    category: 'Combat',
    keywords: ['punch', 'kick', 'sword', 'fight', 'martial', 'kungfu', 'karate', 'boxing', 'mma', 'dodge', 'parry', 'slash', 'combat', 'battle', 'weapon', 'spear', 'axe', 'bow', 'shoot', 'recoil'],
    extraTags: ['combat', 'action'],
  },
  {
    category: 'Locomotion',
    keywords: ['walk', 'run', 'sprint', 'jog', 'jump', 'leap', 'parkour', 'vault', 'climb', 'crawl', 'sneak', 'stride', 'cycle', 'locomotion', 'skate', 'swim', 'fly', 'landing'],
    extraTags: ['locomotion'],
  },
  {
    category: 'Creature',
    keywords: ['dog', 'cat', 'horse', 'wolf', 'lion', 'tiger', 'bear', 'bird', 'eagle', 'dragon', 'dino', 'dinosaur', 'monster', 'quadruped', 'animal', 'creature', 'wing', 'tail', 'gallop', 'trot', 'spider', 'snake'],
    extraTags: ['creature'],
  },
  {
    category: 'Body Mechanics',
    keywords: ['lift', 'heavy', 'push', 'pull', 'carry', 'throw', 'catch', 'fall', 'stagger', 'trip', 'slip', 'balance', 'weight', 'mechanics', 'acrobat', 'flip', 'backflip', 'somersault', 'gymnast', 'dance', 'spin', 'sit', 'stand'],
    extraTags: ['body-mechanics'],
  },
  {
    category: 'Lip Sync',
    keywords: ['lipsync', 'lip-sync', 'dialogue', 'speech', 'monologue', 'talking', 'talk', 'mouth', 'voice', 'sing', 'singing', 'shout', 'yell'],
    extraTags: ['lip-sync', 'acting'],
  },
  {
    category: 'FX / VFX',
    keywords: ['fire', 'flame', 'smoke', 'water', 'splash', 'explosion', 'cloth', 'cape', 'hair', 'wind', 'particle', 'vfx', 'fx', 'lightning', 'magic', 'destruction', 'debris'],
    extraTags: ['fx', 'vfx'],
  },
  {
    category: 'Acting',
    keywords: ['acting', 'emotion', 'laugh', 'cry', 'angry', 'sad', 'happy', 'surprise', 'shock', 'fear', 'facial', 'expression', 'eye', 'blink', 'gesture', 'subtle', 'conversation'],
    extraTags: ['acting'],
  },
];

/**
 * Automatically infer the best animation category and canonical search tags
 * from title, description, tags, and filename so random user uploads are
 * immediately discoverable in search and category filters.
 */
export function inferAnimationCategoryAndTags(input: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  suppliedCategory?: string | null;
}): { category: string; inferredTags: string[] } {
  const haystack = `${input.title || ''} ${input.description || ''} ${(input.tags || []).join(' ')}`.toLowerCase();
  const matchedTags = new Set<string>();
  let bestCategory = '';
  let bestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (haystack.includes(kw)) {
        score += 1;
        matchedTags.add(normalizeTag(kw));
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
      for (const t of rule.extraTags) matchedTags.add(t);
    }
  }

  const rawSupplied = (input.suppliedCategory || '').trim();
  const isGenericSupplied = !rawSupplied || rawSupplied.toLowerCase() === 'acting' || rawSupplied.toLowerCase() === 'general';
  const finalCategory = bestCategory && isGenericSupplied ? bestCategory : (rawSupplied || bestCategory || 'Acting');
  if (finalCategory) matchedTags.add(normalizeTag(finalCategory));

  return {
    category: finalCategory,
    inferredTags: [...matchedTags].filter(Boolean),
  };
}

export function deriveReferenceTags(input: Omit<DiscoveryInput, 'imageUrl' | 'imageBuffer'>): string[] {
  const supplied = (input.tags || []).map(normalizeTag).filter(Boolean);
  const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();
  const extracted = (text.match(/[a-z0-9][a-z0-9-]{2,}/g) || [])
    .filter((word) => !STOP_WORDS.has(word))
    .map(normalizeTag)
    .filter(Boolean);
  const platform = normalizeTag(input.sourcePlatform || '');
  return [...new Set([...supplied, ...extracted, ...(platform ? [platform] : [])])].slice(0, 18);
}

export async function analyzeReferenceVisuals(input: DiscoveryInput): Promise<{ visualTags: string[]; palette: string[]; paletteBuckets: string[] }> {
  const visualTags = deriveReferenceTags(input);
  try {
    const source = input.imageBuffer || (input.imageUrl ? Buffer.from(await (await fetch(input.imageUrl, { signal: AbortSignal.timeout(10_000) })).arrayBuffer()) : null);
    if (!source) return { visualTags, palette: [], paletteBuckets: [] };
    const { data, info } = await sharp(source, { animated: false }).resize(64, 64, { fit: 'inside', withoutEnlargement: false }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const counts = new Map<string, number>();
    for (let index = 0; index < data.length; index += info.channels) {
      const r = Math.round(data[index] / 32) * 32;
      const g = Math.round(data[index + 1] / 32) * 32;
      const b = Math.round(data[index + 2] / 32) * 32;
      const hex = rgbToHex(r, g, b);
      counts.set(hex, (counts.get(hex) || 0) + 1);
    }
    const palette = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([hex]) => hex);
    return { visualTags, palette, paletteBuckets: [...new Set(palette.map(colorBucket))] };
  } catch {
    return { visualTags, palette: [], paletteBuckets: [] };
  }
}

function normalizeTag(value: string): string {
  return value.toLowerCase().trim().replace(/^#/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => Math.min(255, value).toString(16).padStart(2, '0')).join('')}`;
}

function colorBucket(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 70) return 'dark';
  if (min > 190) return 'light';
  if (max - min < 35) return 'neutral';
  if (r >= g && r >= b) return r > 180 && g > 120 ? 'warm' : 'red';
  if (g >= r && g >= b) return 'green';
  return b > 160 && r > 100 ? 'purple' : 'blue';
}
