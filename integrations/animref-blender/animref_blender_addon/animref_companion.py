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

from . import animref_api, animref_auth, animref_importer, animref_playblast

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
<title>AnimationReference.org Studio — Blender</title>
<style>
  :root {
    --bg: #09090e;
    --panel: #111119;
    --card: #161622;
    --border: rgba(255,255,255,0.08);
    --text: #f4f4f5;
    --muted: #a1a1aa;
    --accent: #7c3aed;
    --accent-hover: #8b5cf6;
    --emerald: #10b981;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    user-select: none;
  }
  /* Header */
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: var(--panel);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 13px;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }
  .brand-dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: linear-gradient(135deg, #a855f7, #f97316);
  }
  .badge-blender {
    font-size: 9px; font-weight: 800; text-transform: uppercase;
    padding: 2px 6px; border-radius: 6px;
    background: rgba(249,115,22,0.18); color: #fdba74; border: 1px solid rgba(249,115,22,0.35);
  }
  .tabs {
    display: flex; gap: 4px; background: rgba(255,255,255,0.04);
    padding: 3px; border-radius: 10px; border: 1px solid var(--border);
  }
  .tab-btn {
    border: none; background: transparent; color: var(--muted);
    padding: 5px 11px; border-radius: 7px; font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all .15s;
  }
  .tab-btn:hover { color: #fff; }
  .tab-btn.active { background: var(--accent); color: #fff; }
  .search-wrap {
    flex: 1; display: flex; align-items: center; gap: 6px;
    background: #0b0b12; border: 1px solid var(--border);
    border-radius: 10px; padding: 0 10px; height: 32px;
  }
  .search-wrap input {
    flex: 1; background: transparent; border: none; outline: none;
    color: #fff; font-size: 12px;
  }
  .acct-area { display: flex; align-items: center; gap: 6px; margin-left: auto; }
  .btn {
    border: 1px solid var(--border); background: rgba(255,255,255,0.06);
    color: #fff; padding: 6px 11px; border-radius: 9px; font-size: 11px; font-weight: 700;
    cursor: pointer; transition: all .15s; white-space: nowrap;
  }
  .btn:hover { background: rgba(255,255,255,0.13); }
  .btn-primary { background: var(--accent); border-color: rgba(167,139,250,0.4); }
  .btn-primary:hover { background: var(--accent-hover); }
  .btn-emerald { background: #059669; border-color: rgba(16,185,129,0.4); }
  .btn-emerald:hover { background: #047857; }
  .btn-danger { background: rgba(239,68,68,0.15); color: #fca5a5; border-color: rgba(239,68,68,0.3); }
  .btn-danger:hover { background: rgba(239,68,68,0.3); color: #fff; }

  /* Filter chips bar */
  .subbar {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 14px; background: #0d0d14;
    border-bottom: 1px solid var(--border);
    overflow-x: auto; flex-shrink: 0;
  }
  .chip {
    border: 1px solid var(--border); background: rgba(255,255,255,0.04);
    color: var(--muted); padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap;
  }
  .chip:hover { color: #fff; border-color: rgba(255,255,255,0.2); }
  .chip.active { background: rgba(124,58,237,0.25); color: #ddd6fe; border-color: rgba(167,139,250,0.5); }

  /* Main content */
  main { flex: 1; overflow-y: auto; padding: 14px; position: relative; }
  .masonry {
    columns: 4 190px;
    column-gap: 12px;
  }
  .card {
    break-inside: avoid;
    margin-bottom: 12px;
    position: relative;
    border-radius: 13px;
    overflow: hidden;
    background: var(--card);
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
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    background: #06060a;
    overflow: hidden;
  }
  .card-media img, .card-media video {
    width: 100%; height: 100%; object-fit: cover; display: block;
  }
  .card-media video {
    position: absolute; inset: 0; opacity: 0; transition: opacity .2s;
  }
  .card:hover .card-media video.playing { opacity: 1; }
  .card-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.85) 100%);
    opacity: 0; transition: opacity .18s;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 8px;
  }
  .card:hover .card-overlay { opacity: 1; }
  .card-top { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
  .card-cat {
    font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
    background: rgba(0,0,0,0.65); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.12);
  }
  .card-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 6px; }
  .card-title { font-size: 11px; font-weight: 700; color: #fff; line-height: 1.25; }
  .icon-btn {
    width: 28px; height: 28px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.2); background: rgba(12,10,18,0.85);
    color: #fff; font-size: 13px; cursor: pointer; display: grid; place-items: center;
    flex-shrink: 0;
  }
  .icon-btn:hover { background: var(--accent); border-color: #c4b5fd; }

  /* Full-Window Studio Video Player Screen (No extra pop-out!) */
  #studioScreen {
    display: none;
    flex-direction: column;
    height: 100%;
    gap: 12px;
  }
  #studioScreen.open { display: flex; }
  .studio-top {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
  }
  .player-shell {
    background: #0d0d13; border: 1px solid #242432; border-radius: 14px;
    padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 260px;
  }
  .player-stage {
    flex: 1; background: #000; border-radius: 10px; overflow: hidden;
    display: flex; align-items: center; justify-content: center; position: relative; min-height: 200px;
  }
  .player-stage video, .player-stage img {
    max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain;
  }
  .scrubber { width: 100%; accent-color: #8b5cf6; cursor: pointer; }
  .transport {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  }
  .frame-pill {
    font-family: ui-monospace, SFMono-Regular, monospace;
    font-size: 11px; font-weight: 700; color: #c4b5fd;
    background: rgba(124,58,237,0.18); padding: 3px 8px; border-radius: 7px;
  }
  .import-bar {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 12px; padding: 10px 12px;
  }
  select, input[type="text"], input[type="number"] {
    background: #0b0b12; color: #fff; border: 1px solid var(--border);
    border-radius: 8px; padding: 5px 8px; font-size: 11px;
  }

  /* Scene & Playblast View */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  @media (max-width: 720px) { .two-col { grid-template-columns: 1fr; } }
  .panel-card {
    background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px;
  }
  .panel-card h3 { font-size: 13px; font-weight: 800; color: #fff; }
  .ref-row {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 8px 10px; background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; font-size: 11px;
  }
  .toast {
    position: fixed; bottom: 16px; right: 16px;
    background: #181826; color: #fff; border: 1px solid rgba(167,139,250,0.45);
    padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: 600;
    box-shadow: 0 12px 32px rgba(0,0,0,0.6); opacity: 0; pointer-events: none;
    transition: opacity .2s; z-index: 999;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="brand-dot"></span>
      <span>AnimRef Studio</span>
      <span class="badge-blender">Blender</span>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="explore">Explore</button>
      <button class="tab-btn" data-tab="saved">Saved</button>
      <button class="tab-btn" data-tab="boards">Boards</button>
      <button class="tab-btn" data-tab="scene">Scene &amp; Playblast</button>
    </div>
    <div class="search-wrap" id="searchWrap">
      <input id="searchInput" type="text" placeholder="Search walk cycle, combat, acting..." />
    </div>
    <div class="acct-area" id="acctArea"></div>
  </header>

  <div class="subbar" id="catBar">
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
    <!-- Grid View -->
    <div id="gridView">
      <div class="masonry" id="cardGrid"></div>
    </div>

    <!-- Full-Window Studio Video Player -->
    <div id="studioScreen">
      <div class="studio-top">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <button class="btn" id="backToGridBtn">← Back</button>
          <span id="studioTitle" style="font-weight:800;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></span>
        </div>
        <button class="btn btn-primary" id="studioImportBtn">+ Import to Blender</button>
      </div>
      <div class="player-shell">
        <div class="player-stage" id="playerStage">
          <video id="studioVideo" loop playsinline></video>
          <img id="studioImg" style="display:none;" />
        </div>
        <input id="scrubber" class="scrubber" type="range" min="0" max="1000" value="0" />
        <div class="transport">
          <button class="btn btn-primary" id="playPauseBtn">▶</button>
          <button class="btn" id="prevFrameBtn">‹ -1f</button>
          <button class="btn" id="nextFrameBtn">+1f ›</button>
          <span class="frame-pill" id="frameReadout">0f · 24fps</span>
          <div style="flex:1;"></div>
          <button class="btn" id="speedBtn">1.0x</button>
          <button class="btn" id="loopBtn">↻ Loop</button>
          <button class="btn" id="openWebBtn">Web ↗</button>
        </div>
      </div>
      <div class="import-bar">
        <label style="font-size:11px;color:var(--muted);">Mode</label>
        <select id="importMode">
          <option value="CAMERA_BG">Camera Background (PiP)</option>
          <option value="EMPTY_3D">3D Reference Plane</option>
          <option value="VSE">Video Sequencer (VSE)</option>
        </select>
        <label style="font-size:11px;color:var(--muted);">PiP</label>
        <select id="pipPreset">
          <option value="TOP_RIGHT">Top-Right</option>
          <option value="TOP_LEFT">Top-Left</option>
          <option value="BOTTOM_RIGHT">Bottom-Right</option>
          <option value="BOTTOM_LEFT">Bottom-Left</option>
          <option value="FULL">Full Frame</option>
        </select>
        <label style="font-size:11px;color:var(--muted);">Opacity</label>
        <input id="importOpacity" type="range" min="0.1" max="1" step="0.05" value="0.75" style="width:90px;accent-color:#8b5cf6;" />
        <label style="font-size:11px;display:flex;align-items:center;gap:4px;">
          <input id="matchFps" type="checkbox" checked /> Match FPS
        </label>
      </div>
    </div>

    <!-- Scene Manager & Playblast View -->
    <div id="sceneView" style="display:none;">
      <div class="two-col">
        <div class="panel-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <h3>Active Blender Scene References</h3>
            <button class="btn" id="refreshSceneBtn">↻ Refresh</button>
          </div>
          <div id="sceneRefList" style="display:flex;flex-direction:column;gap:8px;"></div>
          <div style="margin-top:8px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:700;">Drop Timeline Pose Marker</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;" id="poseMarkerBtns"></div>
          </div>
        </div>
        <div class="panel-card">
          <h3>Viewport Playblast &amp; Auto-Post</h3>
          <div style="display:flex;gap:8px;">
            <input id="pbTitle" type="text" placeholder="Playblast title..." style="flex:1;" />
            <select id="pbFormat">
              <option value="MP4">MP4 (H.264)</option>
              <option value="AVI">AVI (MJPEG)</option>
            </select>
          </div>
          <label style="font-size:12px;color:#d4d4d8;display:flex;align-items:center;gap:6px;">
            <input id="pbAutoPost" type="checkbox" checked /> Auto-post to AnimationReference.org Portfolio &amp; Feed
          </label>
          <button class="btn btn-emerald" id="recordPbBtn" style="padding:10px;">● Record Blender Playblast</button>
          <div id="pbResult" style="font-size:11px;color:#a7f3d0;"></div>
        </div>
      </div>
    </div>
  </main>

  <div class="toast" id="toast"></div>

<script>
let state = { tab: 'explore', tag: 'all', q: '', items: [], activeClip: null, speeds: [0.25, 0.5, 0.75, 1, 1.5, 2], speedIdx: 3 };

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => t.classList.remove('show'), 2800);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
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

async function loadAccount() {
  try {
    const a = await api('/api/account');
    const el = document.getElementById('acctArea');
    if (a.signed_in) {
      el.innerHTML = `<span style="font-size:11px;color:#d4d4d8;font-weight:700;">${a.display_name || a.email}</span>` +
        (a.is_pro ? `<span class="badge-blender" style="background:rgba(124,58,237,0.25);color:#ddd6fe;border-color:#8b5cf6;">PRO</span>` : '') +
        `<button class="btn" id="signOutBtn">Sign Out</button>`;
      document.getElementById('signOutBtn').onclick = async () => {
        await api('/api/auth/signout', { method: 'POST' });
        await loadAccount();
        showToast('Signed out');
      };
    } else {
      el.innerHTML = `<button class="btn btn-primary" id="signInBtn">Sign In</button>`;
      document.getElementById('signInBtn').onclick = async () => {
        await api('/api/auth/browser', { method: 'POST' });
        showToast('Opened browser sign-in — will auto-sync!');
        const poll = setInterval(async () => {
          const cur = await api('/api/account');
          if (cur.signed_in) {
            clearInterval(poll);
            loadAccount();
            loadItems();
            showToast('Connected as ' + (cur.display_name || cur.email));
          }
        }, 1500);
        setTimeout(() => clearInterval(poll), 120000);
      };
    }
  } catch {}
}

async function loadItems() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:20px;">Loading references...</div>`;
  try {
    const qs = new URLSearchParams({ tab: state.tab, tag: state.tag, q: state.q });
    const data = await api('/api/items?' + qs.toString());
    state.items = data.items || [];
    renderGrid();
  } catch (e) {
    grid.innerHTML = `<div style="color:#fca5a5;font-size:12px;padding:20px;">${e.message}</div>`;
  }
}

function renderGrid() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';
  if (!state.items.length) {
    grid.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:20px;">No references found.</div>`;
    return;
  }
  for (const item of state.items) {
    const card = document.createElement('div');
    card.className = 'card';
    const thumb = item.thumbnailUrl || item.posterUrl || '';
    const vUrl = previewUrl(item);
    const isVideo = vUrl && !/\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(vUrl);
    card.innerHTML = `
      <div class="card-media">
        ${thumb ? `<img src="${thumb}" loading="lazy" />` : ''}
        ${isVideo ? `<video muted loop playsinline preload="none" data-src="${vUrl}"></video>` : ''}
        <div class="card-overlay">
          <div class="card-top">
            <span class="card-cat">${item.category || 'Ref'}</span>
            <button class="btn btn-primary quick-imp" style="padding:3px 8px;font-size:10px;">+ Blender</button>
          </div>
          <div class="card-bottom">
            <div class="card-title">${(item.title || 'Reference').slice(0, 46)}</div>
            <button class="icon-btn open-studio" title="Open Studio Player">⛶</button>
          </div>
        </div>
      </div>
    `;
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
    card.querySelector('.quick-imp').onclick = (e) => { e.stopPropagation(); importClip(item); };
    card.querySelector('.open-studio').onclick = (e) => { e.stopPropagation(); openStudio(item); };
    card.onclick = () => openStudio(item);
    grid.appendChild(card);
  }
}

async function importClip(item) {
  showToast('Importing "' + (item.title || 'Reference') + '" into Blender...');
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
    showToast('✓ Imported into Blender!');
  } catch (e) {
    showToast('Error: ' + e.message);
  }
}

function openStudio(item) {
  state.activeClip = item;
  document.getElementById('gridView').style.display = 'none';
  document.getElementById('sceneView').style.display = 'none';
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

function closeStudio() {
  document.getElementById('studioVideo').pause();
  document.getElementById('studioScreen').classList.remove('open');
  document.getElementById('gridView').style.display = 'block';
  document.getElementById('catBar').style.display = state.tab === 'explore' ? 'flex' : 'none';
}

const sVid = document.getElementById('studioVideo');
const scrubber = document.getElementById('scrubber');
sVid.ontimeupdate = () => {
  if (!sVid.duration) return;
  scrubber.value = Math.round((sVid.currentTime / sVid.duration) * 1000);
  const fps = (state.activeClip && state.activeClip.fps) || 24;
  document.getElementById('frameReadout').textContent = `${Math.round(sVid.currentTime * fps)}f · ${fps}fps`;
};
scrubber.oninput = () => {
  if (sVid.duration) sVid.currentTime = (scrubber.value / 1000) * sVid.duration;
};
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
document.getElementById('backToGridBtn').onclick = closeStudio;
document.getElementById('studioImportBtn').onclick = () => state.activeClip && importClip(state.activeClip);
document.getElementById('openWebBtn').onclick = () => {
  if (state.activeClip && state.activeClip.id) window.open('https://animationreference.org/video/' + state.activeClip.id, '_blank');
};

async function loadSceneRefs() {
  const list = document.getElementById('sceneRefList');
  try {
    const data = await api('/api/scene/refs');
    const refs = data.refs || [];
    if (!refs.length) {
      list.innerHTML = `<div style="font-size:11px;color:var(--muted);">No AnimRef references in scene yet.</div>`;
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
        </div>
      `;
      row.querySelectorAll('button').forEach(b => {
        b.onclick = async () => {
          await api('/api/scene/action', {
            method: 'POST',
            body: JSON.stringify({ action: b.dataset.act, ref_key: r.name, delta: parseInt(b.dataset.d || '0', 10) }),
          });
          loadSceneRefs();
        };
      });
      list.appendChild(row);
    }
  } catch (e) {
    list.innerHTML = `<div style="font-size:11px;color:#fca5a5;">${e.message}</div>`;
  }
}

document.getElementById('refreshSceneBtn').onclick = loadSceneRefs;
['Anticipation', 'Contact', 'Passing', 'Breakdown', 'Extreme', 'Overshoot'].forEach(lbl => {
  const b = document.createElement('button');
  b.className = 'btn';
  b.textContent = lbl;
  b.onclick = async () => {
    await api('/api/scene/action', { method: 'POST', body: JSON.stringify({ action: 'marker', label: lbl }) });
    showToast('Added marker: ' + lbl);
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
        auto_upload: document.getElementById('pbAutoPost').checked,
      }),
    });
    document.getElementById('pbResult').textContent = res.uploaded_url
      ? '✓ Posted live: ' + res.uploaded_url
      : '✓ Saved: ' + res.path;
    showToast('✓ Playblast complete!');
  } catch (e) {
    showToast('Playblast error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '● Record Blender Playblast';
  }
};

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tab = btn.dataset.tab;
    closeStudio();
    if (state.tab === 'scene') {
      document.getElementById('gridView').style.display = 'none';
      document.getElementById('catBar').style.display = 'none';
      document.getElementById('sceneView').style.display = 'block';
      loadSceneRefs();
    } else {
      document.getElementById('sceneView').style.display = 'none';
      document.getElementById('gridView').style.display = 'block';
      document.getElementById('catBar').style.display = state.tab === 'explore' ? 'flex' : 'none';
      loadItems();
    }
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
  searchTimer = setTimeout(loadItems, 240);
};

loadAccount();
loadItems();
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

        if parsed.path == "/api/account":
            self._send_json(animref_auth.get_account_summary())
            return

        if parsed.path == "/api/items":
            qs = urllib.parse.parse_qs(parsed.query)
            tab = (qs.get("tab") or ["explore"])[0]
            tag = (qs.get("tag") or ["all"])[0]
            q = (qs.get("q") or [""])[0]
            try:
                if tab == "saved":
                    vids = animref_api.fetch_saved_references()
                    if not vids:
                        vids = animref_api.fetch_moodboard_items()
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

        if parsed.path == "/api/playblast":
            try:
                fmt = body.get("file_format", "MP4")
                title = str(body.get("title") or "Blender Playblast")
                auto_upload = bool(body.get("auto_upload", True))

                out_path = _run_on_blender_main(
                    lambda ctx: animref_playblast.record_viewport_playblast(ctx, file_format=fmt),
                    timeout=180.0,
                )
                uploaded_url = None
                if auto_upload:
                    res = animref_playblast.upload_playblast(out_path, title=title)
                    raw_u = res.get("portfolioUrl") or res.get("url") or ""
                    if raw_u:
                        uploaded_url = (
                            animref_auth.SITE_BASE_URL + raw_u if raw_u.startswith("/") else raw_u
                        )
                self._send_json({"ok": True, "path": out_path, "uploaded_url": uploaded_url})
            except Exception as exc:
                self._send_json({"error": str(exc)}, 400)
            return

        self.send_response(404)
        self.end_headers()


def start_companion_server() -> str:
    global _server, _server_port
    _ensure_main_timer()
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

    for exe in candidates:
        if os.path.isfile(exe):
            try:
                subprocess.Popen([exe, f"--app={url}", "--window-size=980,720"])
                return url
            except Exception:
                pass

    webbrowser.open(url)
    return url
