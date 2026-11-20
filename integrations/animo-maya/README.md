# Animation Reference for Animo / Maya

**Status: Production-ready partner & animator build.** The Animo toolbar
package is located in `Animo_Data/Animo_AnimRef` (synchronized with `Animo_AnimRef`).
See [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) for architecture and handoff notes.

## Key Features

- **Search & Browse Library**: Instant search across the Animation Reference catalog with interactive tag chips, duration/recency sorting, background thumbnail caching, and offline catalog fallback.
- **3 Viewport Display Modes & PiP Corner Presets**:
  - **Camera Image Plane** with 1-click **Picture-in-Picture (PiP)** corner placement (`Full Frame`, `PiP: Top-Right`, `PiP: Top-Left`, `PiP: Bottom-Right`, `PiP: Bottom-Left`).
  - **Free 3D World Card** with optional **Auto-Face Camera (`aimConstraint`)** so the reference card follows your viewport camera angle.
  - **Floating Mini Reference Monitor** & dockable Maya `workspaceControl` modes.
- **Active Scene Reference Manager & Pose-Sync ("Magic Align" + "Nudge & Slip")**:
  - Live inspector panel to control all `animref_*` planes in the scene without opening Maya's Attribute Editor.
  - **⚡ Magic Align ("Align Pose to Maya Frame")**: 1-click sync that aligns the currently displayed reference frame to Maya's current timeline frame (`frameOffset = maya_frame - ref_frame`).
  - **Slip / Nudge Timing (`-5f`, `-1f`, `+1f`, `+5f`)**: Shift scene reference timing earlier or later in real time.
  - Live **Opacity (`alphaGain`) slider**, **Horizontal Mirror / Flip**, **Show/Hide**, and **Delete** controls.
- **A-B Sub-Clip Looper & Maya Time Slider Pose Bookmarks**:
  - Mark `[ In` (key `I`) and `Out ]` (key `O`) points to isolate a sub-action and click **`⇄ Fit Maya A-B`** to set Maya's playback range (`minTime`..`maxTime`) to match.
  - **1-Click Pose Bookmarking (`🏷 Mark Pose`, key `B`)**: Drop color-coded Maya `timeSliderBookmark` markers onto Maya's timeline for *Anticipation*, *Contact*, *Passing*, *Breakdown*, *Extreme*, and *Overshoot*.
- **Built-In Dual Side-by-Side Playblast Compare Studio**:
  - Record a local viewport playblast MP4 via FFmpeg (honoring non-1 start frames like `1001`) or load any existing local playblast file.
  - Compare your **Reference Clip (Left)** and **Maya Playblast (Right)** side-by-side inside Maya with lockstep play/pause, `-1F` / `+1F` frame-stepping, playback speed (`1.0x`, `0.5x`, `0.25x`), and a **Playblast Slip Offset** spinner.
- **Email/Password & Browser Token Sign-In**:
  - Sign in with Email/Password or use **Browser Connect Token** (`https://animationreference.org/extension/connect`) so Google OAuth users can sign in without needing a separate password.
  - Cached tokens in `auth.json` are obfuscated at rest.

## Installation

1. Back up your existing `Animo_Data` folder if applicable, then copy `Animo_Data/Animo_AnimRef` into `maya/scripts/Animo_Data/Animo_AnimRef`.
2. In Maya's Python Script Editor, launch:

   ```python
   import sys
   sys.path.insert(0, r"C:/path/to/Animo_Data")
   from Animo_AnimRef import animref_launcher
   animref_launcher.launch()
   ```

3. Configure FFmpeg using `ANIMO_FFMPEG_PATH`, Animo's bundled FFmpeg, or the system `PATH`.

## Automated Tests

From the main repository root:

```text
python -m unittest discover -s integrations/animo-maya/tests -v
```
