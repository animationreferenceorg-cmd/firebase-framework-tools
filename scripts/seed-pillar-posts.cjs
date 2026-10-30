// Seeds three SEO pillar blog posts into the blogPosts collection, each
// embedding relevant clips from the reference library via videoIds.
// Idempotent: doc ID = slug, rerunning updates in place.
// Run with: node scripts/seed-pillar-posts.cjs
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const snapshot = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'videos-snapshot.json'), 'utf8')
);

function clipsByTags(tags, count = 9) {
  const wanted = new Set(tags.map(t => t.toLowerCase()));
  const matches = [];
  for (let i = snapshot.length - 1; i >= 0 && matches.length < count; i--) {
    const v = snapshot[i];
    if ((v.tags || []).some(t => wanted.has(t.toLowerCase()))) matches.push(v);
  }
  return matches;
}

const POSTS = [
  {
    slug: 'photoshop-frame-by-frame-animation-plugin',
    title: 'Photoshop Frame by Frame Animation Plugin: Real Options',
    tags: ['Smears', 'Walk Cycle', 'Impact Frames', 'Combat'],
    keywords: [
      'photoshop frame by frame animation plugin',
      'photoshop animation plugin',
      'photoshop 2d animation',
      'photoshop timeline onion skin',
      'photoshop sprite sheet export',
      'animation reference study'
    ],
    excerpt: "Photoshop's native Timeline handles basic 1s and 2s, onion skinning, and GIF exports. Here is when to buy a plugin, when to stay native, and why dedicated reference tools beat both.",
    content: `A Photoshop frame by frame animation plugin is a third-party extension designed to enhance Photoshop's native Timeline panel with keyboard frame stepping, advanced onion skinning, and sprite sheet export.

Short answer: you don't need a Photoshop frame by frame animation plugin for most student reel work. Photoshop's built-in Timeline already handles frame-by-frame on 1s or 2s, onion skinning, GIF export, and sprite sheets; plugins mainly add onion-skin controls, video layer timing, and export niceties. If your deliverable is a walk cycle or body mechanics test under a few hundred frames, stay in Photoshop. If you're frame-stepping sakuga for reference or building a reel, a dedicated tool will serve you better, and this guide maps each option to the specific use case where it wins.

The pain starts with frame stepping and study. The Timeline has no scrub bar with per-frame thumbnails, no frame numbering overlay, and no way to loop a range at variable speed while you draw over it. Onion skinning exists only as a limited video-layer feature, not true multi-frame ghosting. Export automation is another gap: sprite sheets and numbered PNG sequences need manual layer slicing or scripting.

Plugins patch playback controls, onion skinning, and export. But if your actual job is studying sakuga clips frame-by-frame and building reference boards for your reel, a dedicated player like Animation Reference (https://animationreference.org/frame-by-frame-player) does that without a Photoshop license at all.`,
  },
  {
    slug: 'sword-animation-reference-guide',
    title: 'Sword Animation Reference: How to Study Blade Combat Frame by Frame',
    tags: ['sword', 'greatsword', 'slash', 'spin slash'],
    keywords: ['sword animation reference', 'sword attack animation', 'blade combat animation', 'melee animation reference', 'game combat animation'],
    excerpt: 'What separates a floaty sword swing from one that feels lethal? A practical guide to studying sword animation reference: anticipation, smears, contact frames and follow-through.',
    content: `A sword swing that feels dangerous is never about the swing itself. When you scrub great blade combat frame by frame, the actual cut usually lasts two or three frames — everything that sells the hit lives in the frames around it.

Start with the anticipation. In almost every strong sword animation you will find a wind-up pose held far longer than you expect, often a third of the whole action. The character coils, weight shifts to the back foot, the blade drags slightly behind the hands. This is the frame range to study first: pause on the deepest anticipation pose and ask what the hips, shoulders and blade angle are each doing. In game animation this pose is also the "read" that tells the player an attack is coming, which is why combat-heavy games exaggerate it so hard.

Then step through the attack itself one frame at a time. You are looking for three things. First, smear frames — single frames where the blade stretches into an arc or multiplies. They look broken in isolation and perfect at speed. Second, the contact frame: the hit almost always lands on a pose held for one or two frames with the body fully committed, chest open, weapon at maximum extension. Third, the speed difference: count how many frames the wind-up takes versus the strike. Ratios of five-to-one are common. If your own attack feels floaty, this ratio is usually the problem.

Follow-through is where weight lives. After contact, the blade keeps travelling and drags the body with it — the character does not simply return to idle. Watch how the back foot slides, how the spine counter-rotates, how the free arm swings to balance the weapon's momentum. Heavier weapons like greatsswords push this even further: the recovery is longer than the attack, and skipping it is exactly why student animations feel weightless.

Finally, study attacks in series. Combo strings (2-hit, 3-hit) reuse the follow-through of one attack as the anticipation of the next, which is a masterclass in overlapping action. Load a 3-hit combo clip, step through the transition frames between hits, and note how the animators never let the energy fully settle.

Every clip embedded below supports frame stepping — use the arrow keys in the player to move one frame at a time, and slow playback to quarter speed for the smear frames. Pick one clip, break it down pose by pose, and copy the timing chart before you animate your own.`,
  },
  {
    slug: 'hit-reaction-animation-reference',
    title: 'Hit Reaction Animation Reference: Making Impacts Feel Heavy',
    tags: ['hit', 'hit reaction', 'knockback', 'damage', 'stagger'],
    keywords: ['hit reaction animation', 'impact animation reference', 'damage animation', 'knockback animation', 'game feel animation'],
    excerpt: 'Impacts sell the fight. Learn to study hit reactions frame by frame: the snap, the stagger, the recovery — and why the first two frames matter more than everything after.',
    content: `Players never see the sword — they see what it does to the target. Hit reactions are half of every impact, and they are one of the highest-leverage skills a game animator can build, because a mediocre attack paired with a great reaction still feels great.

The core principle: the first two frames do all the work. Scrub any strong hit reaction and you will find the head and chest snap away from the impact point almost instantly — often reaching the extreme pose within two or three frames. There is no ease-in. The body is hit by an external force, so it accelerates instantly, then spends the rest of the animation decelerating. If your reaction eases into its extreme, it reads as flinching, not being hit.

Direction matters as much as speed. Good hit reactions are directional: a blow from the left sends the head right, a rising strike lifts the chest, a heavy slam folds the character over. Study how the impact point drives the chain of motion — hips lag behind chest, arms lag behind shoulders, and the weapon or props trail last. This successive breaking of joints is pure overlapping action, and it is easiest to learn by stepping through reference one frame at a time.

Then look at the stagger. Between the snap and the recovery there is almost always a stumble: a step or two to catch balance, weight visibly on the heels, arms windmilling slightly. The stagger is what communicates how hard the hit was — light hits skip it entirely, heavy hits extend it. Games tune combat feel largely by choosing which tier of reaction to play, so reference libraries sort these into light hit, heavy hit, knockback and knockdown for a reason.

Do not skip the recovery. The return to fighting stance is slower than everything before it and full of small balance corrections. Ending a reaction abruptly is the most common mistake in student work; the body should settle, not teleport, back to idle.

The clips below cover the full range — quick flinches, directional staggers, full knockdowns and get-ups. Step through the first five frames of each one and write down the frame count from contact to extreme pose. The pattern you find is the lesson.`,
  },
  {
    slug: 'run-cycle-locomotion-animation-reference',
    title: 'Run Cycle & Locomotion Animation Reference from Real Games',
    tags: ['run', 'running', 'walk', 'walking', 'dash', 'sprint'],
    keywords: ['run cycle animation reference', 'locomotion animation', 'walk cycle reference', 'game locomotion animation', 'running animation study'],
    excerpt: 'Contact, down, passing, up: a practical guide to studying run and walk cycles from shipped games, and what to look for in each key pose when you scrub frame by frame.',
    content: `Every locomotion cycle is built on the same four poses — contact, down, passing, up — but what separates a serviceable run from a memorable one is everything layered on top of that skeleton. The fastest way to learn the difference is to scrub real, shipped game cycles one frame at a time.

Start by finding the contact frames: the moments a foot first touches the ground. Pause there. In a strong run the body is never upright at contact — the chest leads, the hips trail, and the whole character falls forward from stride to stride. Running is controlled falling, and the amount of forward lean is the single clearest signal of speed. Compare a jog clip and a sprint clip at their contact poses and measure the spine angle; the difference is bigger than you think.

Next, the down pose, one or two frames after contact. This is where weight lives: the supporting knee compresses, the hips drop, the head dips. Count how many pixels the head travels down and up over one cycle — that vertical oscillation is what your eye reads as mass. Too little and the character skates; too much and they bounce like rubber.

The passing pose tells you about character. Watch what the arms, shoulders and head do as one leg passes the other. A soldier pumps compact arms close to the body; a scout throws loose, wide swings; an exhausted character lets the arms drag low and behind the beat of the legs. Same skeleton, entirely different acting — and all of it readable in a single frame.

Then study asymmetry. Great cycles are rarely mirror-perfect: one arm swings wider, the head favors a side, footsteps land on slightly uneven timing. Perfect symmetry is what makes CG walk cycles feel robotic. Games also blend locomotion constantly — run-to-stop, dash starts, turn-in-place, landing-to-run — and the transition clips are often more instructive than the loops, because they expose how momentum is spent and recovered.

The embedded clips below include walks, runs, dashes and stop transitions from a range of games and styles. Pick one loop, step through it, and chart the four key poses on paper with their frame numbers. Then find the same poses in a second clip at a different speed and compare the timing. Two cycles studied properly will teach you more than twenty watched at full speed.`,
  },
];

(async () => {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
    }),
  });
  const db = admin.firestore();

  for (const post of POSTS) {
    const clips = clipsByTags(post.tags, 9);
    const doc = {
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      coverImage: clips[0]?.thumbnailUrl || '',
      status: 'published',
      seoTitle: `${post.title} | Animation Reference`,
      seoDescription: post.excerpt,
      keywords: post.keywords,
      videoIds: clips.map(c => c.id),
      author: 'Animation Reference Team',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('blogPosts').doc(post.slug).set(doc, { merge: true });
    console.log(`Seeded: /blog/${post.slug} (${clips.length} clips embedded)`);
  }
  console.log('DONE');
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
