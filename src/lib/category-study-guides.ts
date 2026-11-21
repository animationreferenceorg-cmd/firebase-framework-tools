export interface StudyBeat {
  phase: string;
  frames: string;
  note: string;
}

export interface CategoryFaq {
  question: string;
  answer: string;
}

export interface CategoryStudyGuide {
  eyebrow: string;
  headline: string;
  summary: string;
  beats: StudyBeat[];
  proTips: string[];
  faqs: CategoryFaq[];
}

const GUIDES_BY_KEY: Record<string, CategoryStudyGuide> = {
  walk: {
    eyebrow: '24 FPS Locomotion Breakdown',
    headline: 'Walk Cycle Timing & Spacing Study Guide',
    summary:
      'A standard naturalistic walk cycle runs 24 frames (12 frames per step) at 24 FPS. Study weight transfer across the pelvis, counter-rotation between hips and shoulders, and clear foot-roll arcs on every contact pose.',
    beats: [
      { phase: 'Contact', frames: 'f1 & f13', note: 'Front heel strikes; hips at lowest forward travel; arms at widest swing.' },
      { phase: 'Down / Recoil', frames: 'f4 & f16', note: 'Body absorbs weight; knee bends; pelvis drops to its lowest point.' },
      { phase: 'Passing', frames: 'f7 & f19', note: 'Weight balances over planted leg; free leg passes through with clear silhouette.' },
      { phase: 'Up / High Point', frames: 'f10 & f22', note: 'Back toe pushes off; pelvis peaks just before falling into the next contact.' },
    ],
    proTips: [
      'Scrub frame-by-frame at 0.25x to check hip figure-8 translation in front and side views.',
      'Offset arm swing 1–2 frames behind torso rotation for natural drag and overlap.',
      'Import the clip straight into Maya or Blender at (0,0,0) with AnimRef Studio to match foot-contact timing directly on your rig.',
    ],
    faqs: [
      {
        question: 'How many frames is a standard walk cycle at 24 FPS?',
        answer: 'A relaxed human walk cycle is typically 24 frames (12 frames per step) at 24 FPS. Brisk walks tighten to 16–20 frames, while heavy or tired walks stretch to 28–36 frames.',
      },
      {
        question: 'How do I study walk cycle references frame-by-frame?',
        answer: 'Open any clip on AnimationReference.org and use the 24 FPS frame-step controls or 0.25x slow motion. You can also save the clip to a Moodboard and import it straight into Maya or Blender using the free AnimRef Studio plugin.',
      },
      {
        question: 'What is the most common mistake in walk cycle animation?',
        answer: 'Moving the hips straight horizontally without an up-and-down arc, or forgetting lateral weight shift over the planted foot on the passing pose.',
      },
    ],
  },
  run: {
    eyebrow: '24 FPS High-Speed Locomotion',
    headline: 'Run Cycle & Sprint Timing Study Guide',
    summary:
      'Unlike a walk, a run cycle includes an airborne flight phase where both feet leave the ground. Sprints compress to 10–14 frames per cycle at 24 FPS with aggressive forward torso lean and strong push-off extension.',
    beats: [
      { phase: 'Contact / Impact', frames: 'f1 & f8', note: 'Foot lands near center of gravity; knee absorbs shock immediately.' },
      { phase: 'Down / Squash', frames: 'f3 & f10', note: 'Deepest compression; hips drop; opposite knee drives forward.' },
      { phase: 'Push-Off', frames: 'f5 & f12', note: 'Explosive leg extension; clear diagonal line of action from toe to head.' },
      { phase: 'Airborne Flight', frames: 'f6–f7', note: 'Both feet off the ground; pelvis reaches peak height before gravity pulls down.' },
    ],
    proTips: [
      'Watch the chest lean angle — faster sprints push the center of gravity further ahead of the feet.',
      'Check elbow drive: bent 90-degree arms pump sharply backward to counterbalance hip torque.',
      'Use AnimRef Studio in Maya or Blender to nudge your reference plane ±1 frame until your contact frames align.',
    ],
    faqs: [
      {
        question: 'How many frames is a run cycle at 24 FPS?',
        answer: 'An average jog is 14–16 frames per cycle (7–8 frames per stride) at 24 FPS, while an all-out sprint compresses to 10–12 frames.',
      },
      {
        question: 'What is the main difference between a walk and a run cycle?',
        answer: 'A walk always keeps at least one foot in contact with the ground, whereas a run has a full airborne phase where both feet leave the ground simultaneously.',
      },
      {
        question: 'Can I import run cycle references directly into Maya or Blender?',
        answer: 'Yes. Install the free AnimRef Studio plugin for Maya or Blender, sign in, and drop any reference video onto a 60fps viewport image plane at (0,0,0).',
      },
    ],
  },
  combat: {
    eyebrow: '24 FPS Action & Impact Study',
    headline: 'Combat, Martial Arts & Sword Mechanics Guide',
    summary:
      'Readable combat animation lives on extreme timing contrast: a clear 4–8 frame anticipation, a lightning-fast 1–3 frame strike arc (often with a smear frame), a crisp 2–4 frame hit-stop, and a heavy follow-through settle.',
    beats: [
      { phase: 'Anticipation / Wind-Up', frames: '4–8 frames', note: 'Hips and shoulders coil opposite the strike; silhouette reads cleanly.' },
      { phase: 'Strike / Swing Arc', frames: '1–3 frames', note: 'Fastest spacing in the shot; weapon or fist traces a clean C-arc.' },
      { phase: 'Impact / Hit-Stop', frames: '2–4 frames', note: 'Brief hold or micro-vibration sells kinetic energy and weight transfer.' },
      { phase: 'Follow-Through & Recovery', frames: '8–14 frames', note: 'Momentum carries the weapon past target before feet re-plant for balance.' },
    ],
    proTips: [
      'Track the weapon tip frame-by-frame to verify a clean circular arc rather than a straight line.',
      'Notice how power starts in the planted back foot, rotates through the hips, and snaps last through the hand.',
      'Use Playblast Compare or the Maya/Blender AnimRef plugin to check your strike timing side-by-side.',
    ],
    faqs: [
      {
        question: 'How many frames should a punch or sword swing take in animation?',
        answer: 'The active strike typically spans just 1–3 frames at 24 FPS so it feels explosive, supported by 4–8 frames of clear anticipation and 8–14 frames of follow-through.',
      },
      {
        question: 'Why do action animators use hit-stop frames?',
        answer: 'Holding impact for 2–4 frames lets the viewer’s eye register the contact silhouette and dramatically amplifies the perceived weight of the blow.',
      },
      {
        question: 'Can I download combat reference contact sheets for keyframe blocking?',
        answer: 'Yes. Pro members can export high-resolution 24 FPS keyframe contact sheets and clean MP4s, plus unlimited Maya & Blender Moodboard imports.',
      },
    ],
  },
  acting: {
    eyebrow: '24 FPS Performance & Subtext',
    headline: 'Acting, Dialogue & Facial Expression Study Guide',
    summary:
      'Believable acting happens before the character speaks. Study eye-darts (which lead head turns by 2–4 frames), micro-blinks on thought changes, asymmetric facial expressions, and subtle posture shifts that reveal subtext.',
    beats: [
      { phase: 'Thought / Eye Lead', frames: '2–4f before move', note: 'Eyes lock onto the new focus before the head or shoulders turn.' },
      { phase: 'Blink on Change', frames: '3–5 frames', note: 'Fast 1–2f close, 2–3f open — hides eye-darts and punctuates new thoughts.' },
      { phase: 'Gesture Accent', frames: '6–12 frames', note: 'Hands and brows hit their apex 1–2 frames ahead of the stressed syllable.' },
      { phase: 'Moving Hold / Settle', frames: '12–24+ frames', note: 'Allow breathing room so the audience reads the emotion without twitchiness.' },
    ],
    proTips: [
      'Watch acting clips muted first — if the emotion reads without audio, the silhouette and timing are working.',
      'Favor asymmetric smiles, brow raises, and shoulder tilts over mirrored twin poses.',
      'Compare your facial playblast side-by-side with live-action acting reference inside AnimationReference.org.',
    ],
    faqs: [
      {
        question: 'How long is a natural eye blink in 24 FPS animation?',
        answer: 'A typical blink takes 4–6 frames at 24 FPS: 1–2 frames closing, 1 frame fully closed, and 2–3 frames opening.',
      },
      {
        question: 'Should dialogue lip-sync hit on the exact frame of the audio?',
        answer: 'Animators generally place key mouth shapes 1–2 frames ahead of the audio waveform so the sound and visual feel locked in sync to the human brain.',
      },
      {
        question: 'How can I study subtle acting references cleanly?',
        answer: 'Use AnimationReference.org’s frame-stepping, loop range, and 0.25x speed controls to inspect eye darts, brow timing, and head arcs frame by frame.',
      },
    ],
  },
  quadruped: {
    eyebrow: '24 FPS Creature Locomotion',
    headline: 'Quadruped & Animal Mechanics Study Guide',
    summary:
      'Quadrupeds move like two linked bipeds: the hind legs generate forward drive while the front legs catch and steer weight. Study the 4-beat walk sequence, diagonal trot pairs, and suspension phases in a full gallop.',
    beats: [
      { phase: '4-Beat Walk Order', frames: '24–32 frames', note: 'Back-left → Front-left → Back-right → Front-right, spaced evenly.' },
      { phase: '2-Beat Trot', frames: '14–18 frames', note: 'Diagonal pairs (Front-Left + Back-Right) strike together with a brief float.' },
      { phase: 'Gallop Gather', frames: '4–6 frames', note: 'Spine curls tightly as all four limbs tuck beneath the ribcage.' },
      { phase: 'Gallop Extension', frames: '4–6 frames', note: 'Spine stretches fully during airborne suspension before front paws catch.' },
    ],
    proTips: [
      'Track the scapula (shoulder blade) sliding up and down the ribcage on every front-leg plant.',
      'Tail and head act as natural counterbalances — watch their wave delay behind the spine.',
      'Drop quadruped reference clips directly onto a side-view plane in Maya or Blender using AnimRef Studio.',
    ],
    faqs: [
      {
        question: 'What is the footfall order of a quadruped walk?',
        answer: 'Most quadrupeds (dogs, cats, horses) follow a 4-beat lateral sequence: back-left, front-left, back-right, front-right.',
      },
      {
        question: 'How does a horse gallop differ from a dog gallop?',
        answer: 'Dogs and big cats have a flexible spine with two suspension phases (gathered and extended), while horses have a stiffer spine with one main gathered suspension phase.',
      },
    ],
  },
};

export function getCategoryStudyGuide(slug: string, title: string, clipCount: number): CategoryStudyGuide {
  const s = `${slug} ${title}`.toLowerCase();
  if (s.includes('walk') || s.includes('stride')) return GUIDES_BY_KEY.walk;
  if (s.includes('run') || s.includes('sprint') || s.includes('jog')) return GUIDES_BY_KEY.run;
  if (s.includes('combat') || s.includes('fight') || s.includes('sword') || s.includes('martial') || s.includes('stunt') || s.includes('punch')) {
    return GUIDES_BY_KEY.combat;
  }
  if (s.includes('act') || s.includes('dialog') || s.includes('facial') || s.includes('express') || s.includes('lip')) {
    return GUIDES_BY_KEY.acting;
  }
  if (s.includes('quadruped') || s.includes('animal') || s.includes('horse') || s.includes('dog') || s.includes('cat') || s.includes('creature')) {
    return GUIDES_BY_KEY.quadruped;
  }

  return {
    eyebrow: '24 FPS Motion Breakdown',
    headline: `${title} Animation Timing & Mechanics Guide`,
    summary: `Study ${clipCount > 0 ? `${clipCount.toLocaleString()}+ curated` : 'curated'} ${title.toLowerCase()} animation references frame by frame at 24 FPS. Focus on clear silhouettes, anticipation, weight transfer, and follow-through before polishing arcs and overlap.`,
    beats: [
      { phase: 'Anticipation', frames: '4–8 frames', note: 'Establish direction and energy opposite the main movement so the action reads clearly.' },
      { phase: 'Main Action', frames: '2–6 frames', note: 'Use widest spacing at peak velocity and check silhouette clarity on every breakdown.' },
      { phase: 'Overlap & Drag', frames: '2–5f offset', note: 'Delay secondary limbs, hair, or cloth behind the core pelvis/chest driver.' },
      { phase: 'Settle & Hold', frames: '8–14 frames', note: 'Ease smoothly into the final balanced pose so weight feels grounded.' },
    ],
    proTips: [
      `Step through ${title.toLowerCase()} clips at 0.25x speed to map key poses before blocking your shot.`,
      'Save your favorite references to an AnimRef Moodboard to sync them straight into Maya & Blender.',
      'Use Playblast Compare to verify your silhouette and timing side-by-side against real motion.',
    ],
    faqs: [
      {
        question: `How can I study ${title.toLowerCase()} animation references frame-by-frame?`,
        answer: `Open any ${title.toLowerCase()} clip on AnimationReference.org to scrub frame-by-frame at 24 FPS, adjust playback speed (0.25x–1x), and loop exact sections for blocking.`,
      },
      {
        question: `Can I import these ${title.toLowerCase()} references into Maya or Blender?`,
        answer: `Yes! Download the free AnimRef Studio plugin for Autodesk Maya or Blender to sync your saved Moodboards and drop 60fps reference planes directly at (0,0,0) in your viewport.`,
      },
      {
        question: `Are ${title.toLowerCase()} references free to use for animation practice?`,
        answer: `Free accounts can study 25 fresh references every day (plus rewatch any previously opened clip anytime) and get 15 daily Maya/Blender plugin imports. Pro unlocks unlimited library studies, MP4 downloads, and unlimited Moodboard imports.`,
      },
    ],
  };
}
