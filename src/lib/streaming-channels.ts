import type { Video } from './types';

export interface StreamingChannelItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  coverArt: string;
  badge: string;
  keywords: string[];
  /** Secondary or fallback image if needed */
  fallbackArt?: string;
}

export interface StreamingShelf {
  id: string;
  genre: string;
  title: string;
  tagline: string;
  channels: StreamingChannelItem[];
}

export const STREAMING_SHELVES: StreamingShelf[] = [
  {
    id: 'body-mechanics',
    genre: 'Body Mechanics',
    title: 'Body Mechanics & Locomotion',
    tagline: 'Walk cycles, real-life human biomechanics, run cycles, weight, and parkour',
    channels: [
      {
        id: 'walk-cycles',
        title: 'Walk Cycles & Strides',
        subtitle: '2D, 3D & Anime Walks',
        description: 'Standard walks, casual strolls, heavy boots, and character pacing cycles.',
        href: '/tags/walk',
        coverArt: 'https://www.sakugabooru.com/data/preview/7ddac5c0b8c640d51c46cc4d6dd00bb3.jpg',
        badge: 'MECHANICS',
        keywords: ['walk', 'walking', 'walk cycle', 'walk-cycle', 'ebata walk'],
      },
      {
        id: 'real-walk-reference',
        title: 'Real Human Reference & MoCap',
        subtitle: 'Live-Action Biomechanics',
        description: 'Frame-by-frame real human locomotion, heel-strike, and weight transfer.',
        href: '/resources/real-life-animation-reference',
        coverArt: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Animal_Locomotion_I%2C_Plate_27_-_Nude_Man_Walking_and_Carrying_a_75_lb_stone_on_head%2C_hands_raised_02.gif?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=original',
        badge: '24 FPS • REAL',
        keywords: ['real', 'live-action', 'human', 'reference', 'mocap'],
      },
      {
        id: 'run-cycles',
        title: 'Run Cycles & Sprints',
        subtitle: 'Acceleration & High-Speed',
        description: 'Full sprint mechanics, athletic dashes, panic runs, and velocity arcs.',
        href: '/tags/running-locomotion',
        coverArt: 'https://www.sakugabooru.com/data/preview/98c37987a27c84748fe99b9ec4f1b6de.jpg',
        badge: 'VELOCITY',
        keywords: ['running locomotion', 'run', 'running', 'sprint'],
      },
      {
        id: 'weight-and-lifting',
        title: 'Weight, Lifting & Heavy Loads',
        subtitle: 'Physical Leverage & Strain',
        description: 'Lifting heavy crates, pushing boulders, dragging objects, and gravity strain.',
        href: '/category/body-mechanics',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2FPk8UebEkkd0Xob7SNffg-thumbnailUrl.jpg?alt=media&token=ebfa509c-2f48-4e8e-b7d4-c07b28ae7a68',
        badge: 'PHYSICS',
        keywords: ['body mechanics', 'weight', 'lifting', 'balance', 'heavy'],
      },
      {
        id: 'jumps-and-parkour',
        title: 'Jumps, Landings & Parkour',
        subtitle: 'Elevation & Compression',
        description: 'Deep crouch anticipations, apex hangtime, and heavy ground impact landings.',
        href: '/resources/dance-and-parkour-animation-reference',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2FWyu9hcLUd44uZRBYYLHe-thumbnailUrl.jpg?alt=media&token=9b375199-14e0-411d-aaf7-a35f716e18c0',
        badge: 'ELEVATION',
        keywords: ['jump', 'jumping', 'parkour', 'acrobatics', 'flips', 'landing'],
      },
      {
        id: 'fluid-dance-rotation',
        title: 'Dance, Spins & Dynamic Rotations',
        subtitle: 'Kinetic Continuous Arcs',
        description: 'Rhythmic stage choreography, full 360 pivots, twists, and dynamic arcs.',
        href: '/tags/rotation',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2F0cqAUp1p32SInTaWFWAW-thumbnailUrl.jpg?alt=media&token=93564af7-83a5-4cdb-af0b-9c03848a9c50',
        badge: 'KINETIC',
        keywords: ['rotation', 'dance', 'flips', 'spinning'],
      },
    ],
  },
  {
    id: 'visdev-and-3d',
    genre: 'VisDev & 3D',
    title: 'Visual Development & 3D Assets',
    tagline: 'Character turnarounds, 3D models, storyboards, model sheets, and environments',
    channels: [
      {
        id: 'character-turnarounds',
        title: '360° Character Turnarounds',
        subtitle: 'Silhouette & Topology',
        description: 'Full turntable rotations for studying volumes, hair, and costume design in motion.',
        href: '/resources/character-turnaround-animation-reference',
        coverArt: 'https://cdnb.artstation.com/p/assets/images/images/099/837/249/large/louis-laurent-vision-interactive-image-81.webp?1781106240',
        badge: '360° TURNTABLE',
        keywords: ['turnaround', 'rotation', 'character turnaround', '3d-model', 'turntable'],
      },
      {
        id: '3d-models-and-rigs',
        title: '3D Models & Production Rigs',
        subtitle: 'Wireframes & Mesh Assets',
        description: 'Production-ready 3D character rigs, hard-surface assets, and Maya/Blender models.',
        href: '/tags/3d-model',
        coverArt: 'https://media.sketchfab.com/models/17d22525b4124088a8827d9c45a2627f/thumbnails/55700a1f80d247c7ba450184f971c064/664a296cc711469dbc422492567e264c.jpeg',
        badge: 'RIGGED ASSETS',
        keywords: ['3d-model', 'sketchfab', 'rigged', 'maya', 'blender', 'substancepainter'],
      },
      {
        id: 'storyboards-and-cinematography',
        title: 'Storyboards & Cinematography',
        subtitle: 'Visual Staging & Framing',
        description: 'Beat boards, camera choreography, dynamic lensing, and shot transitions.',
        href: '/tags/storyboard',
        coverArt: 'https://www.sakugabooru.com/data/preview/564b57f4872e754aebe00368216aec29.jpg',
        badge: 'STAGING',
        keywords: ['storyboard', 'cinematography', 'camera', 'staging', 'composition'],
      },
      {
        id: 'visdev-and-concept-art',
        title: 'Visual Development & Color Keys',
        subtitle: 'Worldbuilding & Atmosphere',
        description: 'Atmospheric color keys, mood paintings, and master visual development studies.',
        href: '/resources/visdev-concept-art',
        coverArt: 'https://cdnb.artstation.com/p/assets/images/images/088/468/021/large/pavel-oleinik-03-04-25-cut-2-inst.jpg?1748368373',
        badge: 'VIS DEV',
        keywords: ['visdev', 'visual development', 'artstation', 'concept art', 'color key'],
      },
      {
        id: 'model-sheets-and-design',
        title: 'Model Sheets & Posing Sheets',
        subtitle: 'Character Proportions',
        description: 'Orthographic views, facial expression charts, and proportion construction.',
        href: '/category/model-sheet',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2FSvs9EjVkPSwQSjCbdDG4-thumbnailUrl.jpg?alt=media&token=650ac696-746f-42a0-a92b-d2849c26aa9f',
        badge: 'PROPORTIONS',
        keywords: ['model sheet', 'model-sheet', 'character design', 'expressions chart'],
      },
      {
        id: 'backgrounds-and-layout',
        title: 'Backgrounds & Environmental Layout',
        subtitle: 'Multiplane Parallax & Space',
        description: 'Camera pans across detailed matte paintings, 3D layouts, and sci-fi environments.',
        href: '/tags/background-animation',
        coverArt: 'https://www.sakugabooru.com/data/preview/f881a6e99036caefec4421a0139eae61.jpg',
        badge: 'ENVIRONMENT',
        keywords: ['background animation', '3d background', 'background art', 'layout'],
      },
    ],
  },
  {
    id: 'combat-and-action',
    genre: 'Combat & Action',
    title: 'Combat, Choreography & Action',
    tagline: 'Martial arts, sword duels, mecha kinematics, spider-man acrobatics, and impact frames',
    channels: [
      {
        id: 'martial-arts-stunts',
        title: 'Martial Arts & Stunt Choreography',
        subtitle: 'Hand-to-Hand Combat',
        description: 'Strikes, high kicks, blocks, dodges, wrestling takedowns, and fight rhythm.',
        href: '/tags/combat',
        coverArt: 'https://www.sakugabooru.com/data/preview/cd3e747e05e552550ffe5aa52655177c.jpg',
        badge: 'CHOREOGRAPHY',
        keywords: ['combat', 'fighting', 'martial arts', 'stunt', 'punch', 'kick'],
      },
      {
        id: 'swordplay-and-weapons',
        title: 'Swordplay & Melee Weapons',
        subtitle: 'Katana, Broadsword & Staff',
        description: 'Blade clashes, fencing parries, weapon draw cuts, and lethal follow-through arcs.',
        href: '/resources/sword-swing-animation-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/638ff15589ef28caf206b44fc7716c58.jpg',
        badge: 'WEAPONS',
        keywords: ['sword', 'swordplay', 'blade', 'katana', 'weapon'],
      },
      {
        id: 'transformers-and-mecha',
        title: 'Transformers & Mecha Kinematics',
        subtitle: 'Sci-Fi Hard-Surface Robotics',
        description: 'Heavy hydraulic joints, transforming armor plating, jet thrusters, and railguns.',
        href: '/resources/transformers-mecha-animation-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/6466c314329b03d33fa1a1b74149cfa6.jpg',
        badge: 'HARD-SURFACE',
        keywords: ['mecha', 'transformers', 'robot', 'gundam', 'machinery'],
      },
      {
        id: 'spider-man-acrobatics',
        title: 'Spider-Man & High-Flying Traversal',
        subtitle: 'Pendulum Swings & Rooftops',
        description: 'Web swinging, momentum transfers, rooftop parkour, and dynamic superhero landings.',
        href: '/resources/spider-man-acrobatic-animation-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/109fb100cb4a810fb44a010a1267be9d.jpg',
        badge: 'ACROBATICS',
        keywords: ['spider-man', 'acrobatics', 'parkour', 'flips', 'traversal'],
      },
      {
        id: 'impact-frames-and-force',
        title: 'Impact Frames & Shockwaves',
        subtitle: 'Extreme Kinetic Force',
        description: 'Monochrome color inversions, screen vibrations, and explosive hit-stops.',
        href: '/tags/impact-frames',
        coverArt: 'https://www.sakugabooru.com/data/preview/8828eeb383c0071b0e35587bff9a3f3c.jpg',
        badge: 'IMPACT FORCE',
        keywords: ['impact frames', 'impact', 'sparks fx', 'hit stop'],
      },
    ],
  },
  {
    id: 'acting-and-dialogue',
    genre: 'Acting & Dialogue',
    title: 'Character Acting & Dialogue',
    tagline: 'Facial acting, micro-emotions, speech lip sync, moving holds, and pantomime',
    channels: [
      {
        id: 'character-acting-pantomime',
        title: 'Character Acting & Pantomime',
        subtitle: 'Subtle Posing & Attitude',
        description: 'Silent gestures, internal thought processes, hesitations, and body language.',
        href: '/tags/character-acting',
        coverArt: 'https://www.sakugabooru.com/data/preview/89c17598a600ae926bda0842e6a3266c.jpg',
        badge: 'PERFORMANCE',
        keywords: ['character acting', 'acting', 'performance', 'pantomime'],
      },
      {
        id: 'facial-expressions-acting',
        title: 'Facial Expressions & Micro-Emotions',
        subtitle: 'Eyes, Brow & Mouth',
        description: 'Subtle micro-smiles, furrowed brows, tear drops, shock, and intense rage.',
        href: '/resources/facial-acting-animation-reference',
        coverArt: 'https://storage.googleapis.com/aniamtion-reference.firebasestorage.app/thumbnails/CeFGzb2V9bYeeXoNphp3.jpg',
        badge: 'EXPRESSION',
        keywords: ['facial expressions', 'facial', 'crying', 'eyes', 'smile'],
      },
      {
        id: 'speech-and-lip-sync',
        title: 'Speech & Lip Sync Mechanics',
        subtitle: 'Phonemes & Mouth Cadence',
        description: 'Vowel mouth shapes (A, E, I, O, U), consonant closures (M, B, P), and speech rhythm.',
        href: '/resources/speech-animation-reference',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2FidJgcD9KhOA8nJGpnS4C-thumbnailUrl.jpg?alt=media&token=38e65a67-094c-403e-a820-f77f6ab82f9c',
        badge: 'DIALOGUE',
        keywords: ['dialogue', 'speech', 'lip sync', 'talking'],
      },
      {
        id: 'moving-holds-organic',
        title: 'Moving Holds & Weight Shifts',
        subtitle: 'Natural Breathing & Settles',
        description: 'Keeping poses alive with chest breathing cycles, subtle eye darts, and weight settles.',
        href: '/resources/moving-hold-animation-reference',
        coverArt: 'https://firebasestorage.googleapis.com/v0/b/aniamtion-reference.firebasestorage.app/o/migrated-thumbnails%2FAFUQ51YWfXyXnKTcStqz-thumbnailUrl.jpg?alt=media&token=8be9c4cc-d6c0-4988-a0b3-6931b08ce7ce',
        badge: 'ORGANIC LIFE',
        keywords: ['moving hold', 'subtle', 'breathing', 'settle'],
      },
    ],
  },
  {
    id: 'creatures-and-animals',
    genre: 'Creatures & Animals',
    title: 'Creatures & Wildlife Mechanics',
    tagline: 'Quadrupeds, behemoths, monsters, predators, and winged flight kinematics',
    channels: [
      {
        id: 'quadruped-walks',
        title: 'Quadruped Animal Gaits',
        subtitle: '4-Legged Canine & Feline',
        description: 'Diagonal and lateral walking gaits, shoulder scapula action, and tail counter-balance.',
        href: '/resources/quadruped-animal-walk-cycle-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/555ee98f4709d181d3d7d62d1a3ee44f.jpg',
        badge: 'QUADRUPED',
        keywords: ['animals', 'quadruped', 'creature animation', 'dog', 'cat', 'tiger', 'horse'],
      },
      {
        id: 'creature-mechanics',
        title: 'Creatures, Monsters & Behemoths',
        subtitle: 'Massive Anatomical Scale',
        description: 'Heavy dinosaur footsteps, dragon tail whips, alien joints, and monstrous roars.',
        href: '/tags/creature-animation',
        coverArt: 'https://www.sakugabooru.com/data/preview/c9f57bf64883faa61cd1fb2377c6403c.jpg',
        badge: 'BEHEMOTHS',
        keywords: ['creature animation', 'monster', 'creature', 'beast', 'dragon'],
      },
      {
        id: 'wing-flight-kinematics',
        title: 'Wing Flight & Aerial Kinematics',
        subtitle: 'Downstroke Power & Gliding',
        description: 'Feathered and leathery wing anatomy, air resistance, vortex banks, and landings.',
        href: '/tags/flying',
        coverArt: 'https://i.ytimg.com/vi/lBlZM1nre5g/maxresdefault.jpg',
        badge: 'FLIGHT',
        keywords: ['flying', 'wings', 'flight', 'bird', 'aerial'],
      },
    ],
  },
  {
    id: 'principles-and-vfx',
    genre: 'Principles & VFX',
    title: 'Animation Principles & Elemental VFX',
    tagline: 'Squash & stretch, timing, smears, explosions, smoke, liquid water, and sparks',
    channels: [
      {
        id: 'squash-and-stretch',
        title: 'Squash & Stretch Dynamics',
        subtitle: 'Volume Preservation',
        description: 'Impact deformation, elastic rebound, facial compression, and kinetic weight.',
        href: '/resources/squash-and-stretch-animation-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/79a1d85f6d0987a0f250b838040ebccc.jpg',
        badge: 'PRINCIPLE #1',
        keywords: ['squash and stretch', 'morphing', 'stretch', 'squash'],
      },
      {
        id: 'timing-and-spacing',
        title: 'Timing, Spacing & Anticipation',
        subtitle: 'Frame Spacing Charts',
        description: 'Slow-in, slow-out, moving over extremes, explosive anticipation, and snap timing.',
        href: '/resources/animation-timing-and-spacing-reference',
        coverArt: 'https://www.sakugabooru.com/data/preview/eacf693ddb0c5cc3a8bbbef108f2f1b1.jpg',
        badge: 'CADENCE',
        keywords: ['timing', 'spacing', 'anticipation', 'ease in'],
      },
      {
        id: 'smear-frames',
        title: 'Smear Frames & Motion Multipliers',
        subtitle: 'Speed Lines & Kinetic Blur',
        description: 'Multiple limbs, dry brush smears, extreme distortion, and speed lines in 24 FPS.',
        href: '/tags/smears',
        coverArt: 'https://www.sakugabooru.com/data/preview/c03135ccd91452dbf553a6d3456ea4e3.jpg',
        badge: 'SPEED SMEARS',
        keywords: ['smears', 'smear', 'blur', 'motion blur'],
      },
      {
        id: 'smoke-and-explosions',
        title: 'Smoke, Explosions & Fire FX',
        subtitle: 'Pyrotechnic Destruction',
        description: 'Shockwave blast fronts, billowy smoke plumes, trailing embers, and fire tongues.',
        href: '/tags/smoke-effects',
        coverArt: 'https://www.sakugabooru.com/data/preview/bab13c235c00c07af54d14076ba7b7e1.jpg',
        badge: 'PYROTECHNICS',
        keywords: ['smoke effects', 'explosions', 'fire effects', 'smoke', 'fire'],
      },
      {
        id: 'liquid-and-water',
        title: 'Liquid, Water & Splash FX',
        subtitle: 'Viscosity & Surface Tension',
        description: 'Water drops, crown splashes, pouring liquids, fluid waves, and dynamic ripples.',
        href: '/tags/liquid-and-water',
        coverArt: 'https://www.sakugabooru.com/data/preview/907c43002e0426fc2f0d1e27301d5dbc.jpg',
        badge: 'FLUID DYNAMICS',
        keywords: ['liquid & water', 'water', 'liquid', 'splash'],
      },
      {
        id: 'sparks-and-beams',
        title: 'Sparks, Lightning & Energy Beams',
        subtitle: 'High-Voltage Plasma',
        description: 'Crackling electric bolts, metal grinding sparks, laser blasts, and magic aura particles.',
        href: '/tags/sparks-fx',
        coverArt: 'https://www.sakugabooru.com/data/preview/f712c0f85783b09a2b1a3235bad37d2c.jpg',
        badge: 'ENERGY FX',
        keywords: ['sparks fx', 'lightning fx', 'beams', 'particles', 'magic'],
      },
    ],
  },
];

/**
 * Computes live clip counts for each streaming channel from the in-memory videos snapshot.
 */
export function calculateChannelCounts(videos: Video[]): Record<string, number> {
  const counts: Record<string, number> = {};

  // Build lower-cased lookup map of video tags
  const videoTagSets = videos.map((v) => {
    const set = new Set<string>();
    for (const t of v.tags || []) {
      set.add(String(t).toLowerCase().trim());
    }
    for (const c of v.categoryIds || []) {
      set.add(String(c).toLowerCase().trim());
    }
    const title = (v.title || '').toLowerCase();
    return { set, title };
  });

  for (const shelf of STREAMING_SHELVES) {
    for (const channel of shelf.channels) {
      let count = 0;
      const keys = channel.keywords.map((k) => k.toLowerCase().trim());

      for (const item of videoTagSets) {
        const matches = keys.some((k) => {
          if (item.set.has(k)) return true;
          for (const t of item.set) {
            if (t.includes(k)) return true;
          }
          if (item.title.includes(k)) return true;
          return false;
        });
        if (matches) count++;
      }

      counts[channel.id] = count;
    }
  }

  return counts;
}


/**
 * Resolves dynamic category cover thumbnails directly from the library video snapshot,
 * ensuring each channel showcases an authentic, highest-relevance reference clip from platform content.
 */
export function calculateChannelCovers(videos: Video[]): Record<string, string> {
  const covers: Record<string, string> = {};
  if (!videos || videos.length === 0) return covers;

  const validVideos = videos.filter((v) => {
    const t = v.thumbnailUrl || v.posterUrl;
    if (!t) return false;
    const clean = t.toLowerCase();
    return (
      !clean.includes('assets.reflix.dev') &&
      !clean.includes('cdninstagram.com') &&
      !clean.includes('placehold.co') &&
      !clean.endsWith('.mov') &&
      !clean.endsWith('.mp4')
    );
  });

  const used = new Set<string>();

  for (const shelf of STREAMING_SHELVES) {
    for (const channel of shelf.channels) {
      const keys = channel.keywords.map((k) => k.toLowerCase().trim());
      let bestVid: Video | null = null;
      let bestScore = -1;

      for (const v of validVideos) {
        const thumb = v.thumbnailUrl || v.posterUrl || '';
        const vTitle = (v.title || '').toLowerCase();
        const tags = (v.tags || []).map((t) => String(t).toLowerCase());
        const cats = ((v.categoryIds || []).concat(v.categories || [])).map((c) => String(c).toLowerCase());
        const text = `${vTitle} ${tags.join(' ')} ${cats.join(' ')}`;

        let score = 0;
        for (const k of keys) {
          if (tags.includes(k)) score += 10;
          else if (cats.includes(k)) score += 6;
          else if (vTitle.includes(k)) score += 5;
          else if (text.includes(k)) score += 2;
        }

        if (used.has(thumb)) score -= 15;

        if (score > bestScore) {
          bestScore = score;
          bestVid = v;
        }
      }

      if (bestVid && bestScore > 0) {
        const chosen = bestVid.thumbnailUrl || bestVid.posterUrl || '';
        used.add(chosen);
        covers[channel.id] = chosen;
      } else {
        // Fallback to channel's default authentic cover
        covers[channel.id] = channel.coverArt;
      }
    }
  }

  return covers;
}
