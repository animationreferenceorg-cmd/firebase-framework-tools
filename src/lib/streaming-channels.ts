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
        coverArt: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
        badge: 'MECHANICS',
        keywords: ['walk', 'walking', 'walk cycle', 'walk-cycle', 'ebata walk'],
      },
      {
        id: 'real-walk-reference',
        title: 'Real Human Reference & MoCap',
        subtitle: 'Live-Action Biomechanics',
        description: 'Frame-by-frame real human locomotion, heel-strike, and weight transfer.',
        href: '/resources/real-life-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&auto=format&fit=crop&q=80',
        badge: '24 FPS • REAL',
        keywords: ['real', 'live-action', 'human', 'reference', 'mocap'],
      },
      {
        id: 'run-cycles',
        title: 'Run Cycles & Sprints',
        subtitle: 'Acceleration & High-Speed',
        description: 'Full sprint mechanics, athletic dashes, panic runs, and velocity arcs.',
        href: '/tags/running-locomotion',
        coverArt: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
        badge: 'VELOCITY',
        keywords: ['running locomotion', 'run', 'running', 'sprint'],
      },
      {
        id: 'weight-and-lifting',
        title: 'Weight, Lifting & Heavy Loads',
        subtitle: 'Physical Leverage & Strain',
        description: 'Lifting heavy crates, pushing boulders, dragging objects, and gravity strain.',
        href: '/category/body-mechanics',
        coverArt: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
        badge: 'PHYSICS',
        keywords: ['body mechanics', 'weight', 'lifting', 'balance', 'heavy'],
      },
      {
        id: 'jumps-and-parkour',
        title: 'Jumps, Landings & Parkour',
        subtitle: 'Elevation & Compression',
        description: 'Deep crouch anticipations, apex hangtime, and heavy ground impact landings.',
        href: '/resources/dance-and-parkour-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?w=800&auto=format&fit=crop&q=80',
        badge: 'ELEVATION',
        keywords: ['jump', 'jumping', 'parkour', 'acrobatics', 'flips', 'landing'],
      },
      {
        id: 'fluid-dance-rotation',
        title: 'Dance, Spins & Dynamic Rotations',
        subtitle: 'Kinetic Continuous Arcs',
        description: 'Rhythmic stage choreography, full 360 pivots, twists, and dynamic arcs.',
        href: '/tags/rotation',
        coverArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
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
        coverArt: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        badge: '360° TURNTABLE',
        keywords: ['turnaround', 'rotation', 'character turnaround', '3d-model', 'turntable'],
      },
      {
        id: '3d-models-and-rigs',
        title: '3D Models & Production Rigs',
        subtitle: 'Wireframes & Mesh Assets',
        description: 'Production-ready 3D character rigs, hard-surface assets, and Maya/Blender models.',
        href: '/tags/3d-model',
        coverArt: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80',
        badge: 'RIGGED ASSETS',
        keywords: ['3d-model', 'sketchfab', 'rigged', 'maya', 'blender', 'substancepainter'],
      },
      {
        id: 'storyboards-and-cinematography',
        title: 'Storyboards & Cinematography',
        subtitle: 'Visual Staging & Framing',
        description: 'Beat boards, camera choreography, dynamic lensing, and shot transitions.',
        href: '/tags/storyboard',
        coverArt: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
        badge: 'STAGING',
        keywords: ['storyboard', 'cinematography', 'camera', 'staging', 'composition'],
      },
      {
        id: 'visdev-and-concept-art',
        title: 'Visual Development & Color Keys',
        subtitle: 'Worldbuilding & Atmosphere',
        description: 'Atmospheric color keys, mood paintings, and master visual development studies.',
        href: '/resources/visdev-concept-art',
        coverArt: 'https://images.unsplash.com/photo-1579783901586-d88db74b4fe4?w=800&auto=format&fit=crop&q=80',
        badge: 'VIS DEV',
        keywords: ['visdev', 'visual development', 'artstation', 'concept art', 'color key'],
      },
      {
        id: 'model-sheets-and-design',
        title: 'Model Sheets & Posing Sheets',
        subtitle: 'Character Proportions',
        description: 'Orthographic views, facial expression charts, and proportion construction.',
        href: '/category/model-sheet',
        coverArt: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
        badge: 'PROPORTIONS',
        keywords: ['model sheet', 'model-sheet', 'character design', 'expressions chart'],
      },
      {
        id: 'backgrounds-and-layout',
        title: 'Backgrounds & Environmental Layout',
        subtitle: 'Multiplane Parallax & Space',
        description: 'Camera pans across detailed matte paintings, 3D layouts, and sci-fi environments.',
        href: '/tags/background-animation',
        coverArt: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
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
        coverArt: 'https://images.unsplash.com/photo-1549476464-37392f717541?w=800&auto=format&fit=crop&q=80',
        badge: 'CHOREOGRAPHY',
        keywords: ['combat', 'fighting', 'martial arts', 'stunt', 'punch', 'kick'],
      },
      {
        id: 'swordplay-and-weapons',
        title: 'Swordplay & Melee Weapons',
        subtitle: 'Katana, Broadsword & Staff',
        description: 'Blade clashes, fencing parries, weapon draw cuts, and lethal follow-through arcs.',
        href: '/resources/sword-swing-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1589254065878-42c9da997008?w=800&auto=format&fit=crop&q=80',
        badge: 'WEAPONS',
        keywords: ['sword', 'swordplay', 'blade', 'katana', 'weapon'],
      },
      {
        id: 'transformers-and-mecha',
        title: 'Transformers & Mecha Kinematics',
        subtitle: 'Sci-Fi Hard-Surface Robotics',
        description: 'Heavy hydraulic joints, transforming armor plating, jet thrusters, and railguns.',
        href: '/resources/transformers-mecha-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
        badge: 'HARD-SURFACE',
        keywords: ['mecha', 'transformers', 'robot', 'gundam', 'machinery'],
      },
      {
        id: 'spider-man-acrobatics',
        title: 'Spider-Man & High-Flying Traversal',
        subtitle: 'Pendulum Swings & Rooftops',
        description: 'Web swinging, momentum transfers, rooftop parkour, and dynamic superhero landings.',
        href: '/resources/spider-man-acrobatic-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
        badge: 'ACROBATICS',
        keywords: ['spider-man', 'acrobatics', 'parkour', 'flips', 'traversal'],
      },
      {
        id: 'impact-frames-and-force',
        title: 'Impact Frames & Shockwaves',
        subtitle: 'Extreme Kinetic Force',
        description: 'Monochrome color inversions, screen vibrations, and explosive hit-stops.',
        href: '/tags/impact-frames',
        coverArt: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
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
        coverArt: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80',
        badge: 'PERFORMANCE',
        keywords: ['character acting', 'acting', 'performance', 'pantomime'],
      },
      {
        id: 'facial-expressions-acting',
        title: 'Facial Expressions & Micro-Emotions',
        subtitle: 'Eyes, Brow & Mouth',
        description: 'Subtle micro-smiles, furrowed brows, tear drops, shock, and intense rage.',
        href: '/resources/facial-acting-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
        badge: 'EXPRESSION',
        keywords: ['facial expressions', 'facial', 'crying', 'eyes', 'smile'],
      },
      {
        id: 'speech-and-lip-sync',
        title: 'Speech & Lip Sync Mechanics',
        subtitle: 'Phonemes & Mouth Cadence',
        description: 'Vowel mouth shapes (A, E, I, O, U), consonant closures (M, B, P), and speech rhythm.',
        href: '/resources/speech-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800&auto=format&fit=crop&q=80',
        badge: 'DIALOGUE',
        keywords: ['dialogue', 'speech', 'lip sync', 'talking'],
      },
      {
        id: 'moving-holds-organic',
        title: 'Moving Holds & Weight Shifts',
        subtitle: 'Natural Breathing & Settles',
        description: 'Keeping poses alive with chest breathing cycles, subtle eye darts, and weight settles.',
        href: '/resources/moving-hold-animation-reference',
        coverArt: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80',
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
        coverArt: 'https://images.unsplash.com/photo-1534188753412-3e26d0d618d6?w=800&auto=format&fit=crop&q=80',
        badge: 'QUADRUPED',
        keywords: ['animals', 'quadruped', 'creature animation', 'dog', 'cat', 'tiger', 'horse'],
      },
      {
        id: 'creature-mechanics',
        title: 'Creatures, Monsters & Behemoths',
        subtitle: 'Massive Anatomical Scale',
        description: 'Heavy dinosaur footsteps, dragon tail whips, alien joints, and monstrous roars.',
        href: '/tags/creature-animation',
        coverArt: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
        badge: 'BEHEMOTHS',
        keywords: ['creature animation', 'monster', 'creature', 'beast', 'dragon'],
      },
      {
        id: 'wing-flight-kinematics',
        title: 'Wing Flight & Aerial Kinematics',
        subtitle: 'Downstroke Power & Gliding',
        description: 'Feathered and leathery wing anatomy, air resistance, vortex banks, and landings.',
        href: '/tags/flying',
        coverArt: 'https://images.unsplash.com/photo-1522926197415-e55c22c88c71?w=800&auto=format&fit=crop&q=80',
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
        coverArt: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
        badge: 'PRINCIPLE #1',
        keywords: ['squash and stretch', 'morphing', 'stretch', 'squash'],
      },
      {
        id: 'timing-and-spacing',
        title: 'Timing, Spacing & Anticipation',
        subtitle: 'Frame Spacing Charts',
        description: 'Slow-in, slow-out, moving over extremes, explosive anticipation, and snap timing.',
        href: '/resources/animation-timing-and-spacing-reference',
        coverArt: 'https://images.unsplash.com/photo-1508057198894-247b23fe5ade?w=800&auto=format&fit=crop&q=80',
        badge: 'CADENCE',
        keywords: ['timing', 'spacing', 'anticipation', 'ease in'],
      },
      {
        id: 'smear-frames',
        title: 'Smear Frames & Motion Multipliers',
        subtitle: 'Speed Lines & Kinetic Blur',
        description: 'Multiple limbs, dry brush smears, extreme distortion, and speed lines in 24 FPS.',
        href: '/tags/smears',
        coverArt: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
        badge: 'SPEED SMEARS',
        keywords: ['smears', 'smear', 'blur', 'motion blur'],
      },
      {
        id: 'smoke-and-explosions',
        title: 'Smoke, Explosions & Fire FX',
        subtitle: 'Pyrotechnic Destruction',
        description: 'Shockwave blast fronts, billowy smoke plumes, trailing embers, and fire tongues.',
        href: '/tags/smoke-effects',
        coverArt: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
        badge: 'PYROTECHNICS',
        keywords: ['smoke effects', 'explosions', 'fire effects', 'smoke', 'fire'],
      },
      {
        id: 'liquid-and-water',
        title: 'Liquid, Water & Splash FX',
        subtitle: 'Viscosity & Surface Tension',
        description: 'Water drops, crown splashes, pouring liquids, fluid waves, and dynamic ripples.',
        href: '/tags/liquid-and-water',
        coverArt: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&auto=format&fit=crop&q=80',
        badge: 'FLUID DYNAMICS',
        keywords: ['liquid & water', 'water', 'liquid', 'splash'],
      },
      {
        id: 'sparks-and-beams',
        title: 'Sparks, Lightning & Energy Beams',
        subtitle: 'High-Voltage Plasma',
        description: 'Crackling electric bolts, metal grinding sparks, laser blasts, and magic aura particles.',
        href: '/tags/sparks-fx',
        coverArt: 'https://images.unsplash.com/photo-1545670723-196ed0954986?w=800&auto=format&fit=crop&q=80',
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
