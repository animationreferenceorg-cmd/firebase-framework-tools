"""
=============================================================================
AnimationReference.org - Maya Studio Video Player & Python Installer
=============================================================================
HOW TO INSTALL:
Drag and drop this file into your Maya 3D Viewport or Script Editor!
Works in Maya 2020, 2022, 2023, 2024, 2025, 2026.

FEATURES:
- Real-time Maya Timeline Sync (scrubs at 60 FPS in sync with Time Slider!)
- Local Video Caching for zero-latency frame scrubbing
- Sign in to view your SAVED REFERENCES & LIKED CLIPS from Maya
- 1-Click browser account connect or direct email sign-in
- Viewport Camera Plane integration
- 1-Click 'Send to Maya' from web browser
=============================================================================
"""

import os
import sys
import json
import urllib.request
import urllib.error
import threading
import hashlib
import webbrowser
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    import maya.cmds as cmds
    import maya.mel as mel
    import maya.utils as utils
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False
    print("[AnimRef] Warning: Not running inside Autodesk Maya.")

# PySide Import (PySide6 for Maya 2025+, PySide2 for Maya 2020-2024)
try:
    from PySide6 import QtWidgets, QtCore, QtGui
    from PySide6.QtMultimedia import QMediaPlayer, QAudioOutput
    from PySide6.QtMultimediaWidgets import QVideoWidget
    from PySide6.QtCore import QUrl
    PYSIDE_VER = 6
except ImportError:
    try:
        from PySide2 import QtWidgets, QtCore, QtGui
        from PySide2.QtMultimedia import QMediaPlayer, QMediaContent
        from PySide2.QtMultimediaWidgets import QVideoWidget
        from PySide2.QtCore import QUrl
        PYSIDE_VER = 2
    except ImportError:
        QtWidgets = None
        PYSIDE_VER = 0

try:
    from maya.app.general.mayaMixin import MayaQWidgetDockableMixin
except ImportError:
    class MayaQWidgetDockableMixin(object):
        pass

BRIDGE_PORT = 9880
SHELF_BUTTON_LABEL = "AnimRef"
CONFIG_DIR = os.path.expanduser("~/.animref")
CACHE_DIR = os.path.join(CONFIG_DIR, "cache")
SESSION_FILE = os.path.join(CONFIG_DIR, "session.json")

# Ensure config directories exist
os.makedirs(CACHE_DIR, exist_ok=True)

_server_instance = None
_server_thread = None
_player_window_instance = None
_installer_window_instance = None

# =============================================================================
# 1. Local Cache Manager (For 0ms Scrubbing)
# =============================================================================
def get_cached_video_path(video_url):
    """Returns local cached path for a video URL, or starts downloading."""
    if not video_url or not video_url.startswith("http"):
        return video_url
    url_hash = hashlib.md5(video_url.encode('utf-8')).hexdigest()
    filename = f"{url_hash}.mp4"
    local_path = os.path.join(CACHE_DIR, filename)
    return local_path

def download_video_async(video_url, on_complete=None):
    """Downloads video to local cache in background for ultra-smooth scrubbing."""
    if not video_url or not video_url.startswith("http"):
        return
    local_path = get_cached_video_path(video_url)
    if os.path.exists(local_path) and os.path.getsize(local_path) > 1024:
        if on_complete:
            on_complete(local_path)
        return local_path

    def _dl():
        try:
            req = urllib.request.Request(video_url, headers={'User-Agent': 'AnimRefMaya/1.0'})
            temp_file = local_path + ".tmp"
            with urllib.request.urlopen(req, timeout=30) as resp, open(temp_file, 'wb') as out:
                out.write(resp.read())
            if os.path.exists(temp_file):
                os.replace(temp_file, local_path)
                print(f"[AnimRef] Video cached locally for instant scrubbing: {local_path}")
                if on_complete:
                    if MAYA_AVAILABLE:
                        utils.executeDeferred(on_complete, local_path)
                    else:
                        on_complete(local_path)
        except Exception as e:
            print(f"[AnimRef] Cache download warning: {e}")

    t = threading.Thread(target=_dl, daemon=True)
    t.start()
    return local_path

# =============================================================================
# 2. Camera & Image Plane Controller
# =============================================================================
def setup_reference_camera(video_url, title="AnimationReference", fps=24, offset=0, opacity=0.85):
    if not MAYA_AVAILABLE:
        print(f"[AnimRef] Simulation: Load '{video_url}' into Maya camera.")
        return "RefCam_Simulated", "ImagePlane_Simulated"

    import re
    clean_title = re.sub(r'[^a-zA-Z0-9_]', '_', title)[:24]
    cam_name = f"RefCam_{clean_title}" if clean_title else "RefCam_AnimRef"

    if cmds.objExists(cam_name):
        cam = cam_name
    else:
        cam, cam_shape = cmds.camera(name=cam_name)
        cmds.setAttr(f"{cam}.translate", 0, 100, 300)
        cmds.setAttr(f"{cam}.rotate", 0, 0, 0)
        cmds.setAttr(f"{cam_shape}.renderable", 0)

    planes = cmds.imagePlane(camera=cam, query=True) or []
    if planes:
        img_plane = planes[0]
    else:
        created = cmds.imagePlane(camera=cam)
        img_plane = created[1] if len(created) > 1 else created[0]

    # Use local cached video file if available for imagePlane
    local_file = get_cached_video_path(video_url)
    target_path = local_file if os.path.exists(local_file) else video_url

    try:
        cmds.setAttr(f"{img_plane}.imageName", target_path, type="string")
        cmds.setAttr(f"{img_plane}.useFrameExtension", 1)
        cmds.setAttr(f"{img_plane}.frameOffset", int(offset))
        cmds.setAttr(f"{img_plane}.fit", 2)
        cmds.setAttr(f"{img_plane}.depth", 1000)
        cmds.setAttr(f"{img_plane}.lockedToCamera", 1)
        if cmds.attributeQuery("alphaGain", node=img_plane, exists=True):
            cmds.setAttr(f"{img_plane}.alphaGain", float(opacity))
    except Exception as e:
        print(f"[AnimRef] ImagePlane attributes note: {e}")

    cmds.select(cam)
    return cam, img_plane

# =============================================================================
# 3. Session & Auth Manager
# =============================================================================
def load_session():
    if os.path.exists(SESSION_FILE):
        try:
            with open(SESSION_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def save_session(session_data):
    try:
        with open(SESSION_FILE, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2)
    except Exception as e:
        print(f"[AnimRef] Error saving session: {e}")

def clear_session():
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
        except Exception:
            pass

# =============================================================================
# 4. Local Threaded Bridge Server (Port 9876)
# =============================================================================
try:
    from http.server import ThreadingHTTPServer
except ImportError:
    from socketserver import ThreadingMixIn
    class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
        daemon_threads = True

class ThreadedBridgeServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class AnimRefBridgeHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Connection', 'close')
        BaseHTTPRequestHandler.end_headers(self)

    def do_OPTIONS(self):
        self.close_connection = True
        self.send_response(200)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.end_headers()

    def do_GET(self):
        self.close_connection = True
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        session = load_session()
        self.wfile.write(json.dumps({
            "plugin": "AnimationReference Maya Studio Video Player",
            "version": "1.4.0",
            "status": "listening",
            "port": BRIDGE_PORT,
            "user": session.get("displayName") or session.get("email") or None
        }).encode('utf-8'))

    def do_POST(self):
        self.close_connection = True
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len)

        # ── Auth Token Received from Browser Connect Page ──
        if self.path == '/auth-token':
            try:
                data = json.loads(body.decode('utf-8'))
                token = data.get('token', '')
                uid = data.get('uid', '')
                email = data.get('email', '')
                display_name = data.get('displayName', email)

                save_session({
                    "token": token,
                    "uid": uid,
                    "email": email,
                    "displayName": display_name
                })

                print(f"\n[AnimRef] Connected account: {display_name} ({email})")

                def _update_ui():
                    global _player_window_instance
                    if _player_window_instance:
                        _player_window_instance._on_session_updated()
                    else:
                        show_video_player()

                if MAYA_AVAILABLE:
                    utils.executeDeferred(_update_ui)
                else:
                    _update_ui()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "user": display_name}).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(str(e).encode('utf-8'))
                return

        # ── Load Clip from Web Page 'Send to Maya' ──
        if self.path in ['/load-clip', '/']:
            try:
                data = json.loads(body.decode('utf-8'))
                video_url = data.get('videoUrl', '')
                title = data.get('title', 'Animation Reference')
                fps = data.get('fps', 24)

                def _apply():
                    show_video_player(video_url=video_url, title=title, fps=fps)

                if MAYA_AVAILABLE:
                    utils.executeDeferred(_apply)
                else:
                    _apply()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "clip": title}).encode('utf-8'))
                return
            except Exception as err:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(str(err).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

    def log_message(self, format, *args):
        pass

def stop_bridge():
    global _server_instance, _server_thread
    old = getattr(sys, '_animref_server_instance', None)
    if old:
        try:
            old.shutdown()
            old.server_close()
        except Exception:
            pass
        setattr(sys, '_animref_server_instance', None)

    if _server_instance:
        try:
            _server_instance.shutdown()
            _server_instance.server_close()
        except Exception:
            pass
        _server_instance = None
        _server_thread = None

def start_bridge(port=BRIDGE_PORT):
    global _server_instance, _server_thread, BRIDGE_PORT
    stop_bridge()

    candidate_ports = [port, 9881, 9882, 9883, 9877]
    for p in candidate_ports:
        try:
            server = ThreadedBridgeServer(('127.0.0.1', p), AnimRefBridgeHandler)
            _server_instance = server
            setattr(sys, '_animref_server_instance', server)
            BRIDGE_PORT = p
            _server_thread = threading.Thread(target=server.serve_forever, daemon=True)
            _server_thread.start()
            print(f"[AnimRef] Threaded Maya Bridge active on http://127.0.0.1:{BRIDGE_PORT}!")
            return BRIDGE_PORT
        except OSError as err:
            print(f"[AnimRef] Port {p} unavailable ({err}), trying next port...")
            continue

    print(f"[AnimRef] Warning: Could not bind bridge server on ports {candidate_ports}")
    return None

# =============================================================================
# 5. Timeline-Synced Video Player with User Saved References
# =============================================================================
class AnimRefVideoPlayerWindow(MayaQWidgetDockableMixin, QtWidgets.QWidget if QtWidgets else object):
    def __init__(self, parent=None, video_url="", title="Animation Reference", fps=24):
        super(AnimRefVideoPlayerWindow, self).__init__(parent=parent)
        self.setWindowTitle("Animation Reference Studio")
        self.setObjectName("AnimRefVideoPlayerWindow")
        self.resize(520, 640)
        self.setMinimumWidth(380)
        self.setMinimumHeight(480)

        self.video_url = video_url or "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
        self.current_local_path = None
        self.title = title
        self.fps = float(fps)
        self.start_frame = 1.0
        self.frame_offset = 0.0
        self.is_timeline_sync_enabled = True
        self.script_job_id = None
        
        self.saved_videos = []
        self.liked_videos = []
        self.cached_catalog = []

        self._build_ui()
        self._apply_dark_theme()
        self._setup_media_player()

        if self.video_url:
            self._load_url(self.video_url, self.title, self.fps)

        self._register_timeline_sync()
        self._on_session_updated()
        self._fetch_catalog_async()

    def _build_ui(self):
        main_layout = QtWidgets.QVBoxLayout(self)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(8)

        # User Account Bar
        self.account_bar = QtWidgets.QHBoxLayout()
        self.user_label = QtWidgets.QLabel("👤 Not connected")
        self.user_label.setStyleSheet("color: #a1a1aa; font-size: 11px;")
        
        self.paste_key_btn = QtWidgets.QPushButton("📋 Paste Key")
        self.paste_key_btn.setStyleSheet("background-color: #27272a; color: #d4d4d8; font-weight: 500; padding: 3px 8px; border-radius: 5px; font-size: 10px;")
        self.paste_key_btn.clicked.connect(self._paste_connection_key)

        self.auth_action_btn = QtWidgets.QPushButton("🔗 Connect Account")
        self.auth_action_btn.setStyleSheet("background-color: #581c87; color: #e9d5ff; font-weight: bold; padding: 3px 8px; border-radius: 5px; font-size: 10px;")
        self.auth_action_btn.clicked.connect(self._open_auth_connect)

        self.account_bar.addWidget(self.user_label)
        self.account_bar.addStretch()
        self.account_bar.addWidget(self.paste_key_btn)
        self.account_bar.addWidget(self.auth_action_btn)
        main_layout.addLayout(self.account_bar)

        # Video Screen (QVideoWidget)
        self.video_widget = QVideoWidget() if QtWidgets else None
        if self.video_widget:
            self.video_widget.setMinimumHeight(240)
            self.video_widget.setStyleSheet("background-color: #000000; border-radius: 8px;")
            main_layout.addWidget(self.video_widget, stretch=1)

        # Clip Title and Info
        top_bar = QtWidgets.QHBoxLayout()
        self.title_label = QtWidgets.QLabel(f"<b>🎬 {self.title[:32]}</b>")
        self.title_label.setStyleSheet("color: #c084fc; font-size: 12px;")
        
        self.fps_badge = QtWidgets.QLabel(f"{int(self.fps)} FPS")
        self.fps_badge.setStyleSheet("background-color: #3b0764; color: #d8b4fe; padding: 1px 5px; border-radius: 4px; font-weight: bold; font-size: 10px;")
        
        self.cache_indicator = QtWidgets.QLabel("● Stream")
        self.cache_indicator.setStyleSheet("color: #eab308; font-size: 10px; font-weight: bold;")

        top_bar.addWidget(self.title_label)
        top_bar.addStretch()
        top_bar.addWidget(self.cache_indicator)
        top_bar.addWidget(self.fps_badge)
        main_layout.addLayout(top_bar)

        # Scrubber / Timeline bar
        scrub_layout = QtWidgets.QHBoxLayout()
        self.time_label = QtWidgets.QLabel("F: 1 / 0:00")
        self.time_label.setStyleSheet("color: #a1a1aa; font-family: monospace; font-size: 11px;")
        
        self.scrub_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.scrub_slider.setRange(0, 1000)
        self.scrub_slider.sliderMoved.connect(self._on_user_scrub)
        
        scrub_layout.addWidget(self.time_label)
        scrub_layout.addWidget(self.scrub_slider)
        main_layout.addLayout(scrub_layout)

        # Transport Controls
        transport = QtWidgets.QHBoxLayout()
        
        self.play_btn = QtWidgets.QPushButton("▶ Play")
        self.play_btn.setStyleSheet("background-color: #7e22ce; color: white; font-weight: bold; padding: 4px 10px; border-radius: 5px;")
        self.play_btn.clicked.connect(self._toggle_playback)
        
        step_back_btn = QtWidgets.QPushButton("◀ Step")
        step_back_btn.clicked.connect(lambda: self._step_frames(-1))
        
        step_fwd_btn = QtWidgets.QPushButton("Step ▶")
        step_fwd_btn.clicked.connect(lambda: self._step_frames(1))

        self.sync_checkbox = QtWidgets.QCheckBox("Sync Timeline")
        self.sync_checkbox.setChecked(True)
        self.sync_checkbox.setStyleSheet("color: #4ade80; font-weight: bold; font-size: 11px;")
        self.sync_checkbox.toggled.connect(self._toggle_sync)

        transport.addWidget(self.play_btn)
        transport.addWidget(step_back_btn)
        transport.addWidget(step_fwd_btn)
        transport.addStretch()
        transport.addWidget(self.sync_checkbox)
        main_layout.addLayout(transport)

        # Slip / Offset Controls
        slip_box = QtWidgets.QHBoxLayout()
        slip_label = QtWidgets.QLabel("Frame Slip:")
        slip_label.setStyleSheet("color: #a1a1aa; font-size: 11px;")
        
        self.offset_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.offset_slider.setRange(-100, 100)
        self.offset_slider.setValue(0)
        self.offset_slider.valueChanged.connect(self._on_offset_changed)
        
        self.offset_display = QtWidgets.QLabel("0")
        self.offset_display.setStyleSheet("color: #e4e4e7; font-family: monospace; font-size: 11px; min-width: 25px;")
        
        reset_offset = QtWidgets.QPushButton("Reset")
        reset_offset.setMaximumWidth(45)
        reset_offset.clicked.connect(lambda: self.offset_slider.setValue(0))

        slip_box.addWidget(slip_label)
        slip_box.addWidget(self.offset_slider)
        slip_box.addWidget(self.offset_display)
        slip_box.addWidget(reset_offset)
        main_layout.addLayout(slip_box)

        # Actions Row
        actions = QtWidgets.QHBoxLayout()
        cam_btn = QtWidgets.QPushButton("🎥 Viewport Camera Plane")
        cam_btn.setStyleSheet("background-color: #1e1b4b; border: 1px solid #4338ca; color: #c7d2fe; font-size: 11px; padding: 5px; border-radius: 5px;")
        cam_btn.clicked.connect(self._create_camera_plane)

        fps_btn = QtWidgets.QPushButton("⏱ Conform Maya FPS")
        fps_btn.setStyleSheet("background-color: #18181b; border: 1px solid #27272a; color: #a1a1aa; font-size: 11px; padding: 5px; border-radius: 5px;")
        fps_btn.clicked.connect(self._conform_maya_fps)

        actions.addWidget(cam_btn)
        actions.addWidget(fps_btn)
        main_layout.addLayout(actions)

        # Tabbed Reference Browser: [⭐ Saved References] [❤️ Liked] [🌐 Catalog]
        self.tabs = QtWidgets.QTabWidget()
        self.tabs.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #2e284a; border-radius: 6px; background-color: #131120; }
            QTabBar::tab { background: #1a172a; color: #a1a1aa; padding: 5px 10px; font-size: 11px; border-top-left-radius: 4px; border-top-right-radius: 4px; }
            QTabBar::tab:selected { background: #6b21a8; color: white; font-weight: bold; }
        """)

        # Tab 1: Saved References
        self.saved_list = QtWidgets.QListWidget()
        self.saved_list.itemDoubleClicked.connect(self._on_saved_item_clicked)
        self.tabs.addTab(self.saved_list, "⭐ Saved (0)")

        # Tab 2: Liked References
        self.liked_list = QtWidgets.QListWidget()
        self.liked_list.itemDoubleClicked.connect(self._on_liked_item_clicked)
        self.tabs.addTab(self.liked_list, "❤️ Liked (0)")

        # Tab 3: Catalog Search
        cat_widget = QtWidgets.QWidget()
        cat_layout = QtWidgets.QVBoxLayout(cat_widget)
        cat_layout.setContentsMargins(4, 4, 4, 4)
        cat_layout.setSpacing(4)
        
        self.search_input = QtWidgets.QLineEdit()
        self.search_input.setPlaceholderText("Search 10,000+ reference catalog...")
        self.search_input.textChanged.connect(self._filter_catalog)
        cat_layout.addWidget(self.search_input)

        self.catalog_list = QtWidgets.QListWidget()
        self.catalog_list.itemDoubleClicked.connect(self._on_catalog_item_clicked)
        cat_layout.addWidget(self.catalog_list)
        self.tabs.addTab(cat_widget, "🌐 Catalog")

        self.tabs.setMaximumHeight(140)
        main_layout.addWidget(self.tabs)

    def _setup_media_player(self):
        if not QtWidgets:
            return
        self.media_player = QMediaPlayer()
        if PYSIDE_VER == 6:
            self.audio_output = QAudioOutput()
            self.media_player.setAudioOutput(self.audio_output)
            self.media_player.setVideoOutput(self.video_widget)
        else:
            self.media_player.setVideoOutput(self.video_widget)

        self.media_player.positionChanged.connect(self._on_position_changed)
        self.media_player.durationChanged.connect(self._on_duration_changed)

    def _load_url(self, url, title="Animation Reference", fps=24):
        self.video_url = url
        self.title = title
        self.fps = float(fps)
        self.title_label.setText(f"<b>🎬 {title[:32]}</b>")
        self.fps_badge.setText(f"{int(self.fps)} FPS")

        if not QtWidgets:
            return

        # Check local cache for 0ms lag
        local_cache = get_cached_video_path(url)
        if os.path.exists(local_cache):
            self.current_local_path = local_cache
            self.cache_indicator.setText("● Cached (60fps)")
            self.cache_indicator.setStyleSheet("color: #4ade80; font-size: 10px; font-weight: bold;")
            target_url = QUrl.fromLocalFile(local_cache)
        else:
            self.cache_indicator.setText("● Caching...")
            self.cache_indicator.setStyleSheet("color: #f59e0b; font-size: 10px; font-weight: bold;")
            target_url = QUrl(url) if url.startswith('http') else QUrl.fromLocalFile(url)

            # Start background caching
            def _cached_ready(path):
                self.current_local_path = path
                self.cache_indicator.setText("● Cached (60fps)")
                self.cache_indicator.setStyleSheet("color: #4ade80; font-size: 10px; font-weight: bold;")
                cur_pos = self.media_player.position()
                if hasattr(self.media_player, 'setSource'):
                    self.media_player.setSource(QUrl.fromLocalFile(path))
                else:
                    self.media_player.setMedia(QMediaContent(QUrl.fromLocalFile(path)))
                self.media_player.setPosition(cur_pos)

            download_video_async(url, on_complete=_cached_ready)

        if hasattr(self.media_player, 'setSource'):
            self.media_player.setSource(target_url)
        else:
            self.media_player.setMedia(QMediaContent(target_url))

        self.media_player.setPosition(0)

    # ──────────────── USER AUTHENTICATION & SAVED REFERENCES ────────────────
    def _paste_connection_key(self):
        clip_text = ""
        try:
            clipboard = QtWidgets.QApplication.clipboard()
            clip_text = clipboard.text().strip() if clipboard else ""
        except Exception:
            pass

        text, ok = QtWidgets.QInputDialog.getText(
            self, "Link Animation Reference Account",
            "Paste your Connection Key from AnimationReference.org/plugins/connect:",
            QtWidgets.QLineEdit.Normal,
            clip_text if len(clip_text) > 30 else ""
        )
        if ok and text:
            text = text.strip()
            try:
                import base64
                try:
                    raw_json = base64.b64decode(text.encode('utf-8')).decode('utf-8')
                except Exception:
                    raw_json = text
                data = json.loads(raw_json)
                if not data.get("token"):
                    raise ValueError("Connection key does not contain a valid session token.")
                save_session(data)
                self._on_session_updated()
                display_user = data.get('displayName') or data.get('email') or 'User'
                QtWidgets.QMessageBox.information(self, "Connected!", f"Successfully connected as {display_user}!\nYour saved references are loading.")
            except Exception as err:
                QtWidgets.QMessageBox.warning(self, "Invalid Key", f"Could not parse connection key:\n{err}")

    def _open_auth_connect(self):
        session = load_session()
        if session.get("token"):
            # Already logged in -> Confirm sign out
            reply = QtWidgets.QMessageBox.question(
                self, "Sign Out",
                f"Currently signed in as {session.get('email')}.\nDo you want to sign out?",
                QtWidgets.QMessageBox.Yes | QtWidgets.QMessageBox.No
            )
            if reply == QtWidgets.QMessageBox.Yes:
                clear_session()
                self._on_session_updated()
            return

        # Launch Web Browser Connect Page
        connect_url = f"http://localhost:3000/plugins/connect?port={BRIDGE_PORT}&app=Autodesk%20Maya"
        print(f"[AnimRef] Opening browser to connect account: {connect_url}")
        webbrowser.open(connect_url)

    def _on_session_updated(self):
        session = load_session()
        token = session.get("token")
        email = session.get("email")
        name = session.get("displayName") or email
        uid = session.get("uid")

        if token and email:
            self.user_label.setText(f"👤 {name}")
            self.auth_action_btn.setText("Sign Out")
            self.auth_action_btn.setStyleSheet("background-color: #27272a; color: #a1a1aa; padding: 3px 8px; border-radius: 5px; font-size: 10px;")
            self.tabs.setTabText(0, "⭐ Saved (Loading...)")
            self.tabs.setTabText(1, "❤️ Liked (Loading...)")
            self._fetch_user_saved_references_async(token, uid)
        else:
            self.user_label.setText("👤 Not connected")
            self.auth_action_btn.setText("🔗 Connect Account")
            self.auth_action_btn.setStyleSheet("background-color: #581c87; color: #e9d5ff; font-weight: bold; padding: 3px 8px; border-radius: 5px; font-size: 10px;")
            self.saved_list.clear()
            self.liked_list.clear()
            self.tabs.setTabText(0, "⭐ Saved (0)")
            self.tabs.setTabText(1, "❤️ Liked (0)")

    def _fetch_user_saved_references_async(self, token, uid=None):
        def _fetch():
            session = load_session()
            user_uid = uid or session.get("uid")

            # 1. Primary: Direct Google Firestore REST API (Fast, reliable, zero-config)
            if user_uid:
                try:
                    user_url = f"https://firestore.googleapis.com/v1/projects/aniamtion-reference/databases/(default)/documents/users/{user_uid}"
                    req = urllib.request.Request(user_url, headers={'Authorization': f'Bearer {token}'})
                    with urllib.request.urlopen(req, timeout=7) as resp:
                        user_doc = json.loads(resp.read().decode('utf-8'))
                        fields = user_doc.get('fields', {})
                        saved_raw = fields.get('savedVideoIds', {}).get('arrayValue', {}).get('values', [])
                        liked_raw = fields.get('likedVideoIds', {}).get('arrayValue', {}).get('values', [])
                        saved_ids = [v.get('stringValue') for v in saved_raw if v.get('stringValue')]
                        liked_ids = [v.get('stringValue') for v in liked_raw if v.get('stringValue')]

                    def _fetch_docs(doc_ids):
                        items = []
                        for did in doc_ids[:40]:
                            try:
                                v_url = f"https://firestore.googleapis.com/v1/projects/aniamtion-reference/databases/(default)/documents/videos/{did}"
                                v_req = urllib.request.Request(v_url, headers={'Authorization': f'Bearer {token}'})
                                with urllib.request.urlopen(v_req, timeout=4) as vr:
                                    vf = json.loads(vr.read().decode('utf-8')).get('fields', {})
                                    title = vf.get('title', {}).get('stringValue', 'Reference Clip')
                                    cat = vf.get('category', {}).get('stringValue', '')
                                    v_url_val = vf.get('videoUrl', {}).get('stringValue', '')
                                    fps_val = vf.get('fps', {}).get('integerValue') or vf.get('fps', {}).get('doubleValue') or 24
                                    items.append({
                                        'id': did,
                                        'title': title,
                                        'category': cat,
                                        'videoUrl': v_url_val,
                                        'fps': float(fps_val)
                                    })
                            except Exception:
                                pass
                        return items

                    self.saved_videos = _fetch_docs(saved_ids)
                    self.liked_videos = _fetch_docs(liked_ids)

                    def _update():
                        self._populate_user_lists()

                    if MAYA_AVAILABLE:
                        utils.executeDeferred(_update)
                    else:
                        _update()
                    return
                except Exception as err:
                    print(f"[AnimRef] Direct Firestore REST notice: {err}")

            # 2. Fallback: API endpoint
            for base_url in ["http://localhost:3000", "https://animationreference.org"]:
                try:
                    req = urllib.request.Request(
                        f"{base_url}/api/user/saved-references",
                        headers={
                            'Authorization': f'Bearer {token}',
                            'User-Agent': 'AnimRefMaya/1.0'
                        }
                    )
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        data = json.loads(resp.read().decode('utf-8'))
                        self.saved_videos = data.get("savedVideos", [])
                        self.liked_videos = data.get("likedVideos", [])

                        def _update():
                            self._populate_user_lists()

                        if MAYA_AVAILABLE:
                            utils.executeDeferred(_update)
                        else:
                            _update()
                        return
                except Exception:
                    pass

        t = threading.Thread(target=_fetch, daemon=True)
        t.start()

    def _populate_user_lists(self):
        self.saved_list.clear()
        for v in self.saved_videos:
            title = v.get("title", "Reference Clip")
            cat = v.get("category", "")
            item = QtWidgets.QListWidgetItem(f"[{cat}] {title}")
            item.setData(QtCore.Qt.UserRole, v)
            self.saved_list.addItem(item)
        self.tabs.setTabText(0, f"⭐ Saved ({len(self.saved_videos)})")

        self.liked_list.clear()
        for v in self.liked_videos:
            title = v.get("title", "Reference Clip")
            cat = v.get("category", "")
            item = QtWidgets.QListWidgetItem(f"[{cat}] {title}")
            item.setData(QtCore.Qt.UserRole, v)
            self.liked_list.addItem(item)
        self.tabs.setTabText(1, f"❤️ Liked ({len(self.liked_videos)})")

    def _on_saved_item_clicked(self, item):
        v = item.data(QtCore.Qt.UserRole)
        if v:
            self._load_url(v.get("videoUrl", ""), v.get("title", "Saved Ref"), v.get("fps", 24))

    def _on_liked_item_clicked(self, item):
        v = item.data(QtCore.Qt.UserRole)
        if v:
            self._load_url(v.get("videoUrl", ""), v.get("title", "Liked Ref"), v.get("fps", 24))

    # ──────────────── TIMELINE SCRUBBING & CONTROLS ────────────────
    def _toggle_playback(self):
        if not QtWidgets:
            return
        state = self.media_player.playbackState() if hasattr(self.media_player, 'playbackState') else self.media_player.state()
        if state == QMediaPlayer.PlayingState:
            self.media_player.pause()
            self.play_btn.setText("▶ Play")
        else:
            self.media_player.play()
            self.play_btn.setText("⏸ Pause")

    def _step_frames(self, step_delta):
        current_pos = self.media_player.position()
        frame_ms = (1.0 / self.fps) * 1000.0
        new_pos = max(0, int(current_pos + (step_delta * frame_ms)))
        self.media_player.setPosition(new_pos)

        if self.is_timeline_sync_enabled and MAYA_AVAILABLE:
            cur_maya_time = cmds.currentTime(query=True)
            cmds.currentTime(cur_maya_time + step_delta)

    def _on_user_scrub(self, val):
        duration = self.media_player.duration()
        if duration > 0:
            target_pos = int((val / 1000.0) * duration)
            self.media_player.setPosition(target_pos)

    def _on_position_changed(self, pos_ms):
        duration = self.media_player.duration()
        if duration > 0 and not self.scrub_slider.isSliderDown():
            slider_val = int((pos_ms / float(duration)) * 1000)
            self.scrub_slider.setValue(slider_val)

        sec = pos_ms / 1000.0
        cur_frame = max(1, int(sec * self.fps) + 1)
        mins = int(sec // 60)
        secs = int(sec % 60)
        self.time_label.setText(f"F: {cur_frame} / {mins:02d}:{secs:02d}")

    def _on_duration_changed(self, duration_ms):
        self.scrub_slider.setRange(0, 1000)

    def _on_offset_changed(self, val):
        self.frame_offset = float(val)
        self.offset_display.setText(str(val))
        self.sync_to_maya_timeline()

    def _toggle_sync(self, enabled):
        self.is_timeline_sync_enabled = enabled
        if enabled:
            self.sync_checkbox.setStyleSheet("color: #4ade80; font-weight: bold; font-size: 11px;")
            self.sync_to_maya_timeline()
        else:
            self.sync_checkbox.setStyleSheet("color: #71717a; font-size: 11px;")

    def _register_timeline_sync(self):
        if not MAYA_AVAILABLE:
            return
        if self.script_job_id and cmds.scriptJob(exists=self.script_job_id):
            cmds.scriptJob(kill=self.script_job_id, force=True)

        self.script_job_id = cmds.scriptJob(
            event=["timeChanged", self.sync_to_maya_timeline],
            protected=False
        )
        print(f"[AnimRef] Timeline Sync Active (Job ID: {self.script_job_id})")

    def sync_to_maya_timeline(self):
        """Called instantly on every frame scrub in Maya."""
        if not self.is_timeline_sync_enabled or not MAYA_AVAILABLE:
            return

        current_time = cmds.currentTime(query=True)
        sec = (current_time - self.start_frame + self.frame_offset) / self.fps
        pos_ms = max(0, int(sec * 1000.0))

        # 10ms threshold prevents audio stutter during real-time playback
        if abs(self.media_player.position() - pos_ms) > 10:
            self.media_player.setPosition(pos_ms)

    def _create_camera_plane(self):
        cam, img_plane = setup_reference_camera(self.video_url, self.title, int(self.fps), int(self.frame_offset))
        print(f"[AnimRef] Camera plane created in Maya: {cam}")

    def _conform_maya_fps(self):
        if not MAYA_AVAILABLE:
            return
        cmds.currentUnit(time="film")
        cmds.playbackOptions(playbackSpeed=1)
        print(f"[AnimRef] Conformed Maya timeline to {int(self.fps)} FPS.")

    def _fetch_catalog_async(self):
        def _fetch():
            try:
                url = "https://animationreference.org/data/videos-snapshot.json"
                req = urllib.request.Request(url, headers={'User-Agent': 'AnimRefMaya/1.0'})
                with urllib.request.urlopen(req, timeout=5) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    self.cached_catalog = data.get('videos', [])
            except Exception:
                self.cached_catalog = [
                    {"id": "1", "title": "Spider-Man Acrobat Flip", "category": "COMBAT", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", "fps": 24},
                    {"id": "2", "title": "Heavy Weight Locomotion", "category": "LOCOMOTION", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", "fps": 24},
                    {"id": "3", "title": "Expressive Acting Reaction", "category": "ACTING", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", "fps": 24},
                ]
            self._filter_catalog()

        t = threading.Thread(target=_fetch, daemon=True)
        t.start()

    def _filter_catalog(self):
        if not QtWidgets:
            return
        q = self.search_input.text().lower().strip()
        self.catalog_list.clear()
        count = 0
        for vid in self.cached_catalog:
            title = vid.get('title', '')
            cat = vid.get('category', '')
            if not q or q in title.lower() or q in cat.lower():
                item = QtWidgets.QListWidgetItem(f"[{cat}] {title}")
                item.setData(QtCore.Qt.UserRole, vid)
                self.catalog_list.addItem(item)
                count += 1
                if count >= 30:
                    break

    def _on_catalog_item_clicked(self, item):
        vid = item.data(QtCore.Qt.UserRole)
        if vid:
            self._load_url(vid.get('videoUrl', ''), vid.get('title', 'Ref'), vid.get('fps', 24))

    def _apply_dark_theme(self):
        self.setStyleSheet("""
            QWidget { background-color: #0c0a17; color: #e4e4e7; font-family: sans-serif; }
            QLineEdit { background-color: #171526; border: 1px solid #2e284a; border-radius: 6px; padding: 5px; color: white; }
            QListWidget { background-color: #131120; border: 1px solid #25203d; border-radius: 6px; color: #e4e4e7; }
            QListWidget::item:selected { background-color: #7e22ce; color: white; }
            QSlider::groove:horizontal { height: 4px; background: #2e284a; border-radius: 2px; }
            QSlider::sub-page:horizontal { background: #9333ea; border-radius: 2px; }
            QSlider::handle:horizontal { background: white; width: 12px; margin-top: -4px; margin-bottom: -4px; border-radius: 6px; }
            QPushButton { background-color: #211c38; border: 1px solid #3b3363; border-radius: 6px; padding: 5px; color: white; }
            QPushButton:hover { background-color: #312a52; }
        """)

    def closeEvent(self, event):
        if MAYA_AVAILABLE and self.script_job_id and cmds.scriptJob(exists=self.script_job_id):
            cmds.scriptJob(kill=self.script_job_id, force=True)
            self.script_job_id = None
        if hasattr(self, 'media_player'):
            self.media_player.stop()
        super(AnimRefVideoPlayerWindow, self).closeEvent(event)

# =============================================================================
# 6. Interactive Installation Wizard Dialog
# =============================================================================
class AnimRefInstallerDialog(QtWidgets.QDialog if QtWidgets else object):
    def __init__(self, parent=None):
        super(AnimRefInstallerDialog, self).__init__(parent=parent)
        self.setWindowTitle("Install Animation Reference Studio")
        self.resize(420, 360)
        self._build_ui()

    def _build_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(12)

        # Header Badge
        header = QtWidgets.QHBoxLayout()
        icon_label = QtWidgets.QLabel("🎬")
        icon_label.setStyleSheet("font-size: 28px;")
        
        info_col = QtWidgets.QVBoxLayout()
        title = QtWidgets.QLabel("<b>Animation Reference Studio</b>")
        title.setStyleSheet("font-size: 15px; color: #c084fc;")
        subtitle = QtWidgets.QLabel("Autodesk Maya Timeline & Reference Integration")
        subtitle.setStyleSheet("font-size: 11px; color: #a1a1aa;")
        info_col.addWidget(title)
        info_col.addWidget(subtitle)

        header.addWidget(icon_label)
        header.addLayout(info_col)
        header.addStretch()
        layout.addLayout(header)

        # Shelf Choice
        shelf_label = QtWidgets.QLabel("<b>Select Maya Shelf for Button:</b>")
        shelf_label.setStyleSheet("color: #e4e4e7; font-size: 12px;")
        layout.addWidget(shelf_label)

        self.shelf_combo = QtWidgets.QComboBox()
        self.shelf_combo.setStyleSheet("background-color: #171526; border: 1px solid #3b3363; border-radius: 6px; padding: 6px; color: white;")
        
        shelves = ["AnimRef (New Shelf)", "Custom", "Animation"]
        if MAYA_AVAILABLE:
            try:
                top_shelf = mel.eval("$gShelfTopLevel = $gShelfTopLevel")
                existing_shelves = cmds.tabLayout(top_shelf, query=True, childArray=True) or []
                for s in existing_shelves:
                    if s not in shelves:
                        shelves.append(s)
            except Exception:
                pass

        for s in shelves:
            self.shelf_combo.addItem(s)
        layout.addWidget(self.shelf_combo)

        self.cb_bridge = QtWidgets.QCheckBox("Enable 1-Click Browser Bridge (Port 9876)")
        self.cb_bridge.setChecked(True)
        self.cb_bridge.setStyleSheet("color: #d4d4d8; font-size: 11px;")
        layout.addWidget(self.cb_bridge)

        self.cb_launch = QtWidgets.QCheckBox("Launch Video Player Immediately")
        self.cb_launch.setChecked(True)
        self.cb_launch.setStyleSheet("color: #d4d4d8; font-size: 11px;")
        layout.addWidget(self.cb_launch)

        layout.addStretch()

        install_btn = QtWidgets.QPushButton("🚀 Install & Launch Player")
        install_btn.setStyleSheet("background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #9333ea, stop:1 #c026d3); color: white; font-weight: bold; font-size: 13px; padding: 10px; border-radius: 8px;")
        install_btn.clicked.connect(self._run_install)
        layout.addWidget(install_btn)

        self.setStyleSheet("background-color: #0d0a1a; color: white;")

    def _run_install(self):
        selected_shelf = self.shelf_combo.currentText().split(" ")[0]
        enable_bridge = self.cb_bridge.isChecked()
        launch_player = self.cb_launch.isChecked()

        if MAYA_AVAILABLE:
            try:
                user_scripts = cmds.internalVar(userScriptDir=True)
                dest = os.path.join(user_scripts, "animref_studio.py")
                this_file = os.path.abspath(__file__) if '__file__' in globals() else None
                if this_file and os.path.exists(this_file):
                    with open(this_file, 'r', encoding='utf-8') as src:
                        code = src.read()
                    with open(dest, 'w', encoding='utf-8') as dst:
                        dst.write(code)
                    print(f"[AnimRef] Saved studio script to: {dest}")
            except Exception as e:
                print(f"[AnimRef] User script save notice: {e}")

        if MAYA_AVAILABLE:
            try:
                top_shelf = mel.eval("$gShelfTopLevel = $gShelfTopLevel")
                current_shelf = cmds.tabLayout(top_shelf, query=True, selectTab=True) or "Custom"
                if selected_shelf not in ["AnimRef", "Custom", "Animation"]:
                    current_shelf = selected_shelf

                existing = cmds.shelfLayout(current_shelf, query=True, childArray=True) or []
                for btn in existing:
                    if cmds.objectTypeUI(btn, isType="shelfButton") and cmds.shelfButton(btn, query=True, label=True) == SHELF_BUTTON_LABEL:
                        cmds.deleteUI(btn)

                launch_code = (
                    "import animref_studio\n"
                    "animref_studio.show_video_player()"
                )

                cmds.shelfButton(
                    parent=current_shelf,
                    label=SHELF_BUTTON_LABEL,
                    annotation="Launch Animation Reference Video Player",
                    imageOverlayLabel="REF",
                    image="camera.png",
                    command=launch_code,
                    sourceType="python"
                )
                print(f"[AnimRef] Added '{SHELF_BUTTON_LABEL}' shelf button to '{current_shelf}'.")
            except Exception as e:
                print(f"[AnimRef] Shelf setup warning: {e}")

        if enable_bridge:
            start_bridge()

        self.accept()

        if launch_player:
            show_video_player()

def show_video_player(video_url="", title="Animation Reference", fps=24):
    global _player_window_instance
    if not QtWidgets:
        print("[AnimRef] PySide is not available.")
        return

    start_bridge()

    sys_inst = getattr(sys, '_animref_player_instance', None)
    if not _player_window_instance and sys_inst:
        _player_window_instance = sys_inst

    if _player_window_instance:
        try:
            if video_url:
                _player_window_instance._load_url(video_url, title, fps)
            _player_window_instance._on_session_updated()
            _player_window_instance.show()
            _player_window_instance.raise_()
            return _player_window_instance
        except Exception:
            pass

    _player_window_instance = AnimRefVideoPlayerWindow(video_url=video_url, title=title, fps=fps)
    setattr(sys, '_animref_player_instance', _player_window_instance)
    if MAYA_AVAILABLE:
        _player_window_instance.show(dockable=True)
    else:
        _player_window_instance.show()
    return _player_window_instance

def show_installer_wizard():
    global _installer_window_instance
    if not QtWidgets:
        print("[AnimRef] PySide is not available.")
        return
    _installer_window_instance = AnimRefInstallerDialog()
    _installer_window_instance.show()
    return _installer_window_instance

def onMayaDroppedAndLoaded(*args, **kwargs):
    show_installer_wizard()

if __name__ == "__main__" or MAYA_AVAILABLE:
    show_installer_wizard()
