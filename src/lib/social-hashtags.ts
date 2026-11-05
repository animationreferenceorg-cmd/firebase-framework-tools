/**
 * Movement & Animation Reference Hashtag Mapper
 * 
 * Maps search queries (e.g., diving, running, jumping, acting, combat, parkour)
 * to high-volume creator hashtags on Instagram, TikTok, and social media platforms.
 */

const MOVEMENT_HASHTAGS: Record<string, string[]> = {
  diving: [
    'divinganimation',
    'divingreference',
    'springboarddiving',
    'platformdiving',
    'swimminganimation',
    'bodymechanics',
    'animationreference',
  ],
  dive: [
    'divinganimation',
    'divingreference',
    'springboarddiving',
    'platformdiving',
    'bodymechanics',
    'animationreference',
  ],
  running: [
    'runcycle',
    'runninganimation',
    'runningreference',
    'locomotion',
    'bodymechanics',
    'animationreference',
  ],
  run: [
    'runcycle',
    'runninganimation',
    'runningreference',
    'locomotion',
    'bodymechanics',
    'animationreference',
  ],
  jumping: [
    'jumpcycle',
    'jumpinganimation',
    'jumpingreference',
    'parkouranimation',
    'acrobatics',
    'bodymechanics',
    'animationreference',
  ],
  jump: [
    'jumpcycle',
    'jumpinganimation',
    'jumpingreference',
    'parkour',
    'bodymechanics',
    'animationreference',
  ],
  acting: [
    'characteracting',
    'actingreference',
    'actingbeats',
    'facialacting',
    'characteranimation',
    'animationreference',
  ],
  combat: [
    'fightchoreography',
    'martialartsreference',
    'swordfight',
    'actionreference',
    'combatanimation',
    'animationreference',
  ],
  fight: [
    'fightchoreography',
    'martialartsreference',
    'swordfight',
    'actionreference',
    'combatanimation',
    'animationreference',
  ],
  parkour: [
    'parkour',
    'freerunning',
    'stunts',
    'acrobatics',
    'bodymechanics',
    'animationreference',
  ],
  dance: [
    'danceanimation',
    'dancereference',
    'choreographyreference',
    'animationreference',
  ],
  walking: [
    'walkcycle',
    'walkinganimation',
    'locomotion',
    'bodymechanics',
    'animationreference',
  ],
  walk: [
    'walkcycle',
    'walkinganimation',
    'locomotion',
    'bodymechanics',
    'animationreference',
  ],
  creature: [
    'creatureanimation',
    'quadrupedwalk',
    'animalmechanics',
    'creaturedesign',
    'animationreference',
  ],
};

/**
 * Returns relevant social media hashtags for an animation search query.
 */
export function getSocialHashtagsForQuery(query: string): string[] {
  const clean = (query || '').toLowerCase().trim();
  if (!clean) return ['animationreference', 'characteracting', 'bodymechanics', '2danimation', '3danimation'];

  const words = clean.split(/\s+/).filter(w => w.length > 2);
  const matched = new Set<string>();

  for (const word of words) {
    const direct = MOVEMENT_HASHTAGS[word];
    if (direct) {
      direct.forEach(tag => matched.add(tag));
    }
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (cleanWord.length >= 3) {
      matched.add(`${cleanWord}animation`);
      matched.add(`${cleanWord}reference`);
    }
  }

  if (matched.size === 0) {
    const slug = clean.replace(/[^a-z0-9]+/g, '');
    matched.add(`${slug}animation`);
    matched.add(`${slug}reference`);
    matched.add('animationreference');
    matched.add('bodymechanics');
  }

  return Array.from(matched);
}

/**
 * Constructs an optimized search query targeting Instagram posts, reels, and hashtag tags.
 */
export function buildInstagramHashtagQuery(query: string): string {
  const clean = (query || '').trim();
  const hashtags = getSocialHashtagsForQuery(clean);
  const topHashtags = hashtags.slice(0, 3).map(h => `#${h}`).join(' OR ');

  return `site:instagram.com (p OR reel) (${topHashtags} OR "${clean} animation" OR "${clean} reference")`;
}

