# AnimationReference.org Studio Add-on for Blender

Official Blender 3.6–5.0 add-on for browsing, importing, syncing, and playblasting references directly with [AnimationReference.org](https://animationreference.org).

## Installation

1. Download `animref_blender_addon.zip` from [animationreference.org/plugins](https://animationreference.org/plugins).
2. In Blender, open **Edit → Preferences → Add-ons** (or **Get Extensions → Install from Disk** in Blender 4.2+).
3. Click **Install...**, select `animref_blender_addon.zip`, and enable **Animation: AnimationReference.org Studio**.
4. Open the 3D Viewport sidebar (`N` key) and select the **AnimRef** tab.

## Features

- **1-Click Browser Sign-In**: Connects seamlessly with Google or Email accounts via `animationreference.org/extension/connect`.
- **Search & Saved Library**: Search the full AnimationReference.org catalog by keyword or category, or load your Saved clips.
- **3 Viewport Import Modes**:
  - **Camera Background Video** with 1-click Picture-in-Picture (PiP) corner placement (`Top-Right`, `Top-Left`, `Bottom-Right`, `Bottom-Left`, `Full Frame`).
  - **3D Reference Empty (`IMAGE`)** with opacity, horizontal flip, and optional `Track-To` camera lock.
  - **Video Sequencer (VSE)** movie strip import.
- **Active Scene Reference Manager**: Magic Align to current timeline frame, `-5f / -1f / +1f / +5f` timing slip/nudge, flip, show/hide, and remove.
- **Timeline Pose Markers**: 1-click markers for *Anticipation*, *Contact*, *Passing*, *Breakdown*, *Extreme*, and *Overshoot*.
- **Viewport Playblast & Direct Upload**: Record MP4 (H.264) or AVI viewport playblasts using Blender's built-in FFmpeg encoder (automatically restores all scene render settings) and upload straight to AnimationReference.org.

## Automated Tests

```bash
python -m unittest discover -s integrations/animref-blender/tests -v
```
