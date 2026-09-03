"""
AnimationReference.org - Maya Studio Dockable Window
Compatible with PySide2 (Maya 2017-2024) and PySide6 (Maya 2025+).
"""

import sys
import json
import urllib.request

try:
    from PySide6 import QtWidgets, QtCore, QtGui
except ImportError:
    try:
        from PySide2 import QtWidgets, QtCore, QtGui
    except ImportError:
        QtWidgets = None

try:
    import maya.cmds as cmds
    from maya.app.general.mayaMixin import MayaQWidgetDockableMixin
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False
    class MayaQWidgetDockableMixin(object):
        pass

try:
    import animref_camera
    import animref_bridge
except ImportError:
    from . import animref_camera
    from . import animref_bridge

_window_instance = None

class AnimRefMayaWindow(MayaQWidgetDockableMixin, QtWidgets.QWidget if QtWidgets else object):
    def __init__(self, parent=None):
        super(AnimRefMayaWindow, self).__init__(parent=parent)
        self.setWindowTitle("Animation Reference Studio")
        self.setObjectName("AnimRefStudioWindow")
        self.setMinimumWidth(320)
        self.setMinimumHeight(480)
        
        self.current_img_plane = None
        self.current_cam = None
        self.cached_videos = []

        self._build_ui()
        self._apply_dark_theme()

        # Start bridge and register callback
        animref_bridge.start_server()
        animref_bridge.register_clip_callback(self._on_clip_received)

        # Load video snapshot in background
        self._fetch_library_async()

    def _build_ui(self):
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        # 1. Header
        header_box = QtWidgets.QHBoxLayout()
        title_label = QtWidgets.QLabel("<b>ANIMATION REFERENCE</b>")
        title_label.setStyleSheet("color: #c084fc; font-size: 13px; letter-spacing: 1px;")
        self.status_badge = QtWidgets.QLabel("● Bridge Active")
        self.status_badge.setStyleSheet("color: #4ade80; font-size: 10px; font-weight: bold;")
        header_box.addWidget(title_label)
        header_box.addStretch()
        header_box.addWidget(self.status_badge)
        layout.addLayout(header_box)

        # 2. In-Maya Search Bar
        search_box = QtWidgets.QHBoxLayout()
        self.search_input = QtWidgets.QLineEdit()
        self.search_input.setPlaceholderText("Search references (e.g. Combat, Run, Jump)...")
        self.search_input.textChanged.connect(self._filter_library)
        search_box.addWidget(self.search_input)
        layout.addLayout(search_box)

        # 3. Results List
        self.results_list = QtWidgets.QListWidget()
        self.results_list.setMaximumHeight(150)
        self.results_list.itemDoubleClicked.connect(self._on_result_double_clicked)
        layout.addWidget(self.results_list)

        # Load Selected Button
        self.load_btn = QtWidgets.QPushButton("🎬 Load Selected Reference to Camera")
        self.load_btn.setStyleSheet("background-color: #7e22ce; color: white; font-weight: bold; padding: 6px; border-radius: 4px;")
        self.load_btn.clicked.connect(self._load_selected_result)
        layout.addWidget(self.load_btn)

        # Separator
        line = QtWidgets.QFrame()
        line.setFrameShape(QtWidgets.QFrame.HLine)
        line.setStyleSheet("color: #333344;")
        layout.addWidget(line)

        # 4. Camera & Image Plane Controls
        ctrl_label = QtWidgets.QLabel("<b>CAMERA CONTROLS</b>")
        ctrl_label.setStyleSheet("color: #a1a1aa; font-size: 11px;")
        layout.addWidget(ctrl_label)

        # Current Camera Status
        self.active_cam_label = QtWidgets.QLabel("Active: None")
        self.active_cam_label.setStyleSheet("color: #e4e4e7; font-size: 11px;")
        layout.addWidget(self.active_cam_label)

        # Opacity Slider
        opacity_layout = QtWidgets.QHBoxLayout()
        opacity_layout.addWidget(QtWidgets.QLabel("Opacity:"))
        self.opacity_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.opacity_slider.setRange(0, 100)
        self.opacity_slider.setValue(85)
        self.opacity_slider.valueChanged.connect(self._on_opacity_changed)
        opacity_layout.addWidget(self.opacity_slider)
        self.opacity_val = QtWidgets.QLabel("85%")
        opacity_layout.addWidget(self.opacity_val)
        layout.addLayout(opacity_layout)

        # Frame Slip / Offset Slider
        offset_layout = QtWidgets.QHBoxLayout()
        offset_layout.addWidget(QtWidgets.QLabel("Frame Slip:"))
        self.offset_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.offset_slider.setRange(-100, 100)
        self.offset_slider.setValue(0)
        self.offset_slider.valueChanged.connect(self._on_offset_changed)
        offset_layout.addWidget(self.offset_slider)
        self.offset_val = QtWidgets.QLabel("0")
        offset_layout.addWidget(self.offset_val)
        reset_offset_btn = QtWidgets.QPushButton("Reset")
        reset_offset_btn.setMaximumWidth(45)
        reset_offset_btn.clicked.connect(lambda: self.offset_slider.setValue(0))
        offset_layout.addWidget(reset_offset_btn)
        layout.addLayout(offset_layout)

        # Conform Timeline Button
        self.conform_btn = QtWidgets.QPushButton("⏱ Conform Maya FPS to Reference (24 FPS)")
        self.conform_btn.clicked.connect(self._conform_fps)
        layout.addWidget(self.conform_btn)

        layout.addStretch()

        # Footer
        footer_label = QtWidgets.QLabel("AnimationReference.org Studio Bridge v1.0")
        footer_label.setStyleSheet("color: #71717a; font-size: 9px; text-align: center;")
        footer_label.setAlignment(QtCore.Qt.AlignCenter)
        layout.addWidget(footer_label)

    def _apply_dark_theme(self):
        self.setStyleSheet("""
            QWidget { background-color: #12101e; color: #e4e4e7; font-family: sans-serif; }
            QLineEdit { background-color: #1e1a33; border: 1px solid #3b3558; border-radius: 4px; padding: 5px; color: white; }
            QListWidget { background-color: #181528; border: 1px solid #2e2847; border-radius: 4px; color: #e4e4e7; }
            QListWidget::item:selected { background-color: #6b21a8; color: white; }
            QSlider::groove:horizontal { height: 4px; background: #3b3558; border-radius: 2px; }
            QSlider::sub-page:horizontal { background: #9333ea; border-radius: 2px; }
            QSlider::handle:horizontal { background: white; width: 12px; margin-top: -4px; margin-bottom: -4px; border-radius: 6px; }
            QPushButton { background-color: #262142; border: 1px solid #3f376b; border-radius: 4px; padding: 5px; color: white; }
            QPushButton:hover { background-color: #383061; }
        """)

    def _fetch_library_async(self):
        def _fetch():
            try:
                url = "https://animationreference.org/data/videos-snapshot.json"
                req = urllib.request.Request(url, headers={'User-Agent': 'AnimRefMaya/1.0'})
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    self.cached_videos = data.get('videos', [])
            except Exception:
                # Fallback starter list
                self.cached_videos = [
                    {"id": "1", "title": "Spider-Man Acrobat Flip", "category": "COMBAT", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", "fps": 24},
                    {"id": "2", "title": "Heavy Weight Locomotion", "category": "LOCOMOTION", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4", "fps": 24},
                    {"id": "3", "title": "Expressive Acting Reaction", "category": "ACTING", "videoUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4", "fps": 24},
                ]
            self._filter_library()

        import threading
        t = threading.Thread(target=_fetch, daemon=True)
        t.start()

    def _filter_library(self):
        if not QtWidgets:
            return
        query = self.search_input.text().lower().strip()
        self.results_list.clear()
        count = 0
        for vid in self.cached_videos:
            title = vid.get('title', '')
            cat = vid.get('category', '')
            if not query or query in title.lower() or query in cat.lower():
                item = QtWidgets.QListWidgetItem(f"[{cat}] {title}")
                item.setData(QtCore.Qt.UserRole, vid)
                self.results_list.addItem(item)
                count += 1
                if count >= 30:
                    break

    def _on_result_double_clicked(self, item):
        self._load_selected_result()

    def _load_selected_result(self):
        item = self.results_list.currentItem()
        if not item:
            return
        vid = item.data(QtCore.Qt.UserRole)
        if not vid:
            return
        url = vid.get('videoUrl', '')
        title = vid.get('title', 'Ref')
        fps = vid.get('fps', 24)
        cam, img_plane = animref_camera.setup_reference_camera(url, title, fps)
        self._update_active_cam(cam, img_plane, title, fps)

    def _on_clip_received(self, url, title, fps, cam, img_plane):
        self._update_active_cam(cam, img_plane, title, fps)

    def _update_active_cam(self, cam, img_plane, title, fps):
        self.current_cam = cam
        self.current_img_plane = img_plane
        self.active_cam_label.setText(f"Active: {cam} ({title[:18]})")
        self.conform_btn.setText(f"⏱ Conform Maya FPS to Reference ({fps} FPS)")
        self.conform_btn.setProperty("fps", fps)

    def _on_opacity_changed(self, val):
        self.opacity_val.setText(f"{val}%")
        if self.current_img_plane:
            animref_camera.set_image_plane_opacity(self.current_img_plane, val / 100.0)

    def _on_offset_changed(self, val):
        self.offset_val.setText(str(val))
        if self.current_img_plane:
            animref_camera.set_image_plane_offset(self.current_img_plane, val)

    def _conform_fps(self):
        fps = self.conform_btn.property("fps") or 24
        animref_camera.conform_timeline_fps(fps)

def show_window():
    global _window_instance
    if not QtWidgets:
        print("[AnimRef] PySide is not installed or available.")
        return

    if _window_instance:
        try:
            _window_instance.close()
            _window_instance.deleteLater()
        except Exception:
            pass

    _window_instance = AnimRefMayaWindow()
    if MAYA_AVAILABLE:
        _window_instance.show(dockable=True)
    else:
        _window_instance.show()
    return _window_instance
