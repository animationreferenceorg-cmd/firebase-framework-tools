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

try:
    from PySide6.QtMultimedia import QMediaPlayer, QAudioOutput
    from PySide6.QtMultimediaWidgets import QVideoWidget
    QT_MULTIMEDIA_AVAILABLE = 6
except ImportError:
    try:
        from PySide2.QtMultimedia import QMediaPlayer, QMediaContent
        from PySide2.QtMultimediaWidgets import QVideoWidget
        QAudioOutput = None
        QT_MULTIMEDIA_AVAILABLE = 2
    except ImportError:
        QMediaPlayer = None
        QVideoWidget = None
        QAudioOutput = None
        QT_MULTIMEDIA_AVAILABLE = 0

try:
    from . import animref_api
    from . import animref_importer
    from . import animref_auth
    from . import animref_playblast
except (ImportError, ValueError):
    import animref_api
    import animref_importer
    import animref_auth
    import animref_playblast


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
    background-color: #09090e;
    color: #f4f4f5;
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
}

QDialog {
    background-color: #09090e;
    border: 1px solid #272736;
    border-radius: 14px;
}

/* Dark Obsidian Window Header (Matches Blender Studio) */
FramelessTitleBar {
    background-color: #111119;
    border-bottom: 1px solid #232332;
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
}

QPushButton#TitleBarBtn {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 12px;
    padding: 3px 10px;
    color: #d4d4d8;
    font-size: 10px;
    font-weight: 600;
}
QPushButton#TitleBarBtn:hover {
    background-color: #7c3aed;
    border-color: #8b5cf6;
    color: #ffffff;
}

QPushButton#WinCtrlBtn {
    background-color: transparent;
    border: none;
    color: #a1a1aa;
    font-size: 11px;
    font-weight: bold;
    width: 24px;
    height: 24px;
    border-radius: 12px;
}
QPushButton#WinCtrlBtn:hover {
    background-color: #232332;
    color: #ffffff;
}

QPushButton#WinCloseBtn {
    background-color: transparent;
    border: none;
    color: #a1a1aa;
    font-size: 11px;
    font-weight: bold;
    width: 24px;
    height: 24px;
    border-radius: 12px;
}
QPushButton#WinCloseBtn:hover {
    background-color: #ef4444;
    color: #ffffff;
}

/* Left Navigation Sidebar (Matches Blender Dark Studio) */
SidebarNavPanel {
    background-color: #111119;
    border-right: 1px solid #232332;
    border-bottom-left-radius: 14px;
}

QPushButton#NavBtn {
    background-color: transparent;
    border: none;
    border-radius: 10px;
    padding: 9px 12px;
    color: #a1a1aa;
    font-weight: 700;
    font-size: 12px;
    text-align: left;
}
QPushButton#NavBtn:hover {
    background-color: #1b1b29;
    color: #ffffff;
}
QPushButton#NavBtn[active="true"] {
    background-color: #7c3aed;
    color: #ffffff;
    font-weight: 700;
}

QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 10px;
    padding: 5px 10px;
    color: #f4f4f5;
    font-size: 12px;
    selection-background-color: #7c3aed;
    selection-color: #ffffff;
}
QLineEdit:focus, QComboBox:focus, QSpinBox:focus, QDoubleSpinBox:focus {
    border: 1px solid #8b5cf6;
    background-color: #1a1a28;
}
QComboBox::drop-down {
    subcontrol-origin: padding;
    subcontrol-position: top right;
    width: 20px;
    border: none;
}
QComboBox QAbstractItemView {
    background-color: #161622;
    color: #f4f4f5;
    border: 1px solid #272736;
    border-radius: 8px;
    padding: 4px;
    selection-background-color: #7c3aed;
    selection-color: #ffffff;
    outline: 0;
}

QCheckBox {
    spacing: 6px;
    color: #e4e4e7;
    font-size: 11px;
    font-weight: 600;
}
QCheckBox::indicator {
    width: 15px;
    height: 15px;
    border-radius: 4px;
    border: 1px solid #3f3f52;
    background-color: #161622;
}
QCheckBox::indicator:checked {
    background-color: #7c3aed;
    border-color: #8b5cf6;
}

QToolTip {
    background-color: #161622;
    color: #f4f4f5;
    border: 1px solid #3f3f52;
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
}

QPushButton {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 10px;
    padding: 6px 12px;
    color: #e4e4e7;
    font-weight: 600;
}
QPushButton:hover {
    background-color: #202030;
    border-color: #3f3f52;
    color: #ffffff;
}
QPushButton:pressed {
    background-color: #27273a;
}

QPushButton#PrimaryBtn {
    background-color: #7c3aed;
    border: none;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
    border-radius: 18px;
    padding: 9px 18px;
}
QPushButton#PrimaryBtn:hover {
    background-color: #8b5cf6;
}
QPushButton#PrimaryBtn:disabled {
    background-color: #1f1f2c;
    color: #71717a;
}

QPushButton#SuccessBtn {
    background-color: #10b981;
    border: none;
    color: #ffffff;
    font-weight: 700;
    font-size: 12px;
    border-radius: 18px;
    padding: 9px 18px;
}
QPushButton#SuccessBtn:hover {
    background-color: #059669;
}

QPushButton#TagChip {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 12px;
    padding: 4px 10px;
    font-size: 11px;
    color: #a1a1aa;
}
QPushButton#TagChip:hover {
    background-color: #232334;
    color: #ffffff;
    border-color: #3f3f52;
}
QPushButton#TagChip[active="true"] {
    background-color: #7c3aed;
    color: #ffffff;
    border-color: #8b5cf6;
    font-weight: bold;
}

QScrollArea {
    border: none;
    background-color: #09090e;
}

QScrollBar:vertical {
    border: none;
    background: transparent;
    width: 6px;
}
QScrollBar::handle:vertical {
    background: #2e2e40;
    border-radius: 3px;
    min-height: 24px;
}
QScrollBar::handle:vertical:hover {
    background: #4c4c66;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    border: none;
    background: transparent;
    height: 0px;
}

QProgressBar {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 6px;
    text-align: center;
    color: #f4f4f5;
    font-weight: bold;
    height: 12px;
    font-size: 10px;
}
QProgressBar::chunk {
    background-color: #7c3aed;
    border-radius: 6px;
}

QPushButton#PlayerBtn {
    background-color: #161622;
    border: 1px solid #272736;
    border-radius: 8px;
    color: #e4e4e7;
    font-weight: 600;
    padding: 4px 8px;
    font-size: 11px;
}
QPushButton#PlayerBtn:hover {
    background-color: #7c3aed;
    border-color: #8b5cf6;
    color: #ffffff;
}
QPushButton#PlayerBtn[active="true"] {
    background-color: #7c3aed;
    border-color: #8b5cf6;
    color: #ffffff;
}

QSlider::groove:horizontal {
    background-color: #272736;
    height: 5px;
    border-radius: 2px;
}
QSlider::sub-page:horizontal {
    background-color: #7c3aed;
    height: 5px;
    border-radius: 2px;
}
QSlider::handle:horizontal {
    background-color: #a78bfa;
    width: 12px;
    height: 12px;
    margin-top: -4px;
    margin-bottom: -4px;
    border-radius: 6px;
    border: 2px solid #09090e;
}
"""


class SideGrip(QtWidgets.QWidget):
    """Transparent edge grip for resizing frameless windows."""
    def __init__(self, parent, edge):
        super(SideGrip, self).__init__(parent)
        self.edge = edge
        if edge in (QtCore.Qt.LeftEdge, QtCore.Qt.RightEdge):
            self.setCursor(QtCore.Qt.SizeHorCursor)
        elif edge in (QtCore.Qt.TopEdge, QtCore.Qt.BottomEdge):
            self.setCursor(QtCore.Qt.SizeVerCursor)
        self.mousePos = None
        self.setStyleSheet("background: transparent;")

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.mousePos = QtGui.QCursor.pos()

    def mouseMoveEvent(self, event):
        if self.mousePos is not None:
            delta = QtGui.QCursor.pos() - self.mousePos
            if delta.isNull():
                return
            window = self.window()
            geo = window.geometry()
            if self.edge == QtCore.Qt.LeftEdge:
                new_w = max(window.minimumWidth(), geo.width() - delta.x())
                geo.setLeft(geo.right() - new_w)
                window.setGeometry(geo)
            elif self.edge == QtCore.Qt.RightEdge:
                new_w = max(window.minimumWidth(), geo.width() + delta.x())
                window.resize(new_w, window.height())
            elif self.edge == QtCore.Qt.BottomEdge:
                new_h = max(window.minimumHeight(), geo.height() + delta.y())
                window.resize(window.width(), new_h)
            elif self.edge == QtCore.Qt.TopEdge:
                new_h = max(window.minimumHeight(), geo.height() - delta.y())
                geo.setTop(geo.bottom() - new_h)
                window.setGeometry(geo)
            self.mousePos = QtGui.QCursor.pos()

    def mouseReleaseEvent(self, event):
        self.mousePos = None


class FramelessTitleBar(QtWidgets.QFrame):
    """Minimalist editorial window bar matching AnimationReference.org."""
    def __init__(self, title="Animation Reference", parent=None):
        super(FramelessTitleBar, self).__init__(parent)
        self.drag_position = None
        self.setFixedHeight(26)

        layout = QtWidgets.QHBoxLayout(self)
        layout.setContentsMargins(10, 0, 8, 0)
        layout.setSpacing(6)

        # Minimal Black Circle Logo
        self.logo_widget = QtWidgets.QLabel("A")
        self.logo_widget.setFixedSize(16, 16)
        self.logo_widget.setAlignment(QtCore.Qt.AlignCenter)
        self.logo_widget.setStyleSheet("""
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #8b5cf6, stop:1 #ec4899);
            color: #ffffff;
            font-weight: 900;
            font-size: 9px;
            border-radius: 8px;
        """)
        layout.addWidget(self.logo_widget)

        title_box = QtWidgets.QHBoxLayout()
        title_box.setSpacing(5)
        self.title_lbl = QtWidgets.QLabel(title)
        self.title_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; background: transparent;")
        title_box.addWidget(self.title_lbl)

        self.studio_badge = QtWidgets.QLabel("MAYA")
        self.studio_badge.setStyleSheet("background-color: rgba(6, 182, 212, 0.18); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.35); font-size: 8px; font-weight: 800; padding: 1px 6px; border-radius: 6px;")
        title_box.addWidget(self.studio_badge)
        layout.addLayout(title_box)

        layout.addStretch()

        self.compact_btn = QtWidgets.QPushButton("Mini")
        self.compact_btn.setObjectName("TitleBarBtn")
        self.compact_btn.setToolTip("Toggle compact floating companion")
        layout.addWidget(self.compact_btn)

        self.pin_btn = QtWidgets.QPushButton("Pin")
        self.pin_btn.setObjectName("TitleBarBtn")
        self.pin_btn.setCheckable(True)
        self.pin_btn.setToolTip("Keep window on top of Maya viewport")
        self.pin_btn.clicked.connect(self._toggle_always_on_top)
        layout.addWidget(self.pin_btn)

        if cmds:
            self.dock_btn = QtWidgets.QPushButton("Dock")
            self.dock_btn.setObjectName("TitleBarBtn")
            self.dock_btn.setToolTip("Dock into Maya workspace panels")
            layout.addWidget(self.dock_btn)

        self.web_btn = QtWidgets.QPushButton("web ↗")
        self.web_btn.setObjectName("TitleBarBtn")
        self.web_btn.setToolTip("Open AnimationReference.org/moodboard")
        self.web_btn.clicked.connect(lambda: webbrowser.open("https://animationreference.org/moodboard"))
        layout.addWidget(self.web_btn)

        btn_box = QtWidgets.QHBoxLayout()
        btn_box.setSpacing(2)

        self.min_btn = QtWidgets.QPushButton("–")
        self.min_btn.setObjectName("WinCtrlBtn")
        self.min_btn.clicked.connect(self._minimize_window)
        btn_box.addWidget(self.min_btn)

        self.max_btn = QtWidgets.QPushButton("□")
        self.max_btn.setObjectName("WinCtrlBtn")
        self.max_btn.clicked.connect(self._maximize_window)
        btn_box.addWidget(self.max_btn)

        self.close_btn = QtWidgets.QPushButton("✕")
        self.close_btn.setObjectName("WinCloseBtn")
        self.close_btn.clicked.connect(self._close_window)
        btn_box.addWidget(self.close_btn)

        layout.addLayout(btn_box)

    def _toggle_always_on_top(self):
        win = self.window()
        is_on_top = self.pin_btn.isChecked()
        flags = win.windowFlags()
        if is_on_top:
            flags |= QtCore.Qt.WindowStaysOnTopHint
            self.pin_btn.setStyleSheet("background-color: #7c3aed; color: #ffffff; border: 1px solid #8b5cf6;")
        else:
            flags &= ~QtCore.Qt.WindowStaysOnTopHint
            self.pin_btn.setStyleSheet("")
        pos = win.pos()
        size = win.size()
        win.setWindowFlags(flags)
        win.resize(size)
        win.move(pos)
        win.show()

    def set_docked_mode(self, is_docked):
        self._is_docked_bar = bool(is_docked)
        if is_docked:
            self.setFixedHeight(22)
            self.logo_widget.setVisible(False)
            self.title_lbl.setVisible(False)
            self.studio_badge.setVisible(False)
            self.pin_btn.setVisible(False)
            self.min_btn.setVisible(False)
            self.max_btn.setVisible(False)
            self.close_btn.setVisible(False)
            if hasattr(self, "dock_btn"):
                self.dock_btn.setText("Float")
                self.dock_btn.setVisible(True)
        else:
            self.setFixedHeight(26)
            self.logo_widget.setVisible(True)
            self.title_lbl.setVisible(True)
            self.studio_badge.setVisible(True)
            self.pin_btn.setVisible(True)
            self.min_btn.setVisible(True)
            self.max_btn.setVisible(True)
            self.close_btn.setVisible(True)
            if hasattr(self, "dock_btn"):
                self.dock_btn.setText("Dock")
                self.dock_btn.setVisible(True)

    def set_narrow_mode(self, is_narrow):
        if getattr(self, "_is_docked_bar", False) or getattr(self, "_is_mini_bar", False):
            return
        if is_narrow:
            self.studio_badge.setVisible(False)
            self.web_btn.setVisible(False)
            self.title_lbl.setText("AnimRef")
            if hasattr(self, "dock_btn"):
                self.dock_btn.setText("Dock")
        else:
            self.studio_badge.setVisible(True)
            self.web_btn.setVisible(True)
            self.title_lbl.setText("Animation Reference")
            if hasattr(self, "dock_btn"):
                self.dock_btn.setText("Dock to Maya")

    def set_mini_mode(self, is_mini, video_title=""):
        self._is_mini_bar = bool(is_mini)
        if is_mini:
            self.setFixedHeight(24)
            self.logo_widget.setVisible(False)
            self.studio_badge.setVisible(False)
            if hasattr(self, "dock_btn"):
                self.dock_btn.setVisible(False)
            self.web_btn.setVisible(False)
            self.max_btn.setVisible(False)

            clean_title = (video_title or "Mini Companion").strip()
            if len(clean_title) > 22:
                clean_title = clean_title[:20] + ".."
            self.title_lbl.setText(clean_title)
            self.compact_btn.setText("Full")
        else:
            if getattr(self, "_is_docked_bar", False):
                self.set_docked_mode(True)
            else:
                self.setFixedHeight(26)
                self.logo_widget.setVisible(True)
                self.studio_badge.setVisible(True)
                if hasattr(self, "dock_btn"):
                    self.dock_btn.setVisible(True)
                self.web_btn.setVisible(True)
                self.max_btn.setVisible(True)
                self.title_lbl.setText("Animation Reference")
            self.compact_btn.setText("Mini")

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            win = self.window()
            if hasattr(event, "globalPosition"):
                self.drag_position = event.globalPosition().toPoint() - win.frameGeometry().topLeft()
            else:
                self.drag_position = event.globalPos() - win.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event):
        if event.buttons() == QtCore.Qt.LeftButton and self.drag_position is not None:
            win = self.window()
            if not win.isMaximized():
                if hasattr(event, "globalPosition"):
                    win.move(event.globalPosition().toPoint() - self.drag_position)
                else:
                    win.move(event.globalPos() - self.drag_position)
                event.accept()

    def mouseReleaseEvent(self, event):
        self.drag_position = None

    def mouseDoubleClickEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self._maximize_window()

    def _minimize_window(self):
        self.window().showMinimized()

    def _maximize_window(self):
        win = self.window()
        if win.isMaximized():
            win.showNormal()
        else:
            win.showMaximized()

    def _close_window(self):
        self.window().close()


class WorkspaceHeaderFrame(QtWidgets.QFrame):
    """Draggable header frame so users can click & drag on open header space to move the window anywhere."""
    def __init__(self, parent=None):
        super(WorkspaceHeaderFrame, self).__init__(parent)
        self.drag_position = None

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            win = self.window()
            if hasattr(event, "globalPosition"):
                self.drag_position = event.globalPosition().toPoint() - win.frameGeometry().topLeft()
            else:
                self.drag_position = event.globalPos() - win.frameGeometry().topLeft()
            event.accept()
        else:
            super(WorkspaceHeaderFrame, self).mousePressEvent(event)

    def mouseMoveEvent(self, event):
        if event.buttons() == QtCore.Qt.LeftButton and self.drag_position is not None:
            win = self.window()
            if not win.isMaximized():
                if hasattr(event, "globalPosition"):
                    win.move(event.globalPosition().toPoint() - self.drag_position)
                else:
                    win.move(event.globalPos() - self.drag_position)
                event.accept()
        else:
            super(WorkspaceHeaderFrame, self).mouseMoveEvent(event)

    def mouseReleaseEvent(self, event):
        self.drag_position = None
        super(WorkspaceHeaderFrame, self).mouseReleaseEvent(event)


class SidebarNavPanel(QtWidgets.QFrame):
    """
    Mobile-optimized & responsive Left Sidebar for AnimationReference:
    - Expanded: sleek 150px navigation panel
    - Collapsed: 44px icon rail for ultra-compact viewport companion mode
    - One-click toggle button (◀ / ▶) to collapse/expand
    - Automatically collapses when window width is constrained
    """
    nav_changed = QtCore.Signal(int)
    board_selected = QtCore.Signal(dict)
    all_saves_selected = QtCore.Signal()
    manage_boards_selected = QtCore.Signal()
    collapsed_changed = QtCore.Signal(bool)

    EXPANDED_WIDTH = 150
    COLLAPSED_WIDTH = 44

    def __init__(self, parent=None):
        super(SidebarNavPanel, self).__init__(parent)
        self.is_collapsed = False
        self._manually_collapsed = False
        self.setFixedWidth(self.EXPANDED_WIDTH)

        self.sidebar_layout = QtWidgets.QVBoxLayout(self)
        self.sidebar_layout.setContentsMargins(10, 10, 10, 10)
        self.sidebar_layout.setSpacing(6)

        # 1. Top Control Row: Toggle Collapse Button + "LIBRARY" + "+"
        self.lib_hdr = QtWidgets.QHBoxLayout()
        self.lib_hdr.setContentsMargins(2, 0, 2, 2)
        self.lib_hdr.setSpacing(4)

        self.toggle_collapse_btn = QtWidgets.QPushButton("◀")
        self.toggle_collapse_btn.setFixedSize(22, 22)
        self.toggle_collapse_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.toggle_collapse_btn.setToolTip("Collapse/Expand sidebar to save screen space")
        self.toggle_collapse_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                border: 1px solid #272736;
                border-radius: 6px;
                color: #a1a1aa;
                font-size: 9px;
                font-weight: 700;
                padding: 0px;
            }
            QPushButton:hover {
                background-color: #7c3aed;
                color: #ffffff;
                border-color: #8b5cf6;
            }
        """)
        self.toggle_collapse_btn.clicked.connect(self.toggle_collapse)
        self.lib_hdr.addWidget(self.toggle_collapse_btn)

        self.lib_lbl = QtWidgets.QLabel("LIBRARY")
        self.lib_lbl.setStyleSheet("color: #71717a; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; background: transparent;")
        self.lib_hdr.addWidget(self.lib_lbl)
        self.lib_hdr.addStretch()

        self.plus_btn = QtWidgets.QPushButton("+")
        self.plus_btn.setFixedSize(20, 20)
        self.plus_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.plus_btn.setToolTip("Create a new board on AnimationReference.org/moodboard")
        self.plus_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                border: none;
                border-radius: 10px;
                color: #a1a1aa;
                font-size: 13px;
                font-weight: 600;
                padding: 0px;
            }
            QPushButton:hover {
                background-color: #161622;
                color: #f4f4f5;
            }
        """)
        self.plus_btn.clicked.connect(lambda: webbrowser.open("https://animationreference.org/moodboard"))
        self.lib_hdr.addWidget(self.plus_btn)
        self.sidebar_layout.addLayout(self.lib_hdr)

        # 2. "All saves" and "Explore Library" Buttons
        self.all_saves_btn = QtWidgets.QPushButton("⊞  All saves")
        self.all_saves_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.all_saves_btn.clicked.connect(self._on_all_saves_clicked)
        self.sidebar_layout.addWidget(self.all_saves_btn)

        self.explore_nav_btn = QtWidgets.QPushButton("🌐  Explore")
        self.explore_nav_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.explore_nav_btn.setToolTip("Browse & search all 8,000+ AnimationReference.org clips")
        self.explore_nav_btn.clicked.connect(lambda: self.set_active_index(4))
        self.sidebar_layout.addWidget(self.explore_nav_btn)

        # 3. BOARDS Header Row: "BOARDS" + "Manage"
        self.boards_hdr_widget = QtWidgets.QWidget()
        self.boards_hdr_widget.setStyleSheet("background: transparent;")
        boards_hdr = QtWidgets.QHBoxLayout(self.boards_hdr_widget)
        boards_hdr.setContentsMargins(2, 10, 2, 2)
        self.boards_lbl = QtWidgets.QLabel("BOARDS")
        self.boards_lbl.setStyleSheet("color: #71717a; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; background: transparent;")
        boards_hdr.addWidget(self.boards_lbl)
        boards_hdr.addStretch()

        self.manage_boards_btn = QtWidgets.QPushButton("Manage")
        self.manage_boards_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.manage_boards_btn.setToolTip("View all Moodboards as cards")
        self.manage_boards_btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                border: none;
                color: #a1a1aa;
                font-size: 10px;
                font-weight: 600;
                padding: 1px 2px;
            }
            QPushButton:hover {
                color: #f4f4f5;
                text-decoration: underline;
            }
        """)
        self.manage_boards_btn.clicked.connect(self._on_manage_boards_clicked)
        boards_hdr.addWidget(self.manage_boards_btn)
        self.sidebar_layout.addWidget(self.boards_hdr_widget)

        # 4. Scrollable Individual Boards List
        self.sidebar_boards_scroll = QtWidgets.QScrollArea()
        self.sidebar_boards_scroll.setWidgetResizable(True)
        self.sidebar_boards_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.sidebar_boards_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.sidebar_boards_scroll.setStyleSheet("QScrollArea { background: transparent; border: none; }")
        self.sidebar_boards_widget = QtWidgets.QWidget()
        self.sidebar_boards_widget.setStyleSheet("background: transparent;")
        self.sidebar_boards_layout = QtWidgets.QVBoxLayout(self.sidebar_boards_widget)
        self.sidebar_boards_layout.setContentsMargins(0, 2, 0, 2)
        self.sidebar_boards_layout.setSpacing(2)
        self.sidebar_boards_layout.addStretch()
        self.sidebar_boards_scroll.setWidget(self.sidebar_boards_widget)
        self.sidebar_layout.addWidget(self.sidebar_boards_scroll, stretch=1)

        # 5. Divider & Playblast Compare
        sep = QtWidgets.QFrame()
        sep.setFixedHeight(1)
        sep.setStyleSheet("background-color: #232334; border: none;")
        self.sidebar_layout.addWidget(sep)

        self.nav_buttons = []
        self.playblast_nav_btn = QtWidgets.QPushButton("🎬  Playblast")
        self.playblast_nav_btn.setObjectName("NavBtn")
        self.playblast_nav_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.playblast_nav_btn.setToolTip("Side-by-Side Playblast Comparison")
        self.playblast_nav_btn.clicked.connect(lambda: self.set_active_index(2))
        self.sidebar_layout.addWidget(self.playblast_nav_btn)

        # Account Card at Bottom of Sidebar
        self.account_card = QtWidgets.QFrame()
        self.account_card.setObjectName("AccountCard")
        self.account_card.setCursor(QtCore.Qt.PointingHandCursor)
        self.account_card.setStyleSheet("""
            QFrame#AccountCard {
                background-color: #111119;
                border: 1px solid #272736;
                border-radius: 10px;
            }
            QFrame#AccountCard:hover {
                border: 1px solid #8b5cf6;
            }
        """)
        acc_layout = QtWidgets.QHBoxLayout(self.account_card)
        acc_layout.setContentsMargins(6, 6, 6, 6)
        acc_layout.setSpacing(6)

        self.avatar_lbl = QtWidgets.QLabel("AR")
        self.avatar_lbl.setFixedSize(24, 24)
        self.avatar_lbl.setAlignment(QtCore.Qt.AlignCenter)
        self.avatar_lbl.setStyleSheet("""
            background-color: #7c3aed;
            color: #ffffff;
            font-weight: 800;
            font-size: 9px;
            border-radius: 12px;
        """)
        acc_layout.addWidget(self.avatar_lbl)

        self.acc_text_widget = QtWidgets.QWidget()
        self.acc_text_widget.setStyleSheet("background: transparent;")
        acc_text_layout = QtWidgets.QVBoxLayout(self.acc_text_widget)
        acc_text_layout.setContentsMargins(0, 0, 0, 0)
        acc_text_layout.setSpacing(1)
        self.user_name_lbl = QtWidgets.QLabel("Sign In")
        self.user_name_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; background: transparent;")
        self.user_badge_lbl = QtWidgets.QLabel("Sync Boards")
        self.user_badge_lbl.setStyleSheet("font-size: 9px; color: #a1a1aa; background: transparent;")
        acc_text_layout.addWidget(self.user_name_lbl)
        acc_text_layout.addWidget(self.user_badge_lbl)
        acc_layout.addWidget(self.acc_text_widget, stretch=1)
        self.sidebar_layout.addWidget(self.account_card)

        self.account_card.mousePressEvent = self._on_account_card_clicked

        self.status_box = QtWidgets.QWidget()
        self.stat_desc = QtWidgets.QLabel("")

        self.current_index = 0
        self.active_board_id = "__all_saves__"
        self._all_saves_count = 0
        self._sidebar_board_btns = []
        self._boards_cache = []
        self._update_button_states()

    def toggle_collapse(self):
        self._manually_collapsed = not self.is_collapsed
        self.set_collapsed(not self.is_collapsed)

    def set_collapsed(self, collapsed):
        self.is_collapsed = bool(collapsed)
        target_w = self.COLLAPSED_WIDTH if self.is_collapsed else self.EXPANDED_WIDTH
        self.setFixedWidth(target_w)

        self.toggle_collapse_btn.setText("▶" if self.is_collapsed else "◀")
        self.lib_lbl.setVisible(not self.is_collapsed)
        self.plus_btn.setVisible(not self.is_collapsed)
        self.boards_hdr_widget.setVisible(not self.is_collapsed)
        self.acc_text_widget.setVisible(not self.is_collapsed)

        if self.is_collapsed:
            self.sidebar_layout.setContentsMargins(4, 8, 4, 8)
            self.all_saves_btn.setToolTip("All saves ({} references)".format(self._all_saves_count))
            self.explore_nav_btn.setToolTip("Explore Library (8,000+ references)")
            self.playblast_nav_btn.setText("🎬")
        else:
            self.sidebar_layout.setContentsMargins(10, 10, 10, 10)
            self.playblast_nav_btn.setText("🎬  Playblast")

        self._update_button_states()
        self.collapsed_changed.emit(self.is_collapsed)

    def _on_account_card_clicked(self, event=None):
        user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else None
        self.set_active_index(3)
        if not user:
            win = self.window()
            if hasattr(win, "launch_browser_sign_in"):
                win.launch_browser_sign_in()

    def set_all_saves_count(self, count):
        self._all_saves_count = int(count or 0)
        if self.is_collapsed:
            self.all_saves_btn.setText("⊞")
            self.all_saves_btn.setToolTip("All saves ({} references)".format(self._all_saves_count))
        else:
            self.all_saves_btn.setText("⊞  All saves  {}".format(self._all_saves_count))

    def _on_all_saves_clicked(self):
        self.active_board_id = "__all_saves__"
        self.current_index = 0
        self._update_button_states()
        self.all_saves_selected.emit()

    def _on_manage_boards_clicked(self):
        self.active_board_id = "__manage_boards__"
        self.current_index = 0
        self._update_button_states()
        self.manage_boards_selected.emit()

    def populate_boards_list(self, boards):
        self._boards_cache = list(boards or [])
        self._sidebar_board_btns = []
        while self.sidebar_boards_layout.count():
            item = self.sidebar_boards_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        for b in self._boards_cache:
            b_name = b.get("name") or "Untitled board"
            cnt = b.get("itemCount") or len(b.get("items", []))
            clean_name = b_name[:11] + ".." if len(b_name) > 12 else b_name
            btn_txt = "📁" if self.is_collapsed else "📁  {}  {}".format(clean_name, cnt)
            btn = QtWidgets.QPushButton(btn_txt)
            btn.setCursor(QtCore.Qt.PointingHandCursor)
            btn.setToolTip("{} ({} references)".format(b_name, cnt))
            is_sel = (str(b.get("id")) == str(self.active_board_id))
            self._apply_board_btn_style(btn, is_sel)
            btn.clicked.connect(lambda checked=False, bd=b: self._on_board_btn_clicked(bd))
            self.sidebar_boards_layout.addWidget(btn)
            self._sidebar_board_btns.append((str(b.get("id")), btn, b_name, cnt))

        self.sidebar_boards_layout.addStretch()
        self._update_button_states()

    def _apply_board_btn_style(self, btn, is_selected):
        pad = "6px 2px" if self.is_collapsed else "6px 8px"
        align = "center" if self.is_collapsed else "left"
        if is_selected:
            btn.setStyleSheet("""
                QPushButton {{
                    text-align: {align};
                    background-color: #7c3aed;
                    color: #ffffff;
                    border: none;
                    border-radius: 9px;
                    padding: {pad};
                    font-size: 11px;
                    font-weight: 600;
                }}
            """.format(align=align, pad=pad))
        else:
            btn.setStyleSheet("""
                QPushButton {{
                    text-align: {align};
                    background-color: transparent;
                    color: #f4f4f5;
                    border: none;
                    border-radius: 9px;
                    padding: {pad};
                    font-size: 11px;
                    font-weight: 500;
                }}
                QPushButton:hover {{
                    background-color: #161622;
                    color: #f4f4f5;
                }}
            """.format(align=align, pad=pad))

    def _on_board_btn_clicked(self, board_data):
        self.active_board_id = board_data.get("id")
        self.current_index = 0
        self._update_button_states()
        self.board_selected.emit(board_data)

    def highlight_board(self, board_id):
        self.active_board_id = board_id
        self._update_button_states()

    def clear_board_highlight(self):
        self.active_board_id = "__manage_boards__"
        self._update_button_states()

    def set_active_index(self, index):
        self.current_index = index
        self._update_button_states()
        self.nav_changed.emit(index)

    def _update_button_states(self):
        is_all_saves = (self.current_index == 0 and self.active_board_id == "__all_saves__")
        is_explore = (self.current_index == 4)
        pad = "6px 2px" if self.is_collapsed else "7px 10px"
        align = "center" if self.is_collapsed else "left"
        self.all_saves_btn.setText("⊞" if self.is_collapsed else "⊞  All saves  {}".format(self._all_saves_count))
        self.explore_nav_btn.setText("🌐" if self.is_collapsed else "🌐  Explore")

        def _pill_style(active):
            if active:
                return """
                    QPushButton {{
                        text-align: {align};
                        background-color: #7c3aed;
                        color: #ffffff;
                        border: none;
                        border-radius: 9px;
                        padding: {pad};
                        font-size: 11px;
                        font-weight: 600;
                    }}
                """.format(align=align, pad=pad)
            return """
                QPushButton {{
                    text-align: {align};
                    background-color: transparent;
                    color: #f4f4f5;
                    border: none;
                    border-radius: 9px;
                    padding: {pad};
                    font-size: 11px;
                    font-weight: 500;
                }}
                QPushButton:hover {{
                    background-color: #161622;
                    color: #f4f4f5;
                }}
            """.format(align=align, pad=pad)

        self.all_saves_btn.setStyleSheet(_pill_style(is_all_saves))
        self.explore_nav_btn.setStyleSheet(_pill_style(is_explore))

        for entry in self._sidebar_board_btns:
            bid = entry[0]
            btn = entry[1]
            b_name = entry[2] if len(entry) > 2 else ""
            cnt = entry[3] if len(entry) > 3 else ""
            clean_name = b_name[:11] + ".." if len(b_name) > 12 else b_name
            btn.setText("📁" if self.is_collapsed else "📁  {}  {}".format(clean_name, cnt))
            self._apply_board_btn_style(btn, self.current_index == 0 and bid == str(self.active_board_id))

        is_pb = (self.current_index == 2)
        self.playblast_nav_btn.setProperty("active", "true" if is_pb else "false")
        self.playblast_nav_btn.style().unpolish(self.playblast_nav_btn)
        self.playblast_nav_btn.style().polish(self.playblast_nav_btn)


_ROUNDED_PIXMAP_CACHE = {}
_FALLBACK_PIXMAP_CACHE = {}


def create_rounded_pixmap(src_pixmap, width, height, radius=14, cache_key=None):
    """Crops and scales a QPixmap to (width, height) with smooth rounded corners and in-memory LRU caching."""
    if not src_pixmap or src_pixmap.isNull():
        target = QtGui.QPixmap(width, height)
        target.fill(QtCore.Qt.transparent)
        return target

    key = (cache_key or int(src_pixmap.cacheKey()), int(width), int(height), int(radius))
    cached = _ROUNDED_PIXMAP_CACHE.get(key)
    if cached is not None and not cached.isNull():
        return cached

    target = QtGui.QPixmap(width, height)
    target.fill(QtCore.Qt.transparent)
    scaled = src_pixmap.scaled(width, height, QtCore.Qt.KeepAspectRatioByExpanding, QtCore.Qt.SmoothTransformation)
    x = max(0, (scaled.width() - width) // 2)
    y = max(0, (scaled.height() - height) // 2)
    cropped = scaled.copy(x, y, width, height)

    painter = QtGui.QPainter(target)
    painter.setRenderHint(QtGui.QPainter.Antialiasing)
    painter.setRenderHint(QtGui.QPainter.SmoothPixmapTransform)
    path = QtGui.QPainterPath()
    path.addRoundedRect(QtCore.QRectF(0, 0, width, height), radius, radius)
    painter.setClipPath(path)
    painter.drawPixmap(0, 0, cropped)
    painter.end()

    if len(_ROUNDED_PIXMAP_CACHE) > 400:
        _ROUNDED_PIXMAP_CACHE.clear()
    _ROUNDED_PIXMAP_CACHE[key] = target
    return target


def create_fallback_pixmap(width, height, title, duration_str="", radius=14):
    """Creates a warm editorial stone placeholder card while thumbnails are loading."""
    clean_title = (title or "").strip()[:42]
    fkey = (clean_title, int(width), int(height), int(radius))
    cached_fb = _FALLBACK_PIXMAP_CACHE.get(fkey)
    if cached_fb is not None and not cached_fb.isNull():
        return cached_fb
    pix = QtGui.QPixmap(width, height)
    pix.fill(QtCore.Qt.transparent)
    painter = QtGui.QPainter(pix)
    painter.setRenderHint(QtGui.QPainter.Antialiasing)

    path = QtGui.QPainterPath()
    path.addRoundedRect(QtCore.QRectF(0, 0, width, height), radius, radius)
    painter.setClipPath(path)

    grad = QtGui.QLinearGradient(0, 0, width, height)
    grad.setColorAt(0, QtGui.QColor("#161622"))
    grad.setColorAt(1, QtGui.QColor("#111119"))
    painter.fillRect(QtCore.QRect(0, 0, width, height), grad)

    painter.setPen(QtGui.QPen(QtGui.QColor("#71717a")))
    font = painter.font()
    font.setPointSize(9)
    font.setBold(True)
    painter.setFont(font)

    clean_title = (title or "").strip()
    rect = QtCore.QRect(14, 14, width - 28, height - 28)
    painter.drawText(rect, QtCore.Qt.AlignCenter | QtCore.Qt.TextWordWrap, clean_title[:42])
    painter.end()
    if len(_FALLBACK_PIXMAP_CACHE) > 250:
        _FALLBACK_PIXMAP_CACHE.clear()
    _FALLBACK_PIXMAP_CACHE[fkey] = pix
    return pix


class VideoPlayerWidget(QtWidgets.QFrame):
    """
    YouTube-style Video Player for animators:
    - Expanded high-resolution video viewing surface
    - YouTube red scrubber slider with glowing circular handle
    - Single consolidated control bar:
      [ ▶ Play / ❚❚ Pause ] [ ⏮ 1F ] [ 1F ⏭ ] [ 🔊 Mute ] [ 00:03 / 00:15 ] [ • 72f (24fps) ]
      ... [ ⏱ Sync Maya ] [ 🔁 Loop ] [ 1.0x ] [ ⚙ Settings ] [ ⛶ Theater ] [ 🗗 Pop Out ]
    - In-player settings menu matching website controls:
      - Playback speed (0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
      - Animation FPS (12 fps, 24 fps, 30 fps, 60 fps)
      - Seamless loop toggle
      - Sync with Maya Timeline toggle
      - Maya timeline frame offset prompt
      - Offline HD Cache download
      - Open on AnimationReference.org
    - Keyboard controls (Spacebar = Play/Pause, Left/Right = Frame step, M = Mute, L = Loop)
    """
    def __init__(self, parent=None):
        super(VideoPlayerWidget, self).__init__(parent)
        self.current_video = None
        self.is_scrubbing = False
        self.is_looping = True
        self.playback_rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
        self.rate_index = 3  # default 1.0x
        self.current_playback_rate = 1.0
        self.is_muted = False
        self.duration_ms = 0
        self.fps = 24.0
        self.sync_timeline = bool(cmds and hasattr(cmds, "currentTime"))
        self._time_job_id = None
        self._syncing_from_maya = False
        self._syncing_from_widget = False
        self.timeline_offset_frames = 0
        self.ab_in_ms = None
        self.ab_out_ms = None
        self.ab_in_frame = None
        self.ab_out_frame = None
        self.setFocusPolicy(QtCore.Qt.StrongFocus)

        self.setStyleSheet("""
            VideoPlayerWidget {
                background-color: #0e0e13;
                border: 1px solid #242430;
                border-radius: 14px;
            }
            QSlider#YouTubeSlider {
                height: 18px;
                background: transparent;
                margin: 2px 4px;
            }
            QSlider#YouTubeSlider::groove:horizontal {
                height: 4px;
                background: rgba(255, 255, 255, 0.14);
                border-radius: 2px;
            }
            QSlider#YouTubeSlider::sub-page:horizontal {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #7c3aed, stop:1 #a78bfa);
                border-radius: 2px;
            }
            QSlider#YouTubeSlider::handle:horizontal {
                background: #ffffff;
                border: 2px solid #8b5cf6;
                width: 12px;
                height: 12px;
                margin-top: -5px;
                margin-bottom: -5px;
                border-radius: 7px;
            }
            QSlider#YouTubeSlider::handle:horizontal:hover {
                background: #ffffff;
                border: 2px solid #c4b5fd;
                width: 14px;
                height: 14px;
                margin-top: -6px;
                margin-bottom: -6px;
                border-radius: 8px;
            }
            QPushButton.YTBtn {
                background-color: rgba(255, 255, 255, 0.06);
                color: #e4e4e7;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 8px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 600;
            }
            QPushButton.YTBtn:hover {
                background-color: rgba(255, 255, 255, 0.14);
                border-color: rgba(255, 255, 255, 0.18);
                color: #ffffff;
            }
            QPushButton.YTBtn:pressed {
                background-color: rgba(139, 92, 246, 0.30);
            }
            QPushButton.YTBtn[active="true"] {
                color: #c4b5fd;
                background-color: rgba(124, 58, 237, 0.25);
                border: 1px solid rgba(167, 139, 250, 0.45);
            }
        """)
        self.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)

        # Video Display Surface - clean rounded cinema viewport
        self.display_container = QtWidgets.QStackedWidget()
        self.display_container.setMinimumHeight(200)
        self.display_container.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        self.display_container.setStyleSheet("background-color: #050508; border-radius: 10px;")
        self.display_container.setCursor(QtCore.Qt.PointingHandCursor)
        self.display_container.mousePressEvent = self._on_display_clicked

        if QT_MULTIMEDIA_AVAILABLE > 0 and QVideoWidget is not None:
            self.video_widget = QVideoWidget()
            self.video_widget.setStyleSheet("background-color: #000000; border-radius: 6px;")
            self.display_container.addWidget(self.video_widget)

            self.player = QMediaPlayer(self)
            if QT_MULTIMEDIA_AVAILABLE == 6 and QAudioOutput is not None:
                self.audio_output = QAudioOutput(self)
                self.player.setAudioOutput(self.audio_output)
            else:
                self.audio_output = None

            self.player.setVideoOutput(self.video_widget)
            if hasattr(self.player, "setLoops"):
                self.player.setLoops(QMediaPlayer.Infinite)

            self.player.positionChanged.connect(self._on_position_changed)
            self.player.durationChanged.connect(self._on_duration_changed)
            if hasattr(self.player, "playbackStateChanged"):
                self.player.playbackStateChanged.connect(self._on_state_changed)
            elif hasattr(self.player, "stateChanged"):
                self.player.stateChanged.connect(self._on_state_changed)
        else:
            self.video_widget = None
            self.player = None
            self.audio_output = None

        self.placeholder_label = QtWidgets.QLabel()
        self.placeholder_label.setAlignment(QtCore.Qt.AlignCenter)
        self.placeholder_label.setStyleSheet("background-color: #080a0f; color: #8b949e; border-radius: 6px; font-size: 13px;")
        self.placeholder_label.setText("Select a reference clip to watch")
        self.display_container.addWidget(self.placeholder_label)
        self.display_container.setCurrentWidget(self.placeholder_label)
        layout.addWidget(self.display_container, stretch=1)

        # Scrubber Row - YouTube Red Slider
        self.slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.slider.setObjectName("YouTubeSlider")
        self.slider.setRange(0, 1000)
        self.slider.setValue(0)
        self.slider.sliderPressed.connect(self._on_slider_pressed)
        self.slider.sliderMoved.connect(self._on_slider_moved)
        self.slider.sliderReleased.connect(self._on_slider_released)
        layout.addWidget(self.slider)

        # Modern Minimalist Transport Control Bar
        ctrl_bar = QtWidgets.QHBoxLayout()
        ctrl_bar.setContentsMargins(2, 0, 2, 0)
        ctrl_bar.setSpacing(5)

        # Primary Play / Pause pill
        self.play_btn = QtWidgets.QPushButton("▶")
        self.play_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.play_btn.setFixedSize(32, 28)
        self.play_btn.setStyleSheet("""
            QPushButton {
                background-color: #7c3aed;
                color: #ffffff;
                border: none;
                border-radius: 14px;
                font-size: 12px;
                font-weight: 800;
            }
            QPushButton:hover {
                background-color: #8b5cf6;
            }
        """)
        self.play_btn.setToolTip("Play / Pause (Spacebar)")
        self.play_btn.clicked.connect(self.toggle_play)
        ctrl_bar.addWidget(self.play_btn)

        # Step Back / Forward
        self.prev_frame_btn = QtWidgets.QPushButton("‹")
        self.prev_frame_btn.setProperty("class", "YTBtn")
        self.prev_frame_btn.setFixedSize(26, 26)
        self.prev_frame_btn.setToolTip("Step backward 1 frame (Left Arrow)")
        self.prev_frame_btn.clicked.connect(lambda: self.step_frame(-1))
        ctrl_bar.addWidget(self.prev_frame_btn)

        self.next_frame_btn = QtWidgets.QPushButton("›")
        self.next_frame_btn.setProperty("class", "YTBtn")
        self.next_frame_btn.setFixedSize(26, 26)
        self.next_frame_btn.setToolTip("Step forward 1 frame (Right Arrow)")
        self.next_frame_btn.clicked.connect(lambda: self.step_frame(1))
        ctrl_bar.addWidget(self.next_frame_btn)

        # Mute / Volume
        self.mute_btn = QtWidgets.QPushButton("🔊")
        self.mute_btn.setProperty("class", "YTBtn")
        self.mute_btn.setFixedSize(28, 26)
        self.mute_btn.setToolTip("Mute / Unmute (M)")
        self.mute_btn.clicked.connect(self.toggle_mute)
        ctrl_bar.addWidget(self.mute_btn)

        # Clean time & frame readout
        self.time_label = QtWidgets.QLabel("00:00 / 00:00")
        self.time_label.setStyleSheet("color: #a1a1aa; font-size: 10px; font-weight: 600; margin-left: 2px; background: transparent;")
        ctrl_bar.addWidget(self.time_label)

        self.frame_label = QtWidgets.QLabel("0f")
        self.frame_label.setStyleSheet("color: #c4b5fd; background-color: rgba(124, 58, 237, 0.18); border-radius: 6px; padding: 2px 6px; font-size: 10px; font-weight: 700;")
        ctrl_bar.addWidget(self.frame_label)

        ctrl_bar.addStretch()

        # Sync Maya timeline
        self.sync_btn = QtWidgets.QPushButton("Sync")
        self.sync_btn.setProperty("class", "YTBtn")
        self.sync_btn.setCheckable(True)
        self.sync_btn.setChecked(self.sync_timeline)
        self.sync_btn.setToolTip("Lock playback & scrubbing to Maya timeline")
        self._update_sync_btn_style()
        self.sync_btn.clicked.connect(self.toggle_timeline_sync)
        ctrl_bar.addWidget(self.sync_btn)

        # Loop
        self.loop_btn = QtWidgets.QPushButton("↻")
        self.loop_btn.setProperty("class", "YTBtn")
        self.loop_btn.setFixedSize(28, 26)
        self.loop_btn.setProperty("active", "true" if self.is_looping else "false")
        self.loop_btn.setToolTip("Toggle seamless loop (L)")
        self.loop_btn.clicked.connect(self.toggle_loop)
        ctrl_bar.addWidget(self.loop_btn)

        # Speed
        self.speed_btn = QtWidgets.QPushButton("1.0x")
        self.speed_btn.setProperty("class", "YTBtn")
        self.speed_btn.setToolTip("Playback Speed (Click to cycle)")
        self.speed_btn.clicked.connect(self.cycle_speed)
        ctrl_bar.addWidget(self.speed_btn)

        # Collapsible Animator Tools toggle (keeps player sleek & uncluttered!)
        self.tools_toggle_btn = QtWidgets.QPushButton("Tools")
        self.tools_toggle_btn.setProperty("class", "YTBtn")
        self.tools_toggle_btn.setCheckable(True)
        self.tools_toggle_btn.setChecked(False)
        self.tools_toggle_btn.setToolTip("Show/Hide A-B Loop, Magic Align & Pose Bookmarks")
        ctrl_bar.addWidget(self.tools_toggle_btn)

        # Settings Gear
        self.settings_btn = QtWidgets.QPushButton("⚙")
        self.settings_btn.setProperty("class", "YTBtn")
        self.settings_btn.setFixedSize(28, 26)
        self.settings_btn.setToolTip("Settings (Speed, FPS, Loop, Offset)")
        self.settings_btn.clicked.connect(self.show_settings_menu)
        ctrl_bar.addWidget(self.settings_btn)

        # Hidden legacy attributes
        self.theater_btn = QtWidgets.QPushButton("⛶")
        self.theater_btn.setVisible(False)
        self.popout_btn = QtWidgets.QPushButton("🗗")
        self.popout_btn.setVisible(False)

        layout.addLayout(ctrl_bar)

        # Collapsible Animator Tools Drawer (hidden by default for clean player UX)
        self.animator_bar_widget = QtWidgets.QFrame()
        self.animator_bar_widget.setVisible(False)
        self.animator_bar_widget.setStyleSheet("QFrame { background-color: #15151d; border: 1px solid #262634; border-radius: 10px; }")
        self.tools_toggle_btn.toggled.connect(self.animator_bar_widget.setVisible)
        anim_vbox = QtWidgets.QVBoxLayout(self.animator_bar_widget)
        anim_vbox.setContentsMargins(8, 6, 8, 6)
        anim_vbox.setSpacing(6)

        ab_row = QtWidgets.QHBoxLayout()
        ab_row.setContentsMargins(0, 0, 0, 0)
        ab_row.setSpacing(4)

        self.set_in_btn = QtWidgets.QPushButton("[ In")
        self.set_in_btn.setProperty("class", "YTBtn")
        self.set_in_btn.setToolTip("Set A-B Loop Start at current frame (Shortcut: I)")
        self.set_in_btn.clicked.connect(self.set_ab_in)
        ab_row.addWidget(self.set_in_btn)

        self.set_out_btn = QtWidgets.QPushButton("Out ]")
        self.set_out_btn.setProperty("class", "YTBtn")
        self.set_out_btn.setToolTip("Set A-B Loop End at current frame (Shortcut: O)")
        self.set_out_btn.clicked.connect(self.set_ab_out)
        ab_row.addWidget(self.set_out_btn)

        self.clear_ab_btn = QtWidgets.QPushButton("✕")
        self.clear_ab_btn.setProperty("class", "YTBtn")
        self.clear_ab_btn.setToolTip("Clear A-B Loop Range & Restore Maya Timeline")
        self.clear_ab_btn.setVisible(False)
        self.clear_ab_btn.clicked.connect(self.clear_ab_loop)
        ab_row.addWidget(self.clear_ab_btn)

        self.sync_ab_maya_btn = QtWidgets.QPushButton("⇄ Fit Maya A-B")
        self.sync_ab_maya_btn.setProperty("class", "YTBtn")
        self.sync_ab_maya_btn.setToolTip("Set Maya's Time Slider playback range (minTime..maxTime) to match this A-B sub-clip")
        self.sync_ab_maya_btn.clicked.connect(self.sync_ab_to_maya_timeline)
        ab_row.addWidget(self.sync_ab_maya_btn)

        ab_row.addStretch()

        self.magic_align_btn = QtWidgets.QPushButton("⚡ Align Pose to Maya Frame")
        self.magic_align_btn.setProperty("class", "YTBtn")
        self.magic_align_btn.setStyleSheet("background-color: #132a3a; color: #00E5FF; border: 1px solid #00E5FF; border-radius: 4px; padding: 3px 8px; font-weight: bold;")
        self.magic_align_btn.setToolTip("Magic Align: Syncs this exact reference frame to Maya's current timeline frame on both the player and scene image plane")
        self.magic_align_btn.clicked.connect(self.magic_align_current_frame)
        ab_row.addWidget(self.magic_align_btn)

        anim_vbox.addLayout(ab_row)

        bm_row = QtWidgets.QHBoxLayout()
        bm_row.setContentsMargins(0, 0, 0, 0)
        bm_row.setSpacing(3)

        bm_lbl = QtWidgets.QLabel("🏷 Mark Pose:")
        bm_lbl.setStyleSheet("color: #8b949e; font-size: 10px; font-weight: bold;")
        bm_row.addWidget(bm_lbl)

        bm_presets = [
            ("Anticipation", "#F59E0B"),
            ("Contact", "#00E5FF"),
            ("Passing", "#A78BFA"),
            ("Breakdown", "#10B981"),
            ("Extreme", "#EF4444"),
            ("Overshoot", "#EC4899"),
        ]
        for bm_name, bm_hex in bm_presets:
            chip = QtWidgets.QPushButton(bm_name)
            chip.setCursor(QtCore.Qt.PointingHandCursor)
            chip.setToolTip("Drop a '{}' Time Slider Bookmark at Maya's current frame (Shortcut: B)".format(bm_name))
            chip.setStyleSheet(
                "QPushButton {{ background-color: #141923; color: {c}; border: 1px solid {c}; border-radius: 3px; padding: 2px 5px; font-size: 9px; font-weight: bold; }}"
                "QPushButton:hover {{ background-color: {c}; color: #0a0d12; }}".format(c=bm_hex)
            )
            chip.clicked.connect(lambda checked=False, p=bm_name: self.drop_pose_bookmark(p))
            bm_row.addWidget(chip)

        bm_row.addStretch()
        anim_vbox.addLayout(bm_row)
        layout.addWidget(self.animator_bar_widget)

    def load_video(self, video_data):
        self.current_video = video_data
        if not video_data:
            self.stop()
            self.display_container.setCurrentWidget(self.placeholder_label)
            return

        thumb_path = animref_api.get_thumbnail(video_data)
        if thumb_path and os.path.isfile(thumb_path):
            pix = QtGui.QPixmap(thumb_path)
            self.placeholder_label.setPixmap(pix.scaled(320, 180, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation))
        else:
            dur = video_data.get("duration")
            dur_text = "{:.1f}s".format(dur) if dur else ""
            self.placeholder_label.setPixmap(create_fallback_pixmap(320, 180, video_data.get("title") or "Reference", dur_text))

        if not self.player:
            self.display_container.setCurrentWidget(self.placeholder_label)
            return

        media_source, is_local = animref_api.get_playable_media_source(video_data)
        if not media_source:
            self.display_container.setCurrentWidget(self.placeholder_label)
            return

        self.display_container.setCurrentWidget(self.video_widget)

        if is_local:
            qurl = QtCore.QUrl.fromLocalFile(media_source)
        else:
            qurl = QtCore.QUrl(media_source)

        if QT_MULTIMEDIA_AVAILABLE == 6:
            self.player.setSource(qurl)
        else:
            self.player.setMedia(QMediaContent(qurl))

        if hasattr(self.player, "setLoops"):
            self.player.setLoops(QMediaPlayer.Infinite if self.is_looping else 1)

        if self.sync_timeline and cmds:
            self._start_time_job()
            self._on_maya_time_changed()
        else:
            self.player.play()
            self.play_btn.setText("❚❚")

        if not is_local:
            def _bg_cache():
                try:
                    animref_api.download_video_file(video_data)
                except Exception:
                    pass
            t = threading.Thread(target=_bg_cache)
            t.daemon = True
            t.start()

    def _on_display_clicked(self, event):
        self.setFocus()
        if event.button() == QtCore.Qt.LeftButton:
            self.toggle_play()
            event.accept()

    def update_thumbnail_preview(self, local_path):
        if self.display_container.currentWidget() == self.placeholder_label:
            pix = QtGui.QPixmap(local_path)
            self.placeholder_label.setPixmap(pix.scaled(320, 180, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation))

    def _update_sync_btn_style(self):
        if hasattr(self, "sync_btn"):
            if self.sync_timeline:
                self.sync_btn.setStyleSheet("background-color: #0d2838; color: #00E5FF; border: 1px solid #00E5FF; font-weight: bold;")
                self.sync_btn.setText("⏱ Sync Maya")
            else:
                self.sync_btn.setStyleSheet("")
                self.sync_btn.setText("⏱ Sync")

    def toggle_timeline_sync(self):
        self.sync_timeline = not self.sync_timeline
        self.sync_btn.setChecked(self.sync_timeline)
        self._update_sync_btn_style()
        if self.sync_timeline:
            self._start_time_job()
            self._on_maya_time_changed()
        else:
            self._stop_time_job()

    def _start_time_job(self):
        if not cmds or not hasattr(cmds, "scriptJob"):
            return
        self._stop_time_job()
        try:
            self._time_job_id = cmds.scriptJob(event=["timeChanged", self._on_maya_time_changed], protected=False)
        except Exception:
            self._time_job_id = None

    def _stop_time_job(self):
        if self._time_job_id and cmds and hasattr(cmds, "scriptJob"):
            try:
                if cmds.scriptJob(exists=self._time_job_id):
                    cmds.scriptJob(kill=self._time_job_id, force=True)
            except Exception:
                pass
            self._time_job_id = None

    def _on_maya_time_changed(self):
        if not self.sync_timeline or self.is_scrubbing or self._syncing_from_widget:
            return
        if not self.current_video or self.duration_ms <= 0:
            return

        _cmds = cmds if (cmds and hasattr(cmds, "currentTime")) else None
        if not _cmds:
            try:
                import maya.cmds as real_cmds
                if hasattr(real_cmds, "currentTime"):
                    _cmds = real_cmds
            except Exception:
                pass

        if not _cmds or not hasattr(_cmds, "currentTime") or not hasattr(_cmds, "playbackOptions"):
            return

        try:
            self._syncing_from_maya = True
            cur_frame = _cmds.currentTime(query=True)
            start_frame = _cmds.playbackOptions(query=True, minTime=True)
            fps = self.fps or 24.0
            if hasattr(animref_importer, "get_scene_fps"):
                fps = animref_importer.get_scene_fps() or fps

            frame_offset = cur_frame - start_frame + self.timeline_offset_frames
            if frame_offset < 0:
                target_ms = 0
            else:
                target_ms = int((frame_offset / fps) * 1000.0)
                if self.is_looping and self.duration_ms > 0:
                    target_ms = target_ms % self.duration_ms
                elif self.duration_ms > 0:
                    target_ms = max(0, min(self.duration_ms, target_ms))

            is_maya_playing = False
            try:
                if hasattr(_cmds, "play"):
                    is_maya_playing = bool(_cmds.play(query=True, state=True))
            except Exception:
                pass

            if self.player:
                if is_maya_playing:
                    is_player_playing = False
                    if hasattr(self.player, "playbackState"):
                        is_player_playing = (self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState)
                    elif hasattr(self.player, "state"):
                        is_player_playing = (self.player.state() == QMediaPlayer.PlayingState)

                    drift = abs(self.player.position() - target_ms)
                    if not is_player_playing:
                        self.player.setPosition(target_ms)
                        self.player.play()
                    elif drift > 200:
                        self.player.setPosition(target_ms)
                else:
                    is_player_playing = False
                    if hasattr(self.player, "playbackState"):
                        is_player_playing = (self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState)
                    elif hasattr(self.player, "state"):
                        is_player_playing = (self.player.state() == QMediaPlayer.PlayingState)
                    if is_player_playing:
                        self.pause()
                    self.player.setPosition(target_ms)

            self.slider.setRange(0, max(1, self.duration_ms))
            self.slider.setValue(target_ms)
            self._update_time_display(target_ms, self.duration_ms)
        except Exception:
            pass
        finally:
            self._syncing_from_maya = False

    def _sync_maya_to_ms(self, pos_ms):
        if not self.sync_timeline:
            return
        if self._syncing_from_maya:
            return

        _cmds = cmds if (cmds and hasattr(cmds, "currentTime")) else None
        if not _cmds:
            try:
                import maya.cmds as real_cmds
                if hasattr(real_cmds, "currentTime"):
                    _cmds = real_cmds
            except Exception:
                pass

        if not _cmds or not hasattr(_cmds, "currentTime") or not hasattr(_cmds, "playbackOptions"):
            return

        try:
            self._syncing_from_widget = True
            fps = self.fps or 24.0
            if hasattr(animref_importer, "get_scene_fps"):
                fps = animref_importer.get_scene_fps() or fps
            start_frame = _cmds.playbackOptions(query=True, minTime=True)
            target_frame = start_frame + ((pos_ms / 1000.0) * fps) - self.timeline_offset_frames
            _cmds.currentTime(target_frame, update=True)
        except Exception:
            pass
        finally:
            self._syncing_from_widget = False

    def toggle_play(self):
        if not self.player:
            return
        is_playing = False
        if hasattr(self.player, "playbackState"):
            is_playing = (self.player.playbackState() == QMediaPlayer.PlaybackState.PlayingState)
        elif hasattr(self.player, "state"):
            is_playing = (self.player.state() == QMediaPlayer.PlayingState)

        if is_playing:
            self.pause()
        else:
            self.play()

    def play(self):
        if self.player:
            self.player.play()
            self.play_btn.setText("❚❚")
            self.play_btn.setToolTip("Pause (Spacebar)")
        if self.sync_timeline and cmds and hasattr(cmds, "play") and not self._syncing_from_maya:
            try:
                if not cmds.play(query=True, state=True):
                    cmds.play(forward=True)
            except Exception:
                pass

    def pause(self):
        if self.player:
            self.player.pause()
            self.play_btn.setText("▶")
            self.play_btn.setToolTip("Play (Spacebar)")
        if self.sync_timeline and cmds and hasattr(cmds, "play") and not self._syncing_from_maya:
            try:
                if cmds.play(query=True, state=True):
                    cmds.play(state=False)
            except Exception:
                pass

    def stop(self):
        self._stop_time_job()
        if self.player:
            self.player.stop()
            self.play_btn.setText("▶")
            self.play_btn.setToolTip("Play (Spacebar)")
            self.slider.setValue(0)
            self.time_label.setText("00:00 / 00:00")
            self.frame_label.setText("• 0f ({}fps)".format(int(round(self.fps or 24.0))))

    def step_frame(self, direction):
        self.pause()
        fps = animref_importer.get_scene_fps() if hasattr(animref_importer, "get_scene_fps") else (self.fps or 24.0)
        frame_ms = int(round(1000.0 / (fps or 24.0)))
        pos = self.player.position() if (self.player and self.player.position() > 0) else self.slider.value()
        dur = self.player.duration() if (self.player and self.player.duration() > 0) else self.duration_ms
        if dur <= 0:
            dur = self.slider.maximum() or 1000
        new_pos = max(0, min(dur, pos + (direction * frame_ms)))
        if self.player:
            self.player.setPosition(new_pos)
        self.slider.setValue(new_pos)
        self._update_time_display(new_pos, self.duration_ms)
        self._sync_maya_to_ms(new_pos)

    def cycle_speed(self):
        self.rate_index = (self.rate_index + 1) % len(self.playback_rates)
        rate = self.playback_rates[self.rate_index]
        self.set_playback_rate(rate)

    def set_playback_rate(self, rate):
        self.current_playback_rate = rate
        if rate in self.playback_rates:
            self.rate_index = self.playback_rates.index(rate)
        label = "1.0x" if rate == 1.0 else "{:.2f}x".format(rate) if rate < 1.0 else "{:.1f}x".format(rate)
        self.speed_btn.setText(label)
        if self.player and hasattr(self.player, "setPlaybackRate"):
            self.player.setPlaybackRate(rate)

    def set_target_fps(self, fps_val):
        self.fps = float(fps_val)
        pos = self.player.position() if self.player else self.slider.value()
        self._update_time_display(pos, self.duration_ms)

    def toggle_loop(self):
        self.is_looping = not self.is_looping
        if self.player and hasattr(self.player, "setLoops"):
            self.player.setLoops(QMediaPlayer.Infinite if self.is_looping else 1)
        self.loop_btn.setProperty("active", "true" if self.is_looping else "false")
        self.loop_btn.style().unpolish(self.loop_btn)
        self.loop_btn.style().polish(self.loop_btn)

    def toggle_mute(self):
        self.is_muted = not self.is_muted
        if self.audio_output:
            self.audio_output.setMuted(self.is_muted)
        elif self.player and hasattr(self.player, "setMuted"):
            self.player.setMuted(self.is_muted)
        self.mute_btn.setText("🔇" if self.is_muted else "🔊")
        self.mute_btn.setToolTip("Unmute (M)" if self.is_muted else "Mute (M)")

    def show_settings_menu(self):
        menu = QtWidgets.QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #12161f;
                border: 1px solid #2d3748;
                border-radius: 6px;
                padding: 4px;
                color: #e2e8f0;
                font-size: 11px;
            }
            QMenu::item {
                padding: 6px 22px 6px 12px;
                border-radius: 4px;
            }
            QMenu::item:selected {
                background-color: #ff0033;
                color: #ffffff;
                font-weight: bold;
            }
            QMenu::separator {
                height: 1px;
                background-color: #242c3d;
                margin: 4px 2px;
            }
        """)

        # Submenu: Playback Speed
        cur_speed_text = self.speed_btn.text()
        speed_menu = menu.addMenu("Playback Speed ({})".format(cur_speed_text))
        speed_menu.setStyleSheet(menu.styleSheet())
        for rate in self.playback_rates:
            tag = "{}x (Normal)".format(rate) if rate == 1.0 else "{}x".format(rate)
            if abs(self.current_playback_rate - rate) < 0.01:
                tag = "✓ " + tag
            act = speed_menu.addAction(tag)
            act.triggered.connect(lambda ch=False, r=rate: self.set_playback_rate(r))

        # Submenu: Target FPS
        fps_val = int(round(self.fps or 24.0))
        fps_menu = menu.addMenu("Target FPS ({}fps)".format(fps_val))
        fps_menu.setStyleSheet(menu.styleSheet())
        for f in [12, 24, 30, 60]:
            tag = "{} fps".format(f)
            if fps_val == f:
                tag = "✓ " + tag
            act = fps_menu.addAction(tag)
            act.triggered.connect(lambda ch=False, target=f: self.set_target_fps(target))

        menu.addSeparator()

        # Seamless Loop Action
        loop_act = menu.addAction("✓ Seamless Loop" if self.is_looping else "Seamless Loop")
        loop_act.triggered.connect(self.toggle_loop)

        # Maya Timeline Sync & Frame Offset
        if cmds:
            sync_act = menu.addAction("✓ Sync Maya Timeline" if self.sync_timeline else "Sync Maya Timeline")
            sync_act.triggered.connect(self.toggle_timeline_sync)

            offset_act = menu.addAction("Maya Frame Offset ({}f)...".format(self.timeline_offset_frames))
            offset_act.triggered.connect(self.prompt_timeline_offset)

        menu.addSeparator()

        # Cache HD Video
        cache_act = menu.addAction("Download HD to Local Cache")
        cache_act.triggered.connect(self.download_hd_offline)

        # Open in AnimationReference.org
        web_act = menu.addAction("Open on AnimationReference.org")
        web_act.triggered.connect(self.open_web_clip)

        # Pop up positioned above the settings button
        menu.exec_(self.settings_btn.mapToGlobal(QtCore.QPoint(0, -menu.sizeHint().height())))

    def prompt_timeline_offset(self):
        val, ok = QtWidgets.QInputDialog.getInt(
            self,
            "Maya Timeline Offset",
            "Enter frame offset to align reference video with Maya timeline (frames):",
            self.timeline_offset_frames,
            -100000, 100000, 1
        )
        if ok:
            self.timeline_offset_frames = val
            if self.sync_timeline:
                self._on_maya_time_changed()

    def download_hd_offline(self):
        if not self.current_video:
            return
        def _dl():
            try:
                animref_api.download_video_file(self.current_video)
            except Exception:
                pass
        t = threading.Thread(target=_dl)
        t.daemon = True
        t.start()

    def open_web_clip(self):
        if not self.current_video:
            return
        slug = self.current_video.get("slug") or self.current_video.get("id") or ""
        url = "https://animationreference.org/reference/{}".format(slug) if slug else "https://animationreference.org"
        webbrowser.open(url)

    def toggle_theater_mode(self):
        win = self.window()
        if hasattr(win, "toggle_theater_mode"):
            win.toggle_theater_mode()

    def get_current_ref_frame(self):
        pos_ms = self.player.position() if (self.player and self.player.position() > 0) else self.slider.value()
        fps = self.fps or 24.0
        return max(1, int(round((pos_ms / 1000.0) * fps)) + 1)

    def set_ab_in(self):
        pos_ms = self.player.position() if self.player else self.slider.value()
        self.ab_in_ms = max(0, int(pos_ms))
        self.ab_in_frame = self.get_current_ref_frame()
        if self.ab_out_ms is not None and self.ab_out_ms <= self.ab_in_ms:
            self.ab_out_ms = None
            self.ab_out_frame = None
        self._update_ab_ui()

    def set_ab_out(self):
        pos_ms = self.player.position() if self.player else self.slider.value()
        if self.ab_in_ms is None:
            self.ab_in_ms = 0
            self.ab_in_frame = 1
        self.ab_out_ms = max(self.ab_in_ms + 40, int(pos_ms))
        self.ab_out_frame = max(self.ab_in_frame + 1, self.get_current_ref_frame())
        self._update_ab_ui()

    def clear_ab_loop(self):
        self.ab_in_ms = None
        self.ab_out_ms = None
        self.ab_in_frame = None
        self.ab_out_frame = None
        if hasattr(animref_importer, "restore_maya_timeline_range"):
            animref_importer.restore_maya_timeline_range()
        self._update_ab_ui()

    def _update_ab_ui(self):
        has_ab = (self.ab_in_ms is not None or self.ab_out_ms is not None)
        if hasattr(self, "set_in_btn"):
            self.set_in_btn.setText("[ In: {}f".format(self.ab_in_frame) if self.ab_in_frame is not None else "[ In")
            self.set_in_btn.setProperty("active", "true" if self.ab_in_frame is not None else "false")
            self.set_in_btn.style().unpolish(self.set_in_btn)
            self.set_in_btn.style().polish(self.set_in_btn)
        if hasattr(self, "set_out_btn"):
            self.set_out_btn.setText("Out: {}f ]".format(self.ab_out_frame) if self.ab_out_frame is not None else "Out ]")
            self.set_out_btn.setProperty("active", "true" if self.ab_out_frame is not None else "false")
            self.set_out_btn.style().unpolish(self.set_out_btn)
            self.set_out_btn.style().polish(self.set_out_btn)
        if hasattr(self, "clear_ab_btn"):
            self.clear_ab_btn.setVisible(has_ab)

    def sync_ab_to_maya_timeline(self):
        fps = self.fps or 24.0
        in_f = self.ab_in_frame if self.ab_in_frame is not None else 1
        if self.ab_out_frame is not None:
            out_f = self.ab_out_frame
        else:
            dur_s = (self.duration_ms / 1000.0) if self.duration_ms > 0 else 5.0
            out_f = max(in_f + 1, int(round(dur_s * fps)))
        try:
            animref_importer.sync_ab_loop_to_maya(in_f, out_f, timeline_offset=0)
        except Exception as err:
            if cmds:
                cmds.warning("AnimRef A-B Sync: " + str(err))

    def magic_align_current_frame(self):
        ref_frame = self.get_current_ref_frame()
        if cmds and hasattr(cmds, "currentTime") and hasattr(cmds, "playbackOptions"):
            try:
                cur_maya = int(round(float(cmds.currentTime(query=True))))
                min_maya = int(round(float(cmds.playbackOptions(query=True, minTime=True))))
                self.timeline_offset_frames = (ref_frame - 1) - (cur_maya - min_maya)
            except Exception:
                pass
        win = self.window()
        if hasattr(win, "align_active_scene_plane_to_ref_frame"):
            win.align_active_scene_plane_to_ref_frame(ref_frame)
        elif hasattr(animref_importer, "list_scene_animref_planes"):
            planes = animref_importer.list_scene_animref_planes()
            if planes:
                animref_importer.sync_plane_to_current_frame(planes[0]["node"], ref_frame)

    def drop_pose_bookmark(self, preset="Key Pose"):
        ref_frame = self.get_current_ref_frame()
        try:
            animref_importer.create_pose_bookmark(label=preset, preset=preset, ref_frame=ref_frame)
        except Exception as err:
            if cmds:
                cmds.warning("AnimRef Pose Bookmark: " + str(err))

    def keyPressEvent(self, event):
        key = event.key()
        if key == QtCore.Qt.Key_Space:
            self.toggle_play()
            event.accept()
        elif key == QtCore.Qt.Key_Left:
            self.step_frame(-1)
            event.accept()
        elif key == QtCore.Qt.Key_Right:
            self.step_frame(1)
            event.accept()
        elif key == QtCore.Qt.Key_M:
            self.toggle_mute()
            event.accept()
        elif key == QtCore.Qt.Key_L:
            self.toggle_loop()
            event.accept()
        elif key == QtCore.Qt.Key_I:
            self.set_ab_in()
            event.accept()
        elif key == QtCore.Qt.Key_O:
            self.set_ab_out()
            event.accept()
        elif key == QtCore.Qt.Key_B:
            self.drop_pose_bookmark("Key Pose")
            event.accept()
        elif key == QtCore.Qt.Key_T:
            self.toggle_theater_mode()
            event.accept()
        else:
            super(VideoPlayerWidget, self).keyPressEvent(event)

    def open_popout(self):
        if not self.current_video:
            return
        FloatingReferencePlayer.open_window(self.current_video, get_maya_main_window())

    def _on_slider_pressed(self):
        self.is_scrubbing = True

    def _on_slider_moved(self, value):
        if self.player:
            self.player.setPosition(value)
            self._update_time_display(value, self.duration_ms)
        self._sync_maya_to_ms(value)

    def _on_slider_released(self):
        if self.player:
            val = self.slider.value()
            self.player.setPosition(val)
            self._sync_maya_to_ms(val)
        self.is_scrubbing = False

    def closeEvent(self, event):
        self._stop_time_job()
        super(VideoPlayerWidget, self).closeEvent(event)

    def _on_position_changed(self, pos_ms):
        if self.ab_out_ms is not None and pos_ms >= self.ab_out_ms and not self.is_scrubbing:
            loop_start = self.ab_in_ms if self.ab_in_ms is not None else 0
            if self.player:
                self.player.setPosition(loop_start)
            self.slider.setValue(loop_start)
            self._update_time_display(loop_start, self.duration_ms)
            return
        if not self.is_scrubbing:
            self.slider.setValue(pos_ms)
            self._update_time_display(pos_ms, self.duration_ms)

    def _on_duration_changed(self, dur_ms):
        self.duration_ms = dur_ms
        self.slider.setRange(0, max(1, dur_ms))
        self._update_time_display(self.player.position() if self.player else 0, dur_ms)

    def _on_state_changed(self, state):
        is_playing = False
        if hasattr(self.player, "playbackState"):
            is_playing = (state == QMediaPlayer.PlaybackState.PlayingState)
        else:
            is_playing = (state == QMediaPlayer.PlayingState)
        self.play_btn.setText("❚❚" if is_playing else "▶")
        self.play_btn.setToolTip("Pause (Spacebar)" if is_playing else "Play (Spacebar)")

    def _update_time_display(self, cur_ms, total_ms):
        cur_sec = cur_ms // 1000
        tot_sec = total_ms // 1000
        cur_m, cur_s = divmod(cur_sec, 60)
        tot_m, tot_s = divmod(tot_sec, 60)
        self.time_label.setText("{:02d}:{:02d} / {:02d}:{:02d}".format(cur_m, cur_s, tot_m, tot_s))
        frame = int((cur_ms / 1000.0) * (self.fps or 24.0))
        self.frame_label.setText("• {}f ({}fps)".format(frame, int(round(self.fps or 24.0))))


class FloatingReferencePlayer(QtWidgets.QDialog):
    _instances = []

    def __init__(self, video_data, parent=None):
        super(FloatingReferencePlayer, self).__init__(parent)
        title = video_data.get("title") or "Reference Viewer"
        self.setWindowTitle("AnimRef Studio - " + title)
        self.resize(640, 420)
        self.setMinimumSize(360, 260)
        self.setStyleSheet(DARK_STYLESHEET)
        self.setWindowFlags(
            QtCore.Qt.Window |
            QtCore.Qt.WindowTitleHint |
            QtCore.Qt.WindowSystemMenuHint |
            QtCore.Qt.WindowMinimizeButtonHint |
            QtCore.Qt.WindowMaximizeButtonHint |
            QtCore.Qt.WindowCloseButtonHint
        )

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(6)

        self.player_widget = VideoPlayerWidget(self)
        self.player_widget.popout_btn.setVisible(False)
        self.player_widget.theater_btn.setVisible(False)
        layout.addWidget(self.player_widget)

        bottom_bar = QtWidgets.QHBoxLayout()
        title_lbl = QtWidgets.QLabel(title)
        title_lbl.setStyleSheet("font-weight: bold; color: #ffffff;")
        bottom_bar.addWidget(title_lbl)
        bottom_bar.addStretch()

        import_btn = QtWidgets.QPushButton("Import to Maya Scene")
        import_btn.setObjectName("PrimaryBtn")
        import_btn.clicked.connect(lambda: self.do_import(video_data))
        bottom_bar.addWidget(import_btn)

        layout.addLayout(bottom_bar)
        self.player_widget.load_video(video_data)

    def do_import(self, video_data):
        if _window_instance:
            _window_instance.quick_import_video(video_data)

    def closeEvent(self, event):
        self.player_widget.stop()
        if self in FloatingReferencePlayer._instances:
            FloatingReferencePlayer._instances.remove(self)
        super(FloatingReferencePlayer, self).closeEvent(event)

    @classmethod
    def open_window(cls, video_data, parent=None):
        win = cls(video_data, parent)
        cls._instances.append(win)
        win.show()
        win.raise_()
        win.activateWindow()
        return win


class HoverOverlayFrame(QtWidgets.QFrame):
    """
    Transparent event-forwarding overlay for PinterestClipCardWidget.
    Ensures clicking ANYWHERE on the card (or double-clicking) dispatches
    to the card's clicked / double_clicked signals, while letting child action
    buttons (+ Maya, ⋯ menu, 3D) receive their own clicks.
    """
    def __init__(self, card, parent=None):
        super(HoverOverlayFrame, self).__init__(parent)
        self.card = card
        self.setCursor(QtCore.Qt.PointingHandCursor)

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.card.clicked.emit(self.card.video_data)
            event.accept()
            return
        super(HoverOverlayFrame, self).mousePressEvent(event)

    def mouseDoubleClickEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.card.double_clicked.emit(self.card.video_data)
            event.accept()
            return
        super(HoverOverlayFrame, self).mouseDoubleClickEvent(event)


class _CardHoverPreviewEngine(QtCore.QObject):
    """Single shared muted QMediaPlayer so hovering a card plays video inline without overhead."""
    _instance = None

    @classmethod
    def get(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        super(_CardHoverPreviewEngine, self).__init__()
        self._active_card = None
        self._pending_card = None
        self._timer = QtCore.QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.timeout.connect(self._begin_preview)
        self._player = None
        self._audio = None
        self._video_widget = None

    def _ensure_player(self):
        if self._player is not None or QT_MULTIMEDIA_AVAILABLE <= 0 or QVideoWidget is None:
            return
        try:
            self._player = QMediaPlayer(self)
            if QT_MULTIMEDIA_AVAILABLE == 6 and QAudioOutput is not None:
                self._audio = QAudioOutput(self)
                self._audio.setMuted(True)
                self._audio.setVolume(0.0)
                self._player.setAudioOutput(self._audio)
            elif hasattr(self._player, "setMuted"):
                self._player.setMuted(True)
            if hasattr(self._player, "setLoops"):
                self._player.setLoops(QMediaPlayer.Infinite)
            self._video_widget = QVideoWidget()
            self._video_widget.setAttribute(QtCore.Qt.WA_TransparentForMouseEvents, True)
            self._video_widget.setStyleSheet("background-color: #000000; border-radius: 11px;")
            self._player.setVideoOutput(self._video_widget)
        except Exception:
            self._player = None
            self._video_widget = None

    def request_play(self, card):
        self._pending_card = card
        self._timer.start(220)

    def stop_for_card(self, card):
        if self._pending_card is card:
            self._pending_card = None
            self._timer.stop()
        if self._active_card is card:
            self.stop_all()

    def stop_all(self):
        self._pending_card = None
        self._timer.stop()
        self._active_card = None
        if self._player is not None:
            try:
                self._player.stop()
            except Exception:
                pass
        if self._video_widget is not None:
            try:
                self._video_widget.hide()
                self._video_widget.setParent(None)
            except Exception:
                pass

    def _begin_preview(self):
        card = self._pending_card
        if card is None:
            return
        try:
            if not card.isVisible():
                return
            local_pos = card.mapFromGlobal(QtGui.QCursor.pos())
            if not card.rect().contains(local_pos):
                return
        except RuntimeError:
            return

        vdata = getattr(card, "video_data", None) or {}
        if str(vdata.get("mediaType") or "").lower() in ("image", "model3d"):
            return

        media_source, is_local = animref_api.get_playable_media_source(vdata)
        if not media_source:
            return
        lower_u = str(media_source).lower()
        if any(lower_u.endswith(ext) for ext in (".png", ".jpg", ".jpeg", ".webp", ".gif")):
            return

        self._ensure_player()
        if self._player is None or self._video_widget is None:
            return

        try:
            self._player.stop()
            self._video_widget.setParent(card)
            self._video_widget.setGeometry(0, 0, card.width(), card.height())
            if hasattr(self._video_widget, "setAspectRatioMode"):
                try:
                    self._video_widget.setAspectRatioMode(QtCore.Qt.KeepAspectRatioByExpanding)
                except Exception:
                    pass
            self._video_widget.show()
            if hasattr(card, "hover_overlay") and card.hover_overlay:
                card.hover_overlay.raise_()
            qurl = QtCore.QUrl.fromLocalFile(media_source) if is_local else QtCore.QUrl(media_source)
            if QT_MULTIMEDIA_AVAILABLE == 6:
                self._player.setSource(qurl)
            elif QMediaContent is not None:
                self._player.setMedia(QMediaContent(qurl))
            self._player.play()
            self._active_card = card
        except Exception:
            self.stop_all()


class PinterestClipCardWidget(QtWidgets.QFrame):
    """
    Pure Rounded Image Card matching AnimationReference.org/moodboard (`ReferenceMasonry` in screenshot):
    - Edge-to-edge rounded image (`border-radius: 11px`) with NO ugly borders or text boxes underneath!
    - Varied masonry card heights (scaled proportionally for nimble mobile/compact companion windows)
    - On hover: sleek floating '+ Maya' black pill button & bottom title gradient appear over the image!
    """
    clicked = QtCore.Signal(dict)
    double_clicked = QtCore.Signal(dict)
    import_requested = QtCore.Signal(dict)
    preview_requested = QtCore.Signal(dict)

    ASPECT_RATIOS = [0.82, 0.68, 0.95, 0.72, 0.88]

    def __init__(self, video_data, parent=None, index=0, card_w=170):
        super(PinterestClipCardWidget, self).__init__(parent)
        self.setObjectName("PinterestClipCard")
        self.video_data = video_data
        self.setCursor(QtCore.Qt.PointingHandCursor)

        self.card_w = max(110, int(card_w))
        ratio = self.ASPECT_RATIOS[index % len(self.ASPECT_RATIOS)]
        self.card_h = max(80, int(self.card_w * ratio))
        self.setFixedSize(self.card_w, self.card_h)
        self.setStyleSheet("QFrame#PinterestClipCard { background: transparent; border: none; }")

        # Base Image Label filling 100% of the card with smooth 11px rounded corners
        self.thumb_label = QtWidgets.QLabel(self)
        self.thumb_label.setGeometry(0, 0, self.card_w, self.card_h)
        self.thumb_label.setAlignment(QtCore.Qt.AlignCenter)
        self.thumb_label.setStyleSheet("background: transparent; border: none;")
        self.thumb_label.setAttribute(QtCore.Qt.WA_TransparentForMouseEvents, True)

        self._source_pixmap = None
        cached_thumb = animref_api.get_thumbnail(video_data)
        if cached_thumb and os.path.isfile(cached_thumb):
            self._source_pixmap = QtGui.QPixmap(cached_thumb)
            self.set_pixmap(self._source_pixmap)
        else:
            self.set_fallback_preview()

        # Detect Sketchfab / ArtStation 3D Model
        vid_id_str = str(video_data.get("id") or "").lower()
        media_type = str(video_data.get("mediaType") or video_data.get("source") or "").lower()
        tags_lower = " ".join([str(t).lower() for t in (video_data.get("tags") or [])])
        is_sketchfab = "sf_" in vid_id_str or "sketchfab" in vid_id_str or media_type in ("model3d", "sketchfab") or "sketchfab" in tags_lower
        is_artstation = "as_" in vid_id_str or "artstation" in vid_id_str or media_type == "artstation" or "artstation" in tags_lower

        # Hover Overlay Container (hidden until mouse enters card, just like MoodboardDashboard.tsx!)
        self.hover_overlay = HoverOverlayFrame(self, self)
        self.hover_overlay.setGeometry(0, 0, self.card_w, self.card_h)
        self.hover_overlay.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(0, 0, 0, 55),
                    stop:0.5 rgba(0, 0, 0, 0),
                    stop:1 rgba(0, 0, 0, 175));
                border-radius: 11px;
            }
        """)
        self.hover_overlay.setVisible(False)

        ov_layout = QtWidgets.QVBoxLayout(self.hover_overlay)
        ov_layout.setContentsMargins(6, 6, 6, 6)
        ov_layout.setSpacing(3)

        # Top Action Row inside overlay: [ 3D View ] ... [ ⋯ Menu ] [ + Maya ]
        top_row = QtWidgets.QHBoxLayout()
        top_row.setSpacing(3)

        source_url = video_data.get("sourceUrl") or video_data.get("embedUrl")
        if not source_url and is_sketchfab:
            source_url = "https://sketchfab.com/3d-models/{}".format(vid_id_str.replace("sf_", ""))
        elif not source_url and is_artstation:
            source_url = "https://www.artstation.com/artwork/{}".format(vid_id_str.replace("as_", ""))

        if source_url and (is_sketchfab or is_artstation):
            view_3d_btn = QtWidgets.QPushButton("3D" if is_sketchfab else "Art")
            view_3d_btn.setCursor(QtCore.Qt.PointingHandCursor)
            view_3d_btn.setStyleSheet("""
                QPushButton {
                    background-color: rgba(255, 255, 255, 235);
                    color: #f4f4f5;
                    border: none;
                    border-radius: 9px;
                    padding: 2px 6px;
                    font-size: 9px;
                    font-weight: 700;
                }
                QPushButton:hover {
                    background-color: #111119;
                }
            """)
            view_3d_btn.clicked.connect(lambda checked=False, u=source_url: webbrowser.open(u))
            top_row.addWidget(view_3d_btn)

        top_row.addStretch()

        # Options Dropdown Button (Preview in Player / Open on Web / Dock to Maya)
        self.menu_btn = QtWidgets.QPushButton("⋯")
        self.menu_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.menu_btn.setToolTip("Options: Preview reference, open on site, dock to Maya")
        self.menu_btn.setStyleSheet("""
            QPushButton {
                background-color: rgba(255, 255, 255, 220);
                color: #f4f4f5;
                border: none;
                border-radius: 11px;
                width: 22px;
                height: 22px;
                font-size: 13px;
                font-weight: 800;
                padding: 0px;
            }
            QPushButton:hover {
                background-color: #111119;
                color: #000000;
            }
        """)
        self.menu_btn.clicked.connect(self._show_card_menu)
        top_row.addWidget(self.menu_btn)

        self.quick_import_btn = QtWidgets.QPushButton("+ Maya")
        self.quick_import_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.quick_import_btn.setToolTip("Import reference directly into Maya Viewport")
        self.quick_import_btn.setStyleSheet("""
            QPushButton {
                background-color: #7c3aed;
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 60);
                border-radius: 11px;
                padding: 3px 8px;
                font-size: 9px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #111119;
                color: #f4f4f5;
            }
        """)
        self.quick_import_btn.clicked.connect(self._on_quick_import_clicked)
        top_row.addWidget(self.quick_import_btn)
        ov_layout.addLayout(top_row)

        ov_layout.addStretch()

        # Bottom row inside overlay: Title + Fullscreen Studio button
        bottom_row = QtWidgets.QHBoxLayout()
        bottom_row.setContentsMargins(0, 0, 0, 0)
        bottom_row.setSpacing(4)

        title_text = video_data.get("title") or "Reference"
        self.title_label = QtWidgets.QLabel(title_text)
        self.title_label.setWordWrap(True)
        self.title_label.setStyleSheet("color: #ffffff; font-size: 10px; font-weight: 600; background: transparent;")
        self.title_label.setAttribute(QtCore.Qt.WA_TransparentForMouseEvents, True)
        bottom_row.addWidget(self.title_label, stretch=1)

        self.fullscreen_btn = QtWidgets.QPushButton("⛶")
        self.fullscreen_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.fullscreen_btn.setFixedSize(24, 24)
        self.fullscreen_btn.setToolTip("Open Studio Video Player")
        self.fullscreen_btn.setStyleSheet("""
            QPushButton {
                background-color: rgba(12, 10, 9, 210);
                color: #ffffff;
                border: 1px solid rgba(255, 255, 255, 80);
                border-radius: 12px;
                font-size: 12px;
                font-weight: 700;
                padding: 0px;
            }
            QPushButton:hover {
                background-color: #7c3aed;
                border-color: #a78bfa;
                color: #ffffff;
            }
        """)
        self.fullscreen_btn.clicked.connect(lambda checked=False: self.preview_requested.emit(self.video_data))
        bottom_row.addWidget(self.fullscreen_btn, alignment=QtCore.Qt.AlignBottom)

        ov_layout.addLayout(bottom_row)

    def _on_quick_import_clicked(self):
        try:
            self.quick_import_btn.setText("Streaming...")
            self.quick_import_btn.setEnabled(False)
        except Exception:
            pass
        self.import_requested.emit(self.video_data)

    def resizeEvent(self, event):
        super(PinterestClipCardWidget, self).resizeEvent(event)
        w = self.width()
        h = self.height()
        self.thumb_label.setGeometry(0, 0, w, h)
        self.hover_overlay.setGeometry(0, 0, w, h)

    def set_card_size(self, w, h):
        self.card_w = w
        self.card_h = h
        self.setFixedSize(w, h)
        self.thumb_label.setGeometry(0, 0, w, h)
        self.hover_overlay.setGeometry(0, 0, w, h)
        if self._source_pixmap and not self._source_pixmap.isNull():
            self.set_pixmap(self._source_pixmap)
        else:
            self.set_fallback_preview()

    def _show_card_menu(self):
        menu = QtWidgets.QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #161622;
                border: 1px solid #272736;
                border-radius: 10px;
                padding: 6px;
                color: #f5f5f4;
                font-size: 11px;
                font-weight: 600;
            }
            QMenu::item {
                padding: 7px 18px 7px 10px;
                border-radius: 6px;
            }
            QMenu::item:selected {
                background-color: #8b5cf6;
                color: #ffffff;
            }
            QMenu::separator {
                height: 1px;
                background-color: #232334;
                margin: 4px 2px;
            }
        """)

        # 1. Quick Put in Maya
        act_import = menu.addAction("➕  Put Reference in Maya Scene")
        act_import.triggered.connect(lambda: self.import_requested.emit(self.video_data))

        # 2. Preview in Studio Drawer / Player
        act_preview = menu.addAction("🎬  Preview in Maya Studio Drawer")
        act_preview.triggered.connect(lambda: self.preview_requested.emit(self.video_data))

        # 3. Open on animationreference.org
        vid_id = self.video_data.get("id")
        web_url = "https://animationreference.org/video/{}".format(vid_id) if vid_id else "https://animationreference.org"
        act_web = menu.addAction("🌐  Open on AnimationReference.org ↗")
        act_web.triggered.connect(lambda: webbrowser.open(web_url))

        # 4. Dock / Float Maya window
        menu.addSeparator()
        win = self.window()
        is_docked = getattr(win, "is_docked", False)
        dock_label = "🗗  Float Window" if is_docked else "📌  Dock to Maya Workspace"
        act_dock = menu.addAction(dock_label)
        if hasattr(win, "toggle_docking"):
            act_dock.triggered.connect(win.toggle_docking)

        # Show menu positioned right below the menu button
        if hasattr(self, "menu_btn"):
            menu.exec_(self.menu_btn.mapToGlobal(QtCore.QPoint(0, self.menu_btn.height() + 4)))
        else:
            menu.exec_(QtGui.QCursor.pos())

    def enterEvent(self, event):
        self.hover_overlay.setVisible(True)
        self.hover_overlay.raise_()
        try:
            _CardHoverPreviewEngine.get().request_play(self)
        except Exception:
            pass
        super(PinterestClipCardWidget, self).enterEvent(event)

    def leaveEvent(self, event):
        try:
            local_pos = self.mapFromGlobal(QtGui.QCursor.pos())
            if self.rect().contains(local_pos):
                return
        except Exception:
            pass
        self.hover_overlay.setVisible(False)
        try:
            _CardHoverPreviewEngine.get().stop_for_card(self)
        except Exception:
            pass
        super(PinterestClipCardWidget, self).leaveEvent(event)

    def hideEvent(self, event):
        try:
            _CardHoverPreviewEngine.get().stop_for_card(self)
        except Exception:
            pass
        super(PinterestClipCardWidget, self).hideEvent(event)

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.clicked.emit(self.video_data)
            event.accept()
            return
        super(PinterestClipCardWidget, self).mousePressEvent(event)

    def mouseDoubleClickEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.double_clicked.emit(self.video_data)
            event.accept()
            return
        super(PinterestClipCardWidget, self).mouseDoubleClickEvent(event)

    def set_pixmap(self, pixmap):
        self._source_pixmap = pixmap
        vid_key = self.video_data.get("id") if isinstance(self.video_data, dict) else None
        self.thumb_label.setPixmap(create_rounded_pixmap(pixmap, self.card_w, self.card_h, radius=11, cache_key=vid_key))

    def set_fallback_preview(self):
        title = self.video_data.get("title") or "Reference"
        self.thumb_label.setPixmap(create_fallback_pixmap(self.card_w, self.card_h, title, radius=11))


class PinterestBoardFolderCard(QtWidgets.QFrame):
    """
    Editorial 3-Image Mosaic Board Cover Card (`BoardCover` in MoodboardDashboard.tsx):
    1 tall image on left + 2 stacked images on right, clean board title & reference count below.
    Dynamically scaled to fit mobile and compact desktop layouts.
    """
    open_board_requested = QtCore.Signal(dict)
    import_all_requested = QtCore.Signal(dict)

    def __init__(self, board_data, parent=None, card_w=170):
        super(PinterestBoardFolderCard, self).__init__(parent)
        self.setObjectName("PinterestBoardCard")
        self.board_data = board_data
        self.card_w = max(110, int(card_w))
        self.card_h = int(self.card_w * 0.82)
        self.setCursor(QtCore.Qt.PointingHandCursor)
        self.setFixedSize(self.card_w, self.card_h)
        self.setStyleSheet("""
            QFrame#PinterestBoardCard {
                background-color: #111119;
                border: 1px solid #272736;
                border-radius: 12px;
            }
            QFrame#PinterestBoardCard:hover {
                border: 1px solid #8b5cf6;
            }
        """)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(5)

        items = board_data.get("items", [])
        item_count = board_data.get("itemCount") or len(items)

        # 3-Image Mosaic Cover (proportional height)
        self.cover_frame = QtWidgets.QFrame()
        cover_h = max(50, int(self.card_w * 0.52))
        self.cover_frame.setFixedHeight(cover_h)
        self.cover_frame.setStyleSheet("background-color: #161622; border-radius: 8px; border: none;")
        cover_layout = QtWidgets.QHBoxLayout(self.cover_frame)
        cover_layout.setContentsMargins(2, 2, 2, 2)
        cover_layout.setSpacing(2)

        self.preview_labels = []
        main_lbl = QtWidgets.QLabel()
        main_lbl.setScaledContents(True)
        main_lbl.setStyleSheet("border-radius: 6px; background-color: #161622;")
        cover_layout.addWidget(main_lbl, stretch=2)
        self.preview_labels.append(main_lbl)

        right_col = QtWidgets.QVBoxLayout()
        right_col.setContentsMargins(0, 0, 0, 0)
        right_col.setSpacing(2)
        for _ in range(2):
            sub_lbl = QtWidgets.QLabel()
            sub_lbl.setScaledContents(True)
            sub_lbl.setStyleSheet("border-radius: 4px; background-color: #161622;")
            right_col.addWidget(sub_lbl, stretch=1)
            self.preview_labels.append(sub_lbl)
        cover_layout.addLayout(right_col, stretch=1)
        layout.addWidget(self.cover_frame)

        # Clean Board Title + Count + Quick "Open" Pill
        footer_row = QtWidgets.QHBoxLayout()
        footer_row.setContentsMargins(2, 0, 2, 0)

        title_col = QtWidgets.QVBoxLayout()
        title_col.setSpacing(0)
        board_title = board_data.get("name") or "Untitled board"
        name_lbl = QtWidgets.QLabel(board_title)
        name_lbl.setStyleSheet("font-weight: 700; color: #f4f4f5; font-size: 11px; background: transparent;")
        title_col.addWidget(name_lbl)

        sub_lbl = QtWidgets.QLabel("{} refs".format(item_count))
        sub_lbl.setStyleSheet("color: #a1a1aa; font-size: 9px; background: transparent;")
        title_col.addWidget(sub_lbl)
        footer_row.addLayout(title_col, stretch=1)

        open_pill = QtWidgets.QPushButton("Open →")
        open_pill.setCursor(QtCore.Qt.PointingHandCursor)
        open_pill.setStyleSheet("""
            QPushButton {
                background-color: #7c3aed;
                color: #ffffff;
                border: none;
                border-radius: 9px;
                padding: 3px 7px;
                font-size: 9px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #8b5cf6;
            }
        """)
        open_pill.clicked.connect(lambda: self.open_board_requested.emit(self.board_data))
        footer_row.addWidget(open_pill)

        layout.addLayout(footer_row)
        self._populate_previews(items)

    def _populate_previews(self, items):
        main_w = int(self.card_w * 0.62)
        main_h = max(45, int(self.card_w * 0.50))
        sub_w = max(30, self.card_w - main_w - 8)
        sub_h = max(20, (main_h - 2) // 2)
        for idx, lbl in enumerate(self.preview_labels):
            w = main_w if idx == 0 else sub_w
            h = main_h if idx == 0 else sub_h
            if idx < len(items):
                item = items[idx]
                thumb = animref_api.get_thumbnail(item)
                if thumb and os.path.isfile(thumb):
                    lbl.setPixmap(create_rounded_pixmap(QtGui.QPixmap(thumb), w, h, radius=6))
                else:
                    lbl.setPixmap(create_fallback_pixmap(w, h, item.get("title") or "", radius=6))
            else:
                lbl.setPixmap(create_fallback_pixmap(w, h, "", radius=6))

    def refresh_cover_thumbnails(self):
        self._populate_previews(self.board_data.get("items", []))

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            self.open_board_requested.emit(self.board_data)
        super(PinterestBoardFolderCard, self).mousePressEvent(event)


class VideoCardWidget(QtWidgets.QFrame):
    clicked = QtCore.Signal(dict)
    double_clicked = QtCore.Signal(dict)

    def __init__(self, video_data, parent=None):
        super(VideoCardWidget, self).__init__(parent)
        self.video_data = video_data
        self.setCursor(QtCore.Qt.PointingHandCursor)
        self.setMinimumWidth(150)
        self.setMaximumWidth(220)
        self.setSizePolicy(QtWidgets.QSizePolicy.Preferred, QtWidgets.QSizePolicy.Fixed)
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
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(4)

        self.thumb_label = QtWidgets.QLabel()
        self.thumb_label.setFixedHeight(96)
        self.thumb_label.setScaledContents(True)
        self.thumb_label.setStyleSheet("background-color: #0a0d12; border-radius: 6px;")
        self.thumb_label.setAlignment(QtCore.Qt.AlignCenter)

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
        self.title_label.setFixedHeight(28)
        self.title_label.setToolTip(title_text)
        layout.addWidget(self.title_label)

        meta_layout = QtWidgets.QHBoxLayout()
        meta_layout.setContentsMargins(0, 0, 0, 0)
        meta_layout.setSpacing(4)

        duration = video_data.get("duration")
        self.dur_str = "{:.1f}s".format(duration) if duration else "Clip"
        dur_label = QtWidgets.QLabel(self.dur_str)
        dur_label.setStyleSheet("color: #00E5FF; font-size: 10px; font-weight: bold;")
        meta_layout.addWidget(dur_label)

        meta_layout.addStretch()

        creator = video_data.get("author_name") or video_data.get("uploader") or ""
        if creator:
            clean_creator = creator[:12] + ".." if len(creator) > 13 else creator
            creator_label = QtWidgets.QLabel(clean_creator)
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
        scaled = pixmap.scaled(180, 101, QtCore.Qt.KeepAspectRatioByExpanding, QtCore.Qt.SmoothTransformation)
        self.thumb_label.setPixmap(scaled)
        self.thumb_label.setText("")

    def set_fallback_preview(self):
        title = self.video_data.get("title") or "Animation Reference"
        dur = self.video_data.get("duration")
        dur_text = "{:.1f}s".format(dur) if dur else ""
        self.thumb_label.setPixmap(create_fallback_pixmap(180, 101, title, dur_text))
        self.thumb_label.setText("")


class DualCompareWidget(QtWidgets.QFrame):
    """
    Synchronized Side-by-Side Comparison Player for Reference Clip (Left) vs Maya Playblast (Right).
    Clean studio-grade white UI with high-contrast playback controls and drift-locked sync.
    """
    ref_cached_ready = QtCore.Signal(str, str)

    def __init__(self, parent=None):
        super(DualCompareWidget, self).__init__(parent)
        self.setStyleSheet("""
            DualCompareWidget {
                background-color: #111119;
                border: 1px solid #272736;
                border-radius: 14px;
            }
        """)
        self.fps = 24.0
        self.duration_ms = 1000
        self.ref_duration_ms = 0
        self.pb_duration_ms = 0
        self.is_playing = False
        self.playblast_offset_frames = 0
        self.ref_path = None
        self.pb_path = None
        self._active_ref_id = None
        self._is_scrubbing = False
        self.ref_cached_ready.connect(self._on_ref_cached_ready, QtCore.Qt.QueuedConnection)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)

        self.dc_header_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.dc_header_layout.setContentsMargins(2, 0, 2, 0)
        self.dc_header_layout.setSpacing(6)

        hdr_text_box = QtWidgets.QVBoxLayout()
        hdr_text_box.setSpacing(1)
        self.dc_hdr_lbl = QtWidgets.QLabel("Synchronized Compare")
        self.dc_hdr_lbl.setWordWrap(True)
        self.dc_hdr_lbl.setStyleSheet("font-size: 13px; font-weight: 800; color: #f4f4f5; border: none;")
        hdr_text_box.addWidget(self.dc_hdr_lbl)

        self.dc_hdr_sub = QtWidgets.QLabel("Compare Maya animation timing against reference")
        self.dc_hdr_sub.setWordWrap(True)
        self.dc_hdr_sub.setStyleSheet("font-size: 11px; color: #a1a1aa; font-weight: 500; border: none;")
        hdr_text_box.addWidget(self.dc_hdr_sub)
        self.dc_header_layout.addLayout(hdr_text_box, stretch=1)

        hdr_btns = QtWidgets.QHBoxLayout()
        hdr_btns.setSpacing(6)
        self.load_ref_file_btn = QtWidgets.QPushButton("📂 Load Ref...")
        self.load_ref_file_btn.setToolTip("Select any local reference MP4/MOV file to compare")
        self.load_ref_file_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.load_ref_file_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; border-radius: 12px; padding: 5px 10px; font-size: 11px; font-weight: 700; }"
            "QPushButton:hover { background-color: #232334; border-color: #4c4c66; }"
        )
        self.load_ref_file_btn.clicked.connect(self.browse_reference_file)
        hdr_btns.addWidget(self.load_ref_file_btn)

        self.load_pb_file_btn = QtWidgets.QPushButton("📂 Load MP4...")
        self.load_pb_file_btn.setToolTip("Select any recorded Maya playblast MP4/MOV file on disk to compare")
        self.load_pb_file_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.load_pb_file_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; border-radius: 12px; padding: 5px 10px; font-size: 11px; font-weight: 700; }"
            "QPushButton:hover { background-color: #232334; border-color: #4c4c66; }"
        )
        self.load_pb_file_btn.clicked.connect(self.browse_playblast_file)
        hdr_btns.addWidget(self.load_pb_file_btn)
        self.dc_header_layout.addLayout(hdr_btns)
        layout.addLayout(self.dc_header_layout)

        # Responsive Screens Container (Side-by-side on wide screens, stacked on compact screens)
        self.screens_container = QtWidgets.QWidget()
        self.screens_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight, self.screens_container)
        self.screens_layout.setContentsMargins(0, 0, 0, 0)
        self.screens_layout.setSpacing(12)

        # Left: Reference
        self.left_box_widget = QtWidgets.QWidget()
        left_box = QtWidgets.QVBoxLayout(self.left_box_widget)
        left_box.setContentsMargins(0, 0, 0, 0)
        left_box.setSpacing(6)
        ref_hdr = QtWidgets.QHBoxLayout()
        self.ref_title_lbl = QtWidgets.QLabel("Reference Clip")
        self.ref_title_lbl.setStyleSheet("color: #f4f4f5; font-size: 12px; font-weight: 800; border: none;")
        ref_hdr.addWidget(self.ref_title_lbl)
        ref_hdr.addStretch()
        left_box.addLayout(ref_hdr)

        self.ref_stack = QtWidgets.QStackedWidget()
        self.ref_stack.setMinimumHeight(140)
        self.ref_stack.setStyleSheet("background-color: #050508; border: 1px solid #272736; border-radius: 10px;")
        self.ref_placeholder = QtWidgets.QLabel("Select a reference clip in Explore/Boards or click 'Load Ref...'")
        self.ref_placeholder.setWordWrap(True)
        self.ref_placeholder.setAlignment(QtCore.Qt.AlignCenter)
        self.ref_placeholder.setStyleSheet("color: #71717a; font-size: 11px; font-weight: 600; background-color: #161622; border-radius: 10px; padding: 12px;")
        self.ref_stack.addWidget(self.ref_placeholder)

        if QT_MULTIMEDIA_AVAILABLE > 0 and QVideoWidget is not None:
            self.ref_video_widget = QVideoWidget()
            self.ref_stack.addWidget(self.ref_video_widget)
            self.ref_player = QMediaPlayer(self)
            if QT_MULTIMEDIA_AVAILABLE == 6 and QAudioOutput is not None:
                self.ref_audio = QAudioOutput(self)
                self.ref_audio.setVolume(0.0)
                self.ref_player.setAudioOutput(self.ref_audio)
            else:
                self.ref_audio = None
            self.ref_player.setVideoOutput(self.ref_video_widget)
            if hasattr(self.ref_player, "setLoops"):
                self.ref_player.setLoops(QMediaPlayer.Infinite)
            self.ref_player.positionChanged.connect(self._on_ref_pos_changed)
            self.ref_player.durationChanged.connect(self._on_ref_dur_changed)
            if hasattr(self.ref_player, "mediaStatusChanged"):
                self.ref_player.mediaStatusChanged.connect(lambda s: self._on_media_status(self.ref_player, s))
            if hasattr(self.ref_player, "errorOccurred"):
                self.ref_player.errorOccurred.connect(lambda err, msg="": self._on_player_error(True, msg))
            elif hasattr(self.ref_player, "error"):
                self.ref_player.error.connect(lambda err: self._on_player_error(True, str(err)))
        else:
            self.ref_video_widget = None
            self.ref_player = None
            self.ref_audio = None

        left_box.addWidget(self.ref_stack, stretch=1)
        self.screens_layout.addWidget(self.left_box_widget, stretch=1)

        # Right: Playblast
        self.right_box_widget = QtWidgets.QWidget()
        right_box = QtWidgets.QVBoxLayout(self.right_box_widget)
        right_box.setContentsMargins(0, 0, 0, 0)
        right_box.setSpacing(6)
        pb_hdr = QtWidgets.QHBoxLayout()
        self.pb_title_lbl = QtWidgets.QLabel("Maya Playblast")
        self.pb_title_lbl.setStyleSheet("color: #059669; font-size: 12px; font-weight: 800; border: none;")
        pb_hdr.addWidget(self.pb_title_lbl)
        pb_hdr.addStretch()
        right_box.addLayout(pb_hdr)

        self.pb_stack = QtWidgets.QStackedWidget()
        self.pb_stack.setMinimumHeight(140)
        self.pb_stack.setStyleSheet("background-color: #050508; border: 1px solid #272736; border-radius: 10px;")
        self.pb_placeholder = QtWidgets.QLabel("Record a playblast above or click 'Load MP4...'")
        self.pb_placeholder.setWordWrap(True)
        self.pb_placeholder.setAlignment(QtCore.Qt.AlignCenter)
        self.pb_placeholder.setStyleSheet("color: #71717a; font-size: 11px; font-weight: 600; background-color: #161622; border-radius: 10px; padding: 12px;")
        self.pb_stack.addWidget(self.pb_placeholder)

        if QT_MULTIMEDIA_AVAILABLE > 0 and QVideoWidget is not None:
            self.pb_video_widget = QVideoWidget()
            self.pb_stack.addWidget(self.pb_video_widget)
            self.pb_player = QMediaPlayer(self)
            if QT_MULTIMEDIA_AVAILABLE == 6 and QAudioOutput is not None:
                self.pb_audio = QAudioOutput(self)
                self.pb_audio.setVolume(0.0)
                self.pb_player.setAudioOutput(self.pb_audio)
            else:
                self.pb_audio = None
            self.pb_player.setVideoOutput(self.pb_video_widget)
            if hasattr(self.pb_player, "setLoops"):
                self.pb_player.setLoops(QMediaPlayer.Infinite)
            self.pb_player.positionChanged.connect(self._on_pb_pos_changed)
            self.pb_player.durationChanged.connect(self._on_pb_dur_changed)
            if hasattr(self.pb_player, "mediaStatusChanged"):
                self.pb_player.mediaStatusChanged.connect(lambda s: self._on_media_status(self.pb_player, s))
            if hasattr(self.pb_player, "errorOccurred"):
                self.pb_player.errorOccurred.connect(lambda err, msg="": self._on_player_error(False, msg))
            elif hasattr(self.pb_player, "error"):
                self.pb_player.error.connect(lambda err: self._on_player_error(False, str(err)))
        else:
            self.pb_video_widget = None
            self.pb_player = None
            self.pb_audio = None

        right_box.addWidget(self.pb_stack, stretch=1)
        self.screens_layout.addWidget(self.right_box_widget, stretch=1)

        layout.addWidget(self.screens_container, stretch=1)

        # Shared Scrubber & Controls
        self.scrub_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.scrub_slider.setRange(0, 1000)
        self.scrub_slider.setStyleSheet("""
            QSlider::groove:horizontal {
                height: 6px;
                background: #272736;
                border-radius: 3px;
            }
            QSlider::sub-page:horizontal {
                background: #7c3aed;
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: #7c3aed;
                border: 2px solid #ffffff;
                width: 16px;
                height: 16px;
                margin: -5px 0;
                border-radius: 8px;
            }
            QSlider::handle:horizontal:hover {
                background: #7c3aed;
            }
        """)
        self.scrub_slider.sliderPressed.connect(lambda: setattr(self, "_is_scrubbing", True))
        self.scrub_slider.sliderReleased.connect(lambda: (setattr(self, "_is_scrubbing", False), self.seek_both_ms(self.scrub_slider.value())))
        self.scrub_slider.sliderMoved.connect(self.seek_both_ms)
        layout.addWidget(self.scrub_slider)

        self.ctrl_outer_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.ctrl_outer_layout.setSpacing(8)

        transport_row = QtWidgets.QHBoxLayout()
        transport_row.setSpacing(6)

        light_btn_css = (
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; border-radius: 8px; padding: 5px 9px; font-size: 11px; font-weight: 700; }"
            "QPushButton:hover { background-color: #232334; border-color: #4c4c66; }"
        )

        self.step_back_btn = QtWidgets.QPushButton("⏮ -1F")
        self.step_back_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.step_back_btn.setStyleSheet(light_btn_css)
        self.step_back_btn.clicked.connect(lambda: self.step_both_frames(-1))
        transport_row.addWidget(self.step_back_btn)

        self.play_both_btn = QtWidgets.QPushButton("▶ Play Both")
        self.play_both_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.play_both_btn.setStyleSheet(
            "QPushButton { background-color: #7c3aed; color: #ffffff; border: none; border-radius: 8px; padding: 5px 12px; font-size: 11px; font-weight: 800; }"
            "QPushButton:hover { background-color: #8b5cf6; }"
        )
        self.play_both_btn.clicked.connect(self.toggle_play_both)
        transport_row.addWidget(self.play_both_btn, stretch=1)

        self.step_fwd_btn = QtWidgets.QPushButton("+1F ⏭")
        self.step_fwd_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.step_fwd_btn.setStyleSheet(light_btn_css)
        self.step_fwd_btn.clicked.connect(lambda: self.step_both_frames(1))
        transport_row.addWidget(self.step_fwd_btn)

        self.frame_readout_lbl = QtWidgets.QLabel("Frame: 1f")
        self.frame_readout_lbl.setStyleSheet("color: #7c3aed; font-weight: 800; font-size: 11px; margin-left: 4px; border: none;")
        transport_row.addWidget(self.frame_readout_lbl)

        self.ctrl_outer_layout.addLayout(transport_row, stretch=1)

        timing_row = QtWidgets.QHBoxLayout()
        timing_row.setSpacing(6)

        self.slip_lbl = QtWidgets.QLabel("Slip:")
        self.slip_lbl.setStyleSheet("color: #a1a1aa; font-size: 11px; font-weight: 700; border: none;")
        timing_row.addWidget(self.slip_lbl)
        self.pb_offset_spin = QtWidgets.QSpinBox()
        self.pb_offset_spin.setRange(-500, 500)
        self.pb_offset_spin.setValue(0)
        self.pb_offset_spin.setSuffix("f")
        self.pb_offset_spin.setMinimumWidth(56)
        self.pb_offset_spin.setStyleSheet(
            "QSpinBox { background-color: #111119; color: #f4f4f5; border: 1px solid #272736; border-radius: 8px; padding: 4px 6px; font-weight: 700; font-size: 11px; }"
        )
        self.pb_offset_spin.setToolTip("Offset the playblast timing relative to the reference clip")
        self.pb_offset_spin.valueChanged.connect(self._on_offset_changed)
        timing_row.addWidget(self.pb_offset_spin)

        self.speed_lbl = QtWidgets.QLabel("Speed:")
        self.speed_lbl.setStyleSheet("color: #a1a1aa; font-size: 11px; font-weight: 700; border: none;")
        timing_row.addWidget(self.speed_lbl)
        self.speed_combo = QtWidgets.QComboBox()
        self.speed_combo.addItems(["1.0x", "0.5x", "0.25x"])
        self.speed_combo.setMinimumWidth(58)
        self.speed_combo.setStyleSheet(
            "QComboBox { background-color: #111119; color: #f4f4f5; border: 1px solid #272736; border-radius: 8px; padding: 4px 6px; font-weight: 700; font-size: 11px; }"
        )
        self.speed_combo.currentTextChanged.connect(self._on_speed_changed)
        timing_row.addWidget(self.speed_combo)
        timing_row.addStretch()

        self.ctrl_outer_layout.addLayout(timing_row)
        layout.addLayout(self.ctrl_outer_layout)

    def resizeEvent(self, event):
        super(DualCompareWidget, self).resizeEvent(event)
        w = self.width()
        is_narrow = w < 520
        if hasattr(self, "dc_header_layout") and self.dc_header_layout:
            self.dc_header_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "dc_hdr_sub") and self.dc_hdr_sub:
            self.dc_hdr_sub.setVisible(w >= 620)
        if hasattr(self, "ctrl_outer_layout") and self.ctrl_outer_layout:
            self.ctrl_outer_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "screens_layout") and self.screens_layout:
            if w < 560:
                self.screens_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom)
                if hasattr(self, "ref_stack") and self.ref_stack:
                    self.ref_stack.setMinimumHeight(140)
                if hasattr(self, "pb_stack") and self.pb_stack:
                    self.pb_stack.setMinimumHeight(140)
            else:
                self.screens_layout.setDirection(QtWidgets.QBoxLayout.LeftToRight)
                if hasattr(self, "ref_stack") and self.ref_stack:
                    self.ref_stack.setMinimumHeight(200)
                if hasattr(self, "pb_stack") and self.pb_stack:
                    self.pb_stack.setMinimumHeight(200)

    def _set_player_source(self, player, qurl):
        if not player:
            return
        if QT_MULTIMEDIA_AVAILABLE == 6:
            player.setSource(qurl)
        else:
            player.setMedia(QMediaContent(qurl))

    def _on_media_status(self, player, status):
        try:
            loaded_enum = QMediaPlayer.LoadedMedia if hasattr(QMediaPlayer, "LoadedMedia") else None
            end_enum = QMediaPlayer.EndOfMedia if hasattr(QMediaPlayer, "EndOfMedia") else None
            if loaded_enum is not None and status == loaded_enum:
                if not self.is_playing:
                    player.setPosition(0)
                    player.pause()
            elif end_enum is not None and status == end_enum:
                if self.is_playing:
                    self.seek_both_ms(0)
                    if self.ref_player and self.ref_path:
                        self.ref_player.play()
                    if self.pb_player and self.pb_path:
                        self.pb_player.play()
        except Exception:
            pass

    def _on_player_error(self, is_ref, msg):
        if is_ref:
            self.ref_placeholder.setText("Could not play reference video.\n" + (msg or "Try 'Load Ref...' with a local MP4."))
            self.ref_stack.setCurrentWidget(self.ref_placeholder)
        else:
            self.pb_placeholder.setText("Could not play playblast MP4.\n" + (msg or "Try 'Load MP4...' to pick a file."))
            self.pb_stack.setCurrentWidget(self.pb_placeholder)

    def _on_ref_cached_ready(self, vid_id, local_path):
        if str(vid_id) == str(self._active_ref_id) and local_path and os.path.isfile(local_path):
            self.load_reference_file(local_path, title_override=self.ref_title_lbl.text())

    def load_reference_file(self, file_path, title_override=None):
        if not file_path or not os.path.isfile(file_path):
            return
        self.ref_path = file_path
        self.ref_title_lbl.setText(title_override or ("Reference: " + os.path.basename(file_path)))
        if not self.ref_player or not self.ref_video_widget:
            self.ref_placeholder.setText("Qt Multimedia unavailable in this Maya build.")
            self.ref_stack.setCurrentWidget(self.ref_placeholder)
            return
        self.is_playing = False
        self.play_both_btn.setText("▶ Play Both")
        self._set_player_source(self.ref_player, QtCore.QUrl.fromLocalFile(file_path))
        self.ref_stack.setCurrentWidget(self.ref_video_widget)
        self.ref_player.setPosition(0)
        self.ref_player.pause()

    def browse_reference_file(self):
        file_path, _ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select Reference Video",
            os.path.expanduser("~"),
            "Video Files (*.mp4 *.mov *.avi *.webm);;All Files (*.*)"
        )
        if file_path:
            self._active_ref_id = None
            self.load_reference_file(file_path)

    def load_reference_video(self, video_data):
        if not video_data:
            return
        title_str = "Reference: " + (video_data.get("title") or "Clip")
        self.ref_title_lbl.setText(title_str)
        try:
            self.fps = float(video_data.get("fps") or 24.0)
        except Exception:
            self.fps = 24.0
        self._active_ref_id = str(video_data.get("id") or "")

        media_source, is_local = animref_api.get_playable_media_source(video_data)
        if not media_source or not self.ref_player or not self.ref_video_widget:
            self.ref_placeholder.setText("Reference video unavailable or Qt Multimedia disabled.")
            self.ref_stack.setCurrentWidget(self.ref_placeholder)
            return

        if is_local and os.path.isfile(media_source):
            self.load_reference_file(media_source, title_override=title_str)
            return

        # Stream immediately, and cache locally in background for zero-lag synced scrubbing
        self.ref_path = media_source
        self.is_playing = False
        self.play_both_btn.setText("▶ Play Both")
        self._set_player_source(self.ref_player, QtCore.QUrl(media_source))
        self.ref_stack.setCurrentWidget(self.ref_video_widget)
        self.ref_player.setPosition(0)
        self.ref_player.pause()

        vid_copy = dict(video_data)
        vid_id = self._active_ref_id

        def _bg_cache():
            try:
                local_path = animref_api.download_video_file(vid_copy)
                if local_path and os.path.isfile(local_path):
                    self.ref_cached_ready.emit(vid_id, local_path)
            except Exception:
                pass

        threading.Thread(target=_bg_cache, daemon=True).start()

    def load_playblast_file(self, file_path):
        if not file_path or not os.path.isfile(file_path):
            return
        self.pb_path = file_path
        self.pb_title_lbl.setText("Playblast: " + os.path.basename(file_path))
        if not self.pb_player or not self.pb_video_widget:
            self.pb_placeholder.setText("Qt Multimedia unavailable in this Maya build.")
            self.pb_stack.setCurrentWidget(self.pb_placeholder)
            return
        self.is_playing = False
        self.play_both_btn.setText("▶ Play Both")
        self._set_player_source(self.pb_player, QtCore.QUrl.fromLocalFile(file_path))
        self.pb_stack.setCurrentWidget(self.pb_video_widget)
        self.pb_player.setPosition(0)
        self.pb_player.pause()

    def browse_playblast_file(self):
        file_path, _ = QtWidgets.QFileDialog.getOpenFileName(
            self,
            "Select Recorded Maya Playblast",
            os.path.expanduser("~"),
            "Video Files (*.mp4 *.mov *.avi);;All Files (*.*)"
        )
        if file_path:
            self.load_playblast_file(file_path)

    def _on_offset_changed(self, val):
        self.playblast_offset_frames = int(val)
        self.seek_both_ms(self.scrub_slider.value())

    def _on_speed_changed(self, text):
        rate = 0.25 if "0.25" in text else (0.5 if "0.5" in text else 1.0)
        for p in (self.ref_player, self.pb_player):
            if p and hasattr(p, "setPlaybackRate"):
                p.setPlaybackRate(rate)

    def toggle_play_both(self):
        has_ref = bool(self.ref_player and self.ref_path)
        has_pb = bool(self.pb_player and self.pb_path)
        if not has_ref and not has_pb:
            return
        self.is_playing = not self.is_playing
        if self.is_playing:
            self.play_both_btn.setText("❚❚ Pause Both")
            # Align positions before starting playback so both start locked
            self.seek_both_ms(self.scrub_slider.value())
            if has_ref:
                self.ref_player.play()
            if has_pb:
                self.pb_player.play()
        else:
            self.play_both_btn.setText("▶ Play Both")
            if self.ref_player:
                self.ref_player.pause()
            if self.pb_player:
                self.pb_player.pause()

    def seek_both_ms(self, ref_ms):
        ref_ms = max(0, int(ref_ms))
        offset_ms = int((self.playblast_offset_frames / (self.fps or 24.0)) * 1000.0)
        pb_ms = max(0, ref_ms + offset_ms)
        if self.ref_player and self.ref_path:
            self.ref_player.setPosition(ref_ms)
        if self.pb_player and self.pb_path:
            self.pb_player.setPosition(pb_ms)
        frame = max(1, int(round((ref_ms / 1000.0) * (self.fps or 24.0))) + 1)
        self.frame_readout_lbl.setText("Frame: {}f".format(frame))

    def step_both_frames(self, delta):
        if self.is_playing:
            self.toggle_play_both()
        frame_ms = max(1, int(round(1000.0 / (self.fps or 24.0))))
        new_ms = max(0, min(self.duration_ms, self.scrub_slider.value() + delta * frame_ms))
        self.scrub_slider.setValue(new_ms)
        self.seek_both_ms(new_ms)

    def _on_ref_pos_changed(self, pos_ms):
        if self._is_scrubbing:
            return
        self.scrub_slider.setValue(pos_ms)
        frame = max(1, int(round((pos_ms / 1000.0) * (self.fps or 24.0))) + 1)
        self.frame_readout_lbl.setText("Frame: {}f".format(frame))
        # Keep playblast drift-locked to reference during playback
        if self.is_playing and self.pb_player and self.pb_path and self.pb_duration_ms > 0:
            offset_ms = int((self.playblast_offset_frames / (self.fps or 24.0)) * 1000.0)
            target_pb = max(0, (pos_ms + offset_ms) % max(1, self.pb_duration_ms))
            if abs(self.pb_player.position() - target_pb) > 90:
                self.pb_player.setPosition(target_pb)

    def _on_pb_pos_changed(self, pos_ms):
        # Fallback master scrubber when only playblast is loaded (no reference clip yet)
        if self._is_scrubbing or (self.ref_path and self.ref_duration_ms > 0):
            return
        self.scrub_slider.setValue(pos_ms)
        frame = max(1, int(round((pos_ms / 1000.0) * (self.fps or 24.0))) + 1)
        self.frame_readout_lbl.setText("Frame: {}f".format(frame))

    def _on_ref_dur_changed(self, dur_ms):
        self.ref_duration_ms = max(0, int(dur_ms))
        self.duration_ms = max(1, self.ref_duration_ms or self.pb_duration_ms or 1000)
        self.scrub_slider.setRange(0, self.duration_ms)

    def _on_pb_dur_changed(self, dur_ms):
        self.pb_duration_ms = max(0, int(dur_ms))
        if self.ref_duration_ms <= 0:
            self.duration_ms = max(1, self.pb_duration_ms or 1000)
            self.scrub_slider.setRange(0, self.duration_ms)


class AnimRefBrowserWindow(QtWidgets.QWidget):
    thumbnail_loaded = QtCore.Signal(str, str)
    download_progress = QtCore.Signal(int, int)
    download_finished = QtCore.Signal(dict, str, str, str, bool, bool)
    download_error = QtCore.Signal(str)
    catalog_loaded = QtCore.Signal(list, list)
    saved_loaded = QtCore.Signal(list, list)
    boards_loaded = QtCore.Signal(list)
    playblast_uploaded = QtCore.Signal(dict)

    def __init__(self, parent=None, is_docked=False):
        if parent is None and not is_docked:
            parent = get_maya_main_window()
        super(AnimRefBrowserWindow, self).__init__(parent)
        self.setObjectName("AnimRefUIWindow")
        self.setWindowTitle("Animation Reference (AnimRef) for Maya")
        self.setAttribute(QtCore.Qt.WA_DeleteOnClose, True)
        self.is_docked = is_docked
        self.is_compact = False
        self._current_cols = 0
        self._current_videos = []

        if not self.is_docked:
            self.setWindowFlags(QtCore.Qt.FramelessWindowHint | QtCore.Qt.Window)
            init_w, init_h = self._compute_compact_default_size()
            self.resize(init_w, init_h)
            self.setMinimumSize(230, 200)
        else:
            self.setWindowFlags(QtCore.Qt.Widget)
            self.setMinimumSize(200, 160)

        self.setStyleSheet(DARK_STYLESHEET)

        self.selected_video = None
        self.active_tag = None
        self.card_widgets = {}
        self.saved_card_widgets = {}
        self.boards_card_widgets = {}
        self._last_saved_fetch_time = 0
        self._last_boards_fetch_time = 0
        self._saved_rendered_ids = []
        self._boards_rendered_keys = []
        self.search_timer = QtCore.QTimer()
        self.search_timer.setSingleShot(True)
        self.search_timer.setInterval(280)
        self.search_timer.timeout.connect(self.perform_search)

        self._reflow_timer = QtCore.QTimer(self)
        self._reflow_timer.setSingleShot(True)
        self._reflow_timer.setInterval(60)
        self._reflow_timer.timeout.connect(self._reflow_grid)

        self._board_search_timer = QtCore.QTimer(self)
        self._board_search_timer.setSingleShot(True)
        self._board_search_timer.setInterval(140)
        self._board_search_timer.timeout.connect(self._execute_board_search)
        self._pending_board_search_text = ""
        self._last_detail_cols = 0
        self._last_boards_cols = 0

        # Wire Signals (explicit QueuedConnection guarantees Maya main-thread delivery from worker threads)
        _q = QtCore.Qt.QueuedConnection
        self.thumbnail_loaded.connect(self.on_thumbnail_ready, _q)
        self.download_progress.connect(self.on_download_progress, _q)
        self.download_finished.connect(self.on_download_finished, _q)
        self.download_error.connect(self.on_download_error, _q)
        self.catalog_loaded.connect(self.on_catalog_ready, _q)
        self.saved_loaded.connect(self.on_saved_data_ready, _q)
        self.boards_loaded.connect(self.on_boards_data_ready, _q)
        self.playblast_uploaded.connect(self.on_playblast_uploaded, _q)

        # Clipboard auto-detector timer for 1-click connect token detection
        self._clip_poll_timer = QtCore.QTimer(self)
        self._clip_poll_timer.setInterval(1200)
        self._clip_poll_timer.timeout.connect(self._check_clipboard_for_auth_token)
        self._last_checked_clipboard = ""

        self.build_ui()
        self.update_user_header()
        self.load_initial_data()

        # Frameless edge and corner resize grips
        self.gripSize = 5
        self.sideGrips = [
            SideGrip(self, QtCore.Qt.LeftEdge),
            SideGrip(self, QtCore.Qt.TopEdge),
            SideGrip(self, QtCore.Qt.RightEdge),
            SideGrip(self, QtCore.Qt.BottomEdge),
        ]
        self.cornerGrips = [QtWidgets.QSizeGrip(self) for _ in range(4)]
        for grip in self.cornerGrips:
            grip.setStyleSheet("background: transparent;")
        self._updateGrips()

    def _updateGrips(self):
        if self.is_docked:
            for g in self.sideGrips + self.cornerGrips:
                g.setVisible(False)
            return

        outRect = self.rect()
        gs = self.gripSize
        inRect = outRect.adjusted(gs, gs, -gs, -gs)

        self.cornerGrips[0].setGeometry(QtCore.QRect(outRect.topLeft(), inRect.topLeft()))
        self.cornerGrips[1].setGeometry(QtCore.QRect(outRect.topRight(), inRect.topRight()).normalized())
        self.cornerGrips[2].setGeometry(QtCore.QRect(inRect.bottomRight(), outRect.bottomRight()))
        self.cornerGrips[3].setGeometry(QtCore.QRect(outRect.bottomLeft(), inRect.bottomLeft()).normalized())

        self.sideGrips[0].setGeometry(QtCore.QRect(outRect.left(), inRect.top(), gs, inRect.height()))
        self.sideGrips[1].setGeometry(QtCore.QRect(inRect.left(), outRect.top(), inRect.width(), gs))
        self.sideGrips[2].setGeometry(QtCore.QRect(inRect.right(), inRect.top(), gs, inRect.height()))
        self.sideGrips[3].setGeometry(QtCore.QRect(inRect.left(), inRect.bottom(), inRect.width(), gs))

        for g in self.sideGrips + self.cornerGrips:
            g.raise_()

    def _compute_compact_default_size(self):
        target_w, target_h = 560, 480
        try:
            app = QtWidgets.QApplication.instance()
            screen = app.primaryScreen() if app else None
            if screen is not None:
                avail = screen.availableGeometry()
                target_w = max(360, min(560, int(avail.width() * 0.44)))
                target_h = max(340, min(480, int(avail.height() * 0.62)))
        except Exception:
            pass
        return target_w, target_h

    def resizeEvent(self, event):
        super(AnimRefBrowserWindow, self).resizeEvent(event)
        self._updateGrips()
        w = self.width()
        is_narrow = w < 460
        if hasattr(self, "title_bar") and self.title_bar:
            self.title_bar.set_narrow_mode(is_narrow)
        if hasattr(self, "sidebar") and self.sidebar:
            if w < 540 and not self.sidebar.is_collapsed:
                self.sidebar.set_collapsed(True)
            elif w >= 620 and self.sidebar.is_collapsed and not getattr(self.sidebar, "_manually_collapsed", False):
                self.sidebar.set_collapsed(False)
        if hasattr(self, "workspace_eyebrow_lbl") and self.workspace_eyebrow_lbl:
            self.workspace_eyebrow_lbl.setVisible(not is_narrow)
        if hasattr(self, "toggle_studio_btn") and self.toggle_studio_btn:
            self.toggle_studio_btn.setText("🎬" if is_narrow else "🎬 Studio")
        if hasattr(self, "open_web_boards_btn") and self.open_web_boards_btn:
            self.open_web_boards_btn.setText("+" if is_narrow else "+ Board")
        if hasattr(self, "preview_mode_btn") and self.preview_mode_btn:
            self.preview_mode_btn.setText("👁 ▾" if is_narrow else "Preview ▾")
        if hasattr(self, "board_search_input") and self.board_search_input:
            if w > 900:
                self.board_search_input.setMinimumWidth(80)
                self.board_search_input.setMaximumWidth(220)
            elif w > 650:
                self.board_search_input.setMinimumWidth(70)
                self.board_search_input.setMaximumWidth(150)
            elif w >= 460:
                self.board_search_input.setMinimumWidth(55)
                self.board_search_input.setMaximumWidth(110)
            else:
                self.board_search_input.setMinimumWidth(42)
                self.board_search_input.setMaximumWidth(90)
        if hasattr(self, "_reflow_timer"):
            self._reflow_timer.start(50)
        if hasattr(self, "_update_playblast_responsive_layout"):
            self._update_playblast_responsive_layout()
        if hasattr(self, "inspector_panel") and self.inspector_panel.isVisible():
            self._apply_responsive_splitter_sizes()

    def build_ui(self):
        main_layout = QtWidgets.QVBoxLayout(self)
        main_layout.setContentsMargins(1, 1, 1, 1)
        main_layout.setSpacing(0)

        # 1. Minimalist Window Bar
        self.title_bar = FramelessTitleBar(parent=self)
        self.title_bar.compact_btn.clicked.connect(self.toggle_compact_mode)
        if hasattr(self.title_bar, "dock_btn"):
            self.title_bar.dock_btn.setText("Float" if self.is_docked else "Dock to Maya")
            self.title_bar.dock_btn.clicked.connect(self.toggle_docking)
        self.title_bar.set_docked_mode(self.is_docked)
        main_layout.addWidget(self.title_bar)

        # 2. Draggable Sticky Top Workspace Header (Compact Mobile Optimized)
        self.workspace_header = WorkspaceHeaderFrame(parent=self)
        self.workspace_header.setStyleSheet("""
            WorkspaceHeaderFrame {
                background-color: #09090e;
                border-bottom: 1px solid #272736;
            }
        """)
        wh_layout = QtWidgets.QHBoxLayout(self.workspace_header)
        wh_layout.setContentsMargins(10, 6, 10, 6)
        wh_layout.setSpacing(6)

        title_stack = QtWidgets.QVBoxLayout()
        title_stack.setSpacing(1)
        self.workspace_eyebrow_lbl = QtWidgets.QLabel("REFERENCE WORKSPACE")
        self.workspace_eyebrow_lbl.setStyleSheet("color: #a1a1aa; font-size: 8px; font-weight: 700; letter-spacing: 1.5px; border: none;")
        title_stack.addWidget(self.workspace_eyebrow_lbl)

        self.boards_header_lbl = QtWidgets.QLabel("Boards")
        self.boards_header_lbl.setStyleSheet("color: #f4f4f5; font-size: 16px; font-weight: 800; letter-spacing: -0.5px; border: none;")
        title_stack.addWidget(self.boards_header_lbl)
        wh_layout.addLayout(title_stack)

        wh_layout.addStretch()

        # Rounded White Pill Search Input (matches "Search this board" in screenshot, responsive width)
        self.board_search_input = QtWidgets.QLineEdit()
        self.board_search_input.setPlaceholderText("🔍 Search")
        self.board_search_input.setMinimumWidth(70)
        self.board_search_input.setMaximumWidth(130)
        self.board_search_input.setFixedHeight(26)
        self.board_search_input.setStyleSheet("""
            QLineEdit {
                background-color: #111119;
                border: 1px solid #272736;
                border-radius: 13px;
                padding: 0px 10px;
                color: #f4f4f5;
                font-size: 11px;
            }
            QLineEdit:focus {
                border: 1px solid #8b5cf6;
            }
        """)
        self.board_search_input.textChanged.connect(self.on_board_search_changed)
        wh_layout.addWidget(self.board_search_input)

        # Header Options Dropdown Button: [ Preview ▾ ]
        self.preview_mode_btn = QtWidgets.QPushButton("Preview ▾")
        self.preview_mode_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.preview_mode_btn.setFixedHeight(26)
        self.preview_mode_btn.setToolTip("Preview options: Open video player, open on web, or dock window to Maya")
        self.preview_mode_btn.setStyleSheet("""
            QPushButton {
                background-color: #111119;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 13px;
                padding: 0px 9px;
                font-size: 10px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #161622;
                border-color: #8b5cf6;
            }
        """)
        self.preview_mode_btn.clicked.connect(self._show_header_preview_menu)
        wh_layout.addWidget(self.preview_mode_btn)

        # Quick Sync Pill Button to refresh cloud moodboards & saves in 1 click
        self.sync_boards_btn = QtWidgets.QPushButton("↻")
        self.sync_boards_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.sync_boards_btn.setFixedSize(26, 26)
        self.sync_boards_btn.setToolTip("Sync your latest saved references and Moodboards from AnimationReference.org")
        self.sync_boards_btn.setStyleSheet("""
            QPushButton {
                background-color: #111119;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 13px;
                font-size: 11px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #161622;
                border-color: #8b5cf6;
            }
        """)
        self.sync_boards_btn.clicked.connect(self.force_sync_boards_and_saves)
        wh_layout.addWidget(self.sync_boards_btn)

        # White Rounded Pill Button (Studio / Player Drawer)
        self.toggle_studio_btn = QtWidgets.QPushButton("🎬 Studio")
        self.toggle_studio_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.toggle_studio_btn.setFixedHeight(26)
        self.toggle_studio_btn.setToolTip("Show/Hide the Maya Video Player & Viewport Setup Drawer")
        self.toggle_studio_btn.setStyleSheet("""
            QPushButton {
                background-color: #111119;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 13px;
                padding: 0px 9px;
                font-size: 10px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #161622;
                border-color: #8b5cf6;
            }
        """)
        self.toggle_studio_btn.clicked.connect(self.toggle_inspector_drawer)
        wh_layout.addWidget(self.toggle_studio_btn)

        # Solid Black Pill Button: "+ Board"
        self.open_web_boards_btn = QtWidgets.QPushButton("+ Board")
        self.open_web_boards_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.open_web_boards_btn.setFixedHeight(26)
        self.open_web_boards_btn.setToolTip("Create or save boards on AnimationReference.org/moodboard")
        self.open_web_boards_btn.setStyleSheet("""
            QPushButton {
                background-color: #7c3aed;
                color: #ffffff;
                border: none;
                border-radius: 13px;
                padding: 0px 10px;
                font-size: 10px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #8b5cf6;
            }
        """)
        self.open_web_boards_btn.clicked.connect(lambda: webbrowser.open("https://animationreference.org/moodboard"))
        wh_layout.addWidget(self.open_web_boards_btn)

        main_layout.addWidget(self.workspace_header)

        # 3. Main Body Below Header: Left Sidebar + Full-Width Masonry Canvas (+ Collapsible Slide-Over Drawer)
        self.body_container = QtWidgets.QWidget()
        body_layout = QtWidgets.QHBoxLayout(self.body_container)
        body_layout.setContentsMargins(0, 0, 0, 0)
        body_layout.setSpacing(0)

        self.sidebar = SidebarNavPanel(self)
        if self.is_docked:
            self.sidebar.set_collapsed(True)
        self.sidebar.nav_changed.connect(self.on_nav_changed)
        self.sidebar.board_selected.connect(self.on_sidebar_board_selected)
        self.sidebar.all_saves_selected.connect(self.on_sidebar_all_saves_selected)
        self.sidebar.manage_boards_selected.connect(self.on_sidebar_manage_boards_selected)
        body_layout.addWidget(self.sidebar)

        self.splitter = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        self.splitter.setChildrenCollapsible(True)
        self.splitter.setStyleSheet("QSplitter::handle { background-color: #232334; width: 1px; }")

        self.view_stack = QtWidgets.QStackedWidget()

        # Page 0: Boards & Reference Masonry Canvas
        self.boards_tab = QtWidgets.QWidget()
        self.build_boards_tab(self.boards_tab)
        self.view_stack.addWidget(self.boards_tab)

        # Page 1: Saved Library tab (kept for compatibility)
        self.saved_tab = QtWidgets.QWidget()
        self.build_saved_tab(self.saved_tab)
        self.view_stack.addWidget(self.saved_tab)

        # Page 2: Playblast Compare Studio
        self.playblast_tab = QtWidgets.QWidget()
        self.build_playblast_tab(self.playblast_tab)
        self.view_stack.addWidget(self.playblast_tab)

        # Page 3: Account Settings & Browser Token Sync
        self.account_tab = QtWidgets.QWidget()
        self.build_account_tab(self.account_tab)
        self.view_stack.addWidget(self.account_tab)

        # Page 4: Fallback Explore tab
        self.explore_tab = QtWidgets.QWidget()
        self.build_explore_tab(self.explore_tab)
        self.view_stack.addWidget(self.explore_tab)

        # Page 5: Full-Panel Studio Video Player (replaces cramped side drawer / pop-out window)
        self._previous_view_index = 0
        self.inspector_panel = self.create_inspector_panel()
        self.view_stack.addWidget(self.inspector_panel)

        self.splitter.addWidget(self.view_stack)
        body_layout.addWidget(self.splitter, stretch=1)
        main_layout.addWidget(self.body_container, stretch=1)

    def _show_header_preview_menu(self):
        menu = QtWidgets.QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background-color: #161622;
                border: 1px solid #272736;
                border-radius: 10px;
                padding: 6px;
                color: #f5f5f4;
                font-size: 11px;
                font-weight: 600;
            }
            QMenu::item {
                padding: 7px 18px 7px 10px;
                border-radius: 6px;
            }
            QMenu::item:selected {
                background-color: #8b5cf6;
                color: #ffffff;
            }
            QMenu::separator {
                height: 1px;
                background-color: #232334;
                margin: 4px 2px;
            }
        """)

        # 1. Preview in Maya Studio Drawer
        act_preview = menu.addAction("🎬  Open Maya Studio Preview Drawer")
        act_preview.triggered.connect(lambda: (
            self.toggle_inspector_drawer() if not self.inspector_panel.isVisible() else None
        ))

        # 2. Open Selected Clip on animationreference.org
        sel = getattr(self, "selected_video", None)
        if sel and sel.get("id"):
            url = "https://animationreference.org/video/{}".format(sel.get("id"))
            act_web = menu.addAction("🌐  Open Selected Clip on Web ↗")
            act_web.triggered.connect(lambda: webbrowser.open(url))

        # 3. Open Current Moodboard on animationreference.org
        curr_board = getattr(self, "_current_active_board", None)
        bid = curr_board.get("id") if curr_board else None
        if bid and bid != "__all_saves__":
            board_url = "https://animationreference.org/board/{}".format(bid)
        else:
            board_url = "https://animationreference.org/moodboard"
        act_board_web = menu.addAction("📁  Open Moodboard on Web ↗")
        act_board_web.triggered.connect(lambda: webbrowser.open(board_url))

        # 4. Dock to Maya Workspace
        menu.addSeparator()
        dock_txt = "🗗  Float Window" if self.is_docked else "📌  Dock to Maya Workspace"
        act_dock = menu.addAction(dock_txt)
        act_dock.triggered.connect(self.toggle_docking)

        if hasattr(self, "preview_mode_btn"):
            menu.exec_(self.preview_mode_btn.mapToGlobal(QtCore.QPoint(0, self.preview_mode_btn.height() + 4)))
        else:
            menu.exec_(QtGui.QCursor.pos())

    def _apply_responsive_splitter_sizes(self):
        if not hasattr(self, "splitter") or not hasattr(self, "inspector_panel"):
            return
        if self.inspector_panel.isVisible():
            total_w = self.splitter.width() if self.splitter.width() > 200 else self.width()
            if total_w < 520:
                if self.splitter.orientation() != QtCore.Qt.Vertical:
                    self.splitter.setOrientation(QtCore.Qt.Vertical)
                total_h = self.splitter.height() if self.splitter.height() > 200 else self.height()
                top_h = max(120, int(total_h * 0.42))
                bot_h = max(160, total_h - top_h)
                self.splitter.setSizes([top_h, bot_h])
            else:
                if self.splitter.orientation() != QtCore.Qt.Horizontal:
                    self.splitter.setOrientation(QtCore.Qt.Horizontal)
                drawer_w = max(240, min(420, int(total_w * 0.38)))
                main_w = max(140, total_w - drawer_w)
                self.splitter.setSizes([main_w, drawer_w])

    def toggle_inspector_drawer(self):
        if not hasattr(self, "view_stack") or not hasattr(self, "inspector_panel"):
            return
        studio_idx = self.view_stack.indexOf(self.inspector_panel)
        if studio_idx < 0:
            return
        if self.view_stack.currentIndex() == studio_idx:
            self.close_studio_screen()
        else:
            self._previous_view_index = self.view_stack.currentIndex()
            try:
                _CardHoverPreviewEngine.get().stop_all()
            except Exception:
                pass
            self.view_stack.setCurrentIndex(studio_idx)

    def close_studio_screen(self):
        if hasattr(self, "player_widget") and self.player_widget and getattr(self.player_widget, "player", None):
            try:
                self.player_widget.player.pause()
            except Exception:
                pass
        target = getattr(self, "_previous_view_index", 0)
        if hasattr(self, "view_stack"):
            studio_idx = self.view_stack.indexOf(self.inspector_panel)
            if target == studio_idx or target < 0 or target >= self.view_stack.count():
                target = 0
            self.view_stack.setCurrentIndex(target)
        self._reflow_timer.start(40)

    def on_sidebar_all_saves_selected(self):
        self.view_stack.setCurrentIndex(0)
        all_items = getattr(self, "_all_saves_items", None) or []
        if not all_items:
            for b in getattr(self, "_cached_boards_list", []):
                all_items.extend(b.get("items", []))
        self.show_board_detail({
            "id": "__all_saves__",
            "name": "All saves",
            "items": all_items,
        })

    def on_sidebar_manage_boards_selected(self):
        self.view_stack.setCurrentIndex(0)
        self.show_all_boards_view()

    def on_sidebar_board_selected(self, board_data):
        if self.view_stack.currentIndex() != 0:
            self.view_stack.setCurrentIndex(0)
        self.show_board_detail(board_data)

    def on_nav_changed(self, idx):
        if idx in (2, 3) and hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.pause()
        self.view_stack.setCurrentIndex(idx)
        header_titles = {
            0: "Boards",
            1: "All saves",
            2: "Playblast Compare",
            3: "Account & Cache",
            4: "Explore Library",
        }
        if hasattr(self, "boards_header_lbl") and idx in header_titles:
            self.boards_header_lbl.setText(header_titles[idx])
        if idx == 0:
            self.load_boards_data()
        elif idx == 1:
            self.load_saved_data()
        elif idx == 2:
            if hasattr(self, "refresh_playblast_timeline_info"):
                self.refresh_playblast_timeline_info()
            if hasattr(self, "_refresh_playblast_upload_boards"):
                self._refresh_playblast_upload_boards()
            if hasattr(self, "_update_playblast_responsive_layout"):
                QtCore.QTimer.singleShot(0, self._update_playblast_responsive_layout)
        elif idx == 3:
            if hasattr(self, "refresh_cache_stats"):
                self.refresh_cache_stats()
            user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else animref_auth.get_current_user()
            if not user:
                self.launch_browser_sign_in()
        elif idx == 4:
            if not getattr(self, "_explore_loaded_once", False):
                self._explore_loaded_once = True
                self.perform_search()

    def toggle_compact_mode(self):
        self.is_compact = not self.is_compact
        if self.is_compact:
            self._saved_geometry = self.geometry()
            self._saved_nav_index = getattr(self.sidebar, "current_index", 0)

            self.workspace_header.setVisible(False)
            self.sidebar.setVisible(False)
            self.view_stack.setVisible(False)
            self.inspector_panel.setVisible(True)

            self.detail_title.setVisible(False)
            if hasattr(self, "meta_container"):
                self.meta_container.setVisible(False)
            self.tags_container.setVisible(False)
            self.opts_box.setVisible(False)
            if hasattr(self, "scene_mgr_box"):
                self.scene_mgr_box.setVisible(False)
            if hasattr(self, "player_widget") and hasattr(self.player_widget, "animator_bar_widget"):
                self.player_widget.animator_bar_widget.setVisible(False)
            self.import_btn.setVisible(False)
            self.progress_bar.setVisible(False)

            self.splitter.setSizes([0, 1000])
            vid_title = (self.selected_video.get("title") or "") if self.selected_video else "Mini Reference Player"
            self.title_bar.set_mini_mode(True, vid_title)

            self.setMinimumSize(240, 180)
            if not self.is_docked:
                self.resize(380, 270)
        else:
            self.workspace_header.setVisible(True)
            self.sidebar.setVisible(True)
            self.view_stack.setVisible(True)

            self.detail_title.setVisible(True)
            if hasattr(self, "meta_container"):
                self.meta_container.setVisible(True)
            self.tags_container.setVisible(True)
            self.opts_box.setVisible(True)
            if hasattr(self, "scene_mgr_box"):
                self.scene_mgr_box.setVisible(True)
            if hasattr(self, "player_widget") and hasattr(self.player_widget, "animator_bar_widget"):
                self.player_widget.animator_bar_widget.setVisible(True)
            self.import_btn.setVisible(True)

            self.title_bar.set_mini_mode(False)
            self.setMinimumSize(230, 200)
            if not self.is_docked:
                if hasattr(self, "_saved_geometry") and self._saved_geometry:
                    self.setGeometry(self._saved_geometry)
                else:
                    w, h = self._compute_compact_default_size()
                    self.resize(w, h)

            self._reflow_timer.start(50)

    def toggle_theater_mode(self):
        self.is_theater_mode = getattr(self, "is_theater_mode", False)
        self.is_theater_mode = not self.is_theater_mode
        if self.is_theater_mode:
            self.view_stack.setVisible(False)
            self.inspector_panel.setVisible(True)
            self.splitter.setSizes([0, 1000])
        else:
            self.view_stack.setVisible(True)
            self._apply_responsive_splitter_sizes()
            self._reflow_timer.start(50)

    def toggle_docking(self):
        if self.is_docked:
            show_floating_window()
        else:
            show_docked_window()

    # ==================== EXPLORE TAB ====================
    def build_explore_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(16, 10, 16, 12)
        layout.setSpacing(10)

        self.search_container = QtWidgets.QWidget(parent)
        search_row = QtWidgets.QHBoxLayout(self.search_container)
        search_row.setContentsMargins(0, 0, 0, 0)
        search_row.setSpacing(8)

        self.search_input = QtWidgets.QLineEdit(self.search_container)
        self.search_input.setPlaceholderText("Search entire AnimRef library by title, action, or tag...")
        self.search_input.setClearButtonEnabled(True)
        self.search_input.setMinimumHeight(34)
        self.search_input.returnPressed.connect(lambda: self.perform_search(reset=True))
        search_row.addWidget(self.search_input, stretch=1)

        self.explore_search_btn = QtWidgets.QPushButton("Search", self.search_container)
        self.explore_search_btn.setFixedHeight(34)
        self.explore_search_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.explore_search_btn.setStyleSheet(
            "QPushButton { background-color: #7c3aed; color: #FFFFFF; border: none; border-radius: 17px; padding: 0 16px; font-weight: 700; }"
            "QPushButton:hover { background-color: #8b5cf6; }"
        )
        self.explore_search_btn.clicked.connect(lambda: self.perform_search(reset=True))
        search_row.addWidget(self.explore_search_btn)

        self.sort_combo = QtWidgets.QComboBox(self.search_container)
        self.sort_combo.addItems(["Newest", "Oldest", "Longest", "Shortest"])
        self.sort_combo.setMinimumHeight(34)
        self.sort_combo.currentIndexChanged.connect(lambda _idx: self.perform_search(reset=True))
        search_row.addWidget(self.sort_combo)

        self.stats_label = QtWidgets.QLabel("", self.search_container)
        self.stats_label.setStyleSheet("color: #a1a1aa; font-size: 11px; font-weight: 600;")
        search_row.addWidget(self.stats_label)
        layout.addWidget(self.search_container)

        self.tags_scroll = QtWidgets.QScrollArea(parent)
        self.tags_scroll.setWidgetResizable(True)
        self.tags_scroll.setFixedHeight(40)
        self.tags_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAsNeeded)
        self.tags_scroll.setVerticalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.tags_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.tags_scroll.setStyleSheet("background: transparent;")
        self.tags_widget = QtWidgets.QWidget(self.tags_scroll)
        self.tags_layout = QtWidgets.QHBoxLayout(self.tags_widget)
        self.tags_layout.setContentsMargins(0, 2, 0, 2)
        self.tags_layout.setSpacing(6)
        self.tags_layout.addStretch()
        self.tags_scroll.setWidget(self.tags_widget)
        layout.addWidget(self.tags_scroll)

        self.grid_container = QtWidgets.QWidget(parent)
        grid_wrap_layout = QtWidgets.QVBoxLayout(self.grid_container)
        grid_wrap_layout.setContentsMargins(0, 0, 0, 0)
        grid_wrap_layout.setSpacing(8)

        self.grid_scroll = QtWidgets.QScrollArea(self.grid_container)
        self.grid_scroll.setWidgetResizable(True)
        self.grid_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.grid_content = QtWidgets.QWidget(self.grid_scroll)
        self.grid_layout = QtWidgets.QGridLayout(self.grid_content)
        self.grid_layout.setContentsMargins(0, 0, 0, 0)
        self.grid_layout.setSpacing(12)
        self.grid_scroll.setWidget(self.grid_content)
        grid_wrap_layout.addWidget(self.grid_scroll, stretch=1)

        self.explore_load_more_btn = QtWidgets.QPushButton("Load More Clips", self.grid_container)
        self.explore_load_more_btn.setFixedHeight(34)
        self.explore_load_more_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.explore_load_more_btn.setVisible(False)
        self.explore_load_more_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: none; border-radius: 17px; font-weight: 700; }"
            "QPushButton:hover { background-color: #232334; }"
        )
        self.explore_load_more_btn.clicked.connect(self._load_more_explore)
        grid_wrap_layout.addWidget(self.explore_load_more_btn)

        layout.addWidget(self.grid_container, stretch=1)

        self._explore_offset = 0
        self._explore_limit = 40
        self._explore_total = 0
        self._explore_videos = []
        self._explore_loaded_once = False

    def create_inspector_panel(self):
        self.inspector_panel = QtWidgets.QFrame()
        self.inspector_panel.setMinimumWidth(180)
        self.inspector_panel.setStyleSheet("""
            QFrame#InspectorDrawer {
                background-color: #111119;
                border-left: 1px solid #272736;
            }
        """)
        self.inspector_panel.setObjectName("InspectorDrawer")
        panel_layout = QtWidgets.QVBoxLayout(self.inspector_panel)
        panel_layout.setContentsMargins(0, 0, 0, 0)
        panel_layout.setSpacing(0)

        # Studio Screen Top Header with Back Button
        drawer_hdr_frame = QtWidgets.QFrame()
        drawer_hdr_frame.setStyleSheet("background-color: #111119; border-bottom: 1px solid #272736;")
        drawer_hdr = QtWidgets.QHBoxLayout(drawer_hdr_frame)
        drawer_hdr.setContentsMargins(12, 8, 12, 8)
        drawer_hdr.setSpacing(8)

        close_drawer_btn = QtWidgets.QPushButton("← Back")
        close_drawer_btn.setCursor(QtCore.Qt.PointingHandCursor)
        close_drawer_btn.setStyleSheet("""
            QPushButton {
                background-color: #161622;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 10px;
                padding: 4px 12px;
                font-size: 11px;
                font-weight: 700;
            }
            QPushButton:hover {
                background-color: #7c3aed;
                color: #ffffff;
            }
        """)
        close_drawer_btn.clicked.connect(self.close_studio_screen)
        drawer_hdr.addWidget(close_drawer_btn)

        drawer_lbl = QtWidgets.QLabel("STUDIO PLAYER")
        drawer_lbl.setStyleSheet("color: #a1a1aa; font-size: 10px; font-weight: 800; letter-spacing: 1.5px; background: transparent;")
        drawer_hdr.addWidget(drawer_lbl)
        drawer_hdr.addStretch()
        panel_layout.addWidget(drawer_hdr_frame)

        # Scrollable content for the rest of the inspector
        drawer_scroll = QtWidgets.QScrollArea(self.inspector_panel)
        drawer_scroll.setWidgetResizable(True)
        drawer_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        drawer_scroll.setStyleSheet("QScrollArea { background-color: #111119; border: none; }")

        drawer_content = QtWidgets.QWidget()
        drawer_content.setStyleSheet("background-color: #111119;")
        self.detail_layout = QtWidgets.QVBoxLayout(drawer_content)
        self.detail_layout.setContentsMargins(14, 10, 14, 14)
        self.detail_layout.setSpacing(8)

        self.player_widget = VideoPlayerWidget(drawer_content)
        self.detail_layout.addWidget(self.player_widget, stretch=1)

        self.detail_title = QtWidgets.QLabel("Select a reference card")
        self.detail_title.setStyleSheet("font-weight: 700; font-size: 14px; color: #f4f4f5; background: transparent;")
        self.detail_title.setWordWrap(True)
        self.detail_layout.addWidget(self.detail_title)

        self.meta_container = QtWidgets.QWidget()
        self.meta_container.setStyleSheet("background: transparent;")
        meta_row = QtWidgets.QHBoxLayout(self.meta_container)
        meta_row.setContentsMargins(0, 0, 0, 0)
        self.detail_meta = QtWidgets.QLabel("")
        self.detail_meta.setStyleSheet("color: #a1a1aa; font-size: 11px; background: transparent;")
        self.detail_meta.setWordWrap(True)
        meta_row.addWidget(self.detail_meta, stretch=1)

        self.save_btn = QtWidgets.QPushButton("+ Save")
        self.save_btn.clicked.connect(self.toggle_save_selected_video)
        meta_row.addWidget(self.save_btn)
        self.detail_layout.addWidget(self.meta_container)

        self.tags_container = QtWidgets.QWidget()
        self.tags_container.setStyleSheet("background: transparent;")
        self.tags_flow_layout = QtWidgets.QHBoxLayout(self.tags_container)
        self.tags_flow_layout.setContentsMargins(0, 0, 0, 0)
        self.tags_flow_layout.setSpacing(4)
        self.detail_layout.addWidget(self.tags_container)

        self.opts_box = QtWidgets.QGroupBox("Maya Viewport Placement")
        self.opts_box.setStyleSheet("""
            QGroupBox {
                background-color: #09090e;
                font-weight: 700;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 10px;
                margin-top: 6px;
                padding-top: 8px;
            }
        """)
        opts_layout = QtWidgets.QVBoxLayout(self.opts_box)
        opts_layout.setSpacing(6)

        cam_layout = QtWidgets.QHBoxLayout()
        cam_layout.addWidget(QtWidgets.QLabel("Mode:"))
        self.cam_combo = QtWidgets.QComboBox()
        self.refresh_cameras_dropdown()
        cam_layout.addWidget(self.cam_combo, stretch=1)

        cam_layout.addWidget(QtWidgets.QLabel("PiP:"))
        self.pip_combo = QtWidgets.QComboBox()
        self.pip_combo.addItems([
            "Full Frame",
            "PiP: Top-Right",
            "PiP: Top-Left",
            "PiP: Bottom-Right",
            "PiP: Bottom-Left",
        ])
        self.pip_combo.setCurrentIndex(0)
        self.pip_combo.currentTextChanged.connect(self.on_live_pip_changed)
        cam_layout.addWidget(self.pip_combo, stretch=1)
        opts_layout.addLayout(cam_layout)

        mode_op_layout = QtWidgets.QHBoxLayout()
        mode_op_layout.addWidget(QtWidgets.QLabel("Format:"))
        self.mode_combo = QtWidgets.QComboBox()
        self.mode_combo.addItems(["Image Sequence (Smooth VP2 60fps Scrub)", "Direct Movie"])
        mode_op_layout.addWidget(self.mode_combo, stretch=1)

        mode_op_layout.addWidget(QtWidgets.QLabel("Opacity:"))
        self.opacity_slider = QtWidgets.QSlider(QtCore.Qt.Horizontal)
        self.opacity_slider.setRange(10, 100)
        self.opacity_slider.setValue(90)
        self.opacity_slider.setFixedWidth(70)
        self.opacity_slider.valueChanged.connect(self.on_live_opacity_changed)
        mode_op_layout.addWidget(self.opacity_slider)
        self.opacity_val_lbl = QtWidgets.QLabel("90%")
        self.opacity_val_lbl.setFixedWidth(30)
        mode_op_layout.addWidget(self.opacity_val_lbl)
        opts_layout.addLayout(mode_op_layout)

        checks_grid = QtWidgets.QGridLayout()
        checks_grid.setSpacing(4)
        self.start_curr_check = QtWidgets.QCheckBox("Start at Current Frame")
        self.start_curr_check.setChecked(False)
        self.start_curr_check.setToolTip("Unchecked: Reference starts cleanly at frame 0. Checked: starts at Maya's current time slider frame.")
        checks_grid.addWidget(self.start_curr_check, 0, 0)

        self.fit_timeline_check = QtWidgets.QCheckBox("Fit Timeline Range")
        self.fit_timeline_check.setChecked(True)
        self.fit_timeline_check.setToolTip("Adjusts Maya's playback range to fit the imported reference length starting from 0.")
        checks_grid.addWidget(self.fit_timeline_check, 0, 1)

        self.mirror_check = QtWidgets.QCheckBox("Mirror Horizontally")
        self.mirror_check.setChecked(False)
        self.mirror_check.toggled.connect(self.on_live_mirror_toggled)
        checks_grid.addWidget(self.mirror_check, 1, 0)

        self.face_cam_check = QtWidgets.QCheckBox("3D Card: Auto-Face Camera")
        self.face_cam_check.setChecked(False)
        checks_grid.addWidget(self.face_cam_check, 1, 1)
        opts_layout.addLayout(checks_grid)

        self.detail_layout.addWidget(self.opts_box)

        # Active Scene Reference Manager
        self.scene_mgr_box = QtWidgets.QGroupBox("Scene Reference Manager")
        self.scene_mgr_box.setStyleSheet("""
            QGroupBox {
                background-color: #09090e;
                font-weight: 700;
                color: #f4f4f5;
                border: 1px solid #272736;
                border-radius: 10px;
                margin-top: 4px;
                padding-top: 8px;
            }
        """)
        sm_layout = QtWidgets.QVBoxLayout(self.scene_mgr_box)
        sm_layout.setSpacing(4)

        plane_sel_row = QtWidgets.QHBoxLayout()
        self.scene_plane_combo = QtWidgets.QComboBox()
        self.scene_plane_combo.setPlaceholderText("No AnimRef planes in scene")
        plane_sel_row.addWidget(self.scene_plane_combo, stretch=1)

        self.refresh_planes_btn = QtWidgets.QPushButton("↻")
        self.refresh_planes_btn.setFixedWidth(28)
        self.refresh_planes_btn.setToolTip("Refresh scene AnimRef planes")
        self.refresh_planes_btn.clicked.connect(self.refresh_scene_planes)
        plane_sel_row.addWidget(self.refresh_planes_btn)

        self.lock_plane_btn = QtWidgets.QPushButton("🔒")
        self.lock_plane_btn.setFixedWidth(28)
        self.lock_plane_btn.setToolTip("Lock / Unlock plane in Maya viewport (unselectable reference mode)")
        self.lock_plane_btn.clicked.connect(self.toggle_selected_plane_lock)
        plane_sel_row.addWidget(self.lock_plane_btn)

        self.focus_plane_btn = QtWidgets.QPushButton("🎯")
        self.focus_plane_btn.setFixedWidth(28)
        self.focus_plane_btn.setToolTip("Frame / Focus selected plane in Maya viewport")
        self.focus_plane_btn.clicked.connect(self.focus_selected_plane)
        plane_sel_row.addWidget(self.focus_plane_btn)

        self.vis_plane_btn = QtWidgets.QPushButton("👁")
        self.vis_plane_btn.setFixedWidth(28)
        self.vis_plane_btn.setToolTip("Toggle visibility")
        self.vis_plane_btn.clicked.connect(self.toggle_selected_plane_visibility)
        plane_sel_row.addWidget(self.vis_plane_btn)

        self.del_plane_btn = QtWidgets.QPushButton("🗑")
        self.del_plane_btn.setFixedWidth(28)
        self.del_plane_btn.setToolTip("Delete selected reference plane from scene")
        self.del_plane_btn.clicked.connect(self.delete_selected_plane)
        plane_sel_row.addWidget(self.del_plane_btn)
        sm_layout.addLayout(plane_sel_row)

        nudge_row = QtWidgets.QHBoxLayout()
        nudge_row.setSpacing(4)
        for delta, txt in [(-5, "-5f"), (-1, "-1f"), (1, "+1f"), (5, "+5f")]:
            n_btn = QtWidgets.QPushButton(txt)
            n_btn.setFixedWidth(34)
            n_btn.clicked.connect(lambda checked=False, d=delta: self.nudge_selected_plane(d))
            nudge_row.addWidget(n_btn)

        self.reset_zero_btn = QtWidgets.QPushButton("⏮ 0f")
        self.reset_zero_btn.setFixedWidth(44)
        self.reset_zero_btn.setToolTip("Reset reference plane start to Maya frame 0")
        self.reset_zero_btn.clicked.connect(self.reset_selected_plane_to_zero)
        nudge_row.addWidget(self.reset_zero_btn)

        self.plane_offset_lbl = QtWidgets.QLabel("Offset: 0f")
        nudge_row.addWidget(self.plane_offset_lbl)
        nudge_row.addStretch()
        sm_layout.addLayout(nudge_row)

        quick_row = QtWidgets.QHBoxLayout()
        quick_row.setSpacing(4)
        self.snap_view_btn = QtWidgets.QPushButton("📍 Snap to View")
        self.snap_view_btn.setToolTip("Move Free 3D Card in front of active viewport camera")
        self.snap_view_btn.clicked.connect(self.snap_selected_plane_to_view)
        quick_row.addWidget(self.snap_view_btn)

        for depth_val, lbl in [(5.0, "Near"), (100.0, "Mid"), (500.0, "BG")]:
            d_btn = QtWidgets.QPushButton(lbl)
            d_btn.setFixedWidth(42)
            d_btn.setToolTip("Set imagePlane depth to {}".format(int(depth_val)))
            d_btn.clicked.connect(lambda checked=False, dv=depth_val: self.set_selected_plane_depth(dv))
            quick_row.addWidget(d_btn)

        self.compare_btn = QtWidgets.QPushButton("🎬 Compare")
        self.compare_btn.setToolTip("Open Playblast Compare with current reference clip")
        self.compare_btn.clicked.connect(self.send_selected_to_compare)
        quick_row.addWidget(self.compare_btn)
        sm_layout.addLayout(quick_row)

        self.detail_layout.addWidget(self.scene_mgr_box)
        self.refresh_scene_planes()

        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setVisible(False)
        self.detail_layout.addWidget(self.progress_bar)

        self.import_btn = QtWidgets.QPushButton("+ Put Reference in Maya Scene")
        self.import_btn.setObjectName("PrimaryBtn")
        self.import_btn.setEnabled(False)
        self.import_btn.clicked.connect(self.on_import_clicked)
        self.detail_layout.addWidget(self.import_btn)

        drawer_scroll.setWidget(drawer_content)
        panel_layout.addWidget(drawer_scroll, stretch=1)

        return self.inspector_panel

    def _get_selected_scene_plane_node(self):
        if not hasattr(self, "scene_plane_combo") or self.scene_plane_combo.count() == 0:
            return None
        return self.scene_plane_combo.currentData()

    def refresh_scene_planes(self):
        if not hasattr(self, "scene_plane_combo"):
            return
        planes = []
        if hasattr(animref_importer, "list_scene_animref_planes"):
            try:
                planes = animref_importer.list_scene_animref_planes()
            except Exception:
                planes = []
        cur_node = self.scene_plane_combo.currentData()
        self.scene_plane_combo.blockSignals(True)
        self.scene_plane_combo.clear()
        selected_idx = 0
        for idx, p in enumerate(planes):
            label = "{} ({})".format(p.get("title") or p["node"], p["node"])
            self.scene_plane_combo.addItem(label, p["node"])
            if p["node"] == cur_node:
                selected_idx = idx
        if planes:
            self.scene_plane_combo.setCurrentIndex(selected_idx)
            p = planes[selected_idx]
            if hasattr(self, "plane_offset_lbl"):
                self.plane_offset_lbl.setText("Offset: {:+d}f".format(int(p.get("frame_offset", 0))))
        else:
            if hasattr(self, "plane_offset_lbl"):
                self.plane_offset_lbl.setText("Offset: 0f")
        self.scene_plane_combo.blockSignals(False)

    def on_live_pip_changed(self, preset_label):
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "apply_pip_preset"):
            animref_importer.apply_pip_preset(node, preset_label)

    def on_live_opacity_changed(self, val):
        if hasattr(self, "opacity_val_lbl"):
            self.opacity_val_lbl.setText("{}%".format(int(val)))
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "set_plane_opacity"):
            animref_importer.set_plane_opacity(node, float(val) / 100.0)

    def on_live_mirror_toggled(self, checked):
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "toggle_plane_mirror"):
            animref_importer.toggle_plane_mirror(node, mirrored=bool(checked))

    def nudge_selected_plane(self, delta_frames):
        self.refresh_scene_planes()
        node = self._get_selected_scene_plane_node()
        if not node:
            return
        new_off = animref_importer.nudge_plane_offset(node, delta_frames)
        if hasattr(self, "plane_offset_lbl"):
            self.plane_offset_lbl.setText("Offset: {:+d}f".format(int(new_off)))

    def align_active_scene_plane_to_ref_frame(self, ref_frame):
        self.refresh_scene_planes()
        node = self._get_selected_scene_plane_node()
        if not node:
            return
        new_off = animref_importer.sync_plane_to_current_frame(node, ref_frame)
        if hasattr(self, "plane_offset_lbl"):
            self.plane_offset_lbl.setText("Offset: {:+d}f".format(int(new_off)))

    def toggle_selected_plane_visibility(self):
        node = self._get_selected_scene_plane_node()
        if not node:
            return
        animref_importer.toggle_plane_visibility(node)

    def toggle_selected_plane_lock(self):
        node = self._get_selected_scene_plane_node()
        if not node or not hasattr(animref_importer, "toggle_plane_lock"):
            return
        locked = animref_importer.toggle_plane_lock(node)
        if hasattr(self, "lock_plane_btn"):
            self.lock_plane_btn.setText("🔓" if locked else "🔒")

    def focus_selected_plane(self):
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "focus_plane_in_viewport"):
            animref_importer.focus_plane_in_viewport(node)

    def snap_selected_plane_to_view(self):
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "snap_plane_to_active_camera"):
            animref_importer.snap_plane_to_active_camera(node, distance=28.0)

    def reset_selected_plane_to_zero(self):
        node = self._get_selected_scene_plane_node()
        if not node or not hasattr(animref_importer, "reset_plane_to_zero"):
            return
        new_off = animref_importer.reset_plane_to_zero(node)
        if hasattr(self, "plane_offset_lbl"):
            self.plane_offset_lbl.setText("Offset: {:+d}f".format(int(new_off)))

    def set_selected_plane_depth(self, depth_val):
        node = self._get_selected_scene_plane_node()
        if node and hasattr(animref_importer, "set_plane_depth"):
            animref_importer.set_plane_depth(node, depth=float(depth_val))

    def send_selected_to_compare(self):
        if hasattr(self, "sidebar"):
            self.sidebar.set_active_index(2)

    def delete_selected_plane(self):
        node = self._get_selected_scene_plane_node()
        if not node:
            return
        animref_importer.delete_plane(node)
        self.refresh_scene_planes()

    def refresh_cameras_dropdown(self):
        self.cam_combo.clear()
        self.cam_combo.addItem("Free 3D Card (Move in Viewport)")
        self.cam_combo.addItem("Attach to Current Viewport")
        self.cam_combo.addItem("Attach to Camera: persp")
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

    # ==================== SAVED TAB ====================
    def build_saved_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        self.saved_header_lbl = QtWidgets.QLabel("All saves")
        self.saved_scroll = QtWidgets.QScrollArea()
        self.saved_scroll.setWidgetResizable(True)
        self.saved_content = QtWidgets.QWidget()
        self.saved_grid = QtWidgets.QGridLayout(self.saved_content)
        self.saved_scroll.setWidget(self.saved_content)
        layout.addWidget(self.saved_scroll)

    # ==================== MAIN MOODBOARDS & MASONRY CANVAS ====================
    def build_boards_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(8, 6, 8, 8)
        layout.setSpacing(6)

        self.back_to_boards_btn = QtWidgets.QPushButton("← Manage boards")
        self.back_to_boards_btn.setVisible(False)

        # Stacked view:
        # Page 0 = Manage Boards Grid (3-Image Mosaic Board Cover Cards)
        # Page 1 = Pure Rounded Image Cards Masonry Grid (Default view matching screenshot!)
        self.boards_view_stack = QtWidgets.QStackedWidget()

        # Page 0: Manage Boards (3-image mosaic cover cards)
        self.boards_grid_page = QtWidgets.QWidget()
        bg_layout = QtWidgets.QVBoxLayout(self.boards_grid_page)
        bg_layout.setContentsMargins(0, 0, 0, 0)
        self.boards_scroll = QtWidgets.QScrollArea()
        self.boards_scroll.setWidgetResizable(True)
        self.boards_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.boards_content = QtWidgets.QWidget()
        self.boards_grid = QtWidgets.QGridLayout(self.boards_content)
        self.boards_grid.setContentsMargins(2, 2, 2, 2)
        self.boards_grid.setSpacing(8)
        self.boards_scroll.setWidget(self.boards_content)
        bg_layout.addWidget(self.boards_scroll)
        self.boards_view_stack.addWidget(self.boards_grid_page)

        # Page 1: Pure Rounded Image Masonry Grid (Matches screenshot!)
        self.board_detail_page = QtWidgets.QWidget()
        bd_layout = QtWidgets.QVBoxLayout(self.board_detail_page)
        bd_layout.setContentsMargins(0, 0, 0, 0)
        bd_layout.setSpacing(6)

        self.detail_board_title = QtWidgets.QLabel("")
        self.detail_board_title.setVisible(False)
        self.import_all_board_btn = QtWidgets.QPushButton("+ Put Board in Maya")
        self.import_all_board_btn.setVisible(False)

        self.detail_scroll = QtWidgets.QScrollArea()
        self.detail_scroll.setWidgetResizable(True)
        self.detail_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.detail_content = QtWidgets.QWidget()
        self.detail_grid = QtWidgets.QGridLayout(self.detail_content)
        self.detail_grid.setContentsMargins(2, 2, 2, 2)
        self.detail_grid.setSpacing(8)
        self.detail_scroll.setWidget(self.detail_content)
        bd_layout.addWidget(self.detail_scroll, stretch=1)
        self.boards_view_stack.addWidget(self.board_detail_page)

        layout.addWidget(self.boards_view_stack, stretch=1)

    # ==================== PLAYBLAST STUDIO TAB ====================
    def build_playblast_tab(self, parent):
        outer_layout = QtWidgets.QVBoxLayout(parent)
        outer_layout.setContentsMargins(0, 0, 0, 0)
        outer_layout.setSpacing(0)

        self.pb_scroll = QtWidgets.QScrollArea(parent)
        self.pb_scroll.setWidgetResizable(True)
        self.pb_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.pb_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.pb_scroll.setStyleSheet("QScrollArea { background-color: #09090e; border: none; }")

        content = QtWidgets.QWidget()
        content.setStyleSheet("background-color: #09090e;")
        self.pb_main_layout = QtWidgets.QVBoxLayout(content)
        self.pb_main_layout.setContentsMargins(12, 12, 12, 14)
        self.pb_main_layout.setSpacing(12)

        # Header Title & Scene Info Banner
        self.pb_hdr_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.pb_hdr_layout.setSpacing(8)
        hdr_left = QtWidgets.QVBoxLayout()
        hdr_left.setSpacing(2)

        self.pb_title_lbl = QtWidgets.QLabel("Playblast & Export")
        self.pb_title_lbl.setWordWrap(True)
        self.pb_title_lbl.setStyleSheet("font-size: 17px; font-weight: 800; color: #f4f4f5; border: none;")
        hdr_left.addWidget(self.pb_title_lbl)

        self.pb_subtitle_lbl = QtWidgets.QLabel("Record your active Maya scene to MP4 or AVI and upload directly to AnimationReference.org")
        self.pb_subtitle_lbl.setWordWrap(True)
        self.pb_subtitle_lbl.setStyleSheet("font-size: 11px; color: #a1a1aa; font-weight: 500; border: none;")
        hdr_left.addWidget(self.pb_subtitle_lbl)
        self.pb_hdr_layout.addLayout(hdr_left, stretch=1)

        self.pb_info_lbl = QtWidgets.QLabel("Camera: persp  |  Timeline: 1 - 120 (24 fps)")
        self.pb_info_lbl.setWordWrap(True)
        self.pb_info_lbl.setStyleSheet(
            "background-color: #111119; color: #f4f4f5; font-size: 11px; font-weight: 700; padding: 6px 10px; border-radius: 10px; border: 1px solid #272736;"
        )
        self.pb_hdr_layout.addWidget(self.pb_info_lbl)
        self.pb_main_layout.addLayout(self.pb_hdr_layout)

        # Card 1: Playblast Settings & 1-Click MP4 / AVI Record
        card = QtWidgets.QFrame()
        card.setObjectName("PlayblastSettingsCard")
        card.setStyleSheet("""
            QFrame#PlayblastSettingsCard {
                background-color: #111119;
                border-radius: 14px;
                border: 1px solid #272736;
            }
        """)
        card_layout = QtWidgets.QVBoxLayout(card)
        card_layout.setContentsMargins(12, 12, 12, 12)
        card_layout.setSpacing(10)

        ctrl_style = (
            "background-color: #111119; color: #f4f4f5; border: 1px solid #272736; "
            "border-radius: 8px; padding: 4px 8px; font-weight: 600; font-size: 11px;"
        )

        # Row 1: Camera, Resolution & Format (MP4 / AVI)
        self.pb_row1_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.pb_row1_layout.setSpacing(8)

        cam_box = QtWidgets.QHBoxLayout()
        cam_box.setSpacing(6)
        cam_lbl = QtWidgets.QLabel("Cam:")
        cam_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        cam_box.addWidget(cam_lbl)
        self.pb_cam_combo = QtWidgets.QComboBox()
        self.pb_cam_combo.addItem("Active Viewport", "")
        self.pb_cam_combo.setMinimumWidth(0)
        self.pb_cam_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToMinimumContentsLengthWithIcon)
        self.pb_cam_combo.setStyleSheet(ctrl_style)
        cam_box.addWidget(self.pb_cam_combo, stretch=1)
        self.pb_row1_layout.addLayout(cam_box, stretch=1)

        res_box = QtWidgets.QHBoxLayout()
        res_box.setSpacing(6)
        res_lbl = QtWidgets.QLabel("Res:")
        res_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        res_box.addWidget(res_lbl)
        self.pb_res_combo = QtWidgets.QComboBox()
        self.pb_res_combo.addItems(["1280x720 (HD)", "1920x1080 (Full HD)", "960x540 (Preview)"])
        self.pb_res_combo.setMinimumWidth(0)
        self.pb_res_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToMinimumContentsLengthWithIcon)
        self.pb_res_combo.setStyleSheet(ctrl_style)
        res_box.addWidget(self.pb_res_combo, stretch=1)
        self.pb_row1_layout.addLayout(res_box, stretch=1)

        fmt_box = QtWidgets.QHBoxLayout()
        fmt_box.setSpacing(6)
        fmt_lbl = QtWidgets.QLabel("Format:")
        fmt_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        fmt_box.addWidget(fmt_lbl)
        self.pb_format_combo = QtWidgets.QComboBox()
        self.pb_format_combo.addItems(["MP4 (H.264)", "AVI"])
        self.pb_format_combo.setMinimumWidth(0)
        self.pb_format_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToMinimumContentsLengthWithIcon)
        self.pb_format_combo.setStyleSheet(ctrl_style)
        fmt_box.addWidget(self.pb_format_combo, stretch=1)
        self.pb_row1_layout.addLayout(fmt_box)
        card_layout.addLayout(self.pb_row1_layout)

        # Row 2: Frames Range, Timeline Sync & HUD Options
        self.pb_row2_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.pb_row2_layout.setSpacing(8)

        frames_box = QtWidgets.QHBoxLayout()
        frames_box.setSpacing(5)
        range_lbl = QtWidgets.QLabel("Frames:")
        range_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        frames_box.addWidget(range_lbl)
        self.pb_start_spin = QtWidgets.QSpinBox()
        self.pb_start_spin.setRange(-10000, 100000)
        self.pb_start_spin.setValue(1)
        self.pb_start_spin.setMinimumWidth(52)
        self.pb_start_spin.setStyleSheet(ctrl_style)
        frames_box.addWidget(self.pb_start_spin, stretch=1)

        dash_lbl = QtWidgets.QLabel("–")
        dash_lbl.setStyleSheet("color: #a1a1aa; font-weight: bold; border: none;")
        frames_box.addWidget(dash_lbl)

        self.pb_end_spin = QtWidgets.QSpinBox()
        self.pb_end_spin.setRange(-10000, 100000)
        self.pb_end_spin.setValue(120)
        self.pb_end_spin.setMinimumWidth(52)
        self.pb_end_spin.setStyleSheet(ctrl_style)
        frames_box.addWidget(self.pb_end_spin, stretch=1)
        self.pb_row2_layout.addLayout(frames_box)

        sync_hud_box = QtWidgets.QHBoxLayout()
        sync_hud_box.setSpacing(8)
        self.pb_sync_range_btn = QtWidgets.QPushButton("↻ Sync Timeline")
        self.pb_sync_range_btn.setToolTip("Auto-detect active camera and frame range from Maya timeline")
        self.pb_sync_range_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.pb_sync_range_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; "
            "border-radius: 8px; padding: 4px 10px; font-weight: 700; font-size: 11px; }"
            "QPushButton:hover { background-color: #232334; border-color: #4c4c66; }"
        )
        self.pb_sync_range_btn.clicked.connect(self.refresh_playblast_timeline_info)
        sync_hud_box.addWidget(self.pb_sync_range_btn)

        self.pb_ornaments_check = QtWidgets.QCheckBox("Show HUD")
        self.pb_ornaments_check.setStyleSheet("color: #a1a1aa; font-size: 11px; font-weight: 600; border: none;")
        self.pb_ornaments_check.setChecked(False)
        sync_hud_box.addWidget(self.pb_ornaments_check)
        sync_hud_box.addStretch()
        self.pb_row2_layout.addLayout(sync_hud_box, stretch=1)
        card_layout.addLayout(self.pb_row2_layout)

        # Row 3: Action Buttons
        self.pb_btn_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.pb_btn_layout.setSpacing(8)

        self.record_pb_btn = QtWidgets.QPushButton("🎬 Record Playblast")
        self.record_pb_btn.setMinimumHeight(36)
        self.record_pb_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.record_pb_btn.setStyleSheet(
            "QPushButton { background-color: #7c3aed; color: #FFFFFF; border: none; border-radius: 18px; "
            "padding: 0 14px; font-weight: 800; font-size: 12px; }"
            "QPushButton:hover { background-color: #8b5cf6; }"
            "QPushButton:disabled { background-color: #93C5FD; color: #FFFFFF; }"
        )
        self.record_pb_btn.clicked.connect(self.run_playblast_capture)
        self.pb_btn_layout.addWidget(self.record_pb_btn, stretch=2)

        self.export_mp4_btn = QtWidgets.QPushButton("💾 Export As...")
        self.export_mp4_btn.setMinimumHeight(36)
        self.export_mp4_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.export_mp4_btn.setToolTip("Save your playblast to Desktop or any custom folder as MP4 or AVI")
        self.export_mp4_btn.setStyleSheet(
            "QPushButton { background-color: #7c3aed; color: #FFFFFF; border: none; border-radius: 18px; "
            "padding: 0 14px; font-weight: 800; font-size: 12px; }"
            "QPushButton:hover { background-color: #27272a; }"
            "QPushButton:disabled { background-color: #a1a1aa; color: #FFFFFF; }"
        )
        self.export_mp4_btn.clicked.connect(self.export_playblast_mp4)
        self.pb_btn_layout.addWidget(self.export_mp4_btn, stretch=1)

        self.open_pb_folder_btn = QtWidgets.QPushButton("📁 Open Folder")
        self.open_pb_folder_btn.setMinimumHeight(36)
        self.open_pb_folder_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.open_pb_folder_btn.setToolTip("Open playblast output folder in Explorer")
        self.open_pb_folder_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; "
            "border-radius: 18px; padding: 0 12px; font-weight: 700; font-size: 11px; }"
            "QPushButton:hover { background-color: #232334; border-color: #4c4c66; }"
        )
        self.open_pb_folder_btn.clicked.connect(self.open_playblast_folder)
        self.pb_btn_layout.addWidget(self.open_pb_folder_btn)
        card_layout.addLayout(self.pb_btn_layout)

        self.pb_progress = QtWidgets.QProgressBar()
        self.pb_progress.setVisible(False)
        card_layout.addWidget(self.pb_progress)

        self.pb_status_lbl = QtWidgets.QLabel("Ready — choose MP4 or AVI and click 'Record Playblast' or 'Export As...'.")
        self.pb_status_lbl.setStyleSheet(
            "background-color: #111119; border: 1px solid #272736; border-radius: 10px; "
            "padding: 8px 10px; color: #334155; font-size: 11px; font-weight: 600;"
        )
        self.pb_status_lbl.setWordWrap(True)
        card_layout.addWidget(self.pb_status_lbl)

        self.pb_main_layout.addWidget(card)

        # Card 2: Auto-Import / Upload to AnimationReference.org
        upload_card = QtWidgets.QFrame()
        upload_card.setObjectName("PlayblastUploadCard")
        upload_card.setStyleSheet("""
            QFrame#PlayblastUploadCard {
                background-color: #111119;
                border-radius: 14px;
                border: 1px solid #272736;
            }
        """)
        uc_layout = QtWidgets.QVBoxLayout(upload_card)
        uc_layout.setContentsMargins(12, 12, 12, 12)
        uc_layout.setSpacing(10)

        uc_title = QtWidgets.QLabel("Import to AnimationReference.org")
        uc_title.setWordWrap(True)
        uc_title.setStyleSheet("font-size: 14px; font-weight: 800; color: #f4f4f5; border: none;")
        uc_layout.addWidget(uc_title)

        uc_sub = QtWidgets.QLabel("Publish your Maya playblast directly to AnimationReference.org and optionally save it to a board.")
        uc_sub.setWordWrap(True)
        uc_sub.setStyleSheet("font-size: 11px; color: #a1a1aa; font-weight: 500; border: none;")
        uc_layout.addWidget(uc_sub)

        self.pb_upload_row_layout = QtWidgets.QBoxLayout(QtWidgets.QBoxLayout.LeftToRight)
        self.pb_upload_row_layout.setSpacing(8)

        title_box = QtWidgets.QHBoxLayout()
        title_box.setSpacing(6)
        t_lbl = QtWidgets.QLabel("Title:")
        t_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        title_box.addWidget(t_lbl)
        self.pb_upload_title = QtWidgets.QLineEdit()
        self.pb_upload_title.setPlaceholderText("Maya Playblast")
        self.pb_upload_title.setStyleSheet(ctrl_style)
        title_box.addWidget(self.pb_upload_title, stretch=1)
        self.pb_upload_row_layout.addLayout(title_box, stretch=1)

        board_box = QtWidgets.QHBoxLayout()
        board_box.setSpacing(6)
        b_lbl = QtWidgets.QLabel("Board:")
        b_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #f4f4f5; border: none;")
        board_box.addWidget(b_lbl)
        self.pb_upload_board_combo = QtWidgets.QComboBox()
        self.pb_upload_board_combo.addItem("Library Only (No Board)", "")
        self.pb_upload_board_combo.setMinimumWidth(0)
        self.pb_upload_board_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToMinimumContentsLengthWithIcon)
        self.pb_upload_board_combo.setStyleSheet(ctrl_style)
        board_box.addWidget(self.pb_upload_board_combo, stretch=1)
        self.pb_upload_row_layout.addLayout(board_box, stretch=1)
        uc_layout.addLayout(self.pb_upload_row_layout)

        self.pb_auto_upload_check = QtWidgets.QCheckBox("Auto-post to AnimationReference.org Portfolio & Feed right after recording")
        self.pb_auto_upload_check.setStyleSheet("color: #f4f4f5; font-size: 11px; font-weight: 600; border: none;")
        self.pb_auto_upload_check.setChecked(False)
        uc_layout.addWidget(self.pb_auto_upload_check)

        self.upload_pb_btn = QtWidgets.QPushButton("☁️ Upload Playblast to AnimationReference.org")
        self.upload_pb_btn.setMinimumHeight(38)
        self.upload_pb_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.upload_pb_btn.setStyleSheet(
            "QPushButton { background-color: #059669; color: #FFFFFF; border: none; border-radius: 19px; "
            "padding: 0 16px; font-weight: 800; font-size: 12px; }"
            "QPushButton:hover { background-color: #34d399; }"
            "QPushButton:disabled { background-color: #a7f3d0; color: #6ee7b7; }"
        )
        self.upload_pb_btn.clicked.connect(self.run_playblast_upload)
        uc_layout.addWidget(self.upload_pb_btn)

        self.pb_upload_link_lbl = QtWidgets.QLabel("")
        self.pb_upload_link_lbl.setVisible(False)
        self.pb_upload_link_lbl.setWordWrap(True)
        self.pb_upload_link_lbl.setOpenExternalLinks(True)
        self.pb_upload_link_lbl.setStyleSheet(
            "background-color: rgba(16, 185, 129, 0.14); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 10px; "
            "padding: 8px 10px; color: #6ee7b7; font-size: 11px; font-weight: 700;"
        )
        uc_layout.addWidget(self.pb_upload_link_lbl)

        self.pb_main_layout.addWidget(upload_card)
        self.pb_main_layout.addStretch()

        self.compare_card = QtWidgets.QFrame()
        self.compare_card.setVisible(False)
        self.comp_link_lbl = QtWidgets.QLabel("")
        self.open_compare_btn = QtWidgets.QPushButton("")

        self.pb_scroll.setWidget(content)
        outer_layout.addWidget(self.pb_scroll)

    def _update_playblast_responsive_layout(self):
        if not hasattr(self, "pb_scroll") or not self.pb_scroll:
            return
        vp = self.pb_scroll.viewport()
        w = vp.width() if vp and vp.width() > 0 else self.width()
        is_narrow = w < 480
        is_very_narrow = w < 380

        if hasattr(self, "pb_main_layout"):
            m = 8 if is_very_narrow else (12 if is_narrow else 20)
            self.pb_main_layout.setContentsMargins(m, m, m, m)
        if hasattr(self, "pb_hdr_layout"):
            self.pb_hdr_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "pb_row1_layout"):
            self.pb_row1_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "pb_row2_layout"):
            self.pb_row2_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "pb_btn_layout"):
            self.pb_btn_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "pb_upload_row_layout"):
            self.pb_upload_row_layout.setDirection(QtWidgets.QBoxLayout.TopToBottom if is_narrow else QtWidgets.QBoxLayout.LeftToRight)
        if hasattr(self, "pb_subtitle_lbl"):
            self.pb_subtitle_lbl.setVisible(not is_very_narrow)

    # ==================== ACCOUNT TAB ====================
    def build_account_tab(self, parent):
        outer = QtWidgets.QVBoxLayout(parent)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.setSpacing(0)

        acc_scroll = QtWidgets.QScrollArea(parent)
        acc_scroll.setWidgetResizable(True)
        acc_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        acc_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)

        content = QtWidgets.QWidget()
        layout = QtWidgets.QVBoxLayout(content)
        layout.setContentsMargins(14, 14, 14, 16)
        layout.setSpacing(12)

        title = QtWidgets.QLabel("AnimationReference.org Account")
        title.setWordWrap(True)
        title.setStyleSheet("font-size: 17px; font-weight: 800; color: #f4f4f5;")
        layout.addWidget(title)

        self.login_box = QtWidgets.QFrame()
        self.login_box.setStyleSheet("background-color: #111119; border-radius: 14px; border: 1px solid #272736; padding: 14px;")
        l_layout = QtWidgets.QVBoxLayout(self.login_box)
        l_layout.setSpacing(10)

        l_desc = QtWidgets.QLabel("Sign in with your AnimationReference.org account to sync your Moodboards, Saved references, and upload playblasts directly from Maya.")
        l_desc.setStyleSheet("color: #52525b; font-size: 12px; border: none;")
        l_desc.setWordWrap(True)
        l_layout.addWidget(l_desc)

        # Prominent Instant Browser Sign-In Button (Automatic 1-click connect!)
        self.browser_login_btn = QtWidgets.QPushButton("🌐   Sign In with AnimationReference.org")
        self.browser_login_btn.setObjectName("PrimaryBtn")
        self.browser_login_btn.setFixedHeight(44)
        self.browser_login_btn.setCursor(QtCore.Qt.PointingHandCursor)
        self.browser_login_btn.setToolTip("Opens animationreference.org in your browser and signs you in automatically!")
        self.browser_login_btn.setStyleSheet("""
            QPushButton#PrimaryBtn {
                background-color: #7c3aed;
                color: #ffffff;
                font-size: 13px;
                font-weight: 700;
                border-radius: 22px;
                padding: 10px 24px;
            }
            QPushButton#PrimaryBtn:hover {
                background-color: #8b5cf6;
            }
        """)
        self.browser_login_btn.clicked.connect(self.launch_browser_sign_in)
        l_layout.addWidget(self.browser_login_btn)

        self.browser_sync_status = QtWidgets.QLabel("")
        self.browser_sync_status.setStyleSheet("color: #059669; font-size: 11px; font-weight: 600;")
        self.browser_sync_status.setAlignment(QtCore.Qt.AlignCenter)
        l_layout.addWidget(self.browser_sync_status)

        sep_lbl = QtWidgets.QLabel("— OR SIGN IN WITH EMAIL & PASSWORD —")
        sep_lbl.setAlignment(QtCore.Qt.AlignCenter)
        sep_lbl.setStyleSheet("color: #71717a; font-size: 10px; font-weight: 700; margin-top: 6px;")
        l_layout.addWidget(sep_lbl)

        self.email_input = QtWidgets.QLineEdit()
        self.email_input.setPlaceholderText("Email address...")
        l_layout.addWidget(self.email_input)

        self.pass_input = QtWidgets.QLineEdit()
        self.pass_input.setPlaceholderText("Password...")
        self.pass_input.setEchoMode(QtWidgets.QLineEdit.Password)
        l_layout.addWidget(self.pass_input)

        self.login_btn = QtWidgets.QPushButton("Sign In with Email")
        self.login_btn.setFixedHeight(36)
        self.login_btn.clicked.connect(self.handle_sign_in)
        l_layout.addWidget(self.login_btn)

        token_row = QtWidgets.QHBoxLayout()
        self.token_input = QtWidgets.QLineEdit()
        self.token_input.setPlaceholderText("Or paste connect token here...")
        token_row.addWidget(self.token_input, stretch=1)

        self.token_login_btn = QtWidgets.QPushButton("Connect")
        self.token_login_btn.clicked.connect(self.handle_token_sign_in)
        token_row.addWidget(self.token_login_btn)
        l_layout.addLayout(token_row)

        self.login_status = QtWidgets.QLabel("")
        self.login_status.setStyleSheet("color: #dc2626; font-size: 11px;")
        l_layout.addWidget(self.login_status)

        layout.addWidget(self.login_box)

        self.profile_box = QtWidgets.QFrame()
        self.profile_box.setStyleSheet("background-color: #111119; border-radius: 16px; border: 1px solid #272736; padding: 24px;")
        p_layout = QtWidgets.QVBoxLayout(self.profile_box)
        p_layout.setSpacing(10)

        self.profile_name_lbl = QtWidgets.QLabel("Signed in as:")
        self.profile_name_lbl.setStyleSheet("font-size: 16px; font-weight: 700; color: #f4f4f5;")
        p_layout.addWidget(self.profile_name_lbl)

        self.profile_email_lbl = QtWidgets.QLabel("")
        self.profile_email_lbl.setStyleSheet("color: #a1a1aa;")
        p_layout.addWidget(self.profile_email_lbl)

        self.pro_badge = QtWidgets.QLabel("PRO MEMBER")
        self.pro_badge.setStyleSheet("background-color: #7c3aed; color: #ffffff; font-weight: 800; padding: 4px 10px; border-radius: 8px;")
        self.pro_badge.setFixedWidth(110)
        p_layout.addWidget(self.pro_badge)

        self.sign_out_btn = QtWidgets.QPushButton("Sign Out")
        self.sign_out_btn.clicked.connect(self.handle_sign_out)
        p_layout.addWidget(self.sign_out_btn)

        layout.addWidget(self.profile_box)

        self.cache_box = QtWidgets.QFrame()
        self.cache_box.setStyleSheet("background-color: #111119; border: 1px solid #272736; border-radius: 14px;")
        c_layout = QtWidgets.QVBoxLayout(self.cache_box)
        c_layout.setContentsMargins(14, 12, 14, 12)
        c_layout.setSpacing(8)

        c_title = QtWidgets.QLabel("Storage & Media Cache")
        c_title.setStyleSheet("font-size: 13px; font-weight: 800; color: #f4f4f5; border: none;")
        c_layout.addWidget(c_title)

        self.cache_stats_lbl = QtWidgets.QLabel("Calculating cache size...")
        self.cache_stats_lbl.setWordWrap(True)
        self.cache_stats_lbl.setStyleSheet("color: #71717a; font-size: 11px; border: none;")
        c_layout.addWidget(self.cache_stats_lbl)

        c_btn_row = QtWidgets.QHBoxLayout()
        self.refresh_cache_btn = QtWidgets.QPushButton("Refresh Stats")
        self.refresh_cache_btn.clicked.connect(self.refresh_cache_stats)
        c_btn_row.addWidget(self.refresh_cache_btn)

        self.clear_cache_btn = QtWidgets.QPushButton("Clear Video Cache")
        self.clear_cache_btn.setStyleSheet(
            "QPushButton { background-color: #161622; color: #f4f4f5; border: 1px solid #272736; border-radius: 8px; padding: 6px 12px; font-weight: 600; }"
            "QPushButton:hover { background-color: #232334; }"
        )
        self.clear_cache_btn.clicked.connect(self.handle_clear_cache)
        c_btn_row.addWidget(self.clear_cache_btn)
        c_btn_row.addStretch()
        c_layout.addLayout(c_btn_row)

        layout.addWidget(self.cache_box)
        layout.addStretch()
        acc_scroll.setWidget(content)
        outer.addWidget(acc_scroll)
        self.refresh_cache_stats()

    def refresh_cache_stats(self):
        if not hasattr(self, "cache_stats_lbl") or not hasattr(animref_api, "get_cache_stats"):
            return
        try:
            stats = animref_api.get_cache_stats()
            mb = stats.get("total_bytes", 0) / (1024.0 * 1024.0)
            self.cache_stats_lbl.setText(
                "{:.1f} MB cached  •  {} videos  •  {} thumbnails\n{}".format(
                    mb, stats.get("video_count", 0), stats.get("thumb_count", 0), stats.get("cache_dir", "")
                )
            )
        except Exception as e:
            self.cache_stats_lbl.setText("Cache stats unavailable: {}".format(e))

    def handle_clear_cache(self):
        if not hasattr(animref_api, "clear_media_cache"):
            return
        removed = animref_api.clear_media_cache(clear_thumbs=False)
        self.refresh_cache_stats()
        if hasattr(self, "sync_badge") and self.sync_badge:
            self.sync_badge.setText("Cleared {} cached files".format(removed))

    # ==================== DATA & ACTIONS ====================
    def force_sync_boards_and_saves(self):
        if hasattr(self, "sync_badge"):
            self.sync_badge.setText("↻  Syncing Boards...")
        self.load_saved_data(force_refresh=True)
        self.load_boards_data(force_refresh=True)
        QtCore.QTimer.singleShot(1200, lambda: self.sync_badge.setText("🛡  Maya Viewport Ready") if hasattr(self, "sync_badge") else None)

    def update_user_header(self):
        user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else animref_auth.get_current_user()
        if user:
            name = user.get("displayName") or user.get("email") or "User"
            initials = "".join([part[0].upper() for part in name.split()[:2]]) or "AR"
            self.sidebar.user_name_lbl.setText(name[:16])
            self.sidebar.user_badge_lbl.setText("Signed in • Synced")
            self.sidebar.avatar_lbl.setText(initials)
            self.login_box.setVisible(False)
            self.profile_box.setVisible(True)
            self.profile_name_lbl.setText("Signed in as: " + name)
            self.profile_email_lbl.setText(user.get("email", ""))
            if hasattr(self, "_clip_poll_timer") and self._clip_poll_timer.isActive():
                self._clip_poll_timer.stop()
        else:
            self.sidebar.user_name_lbl.setText("Sign In")
            self.sidebar.user_badge_lbl.setText("Sync your Boards")
            self.sidebar.avatar_lbl.setText("AR")
            self.login_box.setVisible(True)
            self.profile_box.setVisible(False)

    def launch_browser_sign_in(self):
        """
        Opens animationreference.org in user's default browser and starts
        localhost loopback + clipboard listeners to sign in automatically!
        """
        if hasattr(self, "browser_sync_status"):
            self.browser_sync_status.setText("🌐 Opening browser to sign in on AnimationReference.org...")
        if hasattr(self, "sync_badge"):
            self.sync_badge.setText("🌐 Signing in via browser...")

        if hasattr(self, "_clip_poll_timer") and not self._clip_poll_timer.isActive():
            self._clip_poll_timer.start()

        def _on_connected(res):
            QtCore.QTimer.singleShot(0, lambda: self.on_sign_in_complete(res))

        try:
            animref_auth.start_browser_auth_flow(on_complete_callback=_on_connected, open_browser=True)
            if hasattr(self, "browser_sync_status"):
                self.browser_sync_status.setText("Waiting for browser sign in... Maya will connect automatically!")
        except Exception as e:
            try:
                webbrowser.open(getattr(animref_auth, "BROWSER_CONNECT_URL", "https://animationreference.org/extension/connect"))
            except Exception:
                pass

    def _check_clipboard_for_auth_token(self):
        """Checks clipboard for copied 1-click connect tokens from AnimationReference.org/extension/connect."""
        user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else None
        if user:
            if hasattr(self, "_clip_poll_timer") and self._clip_poll_timer.isActive():
                self._clip_poll_timer.stop()
            return

        try:
            clipboard = QtWidgets.QApplication.clipboard()
            text = (clipboard.text() or "").strip()
            if text and text != getattr(self, "_last_checked_clipboard", ""):
                self._last_checked_clipboard = text
                if hasattr(animref_auth, "is_probable_connect_token") and animref_auth.is_probable_connect_token(text):
                    if hasattr(self, "browser_sync_status"):
                        self.browser_sync_status.setText("✓ Detected sign-in code from browser! Connecting...")
                    res = animref_auth.sign_in_with_token(text)
                    self.on_sign_in_complete(res)
        except Exception:
            pass

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

    def handle_token_sign_in(self):
        token_str = self.token_input.text().strip() if hasattr(self, "token_input") else ""
        if not token_str:
            self.login_status.setText("Please paste a connect token from animationreference.org/extension/connect.")
            return
        self.token_login_btn.setEnabled(False)
        self.token_login_btn.setText("Connecting...")

        def _worker():
            res = animref_auth.sign_in_with_token(token_str)
            QtCore.QTimer.singleShot(0, lambda: self.on_sign_in_complete(res))

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_sign_in_complete(self, res):
        self.login_btn.setEnabled(True)
        self.login_btn.setText("Sign In with Email")
        if hasattr(self, "token_login_btn"):
            self.token_login_btn.setEnabled(True)
            self.token_login_btn.setText("Connect Token")
        if res.get("success"):
            self.login_status.setText("")
            self.update_user_header()
            self.sidebar.set_active_index(0)
            self.load_saved_data(force_refresh=True)
            self.load_boards_data(force_refresh=True)

            # Auto-resume reference import if user was waiting on sign-in!
            pending = getattr(self, "_pending_import_video", None)
            if pending:
                self._pending_import_video = None
                QtCore.QTimer.singleShot(600, lambda: self.run_import(pending))
        else:
            self.login_status.setText("Login failed: " + res.get("error", "Unknown error"))

    def handle_sign_out(self):
        animref_auth.sign_out()
        self.update_user_header()
        self.saved_card_widgets = {}
        self.boards_card_widgets = {}
        self._saved_rendered_ids = []
        self._boards_rendered_keys = []
        self._boards_rendered_ids = []
        self._last_saved_fetch_time = 0
        self._last_boards_fetch_time = 0
        self.load_boards_data(force_refresh=True)

    def _build_starter_boards_from_catalog(self):
        catalog = getattr(self, "_catalog_cache", None) or []
        if not catalog:
            try:
                if hasattr(animref_api, "peek_cached_catalog"):
                    catalog = animref_api.peek_cached_catalog() or []
                else:
                    catalog = animref_api.load_catalog() or []
                self._catalog_cache = catalog
            except Exception:
                catalog = []

        if not catalog:
            return []

        buckets = [
            ("starter_moodboard_1", "Moodboard 1", ["walk", "run", "locomotion", "sprint", "jog", "cycle", "jump"]),
            ("starter_moodboard_2", "Moodboard 2", ["combat", "fight", "sword", "attack", "acting", "pose", "character"]),
            ("starter_3d_refs", "3D & ArtStation Refs", ["3d", "creature", "turnaround", "mechanics"]),
        ]

        starter_boards = []
        used_ids = set()
        for b_id, b_name, keywords in buckets:
            matched = []
            for item in catalog:
                text = ((item.get("title") or "") + " " + " ".join(item.get("tags") or [])).lower()
                if any(k in text for k in keywords) and item.get("id") not in used_ids:
                    matched.append(item)
                    used_ids.add(item.get("id"))
                if len(matched) >= 12:
                    break
            if len(matched) < 5:
                for item in catalog:
                    if item.get("id") not in used_ids:
                        matched.append(item)
                        used_ids.add(item.get("id"))
                    if len(matched) >= 8:
                        break
            if matched:
                starter_boards.append({
                    "id": b_id,
                    "name": b_name,
                    "itemCount": len(matched),
                    "items": matched,
                    "isStarter": True,
                })

        return starter_boards

    def load_saved_data(self, force_refresh=False):
        user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else animref_auth.get_current_user()
        if not user:
            return
        cached = animref_auth.get_cached_saved_references(user.get("uid"))
        if cached and (cached.get("saved") or cached.get("liked")):
            self.on_saved_data_ready(cached.get("saved", []), cached.get("liked", []), is_cached=True)

        def _worker():
            try:
                data = animref_auth.get_saved_references(force_refresh=force_refresh)
                self.saved_loaded.emit(data.get("saved", []), data.get("liked", []))
            except Exception:
                pass

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_saved_data_ready(self, saved, liked, is_cached=False):
        all_vids = (saved or []) + (liked or [])
        self._all_saves_items = all_vids
        if hasattr(self, "sidebar"):
            self.sidebar.set_all_saves_count(len(all_vids))
        if getattr(self.sidebar, "active_board_id", None) == "__all_saves__" and all_vids:
            self.show_board_detail({
                "id": "__all_saves__",
                "name": "All saves",
                "items": all_vids,
            })

    def load_boards_data(self, force_refresh=False):
        user = animref_auth.get_cached_user_fast() if hasattr(animref_auth, "get_cached_user_fast") else animref_auth.get_current_user()
        if not user:
            starter = self._build_starter_boards_from_catalog()
            self.on_boards_data_ready(starter, is_cached=True)
            return

        cached = animref_auth.get_cached_moodboards(user.get("uid"))
        if cached:
            self.on_boards_data_ready(cached, is_cached=True)

        def _worker():
            try:
                boards = animref_auth.get_user_moodboards(force_refresh=force_refresh)
                self.boards_loaded.emit(boards)
            except Exception:
                pass

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_board_search_changed(self, text):
        self._pending_board_search_text = text or ""
        if hasattr(self, "_board_search_timer"):
            self._board_search_timer.start()
        else:
            self._execute_board_search()

    def _execute_board_search(self):
        query = (getattr(self, "_pending_board_search_text", "") or "").strip().lower()
        if self.boards_view_stack.currentIndex() == 0:
            all_boards = getattr(self, "_cached_boards_list", [])
            if not query:
                filtered = all_boards
            else:
                filtered = [
                    b for b in all_boards
                    if query in (b.get("name") or "").lower()
                    or any(query in (it.get("title") or "").lower() for it in b.get("items", []))
                ]
            self._render_boards_cards_grid(filtered)
        else:
            board = getattr(self, "_current_active_board", None)
            if not board:
                return
            items = board.get("items", [])
            if query:
                items = [
                    it for it in items
                    if query in (it.get("title") or "").lower()
                    or any(query in str(t).lower() for t in (it.get("tags") or []))
                ]
            self._render_board_detail_cards(items)

    def show_all_boards_view(self):
        if hasattr(self, "boards_view_stack"):
            self.boards_view_stack.setCurrentIndex(0)
        if hasattr(self, "sidebar"):
            self.sidebar.clear_board_highlight()
        self.boards_header_lbl.setText("Boards")

    def show_board_detail(self, board_data):
        self._current_active_board = board_data
        items = board_data.get("items", [])
        board_name = board_data.get("name") or "Boards"

        if hasattr(self, "sidebar"):
            self.sidebar.highlight_board(board_data.get("id"))

        # Keep top header title as "Boards" when on All saves (matching screenshot!), or show board name
        if board_data.get("id") == "__all_saves__":
            self.boards_header_lbl.setText("Boards")
        else:
            self.boards_header_lbl.setText(board_name)

        self._render_board_detail_cards(items)
        self.boards_view_stack.setCurrentIndex(1)

    def _compute_detail_cols(self):
        viewport_w = self.detail_scroll.viewport().width() if (hasattr(self, "detail_scroll") and self.detail_scroll.viewport()) else 380
        if viewport_w < 260:
            return 1
        elif viewport_w < 440:
            return 2
        elif viewport_w < 660:
            return 3
        else:
            return max(3, viewport_w // 200)

    def _compute_boards_cols(self):
        viewport_w = self.boards_scroll.viewport().width() if (hasattr(self, "boards_scroll") and self.boards_scroll.viewport()) else 380
        if viewport_w < 260:
            return 1
        elif viewport_w < 440:
            return 2
        elif viewport_w < 660:
            return 3
        else:
            return max(3, viewport_w // 210)

    def _render_board_detail_cards(self, items):
        self.boards_card_widgets = {}
        self._current_detail_items = list(items or [])

        if hasattr(self, "detail_scroll") and self.detail_scroll:
            self.detail_scroll.setUpdatesEnabled(False)

        try:
            while self.detail_grid.count():
                item = self.detail_grid.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()

            if not items:
                empty_lbl = QtWidgets.QLabel("Nothing in this board yet. Save references on AnimationReference.org/moodboard and click ↻ Sync!")
                empty_lbl.setStyleSheet("color: #a1a1aa; padding: 30px; font-size: 13px;")
                self.detail_grid.addWidget(empty_lbl, 0, 0)
                return

            cols = self._compute_detail_cols()
            self._last_detail_cols = cols

            viewport_w = self.detail_scroll.viewport().width() if (hasattr(self, "detail_scroll") and self.detail_scroll.viewport()) else 380
            gap = 8
            avail_w = max(130, viewport_w - (cols - 1) * gap - 12)
            target_card_w = max(110, min(280, avail_w // cols))

            # True Pinterest Masonry Column Containers (packs each card into the shortest vertical column!)
            col_layouts = []
            col_heights = [0] * cols
            for c_idx in range(cols):
                col_widget = QtWidgets.QWidget()
                col_widget.setStyleSheet("background: transparent;")
                col_vbox = QtWidgets.QVBoxLayout(col_widget)
                col_vbox.setContentsMargins(0, 0, 0, 0)
                col_vbox.setSpacing(gap)
                self.detail_grid.addWidget(col_widget, 0, c_idx, QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)
                col_layouts.append(col_vbox)

            for idx, item in enumerate(items):
                card = PinterestClipCardWidget(item, index=idx, card_w=target_card_w)
                card.clicked.connect(self.quick_import_video)
                card.double_clicked.connect(self.quick_import_video)
                card.import_requested.connect(self.quick_import_video)
                card.preview_requested.connect(self.select_video_and_show)

                # Pick column with smallest accumulated height for true gap-free masonry packing
                target_col = min(range(cols), key=lambda c: col_heights[c])
                col_layouts[target_col].addWidget(card)
                col_heights[target_col] += card.card_h + gap

                vid = item.get("id")
                if vid:
                    self.boards_card_widgets.setdefault(vid, []).append(card)
                animref_api.get_thumbnail(item, callback=self.thumbnail_worker_callback)

            for c_vbox in col_layouts:
                c_vbox.addStretch()
        finally:
            if hasattr(self, "detail_scroll") and self.detail_scroll:
                self.detail_scroll.setUpdatesEnabled(True)

    def import_current_board_clips(self):
        board = getattr(self, "_current_active_board", None)
        if not board:
            return
        self.batch_import_board(board)

    def batch_import_board(self, board_data):
        items = board_data.get("items", [])
        if not items:
            return
        self.quick_import_video(items[0])

    def on_boards_data_ready(self, boards, is_cached=False):
        if not is_cached:
            self._last_boards_fetch_time = time.time()

        boards = list(boards or [])
        if not boards:
            boards = self._build_starter_boards_from_catalog()

        self._cached_boards_list = boards

        # Collect all unique items across boards + saves for "All saves"
        seen = set()
        combined_saves = []
        for it in (getattr(self, "_all_saves_items", None) or []):
            vid = it.get("id")
            if vid and vid not in seen:
                seen.add(vid)
                combined_saves.append(it)
        for b in boards:
            for it in b.get("items", []):
                vid = it.get("id")
                if vid and vid not in seen:
                    seen.add(vid)
                    combined_saves.append(it)

        if hasattr(self, "sidebar"):
            self.sidebar.set_all_saves_count(len(combined_saves))
            self.sidebar.populate_boards_list(boards)

        self._boards_rendered_ids = [b.get("id") for b in boards]
        self._render_boards_cards_grid(boards)

        # Default initial view: show "All saves" pure image masonry grid (matching user's screenshot!)
        if getattr(self.sidebar, "active_board_id", "__all_saves__") == "__all_saves__":
            self.show_board_detail({
                "id": "__all_saves__",
                "name": "All saves",
                "items": combined_saves,
            })

    def _render_boards_cards_grid(self, boards):
        self._boards_rendered_cards = []
        if hasattr(self, "boards_scroll") and self.boards_scroll:
            self.boards_scroll.setUpdatesEnabled(False)

        try:
            while self.boards_grid.count():
                item = self.boards_grid.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()

            cols = self._compute_boards_cols()
            self._last_boards_cols = cols

            viewport_w = self.boards_scroll.viewport().width() if (hasattr(self, "boards_scroll") and self.boards_scroll.viewport()) else 380
            gap = 8
            avail_w = max(130, viewport_w - (cols - 1) * gap - 12)
            target_card_w = max(110, min(280, avail_w // cols))

            for idx, b in enumerate(boards):
                card = PinterestBoardFolderCard(b, card_w=target_card_w)
                card.open_board_requested.connect(self.show_board_detail)
                card.import_all_requested.connect(self.batch_import_board)
                self.boards_grid.addWidget(card, idx // cols, idx % cols)
                self._boards_rendered_cards.append(card)
                for itm in b.get("items", [])[:3]:
                    animref_api.get_thumbnail(itm, callback=self.thumbnail_worker_callback)
        finally:
            if hasattr(self, "boards_scroll") and self.boards_scroll:
                self.boards_scroll.setUpdatesEnabled(True)

    # ==================== PLAYBLAST EXECUTION ====================
    def refresh_playblast_timeline_info(self):
        info = animref_playblast.get_playblast_info()
        if hasattr(self, "pb_info_lbl"):
            self.pb_info_lbl.setText("Camera: {}  |  Timeline: {} - {}  ({} fps)".format(
                info["camera"], info["start"], info["end"], int(round(info["fps"]))
            ))
        if hasattr(self, "pb_start_spin") and hasattr(self, "pb_end_spin"):
            self.pb_start_spin.setValue(int(info["start"]))
            self.pb_end_spin.setValue(int(info["end"]))
        if hasattr(self, "pb_cam_combo"):
            cur_data = self.pb_cam_combo.currentData()
            self.pb_cam_combo.blockSignals(True)
            self.pb_cam_combo.clear()
            self.pb_cam_combo.addItem("Active Viewport ({})".format(info["camera"]), "")
            if cmds and hasattr(cmds, "listCameras"):
                try:
                    for c in (cmds.listCameras() or []):
                        self.pb_cam_combo.addItem(c, c)
                except Exception:
                    pass
            if cur_data:
                idx = self.pb_cam_combo.findData(cur_data)
                if idx >= 0:
                    self.pb_cam_combo.setCurrentIndex(idx)
            self.pb_cam_combo.blockSignals(False)

    def _get_playblast_capture_options(self):
        res_text = self.pb_res_combo.currentText() if hasattr(self, "pb_res_combo") else ""
        if "1920x1080" in res_text:
            w, h = 1920, 1080
        elif "960x540" in res_text:
            w, h = 960, 540
        else:
            w, h = 1280, 720
        cam = self.pb_cam_combo.currentData() if hasattr(self, "pb_cam_combo") else None
        start_f = self.pb_start_spin.value() if hasattr(self, "pb_start_spin") else None
        end_f = self.pb_end_spin.value() if hasattr(self, "pb_end_spin") else None
        show_hud = bool(self.pb_ornaments_check.isChecked()) if hasattr(self, "pb_ornaments_check") else False
        fmt_text = self.pb_format_combo.currentText() if hasattr(self, "pb_format_combo") else "MP4"
        file_format = "avi" if "AVI" in fmt_text.upper() else "mp4"
        return w, h, cam or None, start_f, end_f, show_hud, file_format

    def _refresh_playblast_upload_boards(self):
        if hasattr(self, "pb_upload_title") and not self.pb_upload_title.text().strip():
            scene_title = "Maya Playblast"
            if cmds and hasattr(cmds, "file"):
                try:
                    sname = cmds.file(query=True, sceneName=True, shortName=True)
                    if sname:
                        scene_title = os.path.splitext(sname)[0]
                except Exception:
                    pass
            self.pb_upload_title.setText(scene_title)
        if not hasattr(self, "pb_upload_board_combo"):
            return
        cur = self.pb_upload_board_combo.currentData()
        self.pb_upload_board_combo.blockSignals(True)
        self.pb_upload_board_combo.clear()
        self.pb_upload_board_combo.addItem("Library Only (No Board)", "")
        for b in (getattr(self, "_cached_boards_list", None) or []):
            bid = b.get("id") or ""
            bname = b.get("name") or "Board"
            if bid:
                self.pb_upload_board_combo.addItem(bname, bid)
        if cur:
            idx = self.pb_upload_board_combo.findData(cur)
            if idx >= 0:
                self.pb_upload_board_combo.setCurrentIndex(idx)
        self.pb_upload_board_combo.blockSignals(False)

    def run_playblast_capture(self, output_path=None):
        self.record_pb_btn.setEnabled(False)
        w, h, cam, start_f, end_f, show_hud, file_format = self._get_playblast_capture_options()
        if output_path and output_path.lower().endswith(".avi"):
            file_format = "avi"
        elif output_path and output_path.lower().endswith(".mp4"):
            file_format = "mp4"

        self.record_pb_btn.setText("Recording {}...".format(file_format.upper()))
        if hasattr(self, "export_mp4_btn"):
            self.export_mp4_btn.setEnabled(False)
        QtWidgets.QApplication.processEvents()

        try:
            pb_path = animref_playblast.record_playblast(
                width=w,
                height=h,
                camera=cam,
                start_frame=start_f,
                end_frame=end_f,
                output_path=output_path,
                show_ornaments=show_hud,
                file_format=file_format,
            )
            self.recorded_playblast_path = pb_path
            size_mb = (os.path.getsize(pb_path) / (1024.0 * 1024.0)) if os.path.isfile(pb_path) else 0.0
            self.pb_status_lbl.setText("✓ {} Ready ({:.1f} MB): {}".format(file_format.upper(), size_mb, pb_path))
            if hasattr(self, "pb_auto_upload_check") and self.pb_auto_upload_check.isChecked():
                self.run_playblast_upload()
            return pb_path
        except Exception as e:
            self.pb_status_lbl.setText("Playblast failed: " + str(e))
            return None
        finally:
            self.record_pb_btn.setEnabled(True)
            self.record_pb_btn.setText("🎬 Record Playblast")
            if hasattr(self, "export_mp4_btn"):
                self.export_mp4_btn.setEnabled(True)

    def export_playblast_mp4(self):
        _, _, _, _, _, _, file_format = self._get_playblast_capture_options()
        ext = ".avi" if file_format == "avi" else ".mp4"
        default_dir = os.path.dirname(self.recorded_playblast_path) if getattr(self, "recorded_playblast_path", None) and os.path.isfile(self.recorded_playblast_path) else os.path.expanduser("~/Desktop")
        default_name = os.path.join(default_dir, "maya_playblast" + ext)
        filt = "AVI Video (*.avi);;MP4 Video (*.mp4)" if file_format == "avi" else "MP4 Video (*.mp4);;AVI Video (*.avi)"
        dest_path, _ = QtWidgets.QFileDialog.getSaveFileName(
            self,
            "Export Playblast",
            default_name,
            filt
        )
        if not dest_path:
            return
        if not dest_path.lower().endswith((".mp4", ".avi")):
            dest_path += ext

        existing = getattr(self, "recorded_playblast_path", None)
        if existing and os.path.isfile(existing) and os.path.splitext(existing)[1].lower() == os.path.splitext(dest_path)[1].lower():
            try:
                import shutil
                shutil.copy2(existing, dest_path)
                self.recorded_playblast_path = dest_path
                size_mb = os.path.getsize(dest_path) / (1024.0 * 1024.0)
                self.pb_status_lbl.setText("✓ Exported ({:.1f} MB): {}".format(size_mb, dest_path))
                return
            except Exception as e:
                self.pb_status_lbl.setText("Export copy failed ({}), re-recording...".format(e))

        self.run_playblast_capture(output_path=dest_path)

    def open_playblast_folder(self):
        target_dir = None
        existing = getattr(self, "recorded_playblast_path", None)
        if existing and os.path.isfile(existing):
            target_dir = os.path.dirname(existing)
        else:
            target_dir = animref_playblast.get_playblast_cache_dir()
        if target_dir and os.path.isdir(target_dir):
            QtGui.QDesktopServices.openUrl(QtCore.QUrl.fromLocalFile(target_dir))

    def run_playblast_upload(self):
        pb_path = getattr(self, "recorded_playblast_path", None)
        if not pb_path or not os.path.isfile(pb_path):
            pb_path = self.run_playblast_capture()
            if not pb_path or not os.path.isfile(pb_path):
                return

        if not animref_auth.get_current_user():
            self.pb_status_lbl.setText("Sign in to AnimationReference.org in the Account tab to upload playblasts.")
            if hasattr(self, "sidebar"):
                self.sidebar.set_active_index(3)
            return

        title = (self.pb_upload_title.text().strip() if hasattr(self, "pb_upload_title") else "") or "Maya Playblast"
        board_id = (self.pb_upload_board_combo.currentData() if hasattr(self, "pb_upload_board_combo") else "") or ""

        if hasattr(self, "upload_pb_btn"):
            self.upload_pb_btn.setEnabled(False)
            self.upload_pb_btn.setText("Uploading to AnimationReference.org...")
        if hasattr(self, "pb_upload_link_lbl"):
            self.pb_upload_link_lbl.setVisible(False)
        self.pb_status_lbl.setText("Uploading playblast '{}' to AnimationReference.org...".format(title))

        def _worker():
            try:
                res = animref_auth.upload_playblast_to_animref(
                    pb_path,
                    title=title,
                    board_id=board_id,
                )
                self.playblast_uploaded.emit({"ok": True, "result": res, "title": title})
            except Exception as exc:
                self.playblast_uploaded.emit({"ok": False, "error": str(exc)})

        t = threading.Thread(target=_worker, daemon=True)
        t.start()

    def on_playblast_uploaded(self, res):
        if hasattr(self, "upload_pb_btn"):
            self.upload_pb_btn.setEnabled(True)
            self.upload_pb_btn.setText("☁️ Upload Playblast to AnimationReference.org")

        if isinstance(res, dict) and res.get("ok"):
            info = res.get("result") or {}
            raw_url = info.get("portfolioUrl") or info.get("url") or "https://animationreference.org/feed"
            if raw_url.startswith("/"):
                clip_url = "https://animationreference.org" + raw_url
            else:
                clip_url = raw_url
            self.pb_status_lbl.setText("✓ Posted live to AnimationReference.org!")
            if hasattr(self, "pb_upload_link_lbl"):
                self.pb_upload_link_lbl.setText(
                    '✓ Live on AnimationReference.org: <a href="{0}" style="color:#047857;">{0}</a>'.format(clip_url)
                )
                self.pb_upload_link_lbl.setVisible(True)
        else:
            err = (res.get("error") if isinstance(res, dict) else None) or "Upload failed."
            self.pb_status_lbl.setText("Upload failed: " + str(err))

    # ==================== INITIAL LOAD & SELECTION ====================
    def load_initial_data(self):
        self.load_boards_data()

        def _bg_load():
            try:
                catalog = animref_api.load_catalog()
                tags = animref_api.get_popular_tags(25)
                self.catalog_loaded.emit(catalog, tags)
            except Exception:
                pass

        t = threading.Thread(target=_bg_load)
        t.daemon = True
        t.start()

        def _bg_warm_user():
            try:
                user = animref_auth.get_current_user()
                if user:
                    data = animref_auth.get_saved_references(force_refresh=False)
                    self.saved_loaded.emit(data.get("saved", []), data.get("liked", []))
            except Exception:
                pass

        t_warm = threading.Thread(target=_bg_warm_user)
        t_warm.daemon = True
        t_warm.start()

    def on_catalog_ready(self, catalog, tags):
        self._catalog_cache = catalog or []
        if tags:
            self.build_tag_chips(tags)
        elif hasattr(animref_api, "get_popular_tags"):
            try:
                self.build_tag_chips(animref_api.get_popular_tags(limit=35))
            except Exception:
                pass
        if not getattr(self, "_cached_boards_list", None):
            self.load_boards_data()
        if hasattr(self, "view_stack") and self.view_stack.currentIndex() == 4:
            self._explore_loaded_once = True
            self.perform_search(reset=True)

    def build_tag_chips(self, tags):
        if not hasattr(self, "tags_layout") or self.tags_layout is None:
            return
        while self.tags_layout.count():
            item = self.tags_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        self._tag_chip_buttons = {}
        all_tags = ["All"] + [str(t) for t in (tags or []) if t]
        current_tag = getattr(self, "active_tag", None) or "All"

        for tag_name in all_tags:
            btn = QtWidgets.QPushButton(tag_name)
            btn.setFixedHeight(28)
            btn.setCursor(QtCore.Qt.PointingHandCursor)
            is_active = (tag_name == current_tag) or (tag_name == "All" and not getattr(self, "active_tag", None))
            if is_active:
                btn.setStyleSheet(
                    "QPushButton { background-color: #111111; color: #FFFFFF; border: none; border-radius: 14px; padding: 0 12px; font-size: 11px; font-weight: 700; }"
                )
            else:
                btn.setStyleSheet(
                    "QPushButton { background-color: #161622; color: #f4f4f5; border: none; border-radius: 14px; padding: 0 12px; font-size: 11px; font-weight: 600; }"
                    "QPushButton:hover { background-color: #232334; }"
                )
            btn.clicked.connect(lambda checked=False, t=tag_name: self.set_active_tag(None if t == "All" else t))
            self.tags_layout.addWidget(btn)
            self._tag_chip_buttons[tag_name] = btn
        self.tags_layout.addStretch()

    def set_active_tag(self, tag):
        self.active_tag = None if (not tag or tag == "All") else str(tag)
        active_key = self.active_tag or "All"
        for tag_name, btn in getattr(self, "_tag_chip_buttons", {}).items():
            if tag_name == active_key:
                btn.setStyleSheet(
                    "QPushButton { background-color: #111111; color: #FFFFFF; border: none; border-radius: 14px; padding: 0 12px; font-size: 11px; font-weight: 700; }"
                )
            else:
                btn.setStyleSheet(
                    "QPushButton { background-color: #161622; color: #f4f4f5; border: none; border-radius: 14px; padding: 0 12px; font-size: 11px; font-weight: 600; }"
                    "QPushButton:hover { background-color: #232334; }"
                )
        self.perform_search(reset=True)

    def perform_search(self, reset=True):
        if not hasattr(self, "grid_layout"):
            return
        if reset:
            self._explore_offset = 0
            self._explore_videos = []

        query = self.search_input.text().strip() if hasattr(self, "search_input") else ""
        tag = getattr(self, "active_tag", None)
        sort_text = self.sort_combo.currentText().lower() if hasattr(self, "sort_combo") else "newest"
        limit = getattr(self, "_explore_limit", 40)
        offset = getattr(self, "_explore_offset", 0)

        try:
            res = animref_api.search_videos(query=query or None, tag=tag, sort=sort_text, limit=limit, offset=offset)
            items = res.get("items", []) if isinstance(res, dict) else []
            total = int(res.get("total", len(items))) if isinstance(res, dict) else len(items)
        except Exception as e:
            items = []
            total = 0
            animref_api.log_debug("perform_search error: {}".format(e))

        self._explore_total = total
        if reset:
            self._explore_videos = list(items)
        else:
            self._explore_videos.extend(items)
        self._explore_offset = len(self._explore_videos)

        if hasattr(self, "stats_label") and self.stats_label:
            self.stats_label.setText("{} of {} clips".format(len(self._explore_videos), total))
        if hasattr(self, "explore_load_more_btn") and self.explore_load_more_btn:
            has_more = self._explore_offset < total and len(items) > 0
            self.explore_load_more_btn.setVisible(has_more)

        self.render_grid(self._explore_videos)

    def _load_more_explore(self):
        self.perform_search(reset=False)

    def _compute_explore_cols(self):
        viewport_w = self.grid_scroll.viewport().width() if (hasattr(self, "grid_scroll") and self.grid_scroll.viewport()) else 380
        if viewport_w < 260:
            return 1
        elif viewport_w < 440:
            return 2
        elif viewport_w < 660:
            return 3
        elif viewport_w < 920:
            return 4
        elif viewport_w < 1200:
            return 5
        elif viewport_w < 1500:
            return 6
        else:
            return max(6, min(8, viewport_w // 200))

    def render_grid(self, videos):
        if not hasattr(self, "grid_layout") or self.grid_layout is None:
            return
        if not hasattr(self, "card_widgets"):
            self.card_widgets = {}
        self.card_widgets.clear()

        if hasattr(self, "grid_scroll") and self.grid_scroll:
            self.grid_scroll.setUpdatesEnabled(False)
        try:
            while self.grid_layout.count():
                item = self.grid_layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()

            if not videos:
                empty_lbl = QtWidgets.QLabel("No matching references found. Try another search or clear tag filters.")
                empty_lbl.setAlignment(QtCore.Qt.AlignCenter)
                empty_lbl.setStyleSheet("color: #a1a1aa; font-size: 13px; padding: 36px;")
                self.grid_layout.addWidget(empty_lbl, 0, 0)
                return

            cols = self._compute_explore_cols()
            self._last_explore_cols = cols

            viewport_w = self.grid_scroll.viewport().width() if (hasattr(self, "grid_scroll") and self.grid_scroll.viewport()) else 380
            gap = 10
            avail_w = max(110, viewport_w - gap * (cols + 1))
            target_card_w = max(110, avail_w // cols)

            col_heights = [0] * cols
            col_layouts = []
            for c_idx in range(cols):
                col_widget = QtWidgets.QWidget()
                col_widget.setStyleSheet("background: transparent;")
                col_vbox = QtWidgets.QVBoxLayout(col_widget)
                col_vbox.setContentsMargins(0, 0, 0, 0)
                col_vbox.setSpacing(gap)
                self.grid_layout.addWidget(col_widget, 0, c_idx, QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)
                col_layouts.append(col_vbox)

            for idx, item in enumerate(videos):
                card = PinterestClipCardWidget(item, index=idx, card_w=target_card_w)
                card.clicked.connect(self.quick_import_video)
                card.double_clicked.connect(self.quick_import_video)
                card.import_requested.connect(self.quick_import_video)
                card.preview_requested.connect(self.select_video_and_show)

                target_col = min(range(cols), key=lambda c: col_heights[c])
                col_layouts[target_col].addWidget(card)
                col_heights[target_col] += card.card_h + gap

                vid = item.get("id")
                if vid:
                    self.card_widgets.setdefault(vid, []).append(card)
                animref_api.get_thumbnail(item, callback=self.thumbnail_worker_callback)

            for c_vbox in col_layouts:
                c_vbox.addStretch()
        finally:
            if hasattr(self, "grid_scroll") and self.grid_scroll:
                self.grid_scroll.setUpdatesEnabled(True)

    def _reflow_grid(self):
        if hasattr(self, "view_stack") and self.view_stack.currentIndex() == 4 and getattr(self, "_explore_videos", None):
            new_cols = self._compute_explore_cols()
            vw = self.grid_scroll.viewport().width() if (hasattr(self, "grid_scroll") and self.grid_scroll.viewport()) else 0
            if new_cols != getattr(self, "_last_explore_cols", 0) or abs(vw - getattr(self, "_last_explore_w", 0)) >= 24:
                self._last_explore_cols = new_cols
                self._last_explore_w = vw
                self.render_grid(self._explore_videos)

        if hasattr(self, "boards_view_stack"):
            if self.boards_view_stack.currentIndex() == 0 and getattr(self, "_cached_boards_list", None):
                new_cols = self._compute_boards_cols()
                vw = self.boards_grid_scroll.viewport().width() if (hasattr(self, "boards_grid_scroll") and self.boards_grid_scroll.viewport()) else 0
                if new_cols != getattr(self, "_last_boards_cols", 0) or abs(vw - getattr(self, "_last_boards_w", 0)) >= 24:
                    self._last_boards_cols = new_cols
                    self._last_boards_w = vw
                    self._render_boards_cards_grid(self._cached_boards_list)
            elif self.boards_view_stack.currentIndex() == 1 and getattr(self, "_current_active_board", None):
                new_cols = self._compute_detail_cols()
                vw = self.detail_grid_scroll.viewport().width() if (hasattr(self, "detail_grid_scroll") and self.detail_grid_scroll.viewport()) else 0
                if new_cols != getattr(self, "_last_detail_cols", 0) or abs(vw - getattr(self, "_last_detail_w", 0)) >= 24:
                    self._last_detail_cols = new_cols
                    self._last_detail_w = vw
                    items = getattr(self, "_current_detail_items", None)
                    if items is None:
                        items = self._current_active_board.get("items", [])
                    self._render_board_detail_cards(items)

    def thumbnail_worker_callback(self, video_id, local_path):
        try:
            self.thumbnail_loaded.emit(video_id, local_path or "")
        except Exception:
            pass

    def on_thumbnail_ready(self, video_id, local_path):
        all_cards = []
        all_cards.extend(getattr(self, "boards_card_widgets", {}).get(video_id, []))
        all_cards.extend(getattr(self, "card_widgets", {}).get(video_id, []))
        for b_card in all_cards:
            if local_path and os.path.isfile(local_path):
                b_card.set_pixmap(QtGui.QPixmap(local_path))
            else:
                b_card.set_fallback_preview()

        for folder_card in getattr(self, "_boards_rendered_cards", []):
            if hasattr(folder_card, "refresh_cover_thumbnails"):
                folder_card.refresh_cover_thumbnails()

        if self.selected_video and self.selected_video.get("id") == video_id:
            if hasattr(self, "player_widget") and self.player_widget:
                if local_path and os.path.isfile(local_path):
                    self.player_widget.update_thumbnail_preview(local_path)

    def select_video(self, video_data):
        self.selected_video = video_data

        if hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.load_video(video_data)

        title_text = video_data.get("title") or "Untitled Reference"
        self.detail_title.setText(title_text)
        dur = video_data.get("duration")
        dur_str = "{:.1f}s".format(dur) if dur else "Reference"
        creator = video_data.get("author_name") or video_data.get("uploader") or video_data.get("source") or "Animation Reference"
        self.detail_meta.setText("{}  •  {}".format(dur_str, creator))
        self.import_btn.setEnabled(True)

    def select_video_and_show(self, video_data):
        # Opens the clean full-panel Studio Screen inside the main panel (no extra pop-out window)
        try:
            _CardHoverPreviewEngine.get().stop_all()
        except Exception:
            pass
        if hasattr(self, "view_stack") and hasattr(self, "inspector_panel"):
            studio_idx = self.view_stack.indexOf(self.inspector_panel)
            if studio_idx >= 0:
                if self.view_stack.currentIndex() != studio_idx:
                    self._previous_view_index = self.view_stack.currentIndex()
                self.view_stack.setCurrentIndex(studio_idx)
        self.select_video(video_data)

    def filter_by_tag(self, tag_val):
        if hasattr(self, "board_search_input"):
            self.board_search_input.setText(str(tag_val))

    def toggle_save_selected_video(self):
        if not self.selected_video:
            return
        user = animref_auth.get_current_user()
        if not user:
            self.sidebar.set_active_index(3)
            return
        res = animref_auth.toggle_save_reference(self.selected_video.get("id"))
        if res.get("success"):
            saved = res.get("isSaved", False)
            self.save_btn.setText("Saved" if saved else "+ Save")

    def _set_sync_status(self, text):
        if hasattr(self, "sync_badge") and self.sync_badge is not None:
            try:
                self.sync_badge.setText(text)
            except Exception:
                pass

    def _reset_import_buttons(self, vid_id="", quick_text="+ Maya"):
        all_cards = []
        all_cards.extend(getattr(self, "boards_card_widgets", {}).get(vid_id, []))
        all_cards.extend(getattr(self, "card_widgets", {}).get(vid_id, []))
        for card in all_cards:
            if hasattr(card, "quick_import_btn"):
                try:
                    card.quick_import_btn.setText(quick_text)
                    card.quick_import_btn.setEnabled(True)
                except Exception:
                    pass

    def on_import_clicked(self):
        if not self.selected_video:
            return
        self.run_import(self.selected_video)

    def quick_import_video(self, video_data):
        self.select_video(video_data)
        vid_id = str(video_data.get("id") or "")
        all_cards = []
        all_cards.extend(getattr(self, "boards_card_widgets", {}).get(vid_id, []))
        all_cards.extend(getattr(self, "card_widgets", {}).get(vid_id, []))
        for card in all_cards:
            if hasattr(card, "quick_import_btn"):
                card.quick_import_btn.setText("Streaming...")
                card.quick_import_btn.setEnabled(False)
        cam_choice = self.cam_combo.currentText() if hasattr(self, "cam_combo") else "Free 3D Card"
        if "Free 3D Card" in cam_choice:
            target_cam = "free"
        elif "Current Viewport" in cam_choice or "current" in cam_choice.lower():
            target_cam = "current"
        elif "Attach to Camera: " in cam_choice:
            target_cam = cam_choice.replace("Attach to Camera: ", "").strip()
        elif "New Reference Camera" in cam_choice:
            target_cam = "new_cam"
        else:
            target_cam = "free"
        self.run_import(video_data, force_target_cam=target_cam, force_mode="sequence")

    def on_download_progress(self, current, total):
        self.progress_bar.setValue(current)
        if current < 100:
            self.import_btn.setText("Streaming {}%...".format(current))
        else:
            self.import_btn.setText("Streaming to Maya...")

    def run_import(self, video_data, force_target_cam=None, force_mode=None):
        if not isinstance(video_data, dict):
            return
        if getattr(self, "_is_importing_busy", False):
            worker_t = getattr(self, "_import_thread", None)
            if worker_t and worker_t.is_alive():
                if cmds:
                    cmds.warning("AnimRef: Streaming reference into Maya, please wait a moment...")
                return
            else:
                self._is_importing_busy = False
        self._is_importing_busy = True

        vid_id = str(video_data.get("id") or "")
        try:
            # Pre-check token before kicking off worker if this item requires Pro authorization
            token = animref_auth.get_valid_token()
            raw_vid = str(video_data.get("videoUrl") or video_data.get("streamUrl") or video_data.get("uploadedMediaUrl") or video_data.get("mediaUrl") or video_data.get("url") or video_data.get("sourceUrl") or "").strip()
            has_video_url = bool(raw_vid)
            image_only_url = (video_data.get("imageUrl") or video_data.get("posterUrl") or video_data.get("thumbnailUrl") or video_data.get("coverUrl") or "").strip()
            is_static_image = not has_video_url and bool(image_only_url)
            is_direct_video = (
                vid_id.startswith(("upload-", "clip-", "user-")) or
                "sakugabooru.com" in raw_vid or
                "storage.googleapis.com" in raw_vid or
                "firebasestorage" in raw_vid or
                raw_vid.lower().endswith((".mp4", ".mov", ".webm"))
            )

            if not token and not is_static_image and not is_direct_video and not raw_vid.startswith("http"):
                self._is_importing_busy = False
                self._import_thread = None
                self._pending_import_video = video_data
                self._set_sync_status("🌐  Opening Browser to Sign In...")
                self.import_btn.setText("🔑  Sign In on Browser to Import")
                self.import_btn.setEnabled(True)
                self.progress_bar.setVisible(False)
                self._reset_import_buttons(vid_id, "+ Maya")
                self.launch_browser_sign_in()
                if cmds:
                    cmds.warning("AnimRef: Please sign in in the browser window that just opened, then your reference will import automatically!")
                    try:
                        cmds.inViewMessage(amg="AnimRef: <hl>Sign in in your browser</hl> to import references into Maya", pos="midCenter", fade=True)
                    except Exception:
                        pass
                return

            self.import_btn.setEnabled(False)
            self.import_btn.setText("Streaming to Maya...")
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            self._set_sync_status("⏳  Streaming to Maya Scene...")

            if force_target_cam:
                target_cam = force_target_cam
            else:
                cam_choice = self.cam_combo.currentText()
                if "Free 3D Card" in cam_choice:
                    target_cam = "free"
                elif "Current Viewport" in cam_choice or "current" in cam_choice.lower():
                    target_cam = "current"
                elif "Attach to Camera: " in cam_choice:
                    target_cam = cam_choice.replace("Attach to Camera: ", "").strip()
                elif "New Reference Camera" in cam_choice:
                    target_cam = "new_cam"
                else:
                    target_cam = "free"

            mode = force_mode if force_mode else "sequence"
            start_curr = self.start_curr_check.isChecked()
            fit_timeline = self.fit_timeline_check.isChecked()

            # Instant Viewport Placeholder: only use an already-cached local image (zero UI thread network block)
            placeholder_node = None
            if cmds and not is_static_image and target_cam != "new_cam":
                try:
                    thumb = animref_api.get_thumbnail_local_path(vid_id) if vid_id else None
                    if thumb and os.path.isfile(thumb) and os.path.getsize(thumb) > 64:
                        with open(thumb, "rb") as _tf:
                            _hdr = _tf.read(12)
                        if _hdr.startswith((b"\xff\xd8\xff", b"\x89PNG", b"GIF8", b"RIFF")):
                            placeholder_node = animref_importer.import_animref_to_maya(
                                video_dict=video_data,
                                local_video_path=thumb,
                                mode="image",
                                target_camera=target_cam,
                                start_at_current_frame=start_curr,
                                fit_timeline=False,
                            )
                except Exception:
                    placeholder_node = None
            self._active_placeholder_node = placeholder_node

            scene_fps = 24
            if cmds and hasattr(animref_importer, "get_scene_fps"):
                try:
                    scene_fps = int(round(animref_importer.get_scene_fps()))
                except Exception:
                    scene_fps = 24

            def _bg_worker():
                try:
                    def prog(cur, tot):
                        self.download_progress.emit(cur, tot)

                    local_path = animref_api.download_video_file(video_data, progress_callback=prog)

                    # Pre-convert video to image sequence in background worker so Maya UI never freezes
                    if not str(local_path).lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif", ".obj", ".fbx")):
                        try:
                            self.download_progress.emit(90, 100)
                            animref_importer.convert_video_to_sequence(local_path, target_fps=scene_fps)
                        except Exception as conv_err:
                            print("[AnimRef] Sequence conversion notice:", conv_err)

                    self.download_finished.emit(video_data, local_path, mode, target_cam, start_curr, fit_timeline)
                except Exception as err:
                    self.download_error.emit(str(err))

            t = threading.Thread(target=_bg_worker)
            self._import_thread = t
            t.daemon = True
            t.start()
        except Exception as err:
            self._is_importing_busy = False
            self._import_thread = None
            self.import_btn.setText("+ Put Reference in Maya Scene")
            self.import_btn.setEnabled(True)
            self.progress_bar.setVisible(False)
            self._reset_import_buttons(vid_id, "+ Maya")
            print("[AnimRef ERROR] run_import failed:", err)
            if cmds:
                cmds.warning("AnimRef Import Error: " + str(err))

    def on_download_error(self, err_msg):
        self._is_importing_busy = False
        self._import_thread = None
        ph = getattr(self, "_active_placeholder_node", None)
        self._active_placeholder_node = None
        if ph:
            try:
                animref_importer.delete_plane(ph)
            except Exception:
                pass
        vid_id = str(self.selected_video.get("id") if getattr(self, "selected_video", None) else "")
        self._reset_import_buttons(vid_id, "+ Maya")

        msg_str = str(err_msg)
        print("[AnimRef ERROR] Download failed:", msg_str)
        if cmds:
            cmds.warning("AnimRef Download Failed: " + msg_str)
            try:
                cmds.inViewMessage(amg="AnimRef Download Failed: <hl>{}</hl>".format(msg_str), pos="midCenter", fade=True)
            except Exception:
                pass

        is_auth_error = (
            "sign in" in msg_str.lower() or
            "pro account" in msg_str.lower() or
            "token" in msg_str.lower() or
            "authorize" in msg_str.lower() or
            "unauthorized" in msg_str.lower() or
            "forbidden" in msg_str.lower()
        )
        if is_auth_error:
            animref_auth.sign_out()
            self._set_sync_status("🔑  Sign In via Browser")
            self.import_btn.setText("🔑  Sign In on Browser to Import")
            self.import_btn.setEnabled(True)
            self.progress_bar.setVisible(False)
            self.launch_browser_sign_in()
        else:
            self._set_sync_status("⚠  Download Failed")
            self.import_btn.setText("+ Put Reference in Maya Scene")
            self.import_btn.setEnabled(True)
            self.progress_bar.setVisible(False)

    def closeEvent(self, event):
        if hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.stop()
        super(AnimRefBrowserWindow, self).closeEvent(event)

    def on_download_finished(self, video_data, local_path, mode, target_cam, start_curr, fit_timeline):
        self.import_btn.setText("Streaming to Maya Scene...")
        self.progress_bar.setValue(100)
        QtWidgets.QApplication.processEvents()

        ph = getattr(self, "_active_placeholder_node", None)
        self._active_placeholder_node = None
        if ph:
            try:
                animref_importer.delete_plane(ph)
            except Exception:
                pass

        pip_corner = self.pip_combo.currentText() if hasattr(self, "pip_combo") else "full"
        opacity_val = (self.opacity_slider.value() / 100.0) if hasattr(self, "opacity_slider") else 1.0
        mirror_val = self.mirror_check.isChecked() if hasattr(self, "mirror_check") else False
        face_cam_val = self.face_cam_check.isChecked() if hasattr(self, "face_cam_check") else False

        try:
            plane_node = animref_importer.import_animref_to_maya(
                video_dict=video_data,
                local_video_path=local_path,
                mode=mode,
                target_camera=target_cam,
                start_at_current_frame=start_curr,
                fit_timeline=fit_timeline,
                pip_corner=pip_corner,
                opacity=opacity_val,
                mirror=mirror_val,
                face_camera=face_cam_val,
            )
            self.refresh_scene_planes()
            self._set_sync_status("✓  Added to Maya Scene")
            if cmds:
                try:
                    cmds.refresh(force=True)
                except Exception:
                    pass

            # Update any visible clip cards for this reference
            vid_id = str(video_data.get("id") or "")
            self._reset_import_buttons(vid_id, "✓ In Maya")

            title_str = video_data.get("title") or "Reference"
            print("[AnimRef] Successfully streamed '{}' into Maya Viewport ({})".format(title_str, plane_node))
            if cmds:
                try:
                    cmds.inViewMessage(amg='AnimRef: <hl style="color:#00E5FF;">{}</hl> added to viewport!'.format(title_str), pos="topCenter", fade=True)
                except Exception:
                    pass
        except Exception as err:
            err_msg = str(err)
            print("[AnimRef ERROR] Import Failed:", err_msg)
            vid_id = str(video_data.get("id") or "")
            self._reset_import_buttons(vid_id, "+ Maya")
            if cmds:
                cmds.warning("AnimRef Import Failed: " + err_msg)
                try:
                    cmds.inViewMessage(amg="AnimRef Import Failed: <hl>{}</hl>".format(err_msg), pos="midCenter", fade=True)
                except Exception:
                    pass
        finally:
            self._is_importing_busy = False
            self._import_thread = None
            self.import_btn.setText("+ Put Reference in Maya Scene")
            self.import_btn.setEnabled(True)
            self.progress_bar.setVisible(False)

_window_instance = None
WORKSPACE_NAME = "AnimRefWorkspaceControl"

def is_docked():
    if cmds and hasattr(cmds, "workspaceControl"):
        return bool(cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True))
    return False

def show_docked_window():
    global _window_instance
    if not cmds or not hasattr(cmds, "workspaceControl"):
        return show_floating_window()

    # Clean up any existing floating AnimRef window instances
    main_win = get_maya_main_window()
    if main_win:
        try:
            for child in main_win.children():
                if isinstance(child, QtWidgets.QWidget) and child.objectName() == "AnimRefUIWindow":
                    try:
                        child.close()
                        child.deleteLater()
                    except (RuntimeError, AttributeError):
                        pass
        except Exception:
            pass

    try:
        if QtWidgets and hasattr(QtWidgets, "QApplication") and QtWidgets.QApplication.instance():
            for widget in QtWidgets.QApplication.topLevelWidgets():
                if widget and widget.objectName() == "AnimRefUIWindow" and not getattr(widget, "is_docked", False):
                    try:
                        widget.close()
                        widget.deleteLater()
                    except Exception:
                        pass
    except Exception:
        pass

    if _window_instance is not None and not getattr(_window_instance, "is_docked", False):
        try:
            _window_instance.close()
            _window_instance.deleteLater()
        except Exception:
            pass
        _window_instance = None

    if cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True):
        cmds.workspaceControl(WORKSPACE_NAME, edit=True, restore=True, visible=True)
    else:
        dock_target = None
        for cand in ["ChannelBoxLayerEditor", "AttributeEditor", "Outliner", "ToolSettings"]:
            if cmds.workspaceControl(cand, query=True, exists=True):
                dock_target = cand
                break

        created_docked = False
        if dock_target:
            try:
                cmds.workspaceControl(
                    WORKSPACE_NAME,
                    label="AnimRef Studio",
                    retain=False,
                    floating=False,
                    initialWidth=310,
                    minimumWidth=200,
                    minimumHeight=160,
                    tabToControl=[dock_target, -1]
                )
                created_docked = True
            except Exception:
                created_docked = False

        if not created_docked:
            try:
                cmds.workspaceControl(
                    WORKSPACE_NAME,
                    label="AnimRef Studio",
                    retain=False,
                    floating=False,
                    initialWidth=310,
                    minimumWidth=200,
                    minimumHeight=160,
                    dockToMainWindow=["right", False]
                )
                created_docked = True
            except Exception:
                created_docked = False

        if not created_docked:
            cmds.workspaceControl(
                WORKSPACE_NAME,
                label="AnimRef Studio",
                retain=False,
                floating=True,
                initialWidth=340,
                initialHeight=480,
                minimumWidth=200,
                minimumHeight=160
            )
        try:
            cmds.workspaceControl(WORKSPACE_NAME, edit=True, restore=True)
        except Exception:
            pass

    if not cmds or not hasattr(cmds, "workspaceControl") or not omui:
        return show_floating_window()

    control_ptr = omui.MQtUtil.findControl(WORKSPACE_NAME) if omui else None
    if control_ptr:
        parent_widget = wrapInstance(int(control_ptr), QtWidgets.QWidget)
        layout = parent_widget.layout()
        if layout:
            while layout.count():
                child = layout.takeAt(0)
                if child.widget():
                    child.widget().deleteLater()
        else:
            layout = QtWidgets.QVBoxLayout(parent_widget)
            layout.setContentsMargins(0, 0, 0, 0)
            layout.setSpacing(0)

        win = AnimRefBrowserWindow(parent=parent_widget, is_docked=True)
        layout.addWidget(win)
        win.show()
        parent_widget.show()
        _window_instance = win

        try:
            cmds.workspaceControl(WORKSPACE_NAME, edit=True, visible=True, restore=True)
        except Exception:
            pass
        return win

    return show_floating_window()

def show_floating_window():
    global _window_instance
    if cmds and hasattr(cmds, "workspaceControl"):
        if cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True):
            try:
                cmds.workspaceControl(WORKSPACE_NAME, edit=True, visible=False)
                cmds.deleteUI(WORKSPACE_NAME, control=True)
            except Exception:
                pass

    # Clean up any existing AnimRef window instances in Maya's Qt hierarchy
    main_win = get_maya_main_window()
    if main_win:
        try:
            for child in main_win.children():
                if isinstance(child, QtWidgets.QWidget) and child.objectName() == "AnimRefUIWindow":
                    try:
                        child.close()
                        child.deleteLater()
                    except (RuntimeError, AttributeError):
                        pass
        except Exception:
            pass

    try:
        if QtWidgets and hasattr(QtWidgets, "QApplication") and QtWidgets.QApplication.instance():
            for widget in QtWidgets.QApplication.topLevelWidgets():
                if widget and widget.objectName() == "AnimRefUIWindow":
                    try:
                        widget.close()
                        widget.deleteLater()
                    except Exception:
                        pass
    except Exception:
        pass

    if _window_instance is not None:
        try:
            _window_instance.close()
            _window_instance.deleteLater()
        except Exception:
            pass
        _window_instance = None

    _window_instance = AnimRefBrowserWindow(parent=get_maya_main_window(), is_docked=False)
    _window_instance.show()
    _window_instance.raise_()
    _window_instance.activateWindow()
    return _window_instance

def show_window(dock=False):
    if dock:
        return show_docked_window()
    return show_floating_window()
