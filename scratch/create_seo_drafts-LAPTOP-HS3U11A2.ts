import path from 'path';

const topics = [
  {
    title: "Best Animation Reference Videos",
    keywords: ["animation reference", "best animation reference", "video reference", "acting reference"],
    seoTitle: "Best Animation Reference Videos for Students & Artists",
    seoDescription: "Explore our curated collection of the best animation reference videos for character acting, body mechanics, and creatures."
  },
  {
    title: "Free Animation References",
    keywords: ["free animation reference", "free reference", "body mechanics reference", "animation assets"],
    seoTitle: "Free Animation References (Body Mechanics & Acting)",
    seoDescription: "Access a library of free animation reference videos for animators of all levels. Download and study walk cycles, combat, and acting."
  },
  {
    title: "Animation Reference Library",
    keywords: ["animation library", "reference library", "motion library", "character reference"],
    seoTitle: "The Definitive Animation Reference Library | AnimationReference.org",
    seoDescription: "A comprehensive, searchable library of high-quality animation reference videos. Filter by acting, combat, body mechanics, and animals."
  },
  {
    title: "Animation Acting Reference",
    keywords: ["animation acting", "acting reference", "facial animation", "character performance"],
    seoTitle: "Animation Acting Reference & Character Performance Guide",
    seoDescription: "Study character performance and emotion. Professional acting references for close-ups, dialogue, pantomime, and physical comedy."
  },
  {
    title: "Body Mechanics Reference",
    keywords: ["body mechanics", "weight in animation", "locomotion reference", "physics in animation"],
    seoTitle: "Body Mechanics Reference (Front, Side & Slow Motion)",
    seoDescription: "Master physical weight, balance, and locomotion. Reference videos for heavy lifting, jumps, throws, and complex physical movements."
  },
  {
    title: "Maya Animation Reference",
    keywords: ["maya animation", "maya rigs", "autodesk maya", "3d animation reference"],
    seoTitle: "Maya Animation Reference & Workflow Exercises",
    seoDescription: "Reference sheets and guidelines optimized for 3D animators working in Autodesk Maya. Tips for viewport layout and timing curves."
  },
  {
    title: "Blender Animation Reference",
    keywords: ["blender animation", "blender 3d", "grease pencil", "free 3d animation"],
    seoTitle: "Blender Animation Reference & Grease Pencil Guides",
    seoDescription: "Explore reference setups and workflow optimization for Blender 3D artists. Ideal for 3D animation, rigging, and grease pencil studies."
  },
  {
    title: "Pixar Animation Exercises",
    keywords: ["pixar exercises", "animation tests", "acting exercise", "student animation"],
    seoTitle: "Pixar Animation Exercises & Reference Practice Ideas",
    seoDescription: "Practice exercises inspired by Pixar's training methods. From basic bouncing balls to advanced emotional character performance."
  },
  {
    title: "Animation Practice Ideas",
    keywords: ["animation practice", "animation ideas", "animator drills", "practice prompts"],
    seoTitle: "Animation Practice Ideas & Daily Animator Drills",
    seoDescription: "Stuck on what to animate? Browse this list of practice prompts, from weight tests to complex parkour and interaction tests."
  },
  {
    title: "Best Walk Cycle References",
    keywords: ["walk cycle reference", "walk cycles", "locomotion reference", "human walk cycle"],
    seoTitle: "Best Walk Cycle References (Front, Side & Slow Motion)",
    seoDescription: "The ultimate hub for walk cycle reference. Includes happy, sad, old, stealthy, and marching walks with timing breakdowns."
  },
  {
    title: "Animation Reference Videos for Students",
    keywords: ["student reference", "animation class reference", "basic locomotion", "acting reference"],
    seoTitle: "Animation Reference Videos for Students | Study Guide",
    seoDescription: "Curated reference packs and simple videos specifically gathered for animation students working on class assignments."
  },
  {
    title: "Free Motion Reference Videos",
    keywords: ["motion reference", "action reference", "slow motion video", "body mechanics"],
    seoTitle: "Free Motion Reference Videos (Combat, Sports & Stunts)",
    seoDescription: "Free downloadable motion reference videos showing athletic movements, parkour, weapon fights, and acrobatic jumps."
  },
  {
    title: "Acting Reference Library",
    keywords: ["acting library", "pantomime reference", "dialogue reference", "animation acting"],
    seoTitle: "Acting Reference Library (Close-ups, Gestures & Dialogue)",
    seoDescription: "A searchable collection of live-action references focused on expressions, subtext, timing, and micro-gestures."
  },
  {
    title: "Slow Motion Animation Reference",
    keywords: ["slow motion reference", "high speed camera", "animation timing", "timing reference"],
    seoTitle: "Slow Motion Animation Reference (Timing & Impact Guides)",
    seoDescription: "Timing reference shot in high frame rates. See weight, drag, anticipation, and follow-through frame-by-frame."
  },
  {
    title: "Frame-by-Frame Animation Reference",
    keywords: ["frame by frame", "keyframe reference", "pose to pose", "animation spacing"],
    seoTitle: "Frame-by-Frame Animation Reference & Breakdown Sheets",
    seoDescription: "Analyze reference clips frame-by-frame. Perfect for breakdown sheets, study charts, and precise spacing calculations."
  },
  {
    title: "Human Motion Library",
    keywords: ["human motion", "body mechanics", "kinesiology", "pose reference"],
    seoTitle: "Human Motion Library & Locomotion Database",
    seoDescription: "Anatomical and biomechanical reference videos showing exact joint angles, center of gravity shift, and muscle activation."
  },
  {
    title: "Animation Poses",
    keywords: ["animation poses", "key poses", "silhouette reference", "line of action"],
    seoTitle: "Animation Poses Reference (Key Poses & Silhouette Guide)",
    seoDescription: "Improve your character posing. Reference images and outlines highlighting lines of action, silhouettes, and clear storytelling poses."
  },
  {
    title: "Motion Capture vs Video Reference",
    keywords: ["mocap vs reference", "motion capture", "keyframe animation", "stylized motion"],
    seoTitle: "Motion Capture vs Video Reference: The Animator's Dilemma",
    seoDescription: "An in-depth article analyzing the pros and cons of using motion capture data versus traditional video reference."
  },
  {
    title: "Animation Blocking Reference",
    keywords: ["blocking reference", "pose to pose blocking", "splining guide", "animation planning"],
    seoTitle: "Animation Blocking Reference & Planning Sheet Guide",
    seoDescription: "Learn how to plan your shots. Reference material showing the transition from thumbnail sketches to step-blocking."
  },
  {
    title: "How Professional Animators Use Reference",
    keywords: ["how to use reference", "pro workflow", "reference shooting", "acting study"],
    seoTitle: "How Professional Animators Use Reference: Workflow Secrets",
    seoDescription: "Insights from studio professionals on shooting, editing, planning, and translating video references into stylized character motion."
  },
  {
    title: "Animation Reference",
    keywords: ["animation reference", "video reference", "body mechanics", "acting"],
    seoTitle: "The Ultimate Animation Reference Database",
    seoDescription: "The definitive library of video references for animators, including walk cycles, runs, jumps, acting, and creatures."
  },
  {
    title: "Walk Cycle Reference",
    keywords: ["walk cycle", "walk cycle reference", "front walk cycle", "side walk cycle"],
    seoTitle: "Walk Cycle Reference (Front, Side & Slow Motion) | Guide",
    seoDescription: "Study walk cycle mechanics. Interactive grid views, slow-motion breakdowns, and related exercises for beginners and pros."
  },
  {
    title: "Run Cycle Reference",
    keywords: ["run cycle", "run cycle reference", "running reference", "jogging cycle"],
    seoTitle: "Run Cycle Reference (Front, Side & Slow Motion)",
    seoDescription: "Learn how to animate running. Mechanics breakdown showing weight, lean, push-off force, and arm swings."
  },
  {
    title: "Acting Reference",
    keywords: ["acting reference", "character performance", "emotion reference", "dialogue"],
    seoTitle: "Character Acting Reference & Emotion Library",
    seoDescription: "Curated reference library highlighting subtext, emotional shifts, micro-expressions, and body language."
  },
  {
    title: "Fight Reference",
    keywords: ["fight reference", "combat reference", "sword fight", "parkour combat"],
    seoTitle: "Fight & Combat Reference Library (Swords, Martial Arts)",
    seoDescription: "High-impact combat reference videos. Martial arts, stunt work, weapon handling, and dynamic dynamic jumps."
  },
  {
    title: "Animal Reference",
    keywords: ["animal reference", "quadruped locomotion", "creature animation", "bird flight"],
    seoTitle: "Animal & Quadruped Reference Library",
    seoDescription: "Study quadruped and creature mechanics. Running dogs, walking horses, birds in flight, and stylized creature movements."
  },
  {
    title: "Animation Practice",
    keywords: ["animation practice", "animation exercises", "timing exercises", "posing practice"],
    seoTitle: "Animation Practice Guides & Step-by-Step Drills",
    seoDescription: "A collection of training materials, guides, and worksheets to help you practice and level up your animation skills."
  },
  {
    title: "Slow Motion Reference",
    keywords: ["slow motion", "high frame rate", "slow mo reference", "impact physics"],
    seoTitle: "Slow Motion Reference Videos (High Frame Rates)",
    seoDescription: "Slow motion references capturing muscle flutter, weight settle, and fast impacts at 120fps or higher."
  },
  {
    title: "Animation Library",
    keywords: ["animation library", "references hub", "clips index", "3d references"],
    seoTitle: "Animation Library: Curated Reference Clips & Assets",
    seoDescription: "Browse all reference categories, download files, and explore categorized clip indexes."
  }
];

function generateContent(title: string): string {
  return `# ${title} Reference & Animator Study Guide

Animation reference plays an essential role in creating believable performance, weight, and timing. In this study guide, we'll break down the key concepts, timing tips, common exercises, and principles applied to the topic of: **${title}**.

---

## When Animators Use This Reference
*Describe scenarios, class assignments, or professional situations where this specific reference is needed. Explain how to extract the essence of the motion.*

---

## Key Poses & Breakdown
Animate this locomotion or acting sequence by identifying and hitting these key poses:

- **Contact Pose**: The point where weight transitions (e.g. feet hitting the ground).
- **Passing Position**: One limb passes another, showing the highest or lowest hip transition.
- **Down Position (Settle)**: The lowest point of weight impact, showing squash and weight drag.
- **Up Position (Push-off)**: The highest point of leverage, showing stretch and anticipation.

---

## Timing & Spacing Tips
*Provide tips on frames, easing, arcs of motion, and frame rates. Focus on how the hips translate weight and how extremities follow arcs.*

---

## Common Mistakes to Avoid
1. **Lack of Weight / Settle**: If the hips do not move up and down, the character will look floaty.
2. **Slipping Feet**: Spacing must lock to the ground speed to prevent sliding viewport artifacts.
3. **Stiff Upper Body**: Ensure there is rotation, drag, and tilt in the torso and neck to offset lower body action.

---

## Practice Exercises
- **Level 1 (Beginner)**: Keep it simple. Animate a blocky rig or stick figure focusing purely on timing and primary arcs.
- **Level 2 (Intermediate)**: Add secondary actions like clothing drag, hair overlap, and hand offsets.
- **Level 3 (Advanced)**: Integrate dialogue or character-specific emotion (e.g., proud, tired, stealthy).

---

## Classic Animation Principles Applied
*Explain how the 12 principles of animation (especially Timing, Squash & Stretch, Anticipation, Exaggeration, and Arcs) apply to this reference.*
`;
}

async function runDraftCreation() {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  const admin = await import('firebase-admin');
  const { getAdminApp, getFirestore } = await import('../src/lib/firebase-admin');
  getAdminApp();
  const db = getFirestore();

  console.log("----------------------------------------");
  console.log(`Starting generation of ${topics.length} draft SEO articles...`);
  console.log("----------------------------------------");

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const slug = topic.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    try {
      const postsRef = db.collection('blogPosts');
      const existing = await postsRef.where('slug', '==', slug).limit(1).get();

      if (!existing.empty) {
        console.log(`[${i + 1}/${topics.length}] ⏩ Article already exists. Skipping: ${topic.title}`);
        skippedCount++;
        continue;
      }

      const docRef = postsRef.doc();
      const article = {
        id: docRef.id,
        title: topic.title,
        slug: slug,
        content: generateContent(topic.title),
        excerpt: topic.seoDescription,
        coverImage: "",
        seoTitle: topic.seoTitle,
        seoDescription: topic.seoDescription,
        keywords: topic.keywords,
        status: 'draft',
        videoIds: [],
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        author: "Animation Reference Team"
      };

      await docRef.set(article);
      console.log(`[${i + 1}/${topics.length}] 🎉 Created draft: "${topic.title}" (Slug: /blog/${slug})`);
      createdCount++;
    } catch (err: any) {
      console.error(`❌ Error creating article "${topic.title}":`, err.message || err);
    }
  }

  console.log("\n----------------------------------------");
  console.log(`Process Completed!`);
  console.log(`Created: ${createdCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log("----------------------------------------");
}

runDraftCreation().catch(console.error);
