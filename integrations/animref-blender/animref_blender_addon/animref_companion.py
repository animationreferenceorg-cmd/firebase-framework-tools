"""
Modern Native-App Studio Window for Blender (Localhost Bridge + Frameless App Window).

Provides a true studio-grade UI/UX matching Maya's AnimRef Studio:
- Real CSS masonry visual card grid with HTML5 hover-to-play video previews
- Full-window Studio Video Player (frame stepping, speed, loop, import controls)
- Live 2-way thread-safe bridge into Blender (bpy.app.timers main-thread queue)
- 1-click Import to Camera Background (PiP), 3D Image Empty, or VSE
- Live Scene Reference Manager (Magic Align, Nudge, Flip, Delete, Pose Markers)
- Viewport Playblast (MP4/AVI) + Auto-Post to AnimationReference.org
- Zero external Python dependencies — works on Blender 3.6–5.1 (Win/Mac/Linux)
"""

from __future__ import annotations

import base64
import http.server
import json
import os
import queue
import shutil
import socket
import subprocess
import sys
import threading
import urllib.parse
import webbrowser

try:
    import bpy
except ImportError:
    bpy = None

from . import animref_api, animref_auth, animref_importer, animref_playblast, animref_updater

_server = None
_server_port = 0
_server_lock = threading.Lock()
_bpy_queue: "queue.Queue[tuple]" = queue.Queue()
_timer_registered = False


def _run_on_blender_main(fn, timeout: float = 30.0):
    """Execute `fn(bpy.context)` safely on Blender's main thread and wait for result."""
    if bpy is None:
        raise RuntimeError("Blender bpy is not available.")
    done = threading.Event()
    box = {"result": None, "error": None}
    _bpy_queue.put((fn, done, box))
    if not done.wait(timeout):
        raise TimeoutError("Timed out waiting for Blender main thread.")
    if box["error"] is not None:
        raise box["error"]
    return box["result"]


def _drain_bpy_queue():
    if bpy is None:
        return None
    try:
        while True:
            fn, done, box = _bpy_queue.get_nowait()
            try:
                box["result"] = fn(bpy.context)
            except Exception as exc:
                box["error"] = exc
            finally:
                done.set()
    except queue.Empty:
        pass
    return 0.05


def _ensure_main_timer():
    global _timer_registered
    if bpy is None or _timer_registered:
        return
    try:
        bpy.app.timers.register(_drain_bpy_queue, first_interval=0.05, persistent=True)
        _timer_registered = True
    except Exception:
        pass


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return int(s.getsockname()[1])


STUDIO_HTML = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Animation Reference Studio — Blender</title>
<style>
  :root {
    --canvas: #09090e;
    --surface: #111119;
    --surface-2: #161622;
    --border: rgba(255,255,255,0.08);
    --ink: #f4f4f5;
    --muted: #a1a1aa;
    --accent: #7c3aed;
    --accent-hover: #8b5cf6;
    --emerald: #10b981;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--canvas);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    height: 100vh;
    display: flex;
    overflow: hidden;
    user-select: none;
  }
  /* Left Sidebar (Dark Studio Theme) */
  aside.sidebar {
    width: 210px;
    flex-shrink: 0;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    padding: 14px 10px;
    gap: 6px;
    overflow-y: auto;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .brand-circle {
    width: 22px; height: 22px; border-radius: 50%;
    background: linear-gradient(135deg, #8b5cf6, #ec4899); color: #fff;
    display: grid; place-items: center;
    font-size: 11px; font-weight: 900; flex-shrink: 0;
  }
  .brand-name { font-weight: 800; font-size: 12px; letter-spacing: -0.2px; color: #ffffff; }
  .badge-host {
    font-size: 8px; font-weight: 800; text-transform: uppercase;
    padding: 2px 6px; border-radius: 6px;
    background: rgba(249,115,22,0.18); color: #fdba74; border: 1px solid rgba(249,115,22,0.35);
    margin-left: auto;
  }
  .nav-item {
    display: flex; align-items: center; gap: 9px;
    width: 100%; border: none; background: transparent;
    color: #a1a1aa; padding: 8px 10px; border-radius: 10px;
    font-size: 12px; font-weight: 700; cursor: pointer; text-align: left;
    transition: all .14s;
  }
  .nav-item:hover { background: rgba(255,255,255,0.06); color: #ffffff; }
  .nav-item.active { background: var(--accent); color: #ffffff; }
  .sidebar-section {
    font-size: 9px; font-weight: 800; letter-spacing: 1.2px;
    color: #71717a; text-transform: uppercase;
    padding: 12px 10px 4px;
  }
  .board-item {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; border: none; background: transparent;
    color: #a1a1aa; padding: 6px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 600; cursor: pointer; text-align: left;
  }
  .board-item:hover { background: rgba(255,255,255,0.06); color: #ffffff; }
  .board-item.active { background: rgba(124,58,237,0.22); color: #ddd6fe; font-weight: 800; }
  .board-count { font-size: 10px; color: #71717a; font-weight: 700; }
  .sidebar-footer {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px solid var(--border);
    display: flex; flex-direction: column; gap: 6px;
  }

  /* Main Workspace */
  .workspace {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: var(--canvas);
  }
  header.ws-header {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .ws-title {
    font-size: 16px; font-weight: 800; color: #ffffff;
    letter-spacing: -0.3px; white-space: nowrap;
  }
  .search-pill {
    flex: 1; max-width: 380px;
    display: flex; align-items: center; gap: 6px;
    background: #0b0b12; border: 1px solid var(--border);
    border-radius: 999px; padding: 0 14px; height: 34px;
  }
  .search-pill input {
    flex: 1; border: none; background: transparent; outline: none;
    font-size: 12px; color: #ffffff;
  }
  .btn {
    border: 1px solid var(--border); background: rgba(255,255,255,0.06);
    color: #f4f4f5; padding: 6px 12px; border-radius: 999px;
    font-size: 11px; font-weight: 700; cursor: pointer;
    transition: all .14s; white-space: nowrap;
  }
  .btn:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.2); }
  .btn-dark { background: var(--accent); color: #ffffff; border-color: rgba(167,139,250,0.45); }
  .btn-dark:hover { background: var(--accent-hover); }
  .btn-violet { background: var(--accent); color: #ffffff; border-color: var(--accent); }
  .btn-violet:hover { background: var(--accent-hover); }
  .btn-emerald { background: #059669; color: #ffffff; border-color: rgba(16,185,129,0.45); }
  .btn-emerald:hover { background: #047857; }
  .btn-danger { background: rgba(239,68,68,0.16); color: #fca5a5; border-color: rgba(239,68,68,0.35); }
  .btn-danger:hover { background: rgba(239,68,68,0.32); color: #fff; }

  .tag-bar {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 18px; background: #0d0d14;
    border-bottom: 1px solid var(--border);
    overflow-x: auto; flex-shrink: 0;
  }
  .chip {
    border: 1px solid var(--border); background: rgba(255,255,255,0.04);
    color: #a1a1aa; padding: 4px 12px; border-radius: 999px;
    font-size: 11px; font-weight: 700; cursor: pointer; white-space: nowrap;
  }
  .chip:hover { border-color: rgba(255,255,255,0.22); color: #ffffff; }
  .chip.active { background: rgba(124,58,237,0.28); color: #ddd6fe; border-color: rgba(167,139,250,0.55); }

  main { flex: 1; overflow-y: auto; padding: 16px 18px; }

  /* Dark Rounded Masonry Cards */
  .masonry {
    columns: 4 175px;
    column-gap: 12px;
  }
  .card {
    break-inside: avoid;
    margin-bottom: 12px;
    position: relative;
    border-radius: 13px;
    overflow: hidden;
    background: var(--surface-2);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  }
  .card:hover {
    transform: translateY(-2px);
    border-color: rgba(167,139,250,0.55);
    box-shadow: 0 12px 28px rgba(0,0,0,0.55);
  }
  .card-media {
    position: relative; width: 100%; background: #06060a; overflow: hidden;
  }
  .card-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-media video {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
    opacity: 0; transition: opacity .18s;
  }
  .card:hover .card-media video.playing { opacity: 1; }
  .card-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.85) 100%);
    opacity: 0; transition: opacity .16s;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 8px;
  }
  .card:hover .card-overlay { opacity: 1; }
  .card-top { display: flex; justify-content: flex-end; gap: 5px; }
  .pill-import {
    background: var(--accent); color: #fff; border: 1px solid rgba(196,181,253,0.45);
    border-radius: 999px; padding: 4px 10px; font-size: 10px; font-weight: 800; cursor: pointer;
  }
  .pill-import:hover { background: var(--accent-hover); }
  .card-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; }
  .card-title { font-size: 11px; font-weight: 700; color: #fff; line-height: 1.25; }
  .fs-btn {
    width: 26px; height: 26px; border-radius: 50%;
    background: rgba(12,10,18,0.85); color: #fff;
    border: 1px solid rgba(255,255,255,0.28);
    font-size: 12px; cursor: pointer; display: grid; place-items: center; flex-shrink: 0;
  }
  .fs-btn:hover { background: var(--accent); border-color: #c4b5fd; }

  /* Full-Panel Studio Video Player */
  #studioScreen {
    display: none; flex-direction: column; height: 100%; gap: 12px;
  }
  #studioScreen.open { display: flex; }
  .player-shell {
    background: #0e0e15; border: 1px solid #242434; border-radius: 14px;
    padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 280px;
  }
  .player-stage {
    flex: 1; background: #040407; border-radius: 10px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; min-height: 220px;
  }
  .player-stage video, .player-stage img {
    width: 100%; height: 100%; object-fit: contain;
  }
  .scrubber { width: 100%; accent-color: #8b5cf6; cursor: pointer; }
  .transport { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .yt-btn {
    background: rgba(255,255,255,0.07); color: #e4e4e7;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;
    padding: 4px 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  }
  .yt-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }
  .play-pill {
    width: 32px; height: 28px; border-radius: 14px; border: none;
    background: #7c3aed; color: #fff; font-weight: 800; cursor: pointer;
  }
  .play-pill:hover { background: #8b5cf6; }
  .frame-pill {
    font-family: ui-monospace, monospace; font-size: 10px; font-weight: 700;
    color: #c4b5fd; background: rgba(124,58,237,0.22); padding: 3px 8px; border-radius: 7px;
  }
  .placement-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    padding: 12px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  select, input[type="text"] {
    background: #0b0b12; color: #ffffff; border: 1px solid var(--border);
    border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 600;
  }

  /* Playblast & Scene Panel Cards */
  .panel-card {
    background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
    padding: 16px; display: flex; flex-direction: column; gap: 12px;
    margin-bottom: 14px;
  }
  .panel-card h3 { font-size: 14px; font-weight: 800; color: #ffffff; }
  .ref-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 8px 12px; background: var(--surface-2); border: 1px solid var(--border);
    border-radius: 10px; font-size: 11px;
  }
  .toast {
    position: fixed; bottom: 16px; right: 16px;
    background: #181826; color: #fff; border: 1px solid rgba(167,139,250,0.45);
    padding: 10px 16px; border-radius: 12px; font-size: 12px; font-weight: 700;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0; pointer-events: none;
    transition: opacity .2s; z-index: 999;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-circle">A</div>
      <span class="brand-name">AnimRef</span>
      <span class="badge-host">BLENDER</span>
    </div>

    <button class="nav-item active" data-view="boards">📁 &nbsp;Moodboards</button>
    <button class="nav-item" data-view="uploaded">☁ &nbsp;Uploaded</button>
    <button class="nav-item" data-view="explore">🧭 &nbsp;Explore</button>
    <button class="nav-item" data-view="playblast">🎬 &nbsp;Playblast</button>
    <button class="nav-item" data-view="account">👤 &nbsp;Account</button>

    <div class="sidebar-section">Your Boards</div>
    <div id="boardsSidebarList" style="display:flex;flex-direction:column;gap:2px;">
      <button class="board-item active" data-board="__all_saves__">
        <span>All saves</span>
      </button>
    </div>

    <div class="sidebar-footer" id="sidebarAcctFooter"></div>
  </aside>

  <div class="workspace">
    <header class="ws-header">
      <span class="ws-title" id="wsTitle">All saves</span>
      <div class="search-pill">
        <span style="color:#a8a29e;font-size:12px;">🔍</span>
        <input id="searchInput" type="text" placeholder="Search references..." />
      </div>
      <button class="btn btn-dark" id="openUploadRefBtn">+ Upload Ref</button>
      <button class="btn" id="openStudioBtn">🎬 Studio</button>
      <button class="btn" id="refreshBtn">↻</button>
    </header>

    <div class="tag-bar" id="catBar" style="display:none;">
      <button class="chip active" data-tag="all">All</button>
      <button class="chip" data-tag="walk">Walk Cycle</button>
      <button class="chip" data-tag="run">Run Cycle</button>
      <button class="chip" data-tag="combat">Combat</button>
      <button class="chip" data-tag="acting">Acting</button>
      <button class="chip" data-tag="parkour">Parkour</button>
      <button class="chip" data-tag="creature">Creature</button>
      <button class="chip" data-tag="fx">FX</button>
    </div>

    <main>
      <div id="gridView">
        <div class="masonry" id="cardGrid"></div>
      </div>

      <!-- Full-Panel Studio Player Screen -->
      <div id="studioScreen">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <button class="btn" id="backToGridBtn">← Back</button>
            <span id="studioTitle" style="font-weight:800;font-size:14px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>
          </div>
          <button class="btn btn-dark" id="studioImportBtn">+ Import to Blender</button>
        </div>
        <div class="player-shell">
          <div class="player-stage">
            <video id="studioVideo" loop playsinline></video>
            <img id="studioImg" style="display:none;" />
          </div>
          <input id="scrubber" class="scrubber" type="range" min="0" max="1000" value="0" />
          <div class="transport">
            <button class="play-pill" id="playPauseBtn">▶</button>
            <button class="yt-btn" id="prevFrameBtn">‹</button>
            <button class="yt-btn" id="nextFrameBtn">›</button>
            <span class="frame-pill" id="frameReadout">0f · 24fps</span>
            <div style="flex:1;"></div>
            <button class="yt-btn" id="speedBtn">1.0x</button>
            <button class="yt-btn" id="loopBtn">↻</button>
            <button class="yt-btn" id="openWebBtn">Web ↗</button>
          </div>
        </div>
        <div class="placement-card">
          <strong style="font-size:11px;color:#a1a1aa;">Blender Placement:</strong>
          <select id="importMode">
            <option value="EMPTY_3D" selected>3D Reference Plane (Viewport)</option>
            <option value="CAMERA_BG">Camera Background (PiP)</option>
            <option value="VSE">Video Sequencer (VSE)</option>
          </select>
          <select id="pipPreset">
            <option value="TOP_RIGHT">PiP: Top-Right</option>
            <option value="TOP_LEFT">PiP: Top-Left</option>
            <option value="BOTTOM_RIGHT">PiP: Bottom-Right</option>
            <option value="BOTTOM_LEFT">PiP: Bottom-Left</option>
            <option value="FULL">Full Frame</option>
          </select>
          <label style="font-size:11px;color:#a1a1aa;">Opacity</label>
          <input id="importOpacity" type="range" min="0.1" max="1" step="0.05" value="0.75" style="width:85px;accent-color:#8b5cf6;" />
          <label style="font-size:11px;color:#a1a1aa;display:flex;align-items:center;gap:4px;">
            <input id="matchFps" type="checkbox" checked /> Match FPS
          </label>
        </div>
      </div>

      <!-- Playblast & Active Scene View -->
      <div id="playblastView" style="display:none;">
        <div class="panel-card">
          <h3>Viewport Playblast &amp; Auto-Post to AnimationReference.org</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <input id="pbTitle" type="text" placeholder="Playblast title (e.g. Hero Walk Pass 02)" style="flex:2;min-width:180px;" />
            <select id="pbFormat">
              <option value="MP4">MP4 (H.264)</option>
              <option value="AVI">AVI (MJPEG)</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <select id="pbStage" style="flex:1;min-width:120px;">
              <option value="blocking" selected>Stage: Blocking</option>
              <option value="splining">Stage: Splining</option>
              <option value="polish">Stage: Polish</option>
              <option value="completed">Stage: Completed</option>
            </select>
            <select id="pbCategory" style="flex:1;min-width:130px;">
              <option value="Acting" selected>Acting</option>
              <option value="Body Mechanics">Body Mechanics</option>
              <option value="Creature">Creature</option>
              <option value="Combat">Combat</option>
              <option value="Locomotion">Locomotion</option>
              <option value="Lip Sync">Lip Sync</option>
              <option value="FX / VFX">FX / VFX</option>
            </select>
            <select id="pbBoard" style="flex:1.4;min-width:150px;">
              <option value="">Library &amp; Portfolio (No Board)</option>
            </select>
          </div>
          <div style="display:flex;gap:14px;flex-wrap:wrap;">
            <label style="font-size:12px;color:#d4d4d8;font-weight:600;display:flex;align-items:center;gap:6px;">
              <input id="pbAutoPost" type="checkbox" checked /> Send to AnimationReference.org as Draft (edit &amp; publish on site)
            </label>
            <label style="font-size:12px;color:#a1a1aa;font-weight:600;display:flex;align-items:center;gap:6px;">
              <input id="pbOpenBrowser" type="checkbox" checked /> Open editor in browser
            </label>
          </div>
          <button class="btn btn-emerald" id="recordPbBtn" style="padding:10px 16px;font-size:12px;">● Record &amp; Open Draft on AnimationReference.org</button>
          <div id="pbResult" style="font-size:11px;color:#34d399;font-weight:700;"></div>
        </div>

        <div class="panel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3>Active Blender Scene References</h3>
            <button class="btn" id="refreshSceneBtn">↻ Refresh Scene</button>
          </div>
          <div id="sceneRefList" style="display:flex;flex-direction:column;gap:8px;"></div>
          <div>
            <div style="font-size:11px;color:#78716c;margin-bottom:6px;font-weight:700;">Drop Timeline Pose Marker</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;" id="poseMarkerBtns"></div>
          </div>
        </div>
      </div>

      <!-- Account View -->
      <div id="accountView" style="display:none;">
        <div class="panel-card" id="accountCard"></div>
      </div>
    </main>
  </div>

  <div class="toast" id="toast"></div>

<!-- Upload Reference to Moodboard Modal -->
<div id="uploadRefModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:200;align-items:center;justify-content:center;padding:16px;">
  <div style="background:#111119;border:1px solid #272736;border-radius:16px;padding:18px;width:100%;max-width:440px;display:flex;flex-direction:column;gap:12px;box-shadow:0 24px 60px rgba(0,0,0,0.7);">
    <div style="display:flex;align-items:center;justify-content:space-between;">
      <strong style="font-size:14px;color:#ffffff;">Upload Reference to Moodboard</strong>
      <button class="btn" id="closeUploadRefModal" style="padding:3px 9px;">✕</button>
    </div>
    <p style="font-size:11px;color:#a1a1aa;line-height:1.4;">Upload a video, GIF, or image — it automatically syncs to your AnimationReference.org moodboard too.</p>
    <input id="refFileInput" type="file" accept="video/*,image/*" style="font-size:11px;color:#e4e4e7;background:#161622;border:1px solid #272736;border-radius:10px;padding:8px;" />
    <input id="refTitleInput" type="text" placeholder="Reference title" />
    <div style="display:flex;gap:8px;">
      <select id="refBoardSelect" style="flex:1.4;">
        <option value="">All Saves (No specific board)</option>
      </select>
      <select id="refCatSelect" style="flex:1;">
        <option value="Acting">Acting</option>
        <option value="Body Mechanics">Body Mechanics</option>
        <option value="Creature">Creature</option>
        <option value="Combat">Combat</option>
        <option value="Locomotion">Locomotion</option>
        <option value="Lip Sync">Lip Sync</option>
        <option value="FX / VFX">FX / VFX</option>
      </select>
    </div>
    <input id="refTagsInput" type="text" placeholder="Tags (comma-separated, e.g. walk, parkour)" />
    <div id="refUploadStatus" style="font-size:11px;color:#a1a1aa;"></div>
    <button class="btn btn-dark" id="submitUploadRefBtn" style="padding:10px;font-size:12px;">☁ Upload to Moodboard</button>
  </div>
</div>

<script>
const RATIOS = [0.78, 0.65, 0.92, 0.70, 0.85];
let state = {
  view: 'boards',
  boardId: '__all_saves__',
  boards: [],
  tag: 'all',
  q: '',
  items: [],
  activeClip: null,
  account: { signed_in: false },
  speeds: [0.25, 0.5, 0.75, 1, 1.5, 2],
  speedIdx: 3,
};

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Request failed');
  return data;
}

function previewUrl(v) {
  let u = v.videoUrl || v.mediaUrl || '';
  if (u.includes('b-cdn.net')) {
    u = u.replace('playlist.m3u8', 'play_480p.mp4').replace('play_1080p.mp4', 'play_480p.mp4').replace('play_720p.mp4', 'play_480p.mp4');
  }
  return u;
}

async function startBrowserSignIn() {
  await api('/api/auth/browser', { method: 'POST' });
  showToast('Opened browser sign-in — will auto-sync!');
  const poll = setInterval(async () => {
    const cur = await api('/api/account');
    if (cur.signed_in) {
      clearInterval(poll);
      await loadAccount();
      await loadBoardsSidebar();
      await loadItems();
      showToast('Connected as ' + (cur.display_name || cur.email));
    }
  }, 1500);
  setTimeout(() => clearInterval(poll), 120000);
}

async function loadAccount() {
  try {
    state.account = await api('/api/account');
    const foot = document.getElementById('sidebarAcctFooter');
    const card = document.getElementById('accountCard');
    if (state.account.signed_in) {
      foot.innerHTML = `<div style="font-size:11px;font-weight:800;color:#ffffff;padding:0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${state.account.display_name || state.account.email}</div>`;
      card.innerHTML = `
        <h3>Signed in to AnimationReference.org</h3>
        <p style="font-size:12px;color:#a1a1aa;">Account: <strong style="color:#fff;">${state.account.display_name || ''}</strong> (${state.account.email || ''})</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-dark" onclick="window.open('https://animationreference.org/pricing','_blank')">Manage Pro</button>
          <button class="btn" id="checkUpdatesBtn">↻ Check for Updates</button>
          <button class="btn btn-danger" id="acctSignOutBtn">Sign Out</button>
        </div>
        <div id="updateStatusLine" style="font-size:11px;color:#a1a1aa;">Auto-updates enabled — checks AnimationReference.org on launch.</div>`;
      document.getElementById('checkUpdatesBtn').onclick = checkPluginUpdates;
      document.getElementById('acctSignOutBtn').onclick = async () => {
        await api('/api/auth/signout', { method: 'POST' });
        await loadAccount();
        showToast('Signed out');
      };
    } else {
      foot.innerHTML = `<button class="btn btn-dark" id="sideSignInBtn" style="width:100%;">Sign In</button>`;
      document.getElementById('sideSignInBtn').onclick = startBrowserSignIn;
      card.innerHTML = `
        <h3>Connect AnimationReference.org</h3>
        <p style="font-size:12px;color:#57534e;">Sign in once in your browser to sync your Moodboards, Saved references, and auto-post Blender playblasts.</p>
        <button class="btn btn-dark" id="acctSignInBtn" style="padding:10px 18px;font-size:12px;align-self:flex-start;">🌐 Sign In with AnimationReference.org</button>`;
      document.getElementById('acctSignInBtn').onclick = startBrowserSignIn;
    }
  } catch {}
}

async function loadBoardsSidebar() {
  const list = document.getElementById('boardsSidebarList');
  try {
    const data = await api('/api/boards');
    state.boards = data.boards || [];
  } catch {
    state.boards = [];
  }
  list.innerHTML = '';
  const pbBoardSel = document.getElementById('pbBoard');
  const refBoardSel = document.getElementById('refBoardSelect');
  for (const sel of [pbBoardSel, refBoardSel]) {
    if (!sel) continue;
    const prevVal = sel.value;
    sel.innerHTML = sel === pbBoardSel
      ? '<option value="">Library &amp; Portfolio (No Board)</option>'
      : '<option value="">All Saves (No specific board)</option>';
    for (const b of state.boards) {
      const opt = document.createElement('option');
      opt.value = b.id || '';
      opt.textContent = 'Board: ' + (b.name || 'Untitled');
      sel.appendChild(opt);
    }
    if (prevVal) sel.value = prevVal;
  }
  const allBtn = document.createElement('button');
  allBtn.className = 'board-item' + (state.view === 'boards' && state.boardId === '__all_saves__' ? ' active' : '');
  allBtn.innerHTML = `<span>All saves</span>`;
  allBtn.onclick = () => selectBoard('__all_saves__', 'All saves');
  list.appendChild(allBtn);

  for (const b of state.boards) {
    const btn = document.createElement('button');
    btn.className = 'board-item' + (state.view === 'boards' && state.boardId === b.id ? ' active' : '');
    btn.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.name || 'Board'}</span><span class="board-count">${(b.items || []).length}</span>`;
    btn.onclick = () => selectBoard(b.id, b.name || 'Board');
    list.appendChild(btn);
  }
}

function selectBoard(id, name) {
  state.view = 'boards';
  state.boardId = id;
  document.getElementById('wsTitle').textContent = name;
  setActiveView('boards');
  loadBoardsSidebar();
  loadItems();
}

function setActiveView(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  closeStudio(false);
  document.getElementById('gridView').style.display = (view === 'boards' || view === 'explore' || view === 'uploaded') ? 'block' : 'none';
  document.getElementById('catBar').style.display = view === 'explore' ? 'flex' : 'none';
  document.getElementById('playblastView').style.display = view === 'playblast' ? 'block' : 'none';
  document.getElementById('accountView').style.display = view === 'account' ? 'block' : 'none';
  if (view === 'explore') document.getElementById('wsTitle').textContent = 'Explore Library';
  if (view === 'uploaded') document.getElementById('wsTitle').textContent = 'Uploaded (Unlimited Imports)';
  if (view === 'playblast') { document.getElementById('wsTitle').textContent = 'Playblast & Scene'; loadSceneRefs(); }
  if (view === 'account') { document.getElementById('wsTitle').textContent = 'Account'; loadAccount(); }
}

async function loadItems() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:18px;">Loading references...</div>`;
  try {
    const tab = state.view === 'explore' ? 'explore' : state.view === 'uploaded' ? 'uploaded' : (state.boardId === '__all_saves__' ? 'saved' : 'board');
    const qs = new URLSearchParams({ tab, board_id: state.boardId, tag: state.tag, q: state.q });
    const data = await api('/api/items?' + qs.toString());
    state.items = data.items || [];
    renderGrid();
  } catch (e) {
    grid.innerHTML = `<div style="color:#dc2626;font-size:12px;padding:18px;">${e.message}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  if (!state.items.length) {
    grid.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:18px;">No references here yet. Try Explore or Sign In!</div>`;
    return;
  }
  state.items.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card';
    const thumb = item.thumbnailUrl || item.posterUrl || '';
    const vUrl = previewUrl(item);
    const isVideo = vUrl && !/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(vUrl);
    const ratio = RATIOS[idx % RATIOS.length];
    card.innerHTML = `
      <div class="card-media" style="aspect-ratio: 1 / ${ratio};">
        ${thumb ? `<img src="${thumb}" loading="lazy" />` : ''}
        ${isVideo ? `<video muted loop playsinline preload="none" data-src="${vUrl}"></video>` : ''}
        <div class="card-overlay">
          <div class="card-top">
            <button class="pill-import">+ Blender</button>
          </div>
          <div class="card-bottom">
            <div class="card-title">${(item.title || 'Reference').slice(0, 44)}</div>
            <button class="fs-btn" title="Open Studio Video Player">⛶</button>
          </div>
        </div>
      </div>`;
    const vid = card.querySelector('video');
    if (vid) {
      card.addEventListener('mouseenter', () => {
        if (!vid.src) vid.src = vid.dataset.src;
        vid.play().then(() => vid.classList.add('playing')).catch(() => {});
      });
      card.addEventListener('mouseleave', () => {
        vid.pause();
        vid.classList.remove('playing');
      });
    }
    card.querySelector('.pill-import').onclick = (e) => { e.stopPropagation(); importClip(item); };
    card.querySelector('.fs-btn').onclick = (e) => { e.stopPropagation(); openStudio(item); };
    card.onclick = () => importClip(item);
    grid.appendChild(card);
  });
}

async function importClip(item) {
  showToast('Streaming "' + (item.title || 'Reference') + '" to Blender...');
  try {
    await api('/api/import', {
      method: 'POST',
      body: JSON.stringify({
        video: item,
        mode: document.getElementById('importMode').value,
        pip_preset: document.getElementById('pipPreset').value,
        opacity: parseFloat(document.getElementById('importOpacity').value),
        auto_conform_fps: document.getElementById('matchFps').checked,
      }),
    });
    showToast('✓ Added to Blender Viewport!');
  } catch (e) {
    const msg = String(e.message || e);
    if (msg.includes('PRO_REQUIRED') || msg.includes('402')) {
      showToast('Pro required for video imports — Try Pro for $1 first month!');
      setTimeout(() => window.open('https://animationreference.org/pricing', '_blank'), 1200);
    } else {
      showToast('Import error: ' + msg);
    }
  }
}

function openStudio(item) {
  if (!item && state.items.length) item = state.items[0];
  if (!item) return showToast('Select a reference first');
  state.activeClip = item;
  document.getElementById('gridView').style.display = 'none';
  document.getElementById('playblastView').style.display = 'none';
  document.getElementById('accountView').style.display = 'none';
  document.getElementById('catBar').style.display = 'none';
  document.getElementById('studioScreen').classList.add('open');
  document.getElementById('studioTitle').textContent = item.title || 'Reference';

  const vEl = document.getElementById('studioVideo');
  const iEl = document.getElementById('studioImg');
  const vUrl = previewUrl(item);
  if (vUrl && !/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(vUrl)) {
    iEl.style.display = 'none';
    vEl.style.display = 'block';
    vEl.src = vUrl;
    vEl.playbackRate = state.speeds[state.speedIdx];
    vEl.play().catch(() => {});
    document.getElementById('playPauseBtn').textContent = '❚❚';
  } else {
    vEl.pause();
    vEl.style.display = 'none';
    iEl.style.display = 'block';
    iEl.src = item.thumbnailUrl || vUrl || '';
  }
}

function closeStudio(restoreGrid = true) {
  document.getElementById('studioVideo').pause();
  document.getElementById('studioScreen').classList.remove('open');
  if (restoreGrid) {
    document.getElementById('gridView').style.display = 'block';
    document.getElementById('catBar').style.display = state.view === 'explore' ? 'flex' : 'none';
  }
}

const sVid = document.getElementById('studioVideo');
const scrubber = document.getElementById('scrubber');
sVid.ontimeupdate = () => {
  if (!sVid.duration) return;
  scrubber.value = Math.round((sVid.currentTime / sVid.duration) * 1000);
  const fps = (state.activeClip && state.activeClip.fps) || 24;
  document.getElementById('frameReadout').textContent = `${Math.round(sVid.currentTime * fps)}f · ${fps}fps`;
};
scrubber.oninput = () => { if (sVid.duration) sVid.currentTime = (scrubber.value / 1000) * sVid.duration; };
document.getElementById('playPauseBtn').onclick = () => {
  if (sVid.paused) { sVid.play(); document.getElementById('playPauseBtn').textContent = '❚❚'; }
  else { sVid.pause(); document.getElementById('playPauseBtn').textContent = '▶'; }
};
document.getElementById('prevFrameBtn').onclick = () => {
  sVid.pause(); document.getElementById('playPauseBtn').textContent = '▶';
  const fps = (state.activeClip && state.activeClip.fps) || 24;
  sVid.currentTime = Math.max(0, sVid.currentTime - 1 / fps);
};
document.getElementById('nextFrameBtn').onclick = () => {
  sVid.pause(); document.getElementById('playPauseBtn').textContent = '▶';
  const fps = (state.activeClip && state.activeClip.fps) || 24;
  sVid.currentTime = Math.min(sVid.duration || 999, sVid.currentTime + 1 / fps);
};
document.getElementById('speedBtn').onclick = () => {
  state.speedIdx = (state.speedIdx + 1) % state.speeds.length;
  const sp = state.speeds[state.speedIdx];
  sVid.playbackRate = sp;
  document.getElementById('speedBtn').textContent = sp + 'x';
};
document.getElementById('loopBtn').onclick = () => {
  sVid.loop = !sVid.loop;
  document.getElementById('loopBtn').style.opacity = sVid.loop ? '1' : '0.45';
};
document.getElementById('backToGridBtn').onclick = () => closeStudio(true);
document.getElementById('openStudioBtn').onclick = () => openStudio(state.activeClip);
document.getElementById('studioImportBtn').onclick = () => state.activeClip && importClip(state.activeClip);
document.getElementById('openWebBtn').onclick = () => {
  if (state.activeClip && state.activeClip.id) window.open('https://animationreference.org/video/' + state.activeClip.id, '_blank');
};
document.getElementById('openUploadRefBtn').onclick = () => {
  const modal = document.getElementById('uploadRefModal');
  const sel = document.getElementById('refBoardSelect');
  if (sel && state.view === 'boards' && state.boardId && state.boardId !== '__all_saves__') {
    sel.value = state.boardId;
  }
  document.getElementById('refUploadStatus').textContent = '';
  modal.style.display = 'flex';
};
document.getElementById('closeUploadRefModal').onclick = () => {
  document.getElementById('uploadRefModal').style.display = 'none';
};
document.getElementById('refFileInput').onchange = (e) => {
  const f = e.target.files && e.target.files[0];
  const titleEl = document.getElementById('refTitleInput');
  if (f && !titleEl.value.trim()) {
    titleEl.value = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  }
};
document.getElementById('submitUploadRefBtn').onclick = async () => {
  const fileInput = document.getElementById('refFileInput');
  const file = fileInput.files && fileInput.files[0];
  const statusEl = document.getElementById('refUploadStatus');
  if (!file) { statusEl.textContent = 'Choose a video, GIF, or image file first.'; statusEl.style.color = '#fca5a5'; return; }
  const btn = document.getElementById('submitUploadRefBtn');
  btn.disabled = true;
  btn.textContent = 'Uploading to AnimationReference.org...';
  statusEl.textContent = 'Uploading ' + file.name + '...';
  statusEl.style.color = '#c4b5fd';
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
    const base64Data = String(dataUrl).split(',')[1] || '';
    const res = await api('/api/upload-reference', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        mime_type: file.type || '',
        data_base64: base64Data,
        title: document.getElementById('refTitleInput').value.trim(),
        board_id: document.getElementById('refBoardSelect').value,
        category: document.getElementById('refCatSelect').value,
        tags: document.getElementById('refTagsInput').value.trim(),
      }),
    });
    statusEl.textContent = '✓ Uploaded & synced to AnimationReference.org moodboard!';
    statusEl.style.color = '#6ee7b7';
    showToast('✓ Reference added to Moodboard!');
    fileInput.value = '';
    document.getElementById('refTitleInput').value = '';
    document.getElementById('refTagsInput').value = '';
    setTimeout(() => {
      document.getElementById('uploadRefModal').style.display = 'none';
      loadBoardsSidebar();
      loadItems();
    }, 650);
  } catch (err) {
    statusEl.textContent = 'Upload failed: ' + err.message;
    statusEl.style.color = '#fca5a5';
  } finally {
    btn.disabled = false;
    btn.textContent = '☁ Upload to Moodboard';
  }
};

document.getElementById('refreshBtn').onclick = () => { loadBoardsSidebar(); loadItems(); };

async function loadSceneRefs() {
  const list = document.getElementById('sceneRefList');
  try {
    const data = await api('/api/scene/refs');
    const refs = data.refs || [];
    if (!refs.length) {
      list.innerHTML = `<div style="font-size:11px;color:#78716c;">No AnimRef references in your Blender scene yet.</div>`;
      return;
    }
    list.innerHTML = '';
    for (const r of refs) {
      const row = document.createElement('div');
      row.className = 'ref-row';
      row.innerHTML = `
        <span style="font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.label} (${r.offset >= 0 ? '+' : ''}${r.offset}f)</span>
        <div style="display:flex;gap:4px;">
          <button class="btn" data-act="align">Align</button>
          <button class="btn" data-act="nudge" data-d="-1">-1f</button>
          <button class="btn" data-act="nudge" data-d="1">+1f</button>
          <button class="btn" data-act="flip">Flip</button>
          <button class="btn btn-danger" data-act="delete">✕</button>
        </div>`;
      row.querySelectorAll('button').forEach(b => {
        b.onclick = async () => {
          await api('/api/scene/action', { method: 'POST', body: JSON.stringify({ action: b.dataset.act, ref_key: r.name, delta: parseInt(b.dataset.d || '0', 10) }) });
          loadSceneRefs();
        };
      });
      list.appendChild(row);
    }
  } catch (e) {
    list.innerHTML = `<div style="font-size:11px;color:#dc2626;">${e.message}</div>`;
  }
}

document.getElementById('refreshSceneBtn').onclick = loadSceneRefs;
['Anticipation', 'Contact', 'Passing', 'Breakdown', 'Extreme', 'Overshoot'].forEach(lbl => {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = lbl;
  b.onclick = async () => {
    await api('/api/scene/action', { method: 'POST', body: JSON.stringify({ action: 'marker', label: lbl }) });
    showToast('Added pose marker: ' + lbl);
  };
  document.getElementById('poseMarkerBtns').appendChild(b);
});

document.getElementById('recordPbBtn').onclick = async () => {
  const btn = document.getElementById('recordPbBtn');
  btn.disabled = true;
  btn.textContent = 'Recording playblast...';
  try {
    const res = await api('/api/playblast', {
      method: 'POST',
      body: JSON.stringify({
        title: document.getElementById('pbTitle').value,
        file_format: document.getElementById('pbFormat').value,
        wip_stage: document.getElementById('pbStage').value,
        category: document.getElementById('pbCategory').value,
        board_id: document.getElementById('pbBoard').value,
        auto_upload: document.getElementById('pbAutoPost').checked,
        open_browser: document.getElementById('pbOpenBrowser').checked,
      }),
    });
    document.getElementById('pbResult').innerHTML = res.uploaded_url
      ? `✓ Draft ready to edit on AnimationReference.org: <a href="${res.uploaded_url}" target="_blank" style="color:#6ee7b7;text-decoration:underline;">Open Draft Editor ↗</a>`
      : '✓ Saved: ' + res.path;
    showToast(res.uploaded_url ? '✓ Draft staged — edit & publish in browser!' : '✓ Playblast saved!');
  } catch (e) {
    showToast('Playblast error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '● Record & Open Draft on AnimationReference.org';
  }
};

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.onclick = () => {
    const v = btn.dataset.view;
    setActiveView(v);
    if (v === 'boards' || v === 'explore') loadItems();
  };
});

document.querySelectorAll('.chip').forEach(c => {
  c.onclick = () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    state.tag = c.dataset.tag;
    loadItems();
  };
});

let searchTimer = null;
document.getElementById('searchInput').oninput = (e) => {
  state.q = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadItems, 220);
};

async function checkPluginUpdates() {
  const line = document.getElementById('updateStatusLine');
  if (line) line.textContent = 'Checking AnimationReference.org for updates...';
  try {
    const res = await api('/api/updates/check', { method: 'POST', body: JSON.stringify({ force: true }) });
    if (line) {
      line.textContent = res.message || 'Up to date.';
      line.style.color = res.updated ? '#6ee7b7' : '#a1a1aa';
    }
    showToast(res.updated ? '✓ ' + res.message : (res.message || 'Already up to date!'));
  } catch (e) {
    if (line) line.textContent = 'Update check failed: ' + e.message;
  }
}

loadAccount().then(() => {
  loadBoardsSidebar();
  loadItems();
  // Silently check if background auto-updater pulled a newer version
  setTimeout(async () => {
    try {
      const u = await api('/api/updates/status');
      if (u && u.updated) {
        showToast('✓ ' + (u.message || 'Plugin updated — restart Blender to apply.'));
        const line = document.getElementById('updateStatusLine');
        if (line) { line.textContent = u.message; line.style.color = '#6ee7b7'; }
      }
    } catch {}
  }, 2500);
});
</script>
</body>
</html>
"""


class _StudioHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        return

    def _send_json(self, obj: dict, code: int = 200):
        raw = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        return json.loads(raw.decode("utf-8")) if raw else {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            raw = STUDIO_HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return

        if parsed.path == "/api/updates/status":
            self._send_json(animref_updater.get_last_update_status())
            return

        if parsed.path == "/api/account":
            self._send_json(animref_auth.get_account_summary())
            return

        if parsed.path == "/api/boards":
            try:
                boards = animref_api.fetch_moodboards() if animref_auth.is_signed_in() else []
                self._send_json({"boards": boards})
            except Exception:
                self._send_json({"boards": []})
            return

        if parsed.path == "/api/items":
            qs = urllib.parse.parse_qs(parsed.query)
            tab = (qs.get("tab") or ["explore"])[0]
            board_id = (qs.get("board_id") or [""])[0]
            tag = (qs.get("tag") or ["all"])[0]
            q = (qs.get("q") or [""])[0]
            try:
                if tab == "board" and board_id:
                    boards = animref_api.fetch_moodboards()
                    vids = []
                    for b in boards:
                        if str(b.get("id")) == board_id:
                            vids = b.get("items") or []
                            break
                elif tab == "saved":
                    saved = animref_api.fetch_saved_references() if animref_auth.is_signed_in() else []
                    board_items = animref_api.fetch_moodboard_items() if animref_auth.is_signed_in() else []
                    seen = set()
                    vids = []
                    for item in saved + board_items:
                        key = str(item.get("id") or item.get("videoUrl") or "")
                        if key and key in seen:
                            continue
                        if key:
                            seen.add(key)
                        vids.append(item)
                    if not vids and not animref_auth.is_signed_in():
                        vids = animref_api.fetch_catalog(force_refresh=False)
                elif tab == "uploaded":
                    vids = animref_api.fetch_uploaded_references() if animref_auth.is_signed_in() else []
                elif tab == "boards":
                    vids = animref_api.fetch_moodboard_items()
                else:
                    vids = animref_api.fetch_catalog(force_refresh=False)
                matches = animref_api.search_catalog(query=q, tag=tag if tab == "explore" else "all", videos=vids, limit=80)
                self._send_json({"items": matches})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        if parsed.path == "/api/scene/refs":
            try:
                refs = _run_on_blender_main(lambda ctx: animref_importer.list_scene_references(ctx))
                self._send_json({"refs": refs})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 500)
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        body = self._read_json()

        if parsed.path == "/api/auth/browser":
            url = animref_auth.start_browser_auth_flow(open_browser=True)
            self._send_json({"ok": True, "url": url})
            return

        if parsed.path == "/api/auth/signout":
            animref_auth.sign_out()
            self._send_json({"ok": True})
            return

        if parsed.path == "/api/import":
            try:
                video = body.get("video") or {}
                local_path = animref_api.authorize_and_download_media(video)
                mode = body.get("mode", "CAMERA_BG")
                pip_preset = body.get("pip_preset", "TOP_RIGHT")
                opacity = float(body.get("opacity", 0.75))
                auto_fps = bool(body.get("auto_conform_fps", True))
                title = str(video.get("title") or "Reference")
                fps = int(video.get("fps") or 24)
                duration = float(video.get("duration") or 0.0)

                def _do_import(ctx):
                    if mode == "CAMERA_BG":
                        animref_importer.import_to_camera_background(
                            ctx, local_path=local_path, title=title, opacity=opacity,
                            pip_preset=pip_preset, fps=fps, duration_sec=duration
                        )
                    elif mode == "EMPTY_3D":
                        animref_importer.import_to_3d_empty(
                            ctx, local_path=local_path, title=title, opacity=opacity,
                            fps=fps, duration_sec=duration
                        )
                    else:
                        animref_importer.import_to_vse(ctx, local_path=local_path, title=title)
                    if auto_fps and fps > 0:
                        animref_importer.conform_scene_fps(ctx, fps)
                    return True

                _run_on_blender_main(_do_import)
                self._send_json({"ok": True, "path": local_path})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        if parsed.path == "/api/scene/action":
            try:
                act = body.get("action")
                ref_key = body.get("ref_key", "")
                delta = int(body.get("delta", 0))
                label = str(body.get("label", "Key"))

                def _do_act(ctx):
                    if act == "align":
                        animref_importer.magic_align_reference(ctx, ref_key)
                    elif act == "nudge":
                        animref_importer.nudge_reference_offset(ctx, ref_key, delta)
                    elif act == "flip":
                        animref_importer.toggle_reference_mirror(ctx, ref_key)
                    elif act == "delete":
                        animref_importer.delete_reference(ctx, ref_key)
                    elif act == "marker":
                        animref_importer.add_pose_marker(ctx, label)
                    return True

                _run_on_blender_main(_do_act)
                self._send_json({"ok": True})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        if parsed.path == "/api/upload-reference":
            try:
                b64 = str(body.get("data_base64") or "")
                raw_bytes = base64.b64decode(b64) if b64 else b""
                res = animref_api.upload_reference_bytes(
                    file_bytes=raw_bytes,
                    filename=str(body.get("filename") or "reference.mp4"),
                    title=str(body.get("title") or ""),
                    board_id=str(body.get("board_id") or ""),
                    category=str(body.get("category") or "Acting"),
                    tags=str(body.get("tags") or ""),
                    mime_type=str(body.get("mime_type") or ""),
                )
                self._send_json({"ok": True, "result": res})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        if parsed.path == "/api/updates/check":
            res = animref_updater.check_and_apply_updates(force=bool(body.get("force", True)))
            self._send_json(res)
            return

        if parsed.path == "/api/playblast":
            try:
                fmt = body.get("file_format", "MP4")
                title = str(body.get("title") or "Blender Playblast")
                wip_stage = str(body.get("wip_stage") or "blocking")
                category = str(body.get("category") or "Acting")
                board_id = str(body.get("board_id") or "")
                auto_upload = bool(body.get("auto_upload", True))
                open_browser = bool(body.get("open_browser", True))

                out_path = _run_on_blender_main(
                    lambda ctx: animref_playblast.record_viewport_playblast(ctx, file_format=fmt),
                    timeout=180.0,
                )
                uploaded_url = None
                if auto_upload:
                    res = animref_playblast.upload_playblast(
                        out_path,
                        title=title,
                        category=category,
                        wip_stage=wip_stage,
                        board_id=board_id,
                        draft=True,
                    )
                    raw_u = res.get("reviewUrl") or res.get("portfolioUrl") or res.get("url") or ""
                    if raw_u:
                        uploaded_url = (
                            animref_auth.SITE_BASE_URL + raw_u if raw_u.startswith("/") else raw_u
                        )
                        if open_browser:
                            try:
                                webbrowser.open(uploaded_url)
                            except Exception:
                                pass
                self._send_json({"ok": True, "path": out_path, "uploaded_url": uploaded_url})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        self.send_response(404)
        self.end_headers()


def start_companion_server() -> str:
    global _server, _server_port
    _ensure_main_timer()
    animref_updater.check_in_background(force=False)
    with _server_lock:
        if _server is None:
            _server_port = _find_free_port()
            _server = http.server.ThreadingHTTPServer(("127.0.0.1", _server_port), _StudioHandler)
            t = threading.Thread(target=_server.serve_forever, daemon=True)
            t.start()
        return f"http://127.0.0.1:{_server_port}/"


def stop_companion_server() -> None:
    global _server, _server_port
    with _server_lock:
        if _server is not None:
            try:
                _server.shutdown()
                _server.server_close()
            except Exception:
                pass
            _server = None
            _server_port = 0


def launch_studio_app_window() -> str:
    """Start the local Studio server and open it in a frameless native app window."""
    url = start_companion_server()

    # Prefer Edge / Chrome --app mode so it opens as a clean standalone studio window (no tabs/URL bar)
    candidates = []
    if sys.platform == "win32":
        candidates = [
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ]
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
    else:
        for bin_name in ("google-chrome", "chromium", "microsoft-edge"):
            found = shutil.which(bin_name)
            if found:
                candidates.append(found)

    profile_dir = os.path.join(animref_auth.get_storage_dir(), "app_window_profile")
    os.makedirs(profile_dir, exist_ok=True)
    for exe in candidates:
        if os.path.isfile(exe):
            try:
                subprocess.Popen([
                    exe,
                    f"--user-data-dir={profile_dir}",
                    f"--app={url}",
                    "--new-window",
                    "--window-size=1040,740",
                ])
                return url
            except Exception:
                pass

    webbrowser.open(url)
    return url
