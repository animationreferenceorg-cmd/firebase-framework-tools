import type { BlogPost } from './types';

export const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    id: 'smear-frames-in-3d-animation-guide',
    slug: 'smear-frames-in-3d-animation-guide',
    title: 'Smear Frames in 3D Animation: Maya and Blender Guide',
    seoTitle: '3D Smear Frames in Maya & Blender',
    seoDescription: 'Master smear frames in 3D animation using Maya blendshapes and Blender lattice modifiers. Study 24 FPS timing, multi-limb rigs, and reference breakdowns.',
    excerpt: 'Smear frames give fast 3D motion an authored silhouette that motion blur cannot match. A practical Maya and Blender guide to blendshapes, lattices, and multi-limbs.',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    author: 'Animation Reference Team',
    keywords: [
      'smear frames in 3d animation',
      'maya smear frame tutorial',
      'blender smear frame',
      '3d animation multiples',
      'stylized 3d animation',
      'sakuga smears in 3d',
      'animation reference study'
    ],
    videoIds: ['sakugabooru-83563', 'sakugabooru-83658', 'sakugabooru-83753', 'sakugabooru-84422', 'sakugabooru-67316', 'sakugabooru-68142'],
    createdAt: { seconds: 1730310000 },
    updatedAt: { seconds: 1730310000 },
    content: `## Key Takeaways

- **A smear frame is an authored pose** that gives fast motion a designed silhouette, which motion blur alone cannot provide.
- **Build smears with blendshapes in Maya or lattice and shape-key deformation in Blender**, keyed to hold on exactly one frame.
- **Keep smear geometry on separate controls or layers** so the base render mesh stays clean for close-ups and reused shots.
- **Use multi-limb multiples** when the action needs discrete contact poses along the arc, such as punches or run cycles.
- **At 60fps a single-frame smear reads as a glitch**, so hold it across two or three frames or drive it dynamically by velocity.
- **Study reference frame by frame first**: Use our curated [smears reference library](https://animationreference.org/category/smears) and [frame-by-frame player](https://animationreference.org/frame-by-frame-player) to analyze contact frames and smears before rigging.

Smear frames in 3D animation are deliberately distorted meshes or duplicated limbs rendered on fast-moving frames, giving a single frame the blurred, stretched energy of a hand-drawn smear. Motion blur alone softens edges but cannot exaggerate arcs or spacing the way a real smear can. Below are three practical techniques, with rig and scene setup for Maya and Blender.

---

## What are smear frames in animation?

A smear frame is a single, deliberately distorted drawing or deformed mesh that fills one frame of fast action, bridging two readable poses so the eye registers speed instead of a pop. Animators draw them on 1s, one unique frame per exposure, and stretch limbs, smear features, or duplicate the silhouette across the frame. 

The vocabulary matters when you're breaking down shots: smears, multiples (repeated copies of a limb or object in one frame), and blur frames each do slightly different jobs. Sakugabooru tags thousands of examples if you want to study them frame-by-frame, and our curated [smear breakdowns](https://animationreference.org/category/smears) collect deconstructed shots directly linked to our study tools.

### Smears vs. Multiples vs. Blur Frames

- **Smear frame**: Distorts one continuous shape along the line of action.
- **Multiple**: Repeats distinct copies of a body part (like four hands fanning behind a waving arm) across a single frame.
- **Blur frame**: Approximates optical motion blur by hand using dry-brush smears or soft alpha gradients.

The distinction comes straight from classic hand-drawn practice, summarized in the [twelve principles of animation](https://animationreference.org/resources/12-principles-of-animation-reference), where distortion and exaggeration serve visual readability. In 3D the same choices apply, just through deformed meshes, lattices, and proxy rigs instead of redrawn animation cels.

---

## Why do 3D animators need smears when motion blur exists?

### Motion blur vs. smear: what each one communicates

Motion blur and smears solve fundamentally different visual problems. Blur is a rendering artifact: it says "this object moved fast" by averaging positions across the camera shutter window. A smear is an authored pose: it says "this motion has a shape," with a silhouette you designed on 1s that reads with punchy clarity at 24fps.

Blur alone tends to read as soft mush. It lowers contrast across the fast area, so the eye gets a gray haze of limb instead of a readable arc. A drawn or deformed smear keeps a hard silhouette, which is why stylized and cartoon projects in [3D animation](https://animationreference.org/category/3d-animation) build them by hand.

| Feature | Motion Blur | Smear Frame |
| :--- | :--- | :--- |
| **Source** | Camera / Render engine calculation | Hand-authored pose by the animator |
| **Visual Read** | Speed, softness, motion trail | High energy, dynamic shape, crisp silhouette |
| **Best For** | Realistic camera moves & background motion | Snappy stylized hits, take-offs, whips, and reversals |
| **Frame Control** | Automatic per shutter angle | Keyed exactly on 1s to control spacing & arcs |
| **Tooling** | Built-in render settings (Cycles, Arnold) | Maya blendshapes, Blender lattices, or multiples |

Choose blur for realistic camera moves and continuous physics. Choose a smear for fast accents: take-ons, impacts, whip pans of a hand, or weapon slashes. Many studio-quality shipped shots use both in tandem.

---

## How do you create a smear frame using mesh deformation in 3D?

Mesh deformation smears stretch the actual geometry across the arc between two poses, so the smear lives on the model instead of requiring a 2D compositing overlay. Pick the technique based on how long the smear holds: blendshapes for a single snappy move, lattice or sculpt deformation for anything you want to art-direct by hand.

### Blendshape smear setup in Maya

1. **Duplicate the mesh** at the contact pose or extreme breakdown.
2. **Sculpt the duplicate** into the stretched smear shape along the vector of travel, matching the line of action.
3. **Wire it as a blendshape target** on the character mesh.
4. **Key the blendshape weight** to 1 on the smear frame and 0 on the frames immediately before and after, keyed with stepped or zero-length tangents so it snaps instantly on and off.
5. **Drive the weight with a set-driven key** off the joint translation velocity if you want the smear to fire automatically whenever the arm moves past a speed threshold.

If you are animating in Maya, you can install the **AnimRef Maya Plugin** to import reference clips and scrub them synchronously in your Maya viewport, comparing your blendshape smear against real martial arts or sakuga reference frame by frame.

### Lattice and sculpt smear in Blender

1. **Add a Lattice modifier** around the deforming limb and parent it to an offset control.
2. **Keyframe the lattice points** pulling the mesh along the motion arc on the breakdown frame.
3. **Animate the modifier influence** from 0 to 1 to 0 across three frames (0 on frame 1, 1 on frame 2, 0 on frame 3).
4. For finer anatomical control, sculpt the smear as a **Shape Key** instead and key its Value slider with constant or vector interpolation.
5. **Check the result with motion blur enabled**: Blender's per-object velocity and shutter settings live in the render properties. A smear combined with an overly wide shutter angle can double the stretch into an unreadable mess.

Blender users can take advantage of the **AnimRef Blender Addon** to dock reference videos alongside the 3D viewport, matching the lattice stretch directly to live-action or anime reference clips.

### Keeping the smear on exactly one frame

Key the smear's weight or influence with zero-length holds: same value on the smear frame, then a hard cut to 0 on the next. Step through on 1s with frame stepping to confirm it only reads on the intended frame. 

A punch reference board is an ideal place to study how long a smear should hold before snapping into the target; we broke down contact-pose timing in our [punch animation reference guide](https://animationreference.org/resources/punch-animation-reference).

---

## How do you animate a smear frame on a rig without breaking the model?

The golden rule of 3D smears: **never deform the base render mesh directly with destructive smear geometry.** Build the smear on separate controls or dedicated proxy layers so the base rig stays pristine for close-ups, playblasts, and other shots in the pipeline.

### Separate smear controls from the base rig

- **Maya setup**: Place smear geometry (stretched NURBS surfaces or a lattice-driven proxy) on its own display layer or under a dedicated \`smear_geo\` group, driven by an offset smear control parented under the main hand or head controller. Set the smear meshes to primary visibility off during normal scenes so they never render accidentally.
- **Blender setup**: Use a separate armature or a bone collection outside the main deformation rig, and disable smear objects in render settings by default. Keep the deform rig's primary shape keys and corrective smooths untouched so spacing experiments never bake bad weights into the skinning.

This isolation also prevents smears from bleeding into shots that reuse the asset. A smear that reads brilliantly on 1s in a fast action shot can wreck a moving hold in the character's subsequent dialogue scene. This is why reference study on holds and smears belongs together; see our breakdown on [moving holds in animation](https://animationreference.org/resources/moving-hold-animation-reference).

---

## When should you use a multi-drawn or multi-limb smear in 3D?

A single stretched mesh works when one shape cleanly carries the motion. Reach for a multi-limb smear when the action needs discrete contact poses along the arc: a rapid flurry punch where the fist should occupy two or three positions on the same frame, or a frantic run cycle where each leg needs its own visible trail. 

Multiples read cleaner on 1s than one giant stretched blob because the human eye tracks repeated recognizable silhouettes the way it reads classic hand-drawn Sakuga.

### Multi-limb setup for a punch or swing

1. **Maya workflow**: Duplicate the arm's joints and bind copies of the forearm and fist geometry to them. Keyframe each duplicate at successive contact positions across one or two frames. Use blendshapes to interpolate between copies if you require softer transitions.
2. **Blender workflow**: Duplicate the armature bones and mesh, keying the copies on staggered frames inside the smear window. Hide the original mesh with scale-to-zero keys so only the multiples render.

Tradeoff note: Multi-limb smears multiply rig complexity and can glitch during viewport playblasts if copies pop outside the smear window. Keep them on separate animation layers so you can mute them during team reviews. 

The same frame-stepping discipline applied when analyzing [walk cycle locomotion](https://animationreference.org/resources/human-walk-cycle-animation-reference) applies here: step through the smear frame by frame and ensure each silhouette reads independently.

---

## How do you make a smear read correctly at 24fps vs. 60fps renders?

A smear on 1s in a 24fps stylized shot reads as an intentional drawing because it occupies roughly 42 milliseconds of screen time. Render that same pose at 60fps and it flashes by in under 17 milliseconds; viewers will parse it as a glitch or a broken mesh rather than intended velocity.

At higher frame rates (such as 60fps game engines), you must either hold the smear across two or three frames, or switch to a velocity-driven shader approach where the deformation scales smoothly with the speed of the root bone.

### Playblasting to check the read

Playblast the shot at your target frame rate, not at the viewport's arbitrary default, before committing to the deformation. Step frame-by-frame through the smear: if it only reads when paused, it is decorative clutter, not motion. 

Then render a 60fps version and compare. If the smear looks like a modeling defect at 60fps, split it across additional frames or transition to velocity-based scaling. Compare both 24fps and 60fps versions side-by-side using the [Animation Reference Player](https://animationreference.org/frame-by-frame-player) to verify the visual read.

---

## What do smear frames look like in shipped 3D films and games?

Stylized 3D feature films (such as *Spider-Verse*, *Puss in Boots: The Last Wish*, and *The Peanuts Movie*) are masterclasses in 3D smears: animators stretch meshes, flatten planes, and duplicate limbs on contact poses and fast turns, executing 2D multi-draw techniques directly in 3D space. 

Game animation uses them extensively in melee attacks, dodges, and character transitions where a single frame must communicate impact without compromising input responsiveness.

### Building a smear reference board for your reel

Before opening Maya or Blender, collect 5 to 10 reference clips that feature the specific smear style you want:
- Single-frame stretched sword trails (see our [Sword Animation Reference Guide](https://animationreference.org/blog/sword-animation-reference-guide)).
- Multi-limb flurry punches.
- Exaggerated head whip-pans and blinks.

Organize them into a dedicated study board on [Animation Reference](https://animationreference.org/categories). Our browser-based player provides sub-frame precision, drawing tools to trace the smear's line of action, and loop points for continuous review.

---

## How should you practice smears for your reel?

1. **Pick one clear body-mechanics shot**: A heavy cross punch, a baseball swing, or a whip pan head turn.
2. **Block the key extremes first on 1s**: Make sure the anticipation and contact poses are completely readable before introducing deformation.
3. **Add the smear on exactly one frame**: Place it one or two frames before contact, pulling the silhouette directly along the motion trajectory.
4. **Playblast at 24fps**: Step frame-by-frame against your reference clips. If the smear reads as muddy gray rather than a dynamic snap, narrow the deformation or shorten the hold.
5. **Publish to your portfolio**: Showcase your playblast alongside the frame-by-frame breakdown on your [Animation Reference Portfolio](https://animationreference.org/portfolio) to show recruiters you understand kinetic timing, not just button pressing.

---

## Frequently Asked Questions

### Are smear frames cheating or bad practice in 3D animation?
No. A smear frame is an authored artistic pose, identical in purpose to a squash-and-stretch keyframe. Shipped blockbuster films and AAA action games use them deliberately because render-engine motion blur cannot provide an art-directed silhouette. The only bad practice is deforming the base render mesh destructively, which breaks close-up shots.

### Do smear frames work in realistic or PBR-style 3D, or only cartoony projects?
They work predominantly in cartoony or stylized projects. A hard-edged stretched silhouette can clash with photorealistic PBR shaders, raytraced lighting, and simulated cloth. In realistic animation, subtle velocity-based sub-frame stretch and physical motion blur provide the expected naturalism.

### Can I add smears in post with compositing instead of animating them in 3D?
You can use directional blurs or vector distortion in compositing, but you lose artistic control over the shape. 2D post-processing averages pixels blindly rather than authoring an intentional silhouette. Building smears in 3D ensures the deformation honors camera perspective and lighting.

### How many frames should a smear last?
At 24fps, a smear should last exactly one frame (approx. 42ms). Holding a smear for multiple frames at 24fps makes the character appear rubbery or broken. At 60fps, however, you can hold the smear for 2 to 3 frames so the eye has sufficient time to register the visual arc.`
  },
  {
    id: 'photoshop-frame-by-frame-animation-plugin',
    slug: 'photoshop-frame-by-frame-animation-plugin',
    title: 'Photoshop Frame by Frame Animation Plugin: Real Options',
    seoTitle: 'Photoshop Animation Plugin Options',
    seoDescription: 'Compare Photoshop frame-by-frame animation plugins with native Timeline tools. Breakdown onion skinning, sprite sheets, UXP compatibility, and reference workflows.',
    excerpt: "Photoshop's native Timeline handles basic 1s and 2s, onion skinning, and GIF exports. Here is when to buy a plugin, when to stay native, and why dedicated reference tools beat both.",
    coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    author: 'Animation Reference Team',
    keywords: [
      'photoshop frame by frame animation plugin',
      'photoshop animation plugin',
      'photoshop 2d animation',
      'photoshop timeline onion skin',
      'photoshop sprite sheet export',
      'animation reference study'
    ],
    videoIds: ['sakugabooru-83563', 'sakugabooru-83658', 'sakugabooru-83753', 'sakugabooru-84422', 'sakugabooru-67316', 'sakugabooru-68142'],
    createdAt: { seconds: 1730300000 },
    updatedAt: { seconds: 1730300000 },
    content: `## Key Takeaways

- **Photoshop's built-in Timeline already handles frame-by-frame animation**, onion skinning, GIF export, and numbered PNG sequences without any plugin.
- **Plugins mainly add keyboard-driven frame stepping**, better onion-skin controls, and sprite sheet export, so buy one only if those gaps hurt your workflow.
- **Check a plugin's last supported Photoshop version before paying**, since legacy CEP panels often break silently after major updates while modern UXP plugins stay current.
- **For sprite sheets use an export plugin**, for GIFs use built-in Save for Web, and for video or image sequences use built-in Render Video.
- **For frame-stepping sakuga reference and building study boards**, a dedicated platform like [Animation Reference](https://animationreference.org) serves better than any Photoshop plugin.

Short answer: you don't need a Photoshop frame by frame animation plugin for most student reel work. Photoshop's built-in Timeline already handles frame-by-frame on 1s or 2s, onion skinning, GIF export, and sprite sheets; plugins mainly add onion-skin controls, video layer timing, and export niceties. If your deliverable is a walk cycle or body mechanics test under a few hundred frames, stay in Photoshop. If you're frame-stepping sakuga for reference or building a reel, a dedicated tool will serve you better, and this guide maps each option to the specific use case where it wins.

---

## What can a Photoshop frame by frame animation plugin do that the built-in Timeline cannot?

### What the Timeline already does well

Photoshop's Timeline panel handles straight-ahead frame animation natively: you can create frame animations, set frame delays, toggle layer visibility per frame, and tween positions, and it exports GIFs without a plugin. Adobe's own documentation covers the full workflow in its frame animation guide. For a short walk cycle rough or a smear test on 1s and 2s, that is genuinely enough.

### The gaps animators actually hit

The pain starts with frame stepping and study. The Timeline has no scrub bar with per-frame thumbnails, no frame numbering overlay, and no way to loop a range at variable speed while you draw over it. Onion skinning exists only as a limited video-layer feature, not true multi-frame ghosting. Export automation is another gap: sprite sheets and numbered PNG sequences need manual layer slicing or scripting.

Plugins patch playback controls, onion skinning, and export. But if your actual job is studying sakuga clips frame-by-frame and building reference boards for your reel, a dedicated player like the [frame-by-frame reference player](https://animationreference.org/frame-by-frame-player) does that without a Photoshop license at all.

---

## Which Photoshop animation plugins work with the latest Photoshop version?

Photoshop has migrated to the UXP plugin platform, and many older CEP and Flash-era extensions stop working after major version updates. A plugin that ran on Photoshop 2022 can silently fail on 2024 without the developer updating the manifest. Check the plugin's listing page for the last supported version and its update date before you pay.

### Why old plugins break after Photoshop updates

Adobe deprecates legacy APIs with each release, so tools that hook into the Timeline or export pipeline are the first to break. If a plugin's page shows no update in over a year, assume risk.

### How to check compatibility in five minutes

Install the free trial version, run your actual workflow, frame stepping through a walk cycle, and export one GIF or sprite sheet. If the plugin survives that, it survives your reel. For motion study and reference boards outside Photoshop, a browser-based platform like [Animation Reference](https://animationreference.org/home) sidesteps version compatibility entirely.

---

## Which plugin is best for exporting sprite sheets and GIFs?

For game-ready sprite sheets, a dedicated export plugin beats Photoshop's Timeline, which only renders video or image sequences natively. For GIFs, the built-in "Save for Web" export is usually enough without any plugin at all.

### Decision matrix: deliverable to tool

| Deliverable | Best Route | Why |
| :--- | :--- | :--- |
| **Sprite sheet** | Export plugin | Auto-packs frames into a grid with consistent cell sizes |
| **GIF** | Built-in Save for Web | Lossy palette control, no plugin needed |
| **Image sequence** | Built-in Render Video | Numbered PNG/TARGA frames for comp in After Effects |
| **Video (mp4)** | Built-in Render Video | Direct H.264 render |
| **Reference Study** | [Animation Reference Player](https://animationreference.org/frame-by-frame-player) | Scrubbing 24 FPS video with draw-over tools and frame stepping |
| **Reel Showcase** | [Animation Reference Portfolio](https://animationreference.org/portfolio) | Free, studio-grade portfolio hosting for student & pro reels |

### Sprite sheet workflow

Set your Timeline to frame animation, keep every frame on one canvas layer group, then use a sheet plugin to slice frames into columns and rows. Match your engine's cell size before exporting, or the spritesheet will drift. If you're studying spacing and arcs before committing to keys, it's worth reviewing [how to analyze animation reference](https://animationreference.org/resources/how-to-analyze-animation-reference) first so the sheet cycles cleanly.

### GIF export workflow

File > Export > Save for Web, set looping to Forever, and dither on 2s holds to keep file size sane. Plugin pricing on [Adobe Exchange](https://exchange.adobe.com/) varies, so check the listing before buying.

---

## How do you install a frame by frame animation plugin in Photoshop?

### Install from the Creative Cloud marketplace

Open the Creative Cloud desktop app, go to Stock & Marketplace > Plugins, and search for the animation plugin you want. Click Install, then restart Photoshop. Most plugins appear under Plugins > Plugin Panel or in the Window menu once Photoshop relaunches. Keep Photoshop and the Creative Cloud app updated to the same release cycle, since a plugin built for an older version can fail to load after a major update.

### Manual install and troubleshooting

If a plugin ships as a .zxp file, install it with a third-party ZXP installer rather than double-clicking the file. If a plugin shows up in the marketplace but not inside Photoshop, sign out and back into Creative Cloud, then reinstall. Plugins that still refuse to load often sit in the wrong folder: check Plug-ins inside your Photoshop application folder, not the shared Common Files location.

### Verify the plugin loaded

Open a document, enable the Timeline (Window > Timeline), and step a few frames with the plugin's controls. If frame stepping works and the panel persists after a restart, you are set. For a first practice clip, a short sword swing works well; this [sword animation reference guide](https://animationreference.org/blog/sword-animation-reference-guide) breaks down contact poses and smears you can rebuild frame by frame.

---

## How do you set up your first frame by frame animation in Photoshop after installing a plugin?

### Document and timeline setup

Start a small canvas, 960 by 540, so playback stays smooth. Open Window > Timeline, choose Create Frame Animation, and set the frame rate to 12 fps in the timeline panel menu. Each drawing gets its own layer; Photoshop treats layers as frames, so name them frame_001, frame_002 and keep a clean contact pose on frame one before you animate anything.

### Drawing on 1s and 2s with onion skinning

The honest workflow: turn on Timeline > Onion Skin Frames and set the count to two or three frames before and after, so you can see spacing and arcs between contact poses. Most students animate on 2s, drawing every second frame, then add in-betweens on 1s only where a smear or fast action needs it. A plugin earns its keep here by letting you step frames with a keyboard shortcut, toggle onion skin opacity per layer, and scrub without touching the mouse, which the built-in Timeline makes clunky. 

That shortcut-driven stepping matters more than any export feature, because frame stepping is where you actually spend your hours. If a plugin's docs are stale, check whether it ships as UXP rather than a legacy CEP panel, since Adobe is retiring the old format ([Adobe UXP docs](https://developer.adobe.com/photoshop/uxp/)).

### Checking spacing and arcs before export

Flip playback between 1s and 2s, then flip between the first and last frames of an action to read the arc. Save a copy to your reel page, for example a portfolio like [Animation Reference](https://animationreference.org/portfolio), and keep the layered PSD as your master.

---

## What does each option cost and is there a free option?

### Cost comparison table

Photoshop runs on a subscription, so your baseline cost recurs every month whether you animate or not. Plugins are typically one-time purchases, which is cheaper long-term if Photoshop already covers your frame stepping, onion skinning, and export needs. Dedicated tools split between one-time licenses and subscriptions. 

Our platform is $5/mo Pro with a $1 intro price, and the reference and study features sit on a free tier, so frame-by-frame study of sakuga clips costs nothing to start.

### Free options for students

If you're a student, check what your school already provides. Many animation programs license Adobe for you, which makes the Photoshop subscription cost disappear. Our site lists "100% Free For Artists & Students" on the homepage and runs a student pass through partner programs, including San Jose State University. Between a campus Adobe license and a free reference tier on [Animation Reference](https://animationreference.org), you can build a full study-and-reel workflow before paying anything out of pocket.

---

## When should you leave Photoshop for a dedicated animation tool instead?

### Where Photoshop breaks down for animators

Photoshop handles short loops fine, but long sequences get heavy fast: playback stutters on 1s, frame stepping through a 200-frame shot with smears and multiples is clumsy, and exporting video means rendering the whole timeline out each time. There's no lightweight scrubbing, no sakuga-style tagging, and no way to build reference boards.

### Dedicated tools compared honestly

- **[Sakugabooru](https://www.sakugabooru.com/)**: Tagged community animation clips, but carries a bare-bones video player with no native draw-over or shot board tools.
- **PureRef**: Great for static image boards on desktop, but doesn't play or frame-step synchronized video clips.
- **[Animation Reference](https://animationreference.org)**: Combines studio-grade playback controls (frame stepping on 1s and 2s, custom looping ranges, draw-over tools), organized reference boards, and [student portfolio hosting](https://animationreference.org/portfolio). Honest limits: it's browser-based, so it won't replace Maya playblasts or Blender for producing 3D animation, and its clip library is curated rather than an unmoderated scrape.

### Where our own platform falls short too

If your goal is drawing frames, not studying them, a dedicated animation program (like TVPaint, Clip Studio Paint, or Toon Boom Harmony) beats both Photoshop and us. Use Photoshop for short tests, [Animation Reference](https://animationreference.org) for reference study, and your 3D package (Maya or Blender) for playblasts.

---

## How do you build a reference and study workflow around Photoshop?

### Studying reference frame by frame

Keep your reference study separate from your drawing tool. Photoshop's Timeline can scrub video, but it lacks the frame-stepping controls animators rely on: precise stepping on 1s and 2s, onion skinning over playback, and marking smears or contact poses as you go. 

Watch a sakuga clip or your own playblast in the [Frame-by-Frame Player](https://animationreference.org/frame-by-frame-player), step through the spacing and arcs, and note where the body mechanics break down before you touch the Timeline.

### Building a reference board for your shot

Collect clips for the specific shot you're animating: a [walk cycle](https://animationreference.org/resources/human-walk-cycle-animation-reference) for locomotion, a turn for weight shift, a jump for timing. Organize them per shot rather than in one big pile, so the reference you need is next to the frames you're drawing. Once a study session ends, move into Photoshop and thumbnail from what you absorbed, not from a paused screenshot.

---

## Frequently Asked Questions

### Can you do frame by frame animation in Photoshop without any plugin?
Yes. The built-in Timeline panel creates frame animations where each layer acts as a frame, supports frame delays, tweening, and GIF export through Save for Web. For a short walk cycle or smear test on 1s or 2s, that covers the core workflow. Plugins only add niceties like better onion skinning, keyboard-driven frame stepping, and sprite sheet export.

### Why is my Photoshop animation playback so laggy with lots of layers?
Photoshop treats every layer as a frame, so heavy documents with large canvases and many layers choke playback, especially on 1s over long shots. Shrink the canvas to something like 960 by 540, flatten or merge holds, and keep sequences under a few hundred frames. For longer shots with smears and multiples, study the timing first using an external [frame-by-frame player](https://animationreference.org/frame-by-frame-player).

### Do Photoshop animation plugins work on iPad or only desktop?
Photoshop on iPad does not support the desktop plugin ecosystem, and UXP plugins are built for the desktop application. If a plugin is central to your workflow, plan to animate on desktop. Check the plugin's listing page for the last supported Photoshop version before buying, since legacy panels often break after major updates.

### How do I export a Photoshop frame animation as a PNG sequence for After Effects or Premiere?
Use File > Export > Render Video and choose an image sequence format like PNG or TARGA, which produces numbered frames ready for compositing. The Timeline cannot export sprite sheets natively, so that route needs an export plugin or manual slicing. Keep your layered PSD as the master file before rendering the sequence out.

### Is Photoshop good enough for a 2D animation reel, or do studios expect other software?
For short tests like walk cycles and body mechanics, Photoshop is genuinely enough, and many students build reel pieces entirely in it. Studios hiring for production 2D typically expect dedicated programs such as Toon Boom Harmony or Clip Studio Paint, plus 3D tools for playblasts. Use Photoshop for tests, [Animation Reference](https://animationreference.org) for studying timing, and showcase your finished pieces on an [animation portfolio](https://animationreference.org/portfolio).`
  },
  {
    id: 'sword-animation-reference-guide',
    slug: 'sword-animation-reference-guide',
    title: 'Sword Animation Reference: How to Study Blade Combat Frame by Frame',
    seoTitle: 'Sword Combat Animation Reference',
    seoDescription: 'Study sword animation reference frame by frame: break down anticipation, smears, contact frames, and follow-through for lethal 2D and 3D game combat.',
    excerpt: 'What separates a floaty sword swing from one that feels lethal? A practical guide to studying sword animation reference: anticipation, smears, contact frames and follow-through.',
    coverImage: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    author: 'Animation Reference Team',
    keywords: ['sword animation reference', 'sword attack animation', 'blade combat animation', 'melee animation reference', 'game combat animation'],
    videoIds: ['sakugabooru-84422', 'sakugabooru-83563'],
    createdAt: { seconds: 1729000000 },
    updatedAt: { seconds: 1729000000 },
    content: `A sword swing that feels dangerous is never about the swing itself. When you scrub great blade combat frame by frame, the actual cut usually lasts two or three frames — everything that sells the hit lives in the frames around it.

Start with the anticipation. In almost every strong sword animation you will find a wind-up pose held far longer than you expect, often a third of the whole action. The character coils, weight shifts to the back foot, the blade drags slightly behind the hands. This is the frame range to study first: pause on the deepest anticipation pose and ask what the hips, shoulders and blade angle are each doing. In game animation this pose is also the "read" that tells the player an attack is coming, which is why combat-heavy games exaggerate it so hard.

Then step through the attack itself one frame at a time. You are looking for three things. First, smear frames — single frames where the blade stretches into an arc or multiplies. They look broken in isolation and perfect at speed. Second, the contact frame: the hit almost always lands on a pose held for one or two frames with the body fully committed, chest open, weapon at maximum extension. Third, the speed difference: count how many frames the wind-up takes versus the strike. Ratios of five-to-one are common. If your own attack feels floaty, this ratio is usually the problem.

Follow-through is where weight lives. After contact, the blade keeps travelling and drags the body with it — the character does not simply return to idle. Watch how the back foot slides, how the spine counter-rotates, how the free arm swings to balance the weapon's momentum. Heavier weapons like greatswords push this even further: the recovery is longer than the attack, and skipping it is exactly why student animations feel weightless.

Finally, study attacks in series. Combo strings (2-hit, 3-hit) reuse the follow-through of one attack as the anticipation of the next, which is a masterclass in overlapping action. Load a 3-hit combo clip, step through the transition frames between hits, and note how the animators never let the energy fully settle.`
  },
  {
    id: 'hit-reaction-animation-reference',
    slug: 'hit-reaction-animation-reference',
    title: 'Hit Reaction Animation Reference: Making Impacts Feel Heavy',
    seoTitle: 'Hit Reaction Animation Reference',
    seoDescription: 'Learn to study hit reactions frame by frame: the snap, the stagger, the recovery — and why the first two frames matter more than everything after.',
    excerpt: 'Impacts sell the fight. Learn to study hit reactions frame by frame: the snap, the stagger, the recovery — and why the first two frames matter more than everything after.',
    coverImage: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    author: 'Animation Reference Team',
    keywords: ['hit reaction animation', 'impact animation reference', 'damage animation', 'knockback animation', 'game feel animation'],
    videoIds: ['sakugabooru-83563', 'sakugabooru-83753'],
    createdAt: { seconds: 1729100000 },
    updatedAt: { seconds: 1729100000 },
    content: `Players never see the sword — they see what it does to the target. Hit reactions are half of every impact, and they are one of the highest-leverage skills a game animator can build, because a mediocre attack paired with a great reaction still feels great.

The core principle: the first two frames do all the work. Scrub any strong hit reaction and you will find the head and chest snap away from the impact point almost instantly — often reaching the extreme pose within two or three frames. There is no ease-in. The body is hit by an external force, so it accelerates instantly, then spends the rest of the animation decelerating. If your reaction eases into its extreme, it reads as flinching, not being hit.

Direction matters as much as speed. Good hit reactions are directional: a blow from the left sends the head right, a rising strike lifts the chest, a heavy slam folds the character over. Study how the impact point drives the chain of motion — hips lag behind chest, arms lag behind shoulders, and the weapon or props trail last. This successive breaking of joints is pure overlapping action, and it is easiest to learn by stepping through reference one frame at a time.

Then look at the stagger. Between the snap and the recovery there is almost always a stumble: a step or two to catch balance, weight visibly on the heels, arms windmilling slightly. The stagger is what communicates how hard the hit was — light hits skip it entirely, heavy hits extend it. Games tune combat feel largely by choosing which tier of reaction to play, so reference libraries sort these into light hit, heavy hit, knockback and knockdown for a reason.`
  },
  {
    id: 'run-cycle-locomotion-animation-reference',
    slug: 'run-cycle-locomotion-animation-reference',
    title: 'Run Cycle & Locomotion Animation Reference from Real Games',
    seoTitle: 'Run Cycle Locomotion Animation',
    seoDescription: 'Break down contact, down, passing, and up poses in game run cycles. Learn to analyze locomotion timing, weight, and asymmetry frame by frame.',
    excerpt: 'Contact, down, passing, up: a practical guide to studying run and walk cycles from shipped games, and what to look for in each key pose when you scrub frame by frame.',
    coverImage: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80',
    status: 'published',
    author: 'Animation Reference Team',
    keywords: ['run cycle animation reference', 'locomotion animation', 'walk cycle reference', 'game locomotion animation', 'running animation study'],
    videoIds: ['sakugabooru-83658', 'sakugabooru-67316'],
    createdAt: { seconds: 1729200000 },
    updatedAt: { seconds: 1729200000 },
    content: `Every locomotion cycle is built on the same four poses — contact, down, passing, up — but what separates a serviceable run from a memorable one is everything layered on top of that skeleton. The fastest way to learn the difference is to scrub real, shipped game cycles one frame at a time.

Start by finding the contact frames: the moments a foot first touches the ground. Pause there. In a strong run the body is never upright at contact — the chest leads, the hips trail, and the whole character falls forward from stride to stride. Running is controlled falling, and the amount of forward lean is the single clearest signal of speed. Compare a jog clip and a sprint clip at their contact poses and measure the spine angle; the difference is bigger than you think.

Next, the down pose, one or two frames after contact. This is where weight lives: the supporting knee compresses, the hips drop, the head dips. Count how many pixels the head travels down and up over one cycle — that vertical oscillation is what your eye reads as mass. Too little and the character skates; too much and they bounce like rubber.

The passing pose tells you about character. Watch what the arms, shoulders and head do as one leg passes the other. A soldier pumps compact arms close to the body; a scout throws loose, wide swings; an exhausted character lets the arms drag low and behind the beat of the legs. Same skeleton, entirely different acting — and all of it readable in a single frame.`
  }
];

