from __future__ import absolute_import, division, print_function

import os
import sys
import threading
import time
import webbrowser

try:
    from PySide6 import QtWidgets, QtCore, QtGui
    from shiboken6 import wrapInstance
    PYSIDE_VERSION = 6
except ImportError:
    try:
        from PySide2 import QtWidgets, QtCore, QtGui
        from shiboken2 import wrapInstance
        PYSIDE_VERSION = 2
    except ImportError:
        from PySide import QtGui, QtCore
        from PySide import QtGui as QtWidgets
        from shiboken import wrapInstance
        PYSIDE_VERSION = 1

try:
    import maya.cmds as cmds
    import maya.OpenMayaUI as omui
except ImportError:
    cmds = None
    omui = None

from . import animref_api
from . import animref_importer
from . import animref_auth
from . import animref_playblast


def get_maya_main_window():
    if omui:
        try:
            main_window_ptr = omui.MQtUtil.mainWindow()
            if main_window_ptr:
                return wrapInstance(int(main_window_ptr), QtWidgets.QWidget)
        except Exception:
            pass
    return None


DARK_STYLESHEET = """
QWidget {
    background-color: #0d1117;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
}

QDialog {
    background-color: #0a0d12;
    border: 1px solid #1f2430;
    border-radius: 10px;
}

QTabWidget::pane {
    border: 1px solid #1f2430;
    background-color: #0d1117;
    border-radius: 8px;
    top: -1px;
}

QTabBar::tab {
    background-color: #131720;
    color: #8b949e;
    padding: 8px 18px;
    margin-right: 4px;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border: 1px solid #1f2430;
    font-weight: 600;
    font-size: 12px;
}
QTabBar::tab:selected {
    background-color: #0d1117;
    color: #00E5FF;
    border-bottom: 2px solid #00E5FF;
}
QTabBar::tab:hover:!selected {
    background-color: #1a202c;
    color: #c9d1d9;
}

QLineEdit, QComboBox {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 12px;
    color: #ffffff;
    font-size: 13px;
    selection-background-color: #00E5FF;
}
QLineEdit:focus, QComboBox:focus {
    border: 1px solid #00E5FF;
    background-color: #1c2128;
}

QPushButton {
    background-color: #21262d;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 8px 16px;
    color: #c9d1d9;
    font-weight: 600;
}
QPushButton:hover {
    background-color: #30363d;
    border-color: #8b949e;
    color: #ffffff;
}
QPushButton:pressed {
    background-color: #161b22;
}

QPushButton#PrimaryBtn {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00E5FF, stop:1 #0099FF);
    border: none;
    color: #0a0d12;
    font-weight: 800;
    font-size: 13px;
    border-radius: 6px;
    padding: 10px 18px;
}
QPushButton#PrimaryBtn:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #33ecff, stop:1 #29aaff);
}
QPushButton#PrimaryBtn:disabled {
    background-color: #21262d;
    color: #484f58;
}

QPushButton#SuccessBtn {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #10B981, stop:1 #059669);
    border: none;
    color: #ffffff;
    font-weight: 800;
    font-size: 13px;
    border-radius: 6px;
    padding: 10px 18px;
}
QPushButton#SuccessBtn:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #34d399, stop:1 #10b981);
}

QPushButton#TagChip {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 11px;
    color: #8b949e;
}
QPushButton#TagChip:hover {
    background-color: #21262d;
    color: #ffffff;
    border-color: #00E5FF;
}
QPushButton#TagChip[active="true"] {
    background-color: #00E5FF;
    color: #0a0d12;
    border-color: #00E5FF;
    font-weight: bold;
}

QScrollArea {
    border: none;
    background-color: transparent;
}

QScrollBar:vertical {
    border: none;
    background: #0d1117;
    width: 8px;
}
QScrollBar::handle:vertical {
    background: #30363d;
    border-radius: 4px;
}
QScrollBar::handle:vertical:hover {
    background: #00E5FF;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QProgressBar {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 4px;
    text-align: center;
    color: #ffffff;
    font-weight: bold;
    height: 16px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00E5FF, stop:1 #0099FF);
    border-radius: 3px;
}
"""


def create_fallback_pixmap(width, height, title, duration_str=""):
    """Creates a high-contrast dark reference card preview when thumbnails are loading or unavailable."""
    pix = QtGui.QPixmap(width, height)
    pix.fill(QtCore.Qt.transparent)
    painter = QtGui.QPainter(pix)
    painter.setRenderHint(QtGui.QPainter.Antialiasing)

    # Dark rounded background
    painter.setBrush(QtGui.QBrush(QtGui.QColor("#131720")))
    painter.setPen(QtGui.QPen(QtGui.QColor("#21262d"), 1))
    painter.drawRoundedRect(0, 0, width - 1, height - 1, 6, 6)

    # Cyan/blue top accent bar
    grad = QtGui.QLinearGradient(0, 0, min(width, 48), 0)
    grad.setColorAt(0, QtGui.QColor("#00E5FF"))
    grad.setColorAt(1, QtGui.QColor("#0099FF"))
    painter.fillRect(QtCore.QRect(6, 6, 36, 3), grad)

    # Title
    painter.setPen(QtGui.QPen(QtGui.QColor("#e6edf3")))
    font = painter.font()
    font.setPointSize(9)
    font.setBold(True)
    painter.setFont(font)

    clean_title = (title or "Animation Reference").strip()
    rect = QtCore.QRect(10, 16, width - 20, height - 36)
    painter.drawText(rect, QtCore.Qt.AlignLeft | QtCore.Qt.AlignVCenter | QtCore.Qt.TextWordWrap, clean_title[:45])

    # Duration tag
    if duration_str:
        painter.setPen(QtGui.QPen(QtGui.QColor("#00E5FF")))
        font.setPointSize(8)
        painter.setFont(font)
        painter.drawText(QtCore.QRect(10, height - 20, width - 20, 16), QtCore.Qt.AlignRight | QtCore.Qt.AlignVCenter, duration_str)

    painter.end()
    return pix


class VideoCardWidget(QtWidgets.QFrame):
    clicked = QtCore.Signal(dict)
    double_clicked = QtCore.Signal(dict)

    def __init__(self, video_data, parent=None):
        super(VideoCardWidget, self).__init__(parent)
        self.video_data = video_data
        self.setCursor(QtCore.Qt.PointingHandCursor)
        self.setStyleSheet("""
            VideoCardWidget {
                background-color: #131720;
                border: 1px solid #1f2430;
                border-radius: 8px;
            }
            VideoCardWidget:hover {
                background-color: #1a202c;
                border: 1px solid #00E5FF;
            }
            VideoCardWidget[selected="true"] {
                background-color: #15222e;
                border: 2px solid #00E5FF;
            }
        """)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 8)
        layout.setSpacing(6)

        self.thumb_label = QtWidgets.QLabel()
        self.thumb_label.setFixedSize(188, 106)
        self.thumb_label.setStyleSheet("background-color: #0a0d12; border-radius: 6px;")
        self.thumb_label.setAlignment(QtCore.Qt.AlignCenter)

        # Check local cache synchronously to avoid any flicker
        cached_thumb = animref_api.get_thumbnail(video_data)
        if cached_thumb and os.path.isfile(cached_thumb):
            self.set_pixmap(QtGui.QPixmap(cached_thumb))
        else:
            self.set_fallback_preview()

        layout.addWidget(self.thumb_label)

        title_text = video_data.get("title") or "Untitled Reference"
        self.title_label = QtWidgets.QLabel(title_text)
        self.title_label.setWordWrap(True)
        self.title_label.setStyleSheet("font-weight: 600; color: #ffffff; font-size: 11px;")
        self.title_label.setFixedHeight(30)
        self.title_label.setToolTip(title_text)
        layout.addWidget(self.title_label)

        meta_layout = QtWidgets.QHBoxLayout()
        meta_layout.setContentsMargins(0, 0, 0, 0)

        duration = video_data.get("duration")
        self.dur_str = "{:.1f}s".format(duration) if duration else "Clip"
        dur_label = QtWidgets.QLabel(self.dur_str)
        dur_label.setStyleSheet("color: #00E5FF; font-size: 10px; font-weight: bold;")
        meta_layout.addWidget(dur_label)

        meta_layout.addStretch()

        creator = video_data.get("author_name") or video_data.get("uploader") or ""
        if creator:
            creator_label = QtWidgets.QLabel(creator[:14])
            creator_label.setStyleSheet("color: #8b949e; font-size: 10px;")
            creator_label.setToolTip("Creator: " + creator)
            meta_layout.addWidget(creator_label)

        layout.addLayout(meta_layout)

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.clicked.emit(self.video_data)
        super(VideoCardWidget, self).mousePressEvent(event)

    def mouseDoubleClickEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.double_clicked.emit(self.video_data)
        super(VideoCardWidget, self).mouseDoubleClickEvent(event)

    def set_pixmap(self, pixmap):
        scaled = pixmap.scaled(188, 106, QtCore.Qt.KeepAspectRatioByExpanding, QtCore.Qt.SmoothTransformation)
        self.thumb_label.setPixmap(scaled)
        self.thumb_label.setText("")

    def set_fallback_preview(self):
        title = self.video_data.get("title") or "Animation Reference"
        dur = self.video_data.get("duration")
        dur_text = "{:.1f}s".format(dur) if dur else ""
        self.thumb_label.setPixmap(create_fallback_pixmap(188, 106, title, dur_text))
        self.thumb_label.setText("")


class AnimRefBrowserWindow(QtWidgets.QDialog):
    thumbnail_loaded = QtCore.Signal(str, str)
    download_progress = QtCore.Signal(int, int)
    download_finished = QtCore.Signal(dict, str, str, str, bool, bool)
    download_error = QtCore.Signal(str)
    catalog_loaded = QtCore.Signal(list, list)
    saved_loaded = QtCore.Signal(list, list)
    boards_loaded = QtCore.Signal(list)
    playblast_uploaded = QtCore.Signal(dict)

    def __init__(self, parent=get_maya_main_window()):
        super(AnimRefBrowserWindow, self).__init__(parent)
        self.setObjectName("AnimRefUIWindow")
        self.setWindowTitle("Animation Reference (AnimRef) for Maya")
        self.resize(1060, 740)
        self.setMinimumSize(850, 560)
        self.setStyleSheet(DARK_STYLESHEET)

        self.selected_video = None
        self.active_tag = None
        self.card_widgets = {}
        self.search_timer = QtCore.QTimer()
        self.search_timer.setSingleShot(True)
        self.search_timer.setInterval(280)
        self.search_timer.timeout.connect(self.perform_search)

        # Wire Signals
        self.thumbnail_loaded.connect(self.on_thumbnail_ready)
        self.download_progress.connect(self.on_download_progress)
        self.download_finished.connect(self.on_download_finished)
        self.download_error.connect(self.on_download_error)
        self.catalog_loaded.connect(self.on_catalog_ready)
        self.saved_loaded.connect(self.on_saved_data_ready)
        self.boards_loaded.connect(self.on_boards_data_ready)
        self.playblast_uploaded.connect(self.on_playblast_uploaded)

        self.build_ui()
        self.update_user_header()
        self.load_initial_data()

    def build_ui(self):
        main_layout = QtWidgets.QVBoxLayout(self)
        main_layout.setContentsMargins(16, 14, 16, 14)
        main_layout.setSpacing(10)

        # 1. Header Bar
        header_layout = QtWidgets.QHBoxLayout()
        header_layout.setSpacing(12)

        logo_path = os.path.join(os.path.dirname(__file__), "animref_icon.png")
        if os.path.isfile(logo_path):
            logo_label = QtWidgets.QLabel()
            pix = QtGui.QPixmap(logo_path).scaled(32, 32, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
            logo_label.setPixmap(pix)
            header_layout.addWidget(logo_label)

        title_box = QtWidgets.QVBoxLayout()
        title_box.setSpacing(1)
        title_lbl = QtWidgets.QLabel("ANIMATION REFERENCE")
        title_lbl.setStyleSheet("font-weight: 800; font-size: 15px; letter-spacing: 1.5px; color: #ffffff;")
        sub_lbl = QtWidgets.QLabel("Maya Animation Toolkit & Reference Studio")
        sub_lbl.setStyleSheet("color: #8b949e; font-size: 11px;")
        title_box.addWidget(title_lbl)
        title_box.addWidget(sub_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        self.user_btn = QtWidgets.QPushButton("Sign In")
        self.user_btn.clicked.connect(lambda: self.tabs.setCurrentIndex(4))
        header_layout.addWidget(self.user_btn)

        web_btn = QtWidgets.QPushButton("Open Web")
        web_btn.clicked.connect(lambda: webbrowser.open("https://animationreference.org"))
        header_layout.addWidget(web_btn)

        main_layout.addLayout(header_layout)

        # 2. Tabs
        self.tabs = QtWidgets.QTabWidget()

        # Tab 1: Explore Library
        self.explore_tab = QtWidgets.QWidget()
        self.build_explore_tab(self.explore_tab)
        self.tabs.addTab(self.explore_tab, "Explore Library")

        # Tab 2: Saved & Likes
        self.saved_tab = QtWidgets.QWidget()
        self.build_saved_tab(self.saved_tab)
        self.tabs.addTab(self.saved_tab, "Saved & Favorites")

        # Tab 3: My Boards
        self.boards_tab = QtWidgets.QWidget()
        self.build_boards_tab(self.boards_tab)
        self.tabs.addTab(self.boards_tab, "My Moodboards")

        # Tab 4: Playblast Studio
        self.playblast_tab = QtWidgets.QWidget()
        self.build_playblast_tab(self.playblast_tab)
        self.tabs.addTab(self.playblast_tab, "Playblast Studio")

        # Tab 5: Account
        self.account_tab = QtWidgets.QWidget()
        self.build_account_tab(self.account_tab)
        self.tabs.addTab(self.account_tab, "Account")

        self.tabs.currentChanged.connect(self.on_tab_changed)
        main_layout.addWidget(self.tabs)

    # ==================== EXPLORE TAB ====================
    def build_explore_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        # Search Bar
        search_layout = QtWidgets.QHBoxLayout()
        search_layout.setSpacing(8)

        self.search_input = QtWidgets.QLineEdit()
        self.search_input.setPlaceholderText("Search actions, mechanics, styles (e.g. combat punch, run, jump, sword, creature, parkour)...")
        self.search_input.textChanged.connect(lambda: self.search_timer.start())
        search_layout.addWidget(self.search_input, stretch=4)

        self.sort_combo = QtWidgets.QComboBox()
        self.sort_combo.addItems(["Newest First", "Oldest First", "Longest Duration", "Shortest Duration"])
        self.sort_combo.currentIndexChanged.connect(self.perform_search)
        search_layout.addWidget(self.sort_combo, stretch=1)

        self.stats_label = QtWidgets.QLabel("Loading library...")
        self.stats_label.setStyleSheet("color: #00E5FF; font-weight: bold; font-size: 11px;")
        search_layout.addWidget(self.stats_label)

        layout.addLayout(search_layout)

        # Tag Pills
        self.tags_scroll = QtWidgets.QScrollArea()
        self.tags_scroll.setFixedHeight(36)
        self.tags_scroll.setWidgetResizable(True)
        self.tags_widget = QtWidgets.QWidget()
        self.tags_layout = QtWidgets.QHBoxLayout(self.tags_widget)
        self.tags_layout.setContentsMargins(0, 0, 0, 0)
        self.tags_layout.setSpacing(6)
        self.tags_scroll.setWidget(self.tags_widget)
        layout.addWidget(self.tags_scroll)

        # Central Area (Cards Grid on Left, Inspector on Right)
        splitter = QtWidgets.QSplitter(QtCore.Qt.Horizontal)

        grid_container = QtWidgets.QWidget()
        grid_vbox = QtWidgets.QVBoxLayout(grid_container)
        grid_vbox.setContentsMargins(0, 0, 0, 0)

        self.grid_scroll = QtWidgets.QScrollArea()
        self.grid_scroll.setWidgetResizable(True)
        self.grid_content = QtWidgets.QWidget()
        self.grid_layout = QtWidgets.QGridLayout(self.grid_content)
        self.grid_layout.setContentsMargins(4, 4, 4, 4)
        self.grid_layout.setSpacing(10)
        self.grid_scroll.setWidget(self.grid_content)
        grid_vbox.addWidget(self.grid_scroll)
        splitter.addWidget(grid_container)

        # Right Inspector
        inspector = self.create_inspector_panel()
        splitter.addWidget(inspector)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)

        layout.addWidget(splitter)

    def create_inspector_panel(self):
        panel = QtWidgets.QFrame()
        panel.setFixedWidth(290)
        panel.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430;")
        detail_layout = QtWidgets.QVBoxLayout(panel)
        detail_layout.setContentsMargins(12, 12, 12, 12)
        detail_layout.setSpacing(10)

        self.detail_thumb = QtWidgets.QLabel()
        self.detail_thumb.setFixedSize(264, 148)
        self.detail_thumb.setStyleSheet("background-color: #0a0d12; border-radius: 6px;")
        self.detail_thumb.setAlignment(QtCore.Qt.AlignCenter)
        self.detail_thumb.setText("Select a reference")
        detail_layout.addWidget(self.detail_thumb)

        self.detail_title = QtWidgets.QLabel("No reference selected")
        self.detail_title.setStyleSheet("font-weight: bold; font-size: 13px; color: #ffffff;")
        self.detail_title.setWordWrap(True)
        detail_layout.addWidget(self.detail_title)

        self.detail_meta = QtWidgets.QLabel("")
        self.detail_meta.setStyleSheet("color: #8b949e; font-size: 11px;")
        self.detail_meta.setWordWrap(True)
        detail_layout.addWidget(self.detail_meta)

        self.detail_tags = QtWidgets.QLabel("")
        self.detail_tags.setStyleSheet("color: #00E5FF; font-size: 11px;")
        self.detail_tags.setWordWrap(True)
        detail_layout.addWidget(self.detail_tags)

        detail_layout.addStretch()

        opts_box = QtWidgets.QGroupBox("Maya Import Settings")
        opts_box.setStyleSheet("QGroupBox { font-weight: bold; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; margin-top: 10px; padding-top: 10px; }")
        opts_layout = QtWidgets.QVBoxLayout(opts_box)
        opts_layout.setSpacing(6)

        cam_layout = QtWidgets.QHBoxLayout()
        cam_layout.addWidget(QtWidgets.QLabel("Target:"))
        self.cam_combo = QtWidgets.QComboBox()
        self.refresh_cameras_dropdown()
        cam_layout.addWidget(self.cam_combo)
        opts_layout.addLayout(cam_layout)

        mode_layout = QtWidgets.QHBoxLayout()
        mode_layout.addWidget(QtWidgets.QLabel("Format:"))
        self.mode_combo = QtWidgets.QComboBox()
        self.mode_combo.addItems(["Image Sequence (Scrub)", "Direct MP4"])
        mode_layout.addWidget(self.mode_combo)
        opts_layout.addLayout(mode_layout)

        self.start_curr_check = QtWidgets.QCheckBox("Start at Current Frame")
        self.start_curr_check.setChecked(True)
        opts_layout.addWidget(self.start_curr_check)

        self.fit_timeline_check = QtWidgets.QCheckBox("Fit Timeline Range")
        self.fit_timeline_check.setChecked(True)
        opts_layout.addWidget(self.fit_timeline_check)

        detail_layout.addWidget(opts_box)

        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setVisible(False)
        detail_layout.addWidget(self.progress_bar)

        self.import_btn = QtWidgets.QPushButton("Import to Maya Scene")
        self.import_btn.setObjectName("PrimaryBtn")
        self.import_btn.setEnabled(False)
        self.import_btn.clicked.connect(self.on_import_clicked)
        detail_layout.addWidget(self.import_btn)

        return panel

    def refresh_cameras_dropdown(self):
        self.cam_combo.clear()
        self.cam_combo.addItem("Free 3D Card (Move in Viewport)")
        self.cam_combo.addItem("Attach to Camera: persp")
        self.cam_combo.addItem("Attach to Current Viewport")
        self.cam_combo.addItem("New Reference Camera")
        cams = []
        if hasattr(animref_importer, "get_scene_cameras"):
            try:
                cams = animref_importer.get_scene_cameras()
            except Exception:
                pass
        elif cmds and hasattr(cmds, "ls"):
            try:
                for c in cmds.ls(type="camera") or []:
                    parent = cmds.listRelatives(c, parent=True)
                    if parent:
                        cams.append(parent[0])
            except Exception:
                pass
        for c in sorted(list(set(cams))):
            if c != "persp":
                self.cam_combo.addItem("Attach to Camera: " + c)

    # ==================== SAVED & LIKES TAB ====================
    def build_saved_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        top_row = QtWidgets.QHBoxLayout()
        self.saved_header_lbl = QtWidgets.QLabel("Saved References")
        self.saved_header_lbl.setStyleSheet("font-size: 14px; font-weight: bold; color: #ffffff;")
        top_row.addWidget(self.saved_header_lbl)
        top_row.addStretch()

        refresh_saved_btn = QtWidgets.QPushButton("Refresh Saved")
        refresh_saved_btn.clicked.connect(self.load_saved_data)
        top_row.addWidget(refresh_saved_btn)
        layout.addLayout(top_row)

        self.saved_scroll = QtWidgets.QScrollArea()
        self.saved_scroll.setWidgetResizable(True)
        self.saved_content = QtWidgets.QWidget()
        self.saved_grid = QtWidgets.QGridLayout(self.saved_content)
        self.saved_grid.setContentsMargins(4, 4, 4, 4)
        self.saved_grid.setSpacing(10)
        self.saved_scroll.setWidget(self.saved_content)
        layout.addWidget(self.saved_scroll)

    # ==================== BOARDS TAB ====================
    def build_boards_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(12, 12, 12, 12)
        layout.setSpacing(10)

        top_row = QtWidgets.QHBoxLayout()
        self.boards_header_lbl = QtWidgets.QLabel("Your Moodboards & Collections")
        self.boards_header_lbl.setStyleSheet("font-size: 14px; font-weight: bold; color: #ffffff;")
        top_row.addWidget(self.boards_header_lbl)
        top_row.addStretch()

        refresh_boards_btn = QtWidgets.QPushButton("Refresh Boards")
        refresh_boards_btn.clicked.connect(self.load_boards_data)
        top_row.addWidget(refresh_boards_btn)
        layout.addLayout(top_row)

        self.boards_scroll = QtWidgets.QScrollArea()
        self.boards_scroll.setWidgetResizable(True)
        self.boards_content = QtWidgets.QWidget()
        self.boards_vbox = QtWidgets.QVBoxLayout(self.boards_content)
        self.boards_vbox.setContentsMargins(4, 4, 4, 4)
        self.boards_vbox.setSpacing(12)
        self.boards_scroll.setWidget(self.boards_content)
        layout.addWidget(self.boards_scroll)

    # ==================== PLAYBLAST STUDIO TAB ====================
    def build_playblast_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(16)

        title = QtWidgets.QLabel("Maya Playblast & Comparison Studio")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #ffffff;")
        layout.addWidget(title)

        desc = QtWidgets.QLabel("Record your Maya 3D viewport playblast and sync it directly to Animation Reference for locked side-by-side comparison.")
        desc.setStyleSheet("color: #8b949e; font-size: 12px;")
        desc.setWordWrap(True)
        layout.addWidget(desc)

        # Settings Card
        card = QtWidgets.QFrame()
        card.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430; padding: 14px;")
        card_layout = QtWidgets.QVBoxLayout(card)
        card_layout.setSpacing(12)

        row1 = QtWidgets.QHBoxLayout()
        row1.addWidget(QtWidgets.QLabel("Resolution Preset:"))
        self.pb_res_combo = QtWidgets.QComboBox()
        self.pb_res_combo.addItems(["1280x720 (Standard HD)", "1920x1080 (Full HD)", "960x540 (Preview)"])
        row1.addWidget(self.pb_res_combo)
        row1.addStretch()
        card_layout.addLayout(row1)

        self.pb_info_lbl = QtWidgets.QLabel("Timeline: 1 - 120 (24 fps)")
        self.pb_info_lbl.setStyleSheet("color: #00E5FF; font-weight: bold;")
        card_layout.addWidget(self.pb_info_lbl)

        btn_row = QtWidgets.QHBoxLayout()
        self.record_pb_btn = QtWidgets.QPushButton("🎥 Record Maya Playblast")
        self.record_pb_btn.setObjectName("PrimaryBtn")
        self.record_pb_btn.clicked.connect(self.run_playblast_capture)
        btn_row.addWidget(self.record_pb_btn)

        self.upload_pb_btn = QtWidgets.QPushButton("☁️ Upload to AnimRef Account")
        self.upload_pb_btn.setObjectName("SuccessBtn")
        self.upload_pb_btn.setEnabled(False)
        self.upload_pb_btn.clicked.connect(self.run_playblast_upload)
        btn_row.addWidget(self.upload_pb_btn)

        card_layout.addLayout(btn_row)

        self.pb_progress = QtWidgets.QProgressBar()
        self.pb_progress.setVisible(False)
        card_layout.addWidget(self.pb_progress)

        self.pb_status_lbl = QtWidgets.QLabel("Ready to record.")
        self.pb_status_lbl.setStyleSheet("color: #8b949e;")
        card_layout.addWidget(self.pb_status_lbl)

        layout.addWidget(card)

        # Comparison Action Card
        self.compare_card = QtWidgets.QFrame()
        self.compare_card.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430; padding: 14px;")
        self.compare_card.setVisible(False)
        comp_layout = QtWidgets.QVBoxLayout(self.compare_card)

        self.comp_link_lbl = QtWidgets.QLabel("Playblast uploaded successfully!")
        self.comp_link_lbl.setStyleSheet("color: #10B981; font-weight: bold; font-size: 13px;")
        comp_layout.addWidget(self.comp_link_lbl)

        self.open_compare_btn = QtWidgets.QPushButton("⚡ Open Synchronized Compare on AnimationReference.org")
        self.open_compare_btn.setObjectName("PrimaryBtn")
        comp_layout.addWidget(self.open_compare_btn)

        layout.addWidget(self.compare_card)
        layout.addStretch()

    # ==================== ACCOUNT TAB ====================
    def build_account_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(30, 30, 30, 30)
        layout.setSpacing(16)

        title = QtWidgets.QLabel("Animation Reference Account")
        title.setStyleSheet("font-size: 16px; font-weight: bold; color: #ffffff;")
        layout.addWidget(title)

        # Login Box
        self.login_box = QtWidgets.QFrame()
        self.login_box.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430; padding: 20px;")
        l_layout = QtWidgets.QVBoxLayout(self.login_box)
        l_layout.setSpacing(12)

        l_layout.addWidget(QtWidgets.QLabel("Sign in with your AnimationReference.org account to sync your saved posts, boards, and WIP playblasts."))

        self.email_input = QtWidgets.QLineEdit()
        self.email_input.setPlaceholderText("Email address...")
        l_layout.addWidget(self.email_input)

        self.pass_input = QtWidgets.QLineEdit()
        self.pass_input.setPlaceholderText("Password...")
        self.pass_input.setEchoMode(QtWidgets.QLineEdit.Password)
        l_layout.addWidget(self.pass_input)

        self.login_btn = QtWidgets.QPushButton("Sign In")
        self.login_btn.setObjectName("PrimaryBtn")
        self.login_btn.clicked.connect(self.handle_sign_in)
        l_layout.addWidget(self.login_btn)

        self.login_status = QtWidgets.QLabel("")
        self.login_status.setStyleSheet("color: #FF6B6B;")
        l_layout.addWidget(self.login_status)

        layout.addWidget(self.login_box)

        # Profile Box
        self.profile_box = QtWidgets.QFrame()
        self.profile_box.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430; padding: 20px;")
        p_layout = QtWidgets.QVBoxLayout(self.profile_box)
        p_layout.setSpacing(10)

        self.profile_name_lbl = QtWidgets.QLabel("Signed in as:")
        self.profile_name_lbl.setStyleSheet("font-size: 15px; font-weight: bold; color: #ffffff;")
        p_layout.addWidget(self.profile_name_lbl)

        self.profile_email_lbl = QtWidgets.QLabel("")
        self.profile_email_lbl.setStyleSheet("color: #8b949e;")
        p_layout.addWidget(self.profile_email_lbl)

        self.pro_badge = QtWidgets.QLabel("PRO MEMBER")
        self.pro_badge.setStyleSheet("background-color: #10B981; color: #0a0d12; font-weight: 800; padding: 4px 10px; border-radius: 4px;")
        self.pro_badge.setFixedWidth(110)
        p_layout.addWidget(self.pro_badge)

        self.sign_out_btn = QtWidgets.QPushButton("Sign Out")
        self.sign_out_btn.clicked.connect(self.handle_sign_out)
        p_layout.addWidget(self.sign_out_btn)

        layout.addWidget(self.profile_box)
        layout.addStretch()

    # ==================== DATA & ACTIONS ====================
    def update_user_header(self):
        user = animref_auth.get_current_user()
        if user:
            name = user.get("displayName") or user.get("email") or "User"
            self.user_btn.setText(name + " (Pro)")
            self.user_btn.setStyleSheet("color: #10B981; font-weight: bold;")
            self.login_box.setVisible(False)
            self.profile_box.setVisible(True)
            self.profile_name_lbl.setText("Signed in as: " + name)
            self.profile_email_lbl.setText(user.get("email", ""))
        else:
            self.user_btn.setText("Sign In")
            self.user_btn.setStyleSheet("")
            self.login_box.setVisible(True)
            self.profile_box.setVisible(False)

    def handle_sign_in(self):
        email = self.email_input.text()
        password = self.pass_input.text()
        if not email or not password:
            self.login_status.setText("Please enter your email and password.")
            return

        self.login_btn.setEnabled(False)
        self.login_btn.setText("Signing In...")

        def _worker():
            res = animref_auth.sign_in_with_password(email, password)
            QtCore.QTimer.singleShot(0, lambda: self.on_sign_in_complete(res))

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_sign_in_complete(self, res):
        self.login_btn.setEnabled(True)
        self.login_btn.setText("Sign In")
        if res.get("success"):
            self.login_status.setText("")
            self.update_user_header()
            self.tabs.setCurrentIndex(0)
            self.load_saved_data()
            self.load_boards_data()
        else:
            self.login_status.setText("Login failed: " + res.get("error", "Unknown error"))

    def handle_sign_out(self):
        animref_auth.sign_out()
        self.update_user_header()

    def on_tab_changed(self, idx):
        if idx == 1:
            self.load_saved_data()
        elif idx == 2:
            self.load_boards_data()
        elif idx == 3:
            info = animref_playblast.get_playblast_info()
            self.pb_info_lbl.setText("Camera: {}  |  Timeline: {} - {}  ({} fps)".format(
                info["camera"], info["start"], info["end"], int(round(info["fps"]))
            ))

    def load_saved_data(self):
        user = animref_auth.get_current_user()
        if not user:
            self.saved_header_lbl.setText("Sign in to view your Saved References")
            return

        self.saved_header_lbl.setText("Loading your saved references...")
        def _worker():
            data = animref_auth.get_saved_references()
            self.saved_loaded.emit(data.get("saved", []), data.get("liked", []))

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_saved_data_ready(self, saved, liked):
        total = len(saved) + len(liked)
        self.saved_header_lbl.setText("Your Saved References & Favorites ({})".format(total))

        # Clear grid
        while self.saved_grid.count():
            item = self.saved_grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        all_vids = saved + liked
        cols = 3
        for idx, v in enumerate(all_vids):
            card = VideoCardWidget(v)
            card.clicked.connect(self.select_video)
            card.double_clicked.connect(self.quick_import_video)
            self.saved_grid.addWidget(card, idx // cols, idx % cols)
            animref_api.get_thumbnail(v, callback=self.thumbnail_worker_callback)

    def load_boards_data(self):
        user = animref_auth.get_current_user()
        if not user:
            self.boards_header_lbl.setText("Sign in to view your Moodboards")
            return

        self.boards_header_lbl.setText("Loading your moodboards...")
        def _worker():
            boards = animref_auth.get_user_moodboards()
            self.boards_loaded.emit(boards)

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_boards_data_ready(self, boards):
        self.boards_header_lbl.setText("Your Moodboards ({})".format(len(boards)))
        while self.boards_vbox.count():
            item = self.boards_vbox.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if not boards:
            lbl = QtWidgets.QLabel("No moodboards found on your account. Create moodboards on AnimationReference.org to view them here!")
            lbl.setStyleSheet("color: #8b949e; padding: 20px;")
            self.boards_vbox.addWidget(lbl)
            return

        for b in boards:
            group = QtWidgets.QGroupBox(b.get("name", "Board") + " ({} clips)".format(len(b.get("items", []))))
            group.setStyleSheet("QGroupBox { font-weight: bold; color: #ffffff; border: 1px solid #1f2430; border-radius: 8px; margin-top: 10px; padding: 12px; }")
            g_layout = QtWidgets.QHBoxLayout(group)
            for item in b.get("items", [])[:4]:
                card = VideoCardWidget(item)
                card.clicked.connect(self.select_video)
                card.double_clicked.connect(self.quick_import_video)
                g_layout.addWidget(card)
                animref_api.get_thumbnail(item, callback=self.thumbnail_worker_callback)
            g_layout.addStretch()
            self.boards_vbox.addWidget(group)

    # ==================== PLAYBLAST EXECUTION ====================
    def run_playblast_capture(self):
        self.record_pb_btn.setEnabled(False)
        self.record_pb_btn.setText("Capturing Playblast...")
        self.pb_status_lbl.setText("Rendering viewport frames and encoding with FFmpeg...")
        QtWidgets.QApplication.processEvents()

        res_text = self.pb_res_combo.currentText()
        if "1920x1080" in res_text:
            w, h = 1920, 1080
        elif "960x540" in res_text:
            w, h = 960, 540
        else:
            w, h = 1280, 720

        try:
            mp4_path = animref_playblast.record_playblast(width=w, height=h)
            self.recorded_playblast_path = mp4_path
            self.pb_status_lbl.setText("Playblast ready: " + os.path.basename(mp4_path))
            self.upload_pb_btn.setEnabled(True)
            if cmds:
                cmds.inViewMessage(amg="Playblast generated: <hl>{}</hl>".format(os.path.basename(mp4_path)), pos="midCenter", fade=True)
        except Exception as e:
            self.pb_status_lbl.setText("Playblast failed: " + str(e))
        finally:
            self.record_pb_btn.setEnabled(True)
            self.record_pb_btn.setText("🎥 Record Maya Playblast")

    def run_playblast_upload(self):
        if not hasattr(self, "recorded_playblast_path") or not os.path.isfile(self.recorded_playblast_path):
            self.pb_status_lbl.setText("Please record a playblast first.")
            return

        self.upload_pb_btn.setEnabled(False)
        self.upload_pb_btn.setText("Uploading...")
        self.pb_progress.setVisible(True)
        self.pb_progress.setValue(50)

        def _worker():
            try:
                res = animref_auth.upload_playblast_to_animref(self.recorded_playblast_path)
                self.playblast_uploaded.emit(res)
            except Exception as e:
                def _err():
                    self.pb_status_lbl.setText("Upload error: " + str(e))
                    self.upload_pb_btn.setEnabled(True)
                    self.upload_pb_btn.setText("☁️ Upload to AnimRef Account")
                    self.pb_progress.setVisible(False)
                QtCore.QTimer.singleShot(0, _err)

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_playblast_uploaded(self, res):
        self.pb_progress.setValue(100)
        self.pb_progress.setVisible(False)
        self.upload_pb_btn.setEnabled(True)
        self.upload_pb_btn.setText("Uploaded!")
        self.compare_card.setVisible(True)

        pub_url = res.get("publicUrl", "")
        # Connect to browser compare
        video_id = self.selected_video.get("id") if self.selected_video else "featured"
        compare_url = "https://animationreference.org/video/{}?playblast={}".format(video_id, urllib_parse.quote(pub_url, safe=""))

        self.open_compare_btn.clicked.disconnect() if self.open_compare_btn.receivers(QtCore.SIGNAL("clicked()")) > 0 else None
        self.open_compare_btn.clicked.connect(lambda: webbrowser.open(compare_url))

    # ==================== EXPLORE SEARCH & IMPORT ====================
    def load_initial_data(self):
        def _bg_load():
            catalog = animref_api.load_catalog()
            tags = animref_api.get_popular_tags(25)
            self.catalog_loaded.emit(catalog, tags)

        t = threading.Thread(target=_bg_load)
        t.daemon = True
        t.start()

    def on_catalog_ready(self, catalog, tags):
        self.stats_label.setText("{:,} clips".format(len(catalog)))
        self.build_tag_chips(tags)
        self.perform_search()

    def build_tag_chips(self, tags):
        while self.tags_layout.count():
            item = self.tags_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        all_btn = QtWidgets.QPushButton("All")
        all_btn.setObjectName("TagChip")
        all_btn.setProperty("active", "true" if self.active_tag is None else "false")
        all_btn.clicked.connect(lambda: self.set_active_tag(None))
        self.tags_layout.addWidget(all_btn)

        for t in tags:
            btn = QtWidgets.QPushButton(t)
            btn.setObjectName("TagChip")
            btn.setProperty("active", "true" if self.active_tag == t else "false")
            btn.clicked.connect(lambda checked=False, tag=t: self.set_active_tag(tag))
            self.tags_layout.addWidget(btn)

        self.tags_layout.addStretch()

    def set_active_tag(self, tag):
        self.active_tag = tag
        for i in range(self.tags_layout.count()):
            w = self.tags_layout.itemAt(i).widget()
            if w and isinstance(w, QtWidgets.QPushButton):
                is_active = (w.text() == "All" and tag is None) or (w.text() == tag)
                w.setProperty("active", "true" if is_active else "false")
                w.style().unpolish(w)
                w.style().polish(w)

        self.perform_search()

    def perform_search(self):
        query = self.search_input.text()
        idx = self.sort_combo.currentIndex()
        sort = "newest" if idx == 0 else ("oldest" if idx == 1 else ("duration_desc" if idx == 2 else "duration_asc"))

        result = animref_api.search_videos(
            query=query,
            tag=self.active_tag,
            sort=sort,
            limit=48,
            offset=0
        )

        self.stats_label.setText("{:,} matches".format(result["total"]))
        self.render_grid(result["items"])

    def render_grid(self, videos):
        self.card_widgets.clear()
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        cols = 3
        for idx, v in enumerate(videos):
            card = VideoCardWidget(v)
            card.clicked.connect(self.select_video)
            card.double_clicked.connect(self.quick_import_video)
            self.grid_layout.addWidget(card, idx // cols, idx % cols)
            vid = v.get("id")
            if vid:
                self.card_widgets[vid] = card
            animref_api.get_thumbnail(v, callback=self.thumbnail_worker_callback)

    def thumbnail_worker_callback(self, video_id, local_path):
        self.thumbnail_loaded.emit(video_id, local_path or "")

    def on_thumbnail_ready(self, video_id, local_path):
        card = self.card_widgets.get(video_id)
        if card:
            if local_path and os.path.isfile(local_path):
                card.set_pixmap(QtGui.QPixmap(local_path))
            else:
                card.set_fallback_preview()

        if self.selected_video and self.selected_video.get("id") == video_id:
            if local_path and os.path.isfile(local_path):
                pix = QtGui.QPixmap(local_path).scaled(264, 148, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
                self.detail_thumb.setPixmap(pix)
                self.detail_thumb.setText("")
            else:
                dur = self.selected_video.get("duration")
                dur_str = "{:.1f}s".format(dur) if dur else ""
                fallback_pix = create_fallback_pixmap(264, 148, self.selected_video.get("title") or "Reference", dur_str)
                self.detail_thumb.setPixmap(fallback_pix)
                self.detail_thumb.setText("")

    def select_video(self, video_data):
        self.selected_video = video_data

        for vid, card in self.card_widgets.items():
            is_sel = (vid == video_data.get("id"))
            card.setProperty("selected", "true" if is_sel else "false")
            card.style().unpolish(card)
            card.style().polish(card)

        self.detail_title.setText(video_data.get("title") or "Untitled")
        dur = video_data.get("duration")
        dur_str = "{:.1f}s".format(dur) if dur else "N/A"
        creator = video_data.get("author_name") or video_data.get("uploader") or "Unknown"
        self.detail_meta.setText("Duration: {}\nCreator: {}".format(dur_str, creator))

        tags = video_data.get("tags", [])
        self.detail_tags.setText("Tags: " + ", ".join(tags[:6]))

        thumb_path = animref_api.get_thumbnail(video_data)
        if thumb_path and os.path.isfile(thumb_path):
            pix = QtGui.QPixmap(thumb_path).scaled(264, 148, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
            self.detail_thumb.setPixmap(pix)
            self.detail_thumb.setText("")
        else:
            fallback_pix = create_fallback_pixmap(264, 148, video_data.get("title") or "Reference", dur_str if dur else "")
            self.detail_thumb.setPixmap(fallback_pix)
            self.detail_thumb.setText("")

        self.import_btn.setEnabled(True)

    def on_import_clicked(self):
        if not self.selected_video:
            return
        self.run_import(self.selected_video)

    def quick_import_video(self, video_data):
        self.select_video(video_data)
        self.run_import(video_data)

    def on_download_progress(self, current, total):
        self.progress_bar.setValue(current)
        if current < 100:
            self.import_btn.setText("Downloading {}%...".format(current))
        else:
            self.import_btn.setText("Finalizing...")

    def run_import(self, video_data):
        self.import_btn.setEnabled(False)
        self.import_btn.setText("Connecting...")
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)

        cam_choice = self.cam_combo.currentText()
        if "Free 3D Card" in cam_choice:
            target_cam = "free"
        elif "Attach to Camera: " in cam_choice:
            target_cam = cam_choice.replace("Attach to Camera: ", "").strip()
        elif "New Reference Camera" in cam_choice:
            target_cam = "new_cam"
        else:
            target_cam = "current"

        mode = "sequence" if self.mode_combo.currentIndex() == 0 else "movie"
        start_curr = self.start_curr_check.isChecked()
        fit_timeline = self.fit_timeline_check.isChecked()

        def _bg_worker():
            try:
                def prog(cur, tot):
                    self.download_progress.emit(cur, tot)

                local_path = animref_api.download_video_file(video_data, progress_callback=prog)
                self.download_finished.emit(video_data, local_path, mode, target_cam, start_curr, fit_timeline)
            except Exception as err:
                self.download_error.emit(str(err))

        t = threading.Thread(target=_bg_worker)
        t.daemon = True
        t.start()

    def on_download_error(self, err_msg):
        if cmds:
            cmds.warning("AnimRef Download Failed: " + str(err_msg))
            try:
                cmds.inViewMessage(amg="AnimRef: <hl>{}</hl>".format(err_msg), pos="midCenter", fade=True)
            except Exception:
                pass
        self.import_btn.setText("Import to Maya Scene")
        self.import_btn.setEnabled(True)
        self.progress_bar.setVisible(False)

    def on_download_finished(self, video_data, local_path, mode, target_cam, start_curr, fit_timeline):
        self.import_btn.setText("Converting & Setting Up...")
        self.progress_bar.setValue(100)
        QtWidgets.QApplication.processEvents()

        try:
            animref_importer.import_animref_to_maya(
                video_dict=video_data,
                local_video_path=local_path,
                mode=mode,
                target_camera=target_cam,
                start_at_current_frame=start_curr,
                fit_timeline=fit_timeline
            )
        except Exception as err:
            if cmds:
                cmds.warning("AnimRef Import Failed: " + str(err))
        finally:
            self.import_btn.setText("Import to Maya Scene")
            self.import_btn.setEnabled(True)
            self.progress_bar.setVisible(False)


_window_instance = None

def show_window():
    global _window_instance
    if _window_instance is not None:
        try:
            _window_instance.close()
            _window_instance.deleteLater()
        except Exception:
            pass

    _window_instance = AnimRefBrowserWindow()
    _window_instance.show()
    _window_instance.raise_()
    _window_instance.activateWindow()
    return _window_instance
