# Animation Reference (AnimRef) Studio — Animo Maya Integration

Native integration between [Animation Reference](https://animationreference.org) and the **Animo** animation toolkit for Autodesk Maya.

---

## What's Included

### 1. 🌐 Explore Library
- Search across **8,135+** curated animation reference clips by action, mechanics, styles, and character types.
- Instant tag filtering (*Combat, Smears, Creature Animation, Character Acting, Locomotion, Hair Motion, VFX & Effects*, etc.).
- Sort by Newest, Oldest, or Duration.
- Asynchronous thumbnail and video downloading with local disk caching.

### 2. 🔖 Saved & Favorites
- Live sync with your Animation Reference account.
- Browse all your saved and liked references inside Maya.
- 1-click import into your scene.

### 3. 📋 My Moodboards
- Full access to your cloud moodboards and curated collections.
- Select any moodboard to browse its clips and load them directly into Maya.

### 4. 🎬 Playblast Studio
- **1-Click Maya Viewport Playblast**:
  - Automatically captures the active viewport with clean broadcast settings (hiding viewport HUD/ornaments).
  - Encodes cleanly with Animo's bundled FFmpeg into an optimized H.264 MP4.
- **Direct Cloud Upload**:
  - Uploads playblasts directly to your Animation Reference account.
- **Side-by-Side Locked Comparison**:
  - Automatically generates a link to scrub and compare your Maya playblast frame-for-frame against your reference clip on [animationreference.org](https://animationreference.org).

### 5. 👤 Account & Authentication
- Secure sign-in using your AnimationReference.org email & password.
- Persistent session caching between Maya restarts.
- Displays Pro Member status and user profile.

### 6. 📐 Robust Maya Image Plane Setup
- **Free 3D Card (Move Anywhere in Viewport)**:
  - Spawns a 3D reference card in perspective space placed nicely beside your character rig.
  - Fully movable, rotatable, and scaleable with standard Maya manipulators (`W`, `E`, `R`).
- **Camera Attached Mode**:
  - Seamlessly attaches to `persp` or any scene camera (`shotCam`, `front`, etc.) with `displayOnlyIfCurrent=False`, `fit=Best`, and correct depth.
- **Dedicated Reference Camera**:
  - Creates a dedicated camera locked straight to the reference for split-screen comparison workflows.

---

## Launching in Maya

- **From the Animo Toolbar**: Click the AnimRef icon on the Animo shelf/dock.
- **From Maya Script Editor (Python)**:
  ```python
  import importlib
  from Animo_AnimRef import animref_window
  importlib.reload(animref_window)
  animref_window.show_window()
  ```
