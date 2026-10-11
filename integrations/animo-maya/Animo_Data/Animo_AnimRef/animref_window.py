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
    background-color: #0d1117;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
}

QDialog {
    background-color: #0b0e14;
    border: 1px solid #1f2738;
    border-radius: 8px;
}

/* Frameless Title Bar */
FramelessTitleBar {
    background-color: #11141b;
    border-bottom: 1px solid #1a202c;
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
}

QPushButton#TitleBarBtn {
    background-color: #161b24;
    border: 1px solid #252d3d;
    border-radius: 4px;
    padding: 3px 8px;
    color: #8b949e;
    font-size: 10px;
    font-weight: 600;
}
QPushButton#TitleBarBtn:hover {
    background-color: #212838;
    border-color: #00E5FF;
    color: #ffffff;
}

QPushButton#WinCtrlBtn {
    background-color: transparent;
    border: none;
    color: #8b949e;
    font-size: 11px;
    font-weight: bold;
    width: 24px;
    height: 24px;
    border-radius: 3px;
}
QPushButton#WinCtrlBtn:hover {
    background-color: #21262d;
    color: #ffffff;
}

QPushButton#WinCloseBtn {
    background-color: transparent;
    border: none;
    color: #8b949e;
    font-size: 11px;
    font-weight: bold;
    width: 24px;
    height: 24px;
    border-radius: 3px;
}
QPushButton#WinCloseBtn:hover {
    background-color: #e74c3c;
    color: #ffffff;
}

/* Left Navigation Sidebar */
SidebarNavPanel {
    background-color: #0b0e14;
    border-right: 1px solid #1a1f2c;
    border-bottom-left-radius: 8px;
}

QPushButton#NavBtn {
    background-color: transparent;
    border: none;
    border-left: 3px solid transparent;
    border-radius: 4px;
    padding: 8px 10px;
    color: #8b949e;
    font-weight: 600;
    font-size: 12px;
    text-align: left;
}
QPushButton#NavBtn:hover {
    background-color: #141822;
    color: #e6edf3;
    border-left: 3px solid #30363d;
}
QPushButton#NavBtn[active="true"] {
    background-color: #131a26;
    color: #00E5FF;
    border-left: 3px solid #00E5FF;
    font-weight: bold;
}

QLineEdit, QComboBox {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 7px 10px;
    color: #ffffff;
    font-size: 12px;
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
    padding: 7px 14px;
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
    font-size: 12px;
    border-radius: 6px;
    padding: 9px 16px;
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
    font-size: 12px;
    border-radius: 6px;
    padding: 9px 16px;
}
QPushButton#SuccessBtn:hover {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #34d399, stop:1 #10b981);
}

QPushButton#TagChip {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 3px 10px;
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
    width: 7px;
}
QScrollBar::handle:vertical {
    background: #30363d;
    border-radius: 3px;
}
QScrollBar::handle:vertical:hover {
    background: #00E5FF;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
    height: 0px;
}

QScrollBar:horizontal {
    border: none;
    background: transparent;
    height: 0px;
}
QScrollBar::handle:horizontal {
    border: none;
    background: transparent;
    height: 0px;
}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {
    width: 0px;
    height: 0px;
}

QProgressBar {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 4px;
    text-align: center;
    color: #ffffff;
    font-weight: bold;
    height: 14px;
    font-size: 10px;
}
QProgressBar::chunk {
    background: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00E5FF, stop:1 #0099FF);
    border-radius: 3px;
}

QPushButton#PlayerBtn {
    background-color: #161b22;
    border: 1px solid #30363d;
    border-radius: 4px;
    color: #e6edf3;
    font-weight: 600;
    padding: 4px 8px;
    font-size: 11px;
}
QPushButton#PlayerBtn:hover {
    background-color: #21262d;
    border-color: #00E5FF;
    color: #00E5FF;
}
QPushButton#PlayerBtn[active="true"] {
    background-color: #00E5FF;
    border-color: #00E5FF;
    color: #0a0d12;
}

QSlider::groove:horizontal {
    background-color: #21262d;
    height: 5px;
    border-radius: 2px;
}
QSlider::sub-page:horizontal {
    background-color: #00E5FF;
    height: 5px;
    border-radius: 2px;
}
QSlider::handle:horizontal {
    background-color: #ffffff;
    width: 12px;
    height: 12px;
    margin-top: -4px;
    margin-bottom: -4px;
    border-radius: 6px;
    border: 2px solid #00E5FF;
}
QSlider::handle:horizontal:hover {
    background-color: #00E5FF;
    border: 2px solid #ffffff;
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
    """Custom dark frameless window header inspired by Zoo Tools Hive."""
    def __init__(self, title="ANIMATION REFERENCE", parent=None):
        super(FramelessTitleBar, self).__init__(parent)
        self.drag_position = None
        self.setFixedHeight(36)

        layout = QtWidgets.QHBoxLayout(self)
        layout.setContentsMargins(10, 0, 8, 0)
        layout.setSpacing(8)

        # Glowing Neon Logo Badge
        logo_path = os.path.join(os.path.dirname(__file__), "animref_icon.png")
        if os.path.isfile(logo_path):
            self.logo_widget = QtWidgets.QLabel()
            pix = QtGui.QPixmap(logo_path).scaled(22, 22, QtCore.Qt.KeepAspectRatio, QtCore.Qt.SmoothTransformation)
            self.logo_widget.setPixmap(pix)
            layout.addWidget(self.logo_widget)
        else:
            self.logo_widget = QtWidgets.QLabel("AR")
            self.logo_widget.setFixedSize(22, 22)
            self.logo_widget.setAlignment(QtCore.Qt.AlignCenter)
            self.logo_widget.setStyleSheet("""
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #00E5FF, stop:1 #0077FF);
                color: #0a0d12;
                font-weight: 900;
                font-size: 11px;
                border-radius: 4px;
            """)
            layout.addWidget(self.logo_widget)

        # Title + Studio Badge
        title_box = QtWidgets.QHBoxLayout()
        title_box.setSpacing(6)
        self.title_lbl = QtWidgets.QLabel(title)
        self.title_lbl.setStyleSheet("font-weight: 800; font-size: 12px; letter-spacing: 1.2px; color: #ffffff;")
        title_box.addWidget(self.title_lbl)

        self.studio_badge = QtWidgets.QLabel("STUDIO")
        self.studio_badge.setStyleSheet("background-color: #0d2838; color: #00E5FF; font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 3px; border: 1px solid #00E5FF;")
        title_box.addWidget(self.studio_badge)
        layout.addLayout(title_box)

        layout.addStretch()

        # Mini View Button
        self.compact_btn = QtWidgets.QPushButton("Mini View")
        self.compact_btn.setObjectName("TitleBarBtn")
        self.compact_btn.setToolTip("Toggle compact floating reference monitor")
        layout.addWidget(self.compact_btn)

        # Pin / Always On Top Button
        self.pin_btn = QtWidgets.QPushButton("Pin")
        self.pin_btn.setObjectName("TitleBarBtn")
        self.pin_btn.setCheckable(True)
        self.pin_btn.setToolTip("Pin window on top of Maya viewports")
        self.pin_btn.clicked.connect(self._toggle_always_on_top)
        layout.addWidget(self.pin_btn)

        # Dock to Maya Button
        if cmds:
            self.dock_btn = QtWidgets.QPushButton("Dock to Maya")
            self.dock_btn.setObjectName("TitleBarBtn")
            self.dock_btn.setToolTip("Dock into Maya workspace panels")
            layout.addWidget(self.dock_btn)

        # Web Button
        self.web_btn = QtWidgets.QPushButton("Web")
        self.web_btn.setObjectName("TitleBarBtn")
        self.web_btn.setToolTip("Open AnimationReference.org")
        self.web_btn.clicked.connect(lambda: webbrowser.open("https://animationreference.org"))
        layout.addWidget(self.web_btn)

        # Window Controls: Min, Max, Close
        btn_box = QtWidgets.QHBoxLayout()
        btn_box.setSpacing(2)

        self.min_btn = QtWidgets.QPushButton("-")
        self.min_btn.setObjectName("WinCtrlBtn")
        self.min_btn.setToolTip("Minimize to Taskbar")
        self.min_btn.clicked.connect(self._minimize_window)
        btn_box.addWidget(self.min_btn)

        self.max_btn = QtWidgets.QPushButton("[]")
        self.max_btn.setObjectName("WinCtrlBtn")
        self.max_btn.setToolTip("Maximize / Restore")
        self.max_btn.clicked.connect(self._maximize_window)
        btn_box.addWidget(self.max_btn)

        self.close_btn = QtWidgets.QPushButton("X")
        self.close_btn.setObjectName("WinCloseBtn")
        self.close_btn.setToolTip("Close Window")
        self.close_btn.clicked.connect(self._close_window)
        btn_box.addWidget(self.close_btn)

        layout.addLayout(btn_box)

    def _toggle_always_on_top(self):
        win = self.window()
        is_on_top = self.pin_btn.isChecked()
        flags = win.windowFlags()
        if is_on_top:
            flags |= QtCore.Qt.WindowStaysOnTopHint
            self.pin_btn.setStyleSheet("background-color: #0d2838; color: #00E5FF; border: 1px solid #00E5FF;")
        else:
            flags &= ~QtCore.Qt.WindowStaysOnTopHint
            self.pin_btn.setStyleSheet("")
        pos = win.pos()
        size = win.size()
        win.setWindowFlags(flags)
        win.resize(size)
        win.move(pos)
        win.show()

    def set_mini_mode(self, is_mini, video_title=""):
        if is_mini:
            self.setFixedHeight(30)
            if hasattr(self, "logo_widget"):
                self.logo_widget.setVisible(False)
            self.studio_badge.setVisible(False)
            if hasattr(self, "dock_btn"):
                self.dock_btn.setVisible(False)
            self.web_btn.setVisible(False)
            self.max_btn.setVisible(False)

            clean_title = (video_title or "Mini Reference Player").strip()
            if len(clean_title) > 28:
                clean_title = clean_title[:26] + ".."
            self.title_lbl.setText(clean_title)
            self.title_lbl.setStyleSheet("font-weight: 700; font-size: 11px; color: #00E5FF;")

            self.compact_btn.setText("[+] Full View")
            self.compact_btn.setStyleSheet("background-color: #0d2838; color: #00E5FF; border: 1px solid #00E5FF; font-weight: bold; padding: 2px 7px;")
            self.setToolTip("Click and drag header to move mini player anywhere")
        else:
            self.setFixedHeight(36)
            if hasattr(self, "logo_widget"):
                self.logo_widget.setVisible(True)
            self.studio_badge.setVisible(True)
            if hasattr(self, "dock_btn"):
                self.dock_btn.setVisible(True)
            self.web_btn.setVisible(True)
            self.max_btn.setVisible(True)

            self.title_lbl.setText("ANIMATION REFERENCE")
            self.title_lbl.setStyleSheet("font-weight: 800; font-size: 12px; letter-spacing: 1.2px; color: #ffffff;")

            self.compact_btn.setText("Mini View")
            self.compact_btn.setStyleSheet("")
            self.setToolTip("")

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
            self.max_btn.setText("[]")
        else:
            win.showMaximized()
            self.max_btn.setText("][")

    def _close_window(self):
        self.window().close()


class SidebarNavPanel(QtWidgets.QFrame):
    """Left vertical navigation panel inspired by Zoo Tools Hive."""
    nav_changed = QtCore.Signal(int)

    def __init__(self, parent=None):
        super(SidebarNavPanel, self).__init__(parent)
        self.setFixedWidth(180)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(6, 8, 6, 8)
        layout.setSpacing(4)

        # 1. Top Left Corner: Account Card
        self.account_card = QtWidgets.QFrame()
        self.account_card.setObjectName("AccountCard")
        self.account_card.setCursor(QtCore.Qt.PointingHandCursor)
        self.account_card.setStyleSheet("""
            QFrame#AccountCard {
                background-color: #121722;
                border: 1px solid #1f2738;
                border-radius: 6px;
            }
            QFrame#AccountCard:hover {
                background-color: #171e2c;
                border: 1px solid #00E5FF;
            }
        """)
        acc_layout = QtWidgets.QHBoxLayout(self.account_card)
        acc_layout.setContentsMargins(7, 6, 7, 6)
        acc_layout.setSpacing(7)

        # User Avatar Circle
        self.avatar_lbl = QtWidgets.QLabel("AR")
        self.avatar_lbl.setFixedSize(26, 26)
        self.avatar_lbl.setAlignment(QtCore.Qt.AlignCenter)
        self.avatar_lbl.setStyleSheet("""
            background: qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 #00E5FF, stop:1 #0077FF);
            color: #0a0d12;
            font-weight: 900;
            font-size: 10px;
            border-radius: 13px;
        """)
        acc_layout.addWidget(self.avatar_lbl)

        # Details
        acc_text_layout = QtWidgets.QVBoxLayout()
        acc_text_layout.setSpacing(1)
        self.user_name_lbl = QtWidgets.QLabel("Sign In")
        self.user_name_lbl.setStyleSheet("font-weight: bold; font-size: 11px; color: #ffffff;")
        self.user_badge_lbl = QtWidgets.QLabel("Free Plan")
        self.user_badge_lbl.setStyleSheet("font-size: 9px; color: #8b949e;")
        acc_text_layout.addWidget(self.user_name_lbl)
        acc_text_layout.addWidget(self.user_badge_lbl)
        acc_layout.addLayout(acc_text_layout)
        layout.addWidget(self.account_card)

        # Clicking Account Card opens Account View (page 4)
        self.account_card.mousePressEvent = lambda ev: self.set_active_index(4)

        # Section Header
        sec_lbl = QtWidgets.QLabel("STUDIO")
        sec_lbl.setStyleSheet("color: #484f58; font-size: 9px; font-weight: 800; letter-spacing: 1.2px; margin-top: 6px; margin-left: 6px;")
        layout.addWidget(sec_lbl)

        # Navigation Buttons
        self.nav_buttons = []
        nav_items = [
            (0, "Library", "Browse Animation Reference Library"),
            (1, "Saved & Likes", "Your Starred & Saved Clips"),
            (2, "Moodboards", "Moodboards & Reference Collections"),
            (3, "Playblasts", "Maya Viewport Capture & Compare"),
            (4, "Account", "Account Settings & Cloud Sync"),
        ]

        for idx, label, tip in nav_items:
            btn = QtWidgets.QPushButton(label)
            btn.setObjectName("NavBtn")
            btn.setToolTip(tip)
            btn.setCheckable(True)
            btn.clicked.connect(lambda checked=False, i=idx: self.set_active_index(i))
            layout.addWidget(btn)
            self.nav_buttons.append(btn)

        layout.addStretch()

        # Bottom Status Box
        self.status_box = QtWidgets.QFrame()
        self.status_box.setStyleSheet("background-color: #0e121a; border-radius: 4px; padding: 6px; border: 1px solid #161b26;")
        stat_layout = QtWidgets.QVBoxLayout(self.status_box)
        stat_layout.setContentsMargins(6, 4, 6, 4)
        stat_layout.setSpacing(2)
        stat_title = QtWidgets.QLabel("Maya Scene Ready")
        stat_title.setStyleSheet("color: #10B981; font-weight: bold; font-size: 10px;")
        self.stat_desc = QtWidgets.QLabel("1,420 clips")
        self.stat_desc.setStyleSheet("color: #8b949e; font-size: 9px;")
        stat_layout.addWidget(stat_title)
        stat_layout.addWidget(self.stat_desc)
        layout.addWidget(self.status_box)

        # Set default active: Library (0)
        self.current_index = 0
        self._update_button_states()

    def set_active_index(self, index):
        self.current_index = index
        self._update_button_states()
        self.nav_changed.emit(index)

    def _update_button_states(self):
        for i, btn in enumerate(self.nav_buttons):
            is_active = (i == self.current_index)
            btn.setChecked(is_active)
            btn.setProperty("active", "true" if is_active else "false")
            btn.style().unpolish(btn)
            btn.style().polish(btn)


def create_fallback_pixmap(width, height, title, duration_str=""):
    """Creates a high-contrast dark reference card preview when thumbnails are loading or unavailable."""
    pix = QtGui.QPixmap(width, height)
    pix.fill(QtCore.Qt.transparent)
    painter = QtGui.QPainter(pix)
    painter.setRenderHint(QtGui.QPainter.Antialiasing)

    painter.setBrush(QtGui.QBrush(QtGui.QColor("#131720")))
    painter.setPen(QtGui.QPen(QtGui.QColor("#21262d"), 1))
    painter.drawRoundedRect(0, 0, width - 1, height - 1, 6, 6)

    grad = QtGui.QLinearGradient(0, 0, min(width, 48), 0)
    grad.setColorAt(0, QtGui.QColor("#00E5FF"))
    grad.setColorAt(1, QtGui.QColor("#0099FF"))
    painter.fillRect(QtCore.QRect(6, 6, 36, 3), grad)

    painter.setPen(QtGui.QPen(QtGui.QColor("#e6edf3")))
    font = painter.font()
    font.setPointSize(9)
    font.setBold(True)
    painter.setFont(font)

    clean_title = (title or "Animation Reference").strip()
    rect = QtCore.QRect(10, 16, width - 20, height - 36)
    painter.drawText(rect, QtCore.Qt.AlignLeft | QtCore.Qt.AlignVCenter | QtCore.Qt.TextWordWrap, clean_title[:45])

    if duration_str:
        painter.setPen(QtGui.QPen(QtGui.QColor("#00E5FF")))
        font.setPointSize(8)
        painter.setFont(font)
        painter.drawText(QtCore.QRect(10, height - 20, width - 20, 16), QtCore.Qt.AlignRight | QtCore.Qt.AlignVCenter, duration_str)

    painter.end()
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
        self.setFocusPolicy(QtCore.Qt.StrongFocus)

        self.setStyleSheet("""
            VideoPlayerWidget {
                background-color: #0b0e14;
                border: 1px solid #1a202c;
                border-radius: 8px;
            }
            QSlider#YouTubeSlider {
                height: 18px;
                background: transparent;
                margin: 0px 2px;
            }
            QSlider#YouTubeSlider::groove:horizontal {
                height: 4px;
                background: rgba(255, 255, 255, 0.22);
                border-radius: 2px;
            }
            QSlider#YouTubeSlider::sub-page:horizontal {
                background: #ff0033;
                border-radius: 2px;
            }
            QSlider#YouTubeSlider::handle:horizontal {
                background: #ff0033;
                border: 2px solid #ffffff;
                width: 12px;
                height: 12px;
                margin-top: -4px;
                margin-bottom: -4px;
                border-radius: 6px;
            }
            QSlider#YouTubeSlider::handle:horizontal:hover {
                background: #ff2244;
                width: 14px;
                height: 14px;
                margin-top: -5px;
                margin-bottom: -5px;
                border-radius: 7px;
            }
            QPushButton.YTBtn {
                background-color: transparent;
                color: #e2e8f0;
                border: none;
                border-radius: 4px;
                padding: 4px 7px;
                font-size: 11px;
                font-weight: 600;
            }
            QPushButton.YTBtn:hover {
                background-color: rgba(255, 255, 255, 0.14);
                color: #ffffff;
            }
            QPushButton.YTBtn:pressed {
                background-color: rgba(255, 255, 255, 0.24);
            }
            QPushButton.YTBtn[active="true"] {
                color: #00E5FF;
                background-color: rgba(0, 229, 255, 0.14);
            }
        """)
        self.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)

        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(4)

        # Video Display Surface - large and cinematic
        self.display_container = QtWidgets.QStackedWidget()
        self.display_container.setMinimumHeight(320)
        self.display_container.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
        self.display_container.setStyleSheet("background-color: #000000; border-radius: 6px;")
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

        # YouTube-Style Bottom Control Bar (Single Streamlined Row)
        ctrl_bar = QtWidgets.QHBoxLayout()
        ctrl_bar.setContentsMargins(2, 0, 2, 2)
        ctrl_bar.setSpacing(4)

        # Play / Pause button
        self.play_btn = QtWidgets.QPushButton("▶")
        self.play_btn.setProperty("class", "YTBtn")
        self.play_btn.setStyleSheet("font-size: 13px; font-weight: bold; min-width: 30px;")
        self.play_btn.setToolTip("Play / Pause (Spacebar)")
        self.play_btn.clicked.connect(self.toggle_play)
        ctrl_bar.addWidget(self.play_btn)

        # Step Back
        self.prev_frame_btn = QtWidgets.QPushButton("⏮")
        self.prev_frame_btn.setProperty("class", "YTBtn")
        self.prev_frame_btn.setToolTip("Step backward 1 frame (Left Arrow)")
        self.prev_frame_btn.clicked.connect(lambda: self.step_frame(-1))
        ctrl_bar.addWidget(self.prev_frame_btn)

        # Step Forward
        self.next_frame_btn = QtWidgets.QPushButton("⏭")
        self.next_frame_btn.setProperty("class", "YTBtn")
        self.next_frame_btn.setToolTip("Step forward 1 frame (Right Arrow)")
        self.next_frame_btn.clicked.connect(lambda: self.step_frame(1))
        ctrl_bar.addWidget(self.next_frame_btn)

        # Mute / Volume
        self.mute_btn = QtWidgets.QPushButton("🔊")
        self.mute_btn.setProperty("class", "YTBtn")
        self.mute_btn.setToolTip("Mute / Unmute (M)")
        self.mute_btn.clicked.connect(self.toggle_mute)
        ctrl_bar.addWidget(self.mute_btn)

        # Time counter
        self.time_label = QtWidgets.QLabel("00:00 / 00:00")
        self.time_label.setStyleSheet("color: #e2e8f0; font-size: 11px; font-weight: bold; margin-left: 4px;")
        ctrl_bar.addWidget(self.time_label)

        # Frame counter
        self.frame_label = QtWidgets.QLabel("• 0f (24fps)")
        self.frame_label.setStyleSheet("color: #00E5FF; font-size: 11px; font-weight: bold;")
        ctrl_bar.addWidget(self.frame_label)

        ctrl_bar.addStretch()

        # Sync Maya timeline
        self.sync_btn = QtWidgets.QPushButton("⏱ Sync Maya" if self.sync_timeline else "⏱ Sync")
        self.sync_btn.setProperty("class", "YTBtn")
        self.sync_btn.setCheckable(True)
        self.sync_btn.setChecked(self.sync_timeline)
        self.sync_btn.setToolTip("Lock playback & scrubbing to Maya timeline")
        self._update_sync_btn_style()
        self.sync_btn.clicked.connect(self.toggle_timeline_sync)
        ctrl_bar.addWidget(self.sync_btn)

        # Loop
        self.loop_btn = QtWidgets.QPushButton("🔁 Loop")
        self.loop_btn.setProperty("class", "YTBtn")
        self.loop_btn.setProperty("active", "true" if self.is_looping else "false")
        self.loop_btn.setToolTip("Toggle seamless loop (L)")
        self.loop_btn.clicked.connect(self.toggle_loop)
        ctrl_bar.addWidget(self.loop_btn)

        # Speed
        self.speed_btn = QtWidgets.QPushButton("1.0x")
        self.speed_btn.setProperty("class", "YTBtn")
        self.speed_btn.setToolTip("Playback Speed (Click to cycle, or use Settings)")
        self.speed_btn.clicked.connect(self.cycle_speed)
        ctrl_bar.addWidget(self.speed_btn)

        # Settings Gear (Website style popup menu)
        self.settings_btn = QtWidgets.QPushButton("⚙")
        self.settings_btn.setProperty("class", "YTBtn")
        self.settings_btn.setStyleSheet("font-size: 13px;")
        self.settings_btn.setToolTip("Settings (Speed, FPS, Loop, Offset, Quality)")
        self.settings_btn.clicked.connect(self.show_settings_menu)
        ctrl_bar.addWidget(self.settings_btn)

        # Theater mode
        self.theater_btn = QtWidgets.QPushButton("⛶ Theater")
        self.theater_btn.setProperty("class", "YTBtn")
        self.theater_btn.setToolTip("Toggle Theater Mode (Expand video player across panel)")
        self.theater_btn.clicked.connect(self.toggle_theater_mode)
        ctrl_bar.addWidget(self.theater_btn)

        # Pop out
        self.popout_btn = QtWidgets.QPushButton("🗗 Pop Out")
        self.popout_btn.setProperty("class", "YTBtn")
        self.popout_btn.setToolTip("Pop out into floating resizable reference window")
        self.popout_btn.clicked.connect(self.open_popout)
        ctrl_bar.addWidget(self.popout_btn)

        layout.addLayout(ctrl_bar)

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


class AnimRefBrowserWindow(QtWidgets.QDialog):
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
        self.is_docked = is_docked
        self.is_compact = False
        self._current_cols = 0
        self._current_videos = []

        if not self.is_docked:
            self.setWindowFlags(QtCore.Qt.FramelessWindowHint | QtCore.Qt.Window)
            self.resize(1180, 740)
            self.setMinimumSize(360, 320)
        else:
            self.setMinimumSize(320, 260)

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

    def resizeEvent(self, event):
        super(AnimRefBrowserWindow, self).resizeEvent(event)
        self._updateGrips()
        if hasattr(self, "_reflow_timer"):
            self._reflow_timer.start()

    def build_ui(self):
        main_layout = QtWidgets.QVBoxLayout(self)
        main_layout.setContentsMargins(1, 1, 1, 1)
        main_layout.setSpacing(0)

        # 1. Custom Dark Frameless Title Bar (Zoo Tools inspired)
        self.title_bar = FramelessTitleBar(parent=self)
        self.title_bar.compact_btn.clicked.connect(self.toggle_compact_mode)
        if hasattr(self.title_bar, "dock_btn"):
            self.title_bar.dock_btn.setText("Float Window" if self.is_docked else "Dock to Maya")
            self.title_bar.dock_btn.clicked.connect(self.toggle_docking)
        main_layout.addWidget(self.title_bar)

        # 2. Main Body: Horizontal Layout with Left Navigation Sidebar + Central Views
        self.body_container = QtWidgets.QWidget()
        body_layout = QtWidgets.QHBoxLayout(self.body_container)
        body_layout.setContentsMargins(0, 0, 0, 0)
        body_layout.setSpacing(0)

        # Left Navigation Sidebar (Zoo Tools Hive style)
        self.sidebar = SidebarNavPanel(self)
        self.sidebar.nav_changed.connect(self.on_nav_changed)
        body_layout.addWidget(self.sidebar)

        # Central View Stack (replaces old tabs)
        self.view_stack = QtWidgets.QStackedWidget()

        # Page 0: Explore Library
        self.explore_tab = QtWidgets.QWidget()
        self.build_explore_tab(self.explore_tab)
        self.view_stack.addWidget(self.explore_tab)

        # Page 1: Saved & Favorites
        self.saved_tab = QtWidgets.QWidget()
        self.build_saved_tab(self.saved_tab)
        self.view_stack.addWidget(self.saved_tab)

        # Page 2: My Moodboards
        self.boards_tab = QtWidgets.QWidget()
        self.build_boards_tab(self.boards_tab)
        self.view_stack.addWidget(self.boards_tab)

        # Page 3: Playblast Studio
        self.playblast_tab = QtWidgets.QWidget()
        self.build_playblast_tab(self.playblast_tab)
        self.view_stack.addWidget(self.playblast_tab)

        # Page 4: Account Settings
        self.account_tab = QtWidgets.QWidget()
        self.build_account_tab(self.account_tab)
        self.view_stack.addWidget(self.account_tab)

        body_layout.addWidget(self.view_stack)
        main_layout.addWidget(self.body_container)

    def on_nav_changed(self, idx):
        if idx != 0 and hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.pause()
        self.view_stack.setCurrentIndex(idx)
        if idx == 1:
            self.load_saved_data()
        elif idx == 2:
            self.load_boards_data()
        elif idx == 3:
            info = animref_playblast.get_playblast_info()
            self.pb_info_lbl.setText("Camera: {}  |  Timeline: {} - {}  ({} fps)".format(
                info["camera"], info["start"], info["end"], int(round(info["fps"]))
            ))

    def toggle_compact_mode(self):
        self.is_compact = not self.is_compact
        if self.is_compact:
            self._saved_geometry = self.geometry()
            self._saved_nav_index = getattr(self.sidebar, "current_index", 0)

            # Switch to explore tab where the video player is
            self.view_stack.setCurrentWidget(self.explore_tab)

            # Hide library navigation, search, tags, grid
            self.sidebar.setVisible(False)
            self.search_container.setVisible(False)
            self.tags_scroll.setVisible(False)
            self.grid_container.setVisible(False)

            # Hide all extra inspector controls - ONLY the video player remains
            self.detail_title.setVisible(False)
            if hasattr(self, "meta_container"):
                self.meta_container.setVisible(False)
            else:
                self.detail_meta.setVisible(False)
                self.save_btn.setVisible(False)
            self.tags_container.setVisible(False)
            self.opts_box.setVisible(False)
            self.import_btn.setVisible(False)
            self.progress_bar.setVisible(False)

            # Clean styling so video fills entire window cleanly
            self.inspector_panel.setStyleSheet("background-color: #0a0d12; border: none; border-radius: 0px;")
            self.detail_layout.setContentsMargins(4, 4, 4, 4)
            self.detail_layout.setSpacing(4)
            self.splitter.setSizes([0, 1000])

            # Title bar mini mode with clip title and [Full View] button
            vid_title = (self.selected_video.get("title") or "") if self.selected_video else "Mini Reference Player"
            self.title_bar.set_mini_mode(True, vid_title)

            # Resize to sleek floating video monitor that can be moved around
            self.setMinimumSize(240, 180)
            if not self.is_docked:
                self.resize(380, 270)
        else:
            # Restore all full view components
            self.sidebar.setVisible(True)
            self.search_container.setVisible(True)
            self.tags_scroll.setVisible(True)
            self.grid_container.setVisible(True)

            self.detail_title.setVisible(True)
            if hasattr(self, "meta_container"):
                self.meta_container.setVisible(True)
            else:
                self.detail_meta.setVisible(True)
                self.save_btn.setVisible(True)
            self.tags_container.setVisible(True)
            self.opts_box.setVisible(True)
            self.import_btn.setVisible(True)

            self.inspector_panel.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430;")
            self.detail_layout.setContentsMargins(8, 8, 8, 8)
            self.detail_layout.setSpacing(6)
            self.splitter.setSizes([460, 540])

            self.title_bar.set_mini_mode(False)

            self.setMinimumSize(360, 320)
            if not self.is_docked:
                if hasattr(self, "_saved_geometry") and self._saved_geometry:
                    self.setGeometry(self._saved_geometry)
                else:
                    self.resize(1180, 740)

            if hasattr(self, "_saved_nav_index"):
                self.sidebar.set_active_index(self._saved_nav_index)

            self._reflow_timer.start(50)

    def toggle_theater_mode(self):
        self.is_theater_mode = getattr(self, "is_theater_mode", False)
        self.is_theater_mode = not self.is_theater_mode
        if self.is_theater_mode:
            self.grid_container.setVisible(False)
            self.search_container.setVisible(False)
            self.tags_scroll.setVisible(False)
            self.splitter.setSizes([0, 1000])
            if hasattr(self, "player_widget") and hasattr(self.player_widget, "theater_btn"):
                self.player_widget.theater_btn.setText("⛶ Default View")
                self.player_widget.theater_btn.setStyleSheet("background-color: #ff0033; color: #ffffff;")
        else:
            self.grid_container.setVisible(True)
            self.search_container.setVisible(True)
            self.tags_scroll.setVisible(True)
            self.splitter.setSizes([460, 540])
            if hasattr(self, "player_widget") and hasattr(self.player_widget, "theater_btn"):
                self.player_widget.theater_btn.setText("⛶ Theater")
                self.player_widget.theater_btn.setStyleSheet("")
            self._reflow_timer.start(50)

    def toggle_docking(self):
        if self.is_docked:
            show_floating_window()
        else:
            show_docked_window()

    # ==================== EXPLORE TAB ====================
    def build_explore_tab(self, parent):
        layout = QtWidgets.QVBoxLayout(parent)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(8)

        # Search Container
        self.search_container = QtWidgets.QWidget()
        search_layout = QtWidgets.QHBoxLayout(self.search_container)
        search_layout.setContentsMargins(0, 0, 0, 0)
        search_layout.setSpacing(6)

        self.search_input = QtWidgets.QLineEdit()
        self.search_input.setPlaceholderText("Search actions, mechanics, styles (walk, run, combat, jump)...")
        self.search_input.textChanged.connect(lambda: self.search_timer.start())
        search_layout.addWidget(self.search_input, stretch=3)

        self.sort_combo = QtWidgets.QComboBox()
        self.sort_combo.addItems(["Newest", "Oldest", "Longest", "Shortest"])
        self.sort_combo.currentIndexChanged.connect(self.perform_search)
        search_layout.addWidget(self.sort_combo, stretch=1)

        self.stats_label = QtWidgets.QLabel("")
        self.stats_label.setStyleSheet("color: #00E5FF; font-weight: bold; font-size: 11px;")
        search_layout.addWidget(self.stats_label)

        layout.addWidget(self.search_container)

        # Tag Pills (Tabs on top with ZERO scroll bar)
        self.tags_scroll = QtWidgets.QScrollArea()
        self.tags_scroll.setFixedHeight(34)
        self.tags_scroll.setWidgetResizable(True)
        self.tags_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.tags_scroll.setVerticalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.tags_scroll.setFrameShape(QtWidgets.QFrame.NoFrame)
        self.tags_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; } QScrollBar { width: 0px; height: 0px; }")

        self.tags_widget = QtWidgets.QWidget()
        self.tags_layout = QtWidgets.QHBoxLayout(self.tags_widget)
        self.tags_layout.setContentsMargins(4, 2, 4, 2)
        self.tags_layout.setSpacing(6)
        self.tags_scroll.setWidget(self.tags_widget)

        # Smooth horizontal mouse wheel scroll (no scrollbar needed)
        def _scroll_tags_horizontally(event):
            delta = event.angleDelta().y() or event.angleDelta().x()
            sb = self.tags_scroll.horizontalScrollBar()
            sb.setValue(sb.value() - delta)
            event.accept()

        self.tags_scroll.wheelEvent = _scroll_tags_horizontally
        layout.addWidget(self.tags_scroll)

        # Central Area (Cards Grid on Left, Inspector on Right)
        self.splitter = QtWidgets.QSplitter(QtCore.Qt.Horizontal)
        self.splitter.setChildrenCollapsible(False)

        self.grid_container = QtWidgets.QWidget()
        grid_vbox = QtWidgets.QVBoxLayout(self.grid_container)
        grid_vbox.setContentsMargins(0, 0, 0, 0)
        grid_vbox.setSpacing(0)

        self.grid_scroll = QtWidgets.QScrollArea()
        self.grid_scroll.setWidgetResizable(True)
        self.grid_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
        self.grid_content = QtWidgets.QWidget()
        self.grid_layout = QtWidgets.QGridLayout(self.grid_content)
        self.grid_layout.setContentsMargins(2, 2, 2, 2)
        self.grid_layout.setSpacing(8)
        self.grid_scroll.setWidget(self.grid_content)
        grid_vbox.addWidget(self.grid_scroll)
        self.splitter.addWidget(self.grid_container)

        # Right Inspector
        self.inspector_panel = self.create_inspector_panel()
        self.splitter.addWidget(self.inspector_panel)
        self.splitter.setStretchFactor(0, 1)
        self.splitter.setStretchFactor(1, 2)
        self.splitter.setSizes([460, 540])

        layout.addWidget(self.splitter)

    def create_inspector_panel(self):
        self.inspector_panel = QtWidgets.QFrame()
        self.inspector_panel.setMinimumWidth(380)
        self.inspector_panel.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430;")
        self.detail_layout = QtWidgets.QVBoxLayout(self.inspector_panel)
        self.detail_layout.setContentsMargins(8, 8, 8, 8)
        self.detail_layout.setSpacing(6)

        self.player_widget = VideoPlayerWidget(self.inspector_panel)
        self.detail_layout.addWidget(self.player_widget, stretch=1)

        self.detail_title = QtWidgets.QLabel("Select a reference clip to inspect")
        self.detail_title.setStyleSheet("font-weight: bold; font-size: 13px; color: #ffffff;")
        self.detail_title.setWordWrap(True)
        self.detail_layout.addWidget(self.detail_title)

        self.meta_container = QtWidgets.QWidget()
        meta_row = QtWidgets.QHBoxLayout(self.meta_container)
        meta_row.setContentsMargins(0, 0, 0, 0)
        self.detail_meta = QtWidgets.QLabel("")
        self.detail_meta.setStyleSheet("color: #8b949e; font-size: 11px;")
        self.detail_meta.setWordWrap(True)
        meta_row.addWidget(self.detail_meta, stretch=1)

        self.save_btn = QtWidgets.QPushButton("+ Save")
        self.save_btn.setStyleSheet("padding: 3px 8px; font-size: 10px; background-color: #1c2128; border: 1px solid #30363d; border-radius: 4px; color: #f39c12; font-weight: bold;")
        self.save_btn.clicked.connect(self.toggle_save_selected_video)
        meta_row.addWidget(self.save_btn)
        self.detail_layout.addWidget(self.meta_container)

        self.tags_container = QtWidgets.QWidget()
        self.tags_flow_layout = QtWidgets.QHBoxLayout(self.tags_container)
        self.tags_flow_layout.setContentsMargins(0, 0, 0, 0)
        self.tags_flow_layout.setSpacing(4)
        self.detail_layout.addWidget(self.tags_container)

        self.detail_layout.addStretch()

        self.opts_box = QtWidgets.QGroupBox("Maya Scene Integration")
        self.opts_box.setStyleSheet("QGroupBox { font-weight: bold; color: #e6edf3; border: 1px solid #30363d; border-radius: 6px; margin-top: 4px; padding-top: 6px; }")
        opts_layout = QtWidgets.QVBoxLayout(self.opts_box)
        opts_layout.setSpacing(4)

        cam_layout = QtWidgets.QHBoxLayout()
        cam_layout.addWidget(QtWidgets.QLabel("Target:"))
        self.cam_combo = QtWidgets.QComboBox()
        self.cam_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToContentsOnFirstShow)
        self.refresh_cameras_dropdown()
        cam_layout.addWidget(self.cam_combo, stretch=1)
        opts_layout.addLayout(cam_layout)

        mode_layout = QtWidgets.QHBoxLayout()
        mode_layout.addWidget(QtWidgets.QLabel("Format:"))
        self.mode_combo = QtWidgets.QComboBox()
        self.mode_combo.setSizeAdjustPolicy(QtWidgets.QComboBox.AdjustToContentsOnFirstShow)
        self.mode_combo.addItems(["Image Sequence (Scrubbable)", "Direct MP4 Movie"])
        mode_layout.addWidget(self.mode_combo, stretch=1)
        opts_layout.addLayout(mode_layout)

        self.start_curr_check = QtWidgets.QCheckBox("Start at Current Frame")
        self.start_curr_check.setChecked(True)
        opts_layout.addWidget(self.start_curr_check)

        self.fit_timeline_check = QtWidgets.QCheckBox("Fit Timeline Range to Clip")
        self.fit_timeline_check.setChecked(True)
        opts_layout.addWidget(self.fit_timeline_check)

        self.detail_layout.addWidget(self.opts_box)

        self.progress_bar = QtWidgets.QProgressBar()
        self.progress_bar.setVisible(False)
        self.detail_layout.addWidget(self.progress_bar)

        self.import_btn = QtWidgets.QPushButton("Import to Maya Scene")
        self.import_btn.setObjectName("PrimaryBtn")
        self.import_btn.setEnabled(False)
        self.import_btn.clicked.connect(self.on_import_clicked)
        self.detail_layout.addWidget(self.import_btn)

        return self.inspector_panel

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
        refresh_saved_btn.clicked.connect(lambda: self.load_saved_data(force_refresh=True))
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
        refresh_boards_btn.clicked.connect(lambda: self.load_boards_data(force_refresh=True))
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
        self.record_pb_btn = QtWidgets.QPushButton("Record Maya Playblast")
        self.record_pb_btn.setObjectName("PrimaryBtn")
        self.record_pb_btn.clicked.connect(self.run_playblast_capture)
        btn_row.addWidget(self.record_pb_btn)

        self.upload_pb_btn = QtWidgets.QPushButton("Upload to AnimRef Account")
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

        self.compare_card = QtWidgets.QFrame()
        self.compare_card.setStyleSheet("background-color: #131720; border-radius: 8px; border: 1px solid #1f2430; padding: 14px;")
        self.compare_card.setVisible(False)
        comp_layout = QtWidgets.QVBoxLayout(self.compare_card)

        self.comp_link_lbl = QtWidgets.QLabel("Playblast uploaded successfully!")
        self.comp_link_lbl.setStyleSheet("color: #10B981; font-weight: bold; font-size: 13px;")
        comp_layout.addWidget(self.comp_link_lbl)

        self.open_compare_btn = QtWidgets.QPushButton("Open Synchronized Compare on AnimationReference.org")
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
            initials = "".join([part[0].upper() for part in name.split()[:2]]) or "AR"
            is_pro = user.get("isPro", True)
            self.sidebar.user_name_lbl.setText(name[:14])
            self.sidebar.user_badge_lbl.setText("Pro Member" if is_pro else "Free Member")
            self.sidebar.user_badge_lbl.setStyleSheet("font-size: 9px; color: #10B981; font-weight: bold;" if is_pro else "font-size: 9px; color: #8b949e;")
            self.sidebar.avatar_lbl.setText(initials)
            self.login_box.setVisible(False)
            self.profile_box.setVisible(True)
            self.profile_name_lbl.setText("Signed in as: " + name)
            self.profile_email_lbl.setText(user.get("email", ""))
        else:
            self.sidebar.user_name_lbl.setText("Sign In")
            self.sidebar.user_badge_lbl.setText("Click to Login")
            self.sidebar.user_badge_lbl.setStyleSheet("font-size: 9px; color: #8b949e;")
            self.sidebar.avatar_lbl.setText("AR")
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
            self.sidebar.set_active_index(0)
            self.load_saved_data()
            self.load_boards_data()
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
        while self.saved_grid.count():
            item = self.saved_grid.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        while self.boards_vbox.count():
            item = self.boards_vbox.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self.saved_header_lbl.setText("Sign in to view your Saved References")
        self.boards_header_lbl.setText("Sign in to view your Moodboards")

    def load_saved_data(self, force_refresh=False):
        user = animref_auth.get_current_user()
        if not user:
            self.saved_header_lbl.setText("Sign in to view your Saved References")
            return

        now = time.time()
        last_fetch = getattr(self, "_last_saved_fetch_time", 0)
        has_cards = hasattr(self, "saved_card_widgets") and len(self.saved_card_widgets) > 0

        # If already populated and recent (< 90s) and not force refresh, keep UI instant!
        if has_cards and not force_refresh and (now - last_fetch < 90):
            return

        # 1. Instant zero-wait render from local cache if UI not populated
        cached = animref_auth.get_cached_saved_references(user.get("uid"))
        if cached and (cached.get("saved") or cached.get("liked")):
            if not has_cards:
                self.on_saved_data_ready(cached.get("saved", []), cached.get("liked", []), is_cached=True)

        if not has_cards and not (cached and (cached.get("saved") or cached.get("liked"))):
            self.saved_header_lbl.setText("Loading your saved references...")

        # If recent cached render and not forcing refresh, avoid redundant background network hit
        if not force_refresh and (now - last_fetch < 90) and cached:
            return

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
        if not is_cached:
            self._last_saved_fetch_time = time.time()

        all_vids = (saved or []) + (liked or [])
        total = len(all_vids)
        self.saved_header_lbl.setText("Your Saved References & Favorites ({})".format(total))

        # Check if identical to currently rendered to avoid unnecessary UI redraw
        current_ids = [v.get("id") for v in all_vids if v.get("id")]
        prev_ids = getattr(self, "_saved_rendered_ids", [])
        if prev_ids and prev_ids == current_ids and getattr(self, "saved_card_widgets", None):
            return

        self._saved_rendered_ids = current_ids

        # Fast Qt batch rendering: disable updates to avoid layout thrashing
        if hasattr(self, "saved_scroll") and self.saved_scroll:
            self.saved_scroll.setUpdatesEnabled(False)

        try:
            self.saved_card_widgets = {}
            while self.saved_grid.count():
                item = self.saved_grid.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()

            if not all_vids:
                lbl = QtWidgets.QLabel("No saved references found. Click the bookmark on any clip to save it here!")
                lbl.setStyleSheet("color: #8b949e; padding: 20px;")
                self.saved_grid.addWidget(lbl, 0, 0)
                return

            viewport_w = self.saved_scroll.viewport().width() if self.saved_scroll.viewport() else 500
            cols = max(1, viewport_w // 190)
            for idx, v in enumerate(all_vids):
                card = VideoCardWidget(v)
                card.clicked.connect(self.select_video_and_show)
                card.double_clicked.connect(self.quick_import_video)
                self.saved_grid.addWidget(card, idx // cols, idx % cols)
                vid = v.get("id")
                if vid:
                    self.saved_card_widgets[vid] = card
                animref_api.get_thumbnail(v, callback=self.thumbnail_worker_callback)
        finally:
            if hasattr(self, "saved_scroll") and self.saved_scroll:
                self.saved_scroll.setUpdatesEnabled(True)

    def load_boards_data(self, force_refresh=False):
        user = animref_auth.get_current_user()
        if not user:
            self.boards_header_lbl.setText("Sign in to view your Moodboards")
            return

        now = time.time()
        last_fetch = getattr(self, "_last_boards_fetch_time", 0)
        has_boards = hasattr(self, "_boards_rendered_ids") and len(self._boards_rendered_ids) > 0

        # If already populated and recent (< 90s) and not force refresh, keep UI instant!
        if has_boards and not force_refresh and (now - last_fetch < 90):
            return

        # 1. Instant zero-wait render from local cache if UI not populated
        cached = animref_auth.get_cached_moodboards(user.get("uid"))
        if cached:
            if not has_boards:
                self.on_boards_data_ready(cached, is_cached=True)

        if not has_boards and not cached:
            self.boards_header_lbl.setText("Loading your moodboards...")

        if not force_refresh and (now - last_fetch < 90) and cached:
            return

        def _worker():
            try:
                boards = animref_auth.get_user_moodboards(force_refresh=force_refresh)
                self.boards_loaded.emit(boards)
            except Exception:
                pass

        t = threading.Thread(target=_worker)
        t.daemon = True
        t.start()

    def on_boards_data_ready(self, boards, is_cached=False):
        if not is_cached:
            self._last_boards_fetch_time = time.time()

        boards = boards or []
        self.boards_header_lbl.setText("Your Moodboards ({})".format(len(boards)))

        board_keys = [str(b.get("id")) + "_" + str(len(b.get("items", []))) for b in boards]
        prev_keys = getattr(self, "_boards_rendered_keys", [])
        if prev_keys and prev_keys == board_keys and hasattr(self, "boards_card_widgets") and self.boards_card_widgets:
            return

        self._boards_rendered_keys = board_keys
        self._boards_rendered_ids = [b.get("id") for b in boards]

        if hasattr(self, "boards_scroll") and self.boards_scroll:
            self.boards_scroll.setUpdatesEnabled(False)

        try:
            from collections import defaultdict
            self.boards_card_widgets = defaultdict(list)

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
                items = b.get("items", [])
                board_id = b.get("id", "")
                board_name = b.get("name", "Board")
                group = QtWidgets.QGroupBox(board_name + " ({} clips)".format(len(items)))
                group.setStyleSheet("QGroupBox { font-weight: bold; color: #ffffff; border: 1px solid #1f2430; border-radius: 8px; margin-top: 10px; padding: 12px; }")

                group_layout = QtWidgets.QVBoxLayout(group)
                group_layout.setContentsMargins(6, 12, 6, 6)
                group_layout.setSpacing(6)

                if not items:
                    empty_lbl = QtWidgets.QLabel("This board is currently empty. Add references from the Explore tab or AnimationReference.org!")
                    empty_lbl.setStyleSheet("color: #8b949e; font-size: 11px; padding: 8px;")
                    group_layout.addWidget(empty_lbl)
                else:
                    strip_scroll = QtWidgets.QScrollArea()
                    strip_scroll.setWidgetResizable(True)
                    strip_scroll.setFixedHeight(180)
                    strip_scroll.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAsNeeded)
                    strip_scroll.setVerticalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
                    strip_scroll.setStyleSheet("QScrollArea { border: none; background: transparent; }")

                    strip_content = QtWidgets.QWidget()
                    strip_content.setStyleSheet("background: transparent;")
                    strip_layout = QtWidgets.QHBoxLayout(strip_content)
                    strip_layout.setContentsMargins(2, 2, 2, 2)
                    strip_layout.setSpacing(8)

                    for item in items:
                        card = VideoCardWidget(item)
                        card.clicked.connect(self.select_video_and_show)
                        card.double_clicked.connect(self.quick_import_video)
                        strip_layout.addWidget(card)
                        vid = item.get("id")
                        if vid:
                            self.boards_card_widgets[vid].append(card)
                        animref_api.get_thumbnail(item, callback=self.thumbnail_worker_callback)

                    strip_layout.addStretch()
                    strip_scroll.setWidget(strip_content)
                    group_layout.addWidget(strip_scroll)

                self.boards_vbox.addWidget(group)
        finally:
            if hasattr(self, "boards_scroll") and self.boards_scroll:
                self.boards_scroll.setUpdatesEnabled(True)

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
            self.record_pb_btn.setText("Record Maya Playblast")

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
                    self.upload_pb_btn.setText("Upload to AnimRef Account")
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
        video_id = self.selected_video.get("id") if self.selected_video else "featured"
        try:
            from urllib.parse import quote as urllib_quote
        except ImportError:
            from urllib import quote as urllib_quote
        compare_url = "https://animationreference.org/video/{}?playblast={}".format(video_id, urllib_quote(pub_url, safe=""))

        self.open_compare_btn.clicked.disconnect() if self.open_compare_btn.receivers(QtCore.SIGNAL("clicked()")) > 0 else None
        self.open_compare_btn.clicked.connect(lambda: webbrowser.open(compare_url))

    # ==================== EXPLORE SEARCH & IMPORT ====================
    def load_initial_data(self):
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
                    animref_auth.get_saved_references(force_refresh=False)
                    animref_auth.get_user_moodboards(force_refresh=False)
            except Exception:
                pass

        t_warm = threading.Thread(target=_bg_warm_user)
        t_warm.daemon = True
        t_warm.start()

    def on_catalog_ready(self, catalog, tags):
        self.stats_label.setText("{:,} clips".format(len(catalog)))
        self.sidebar.stat_desc.setText("{:,} clips".format(len(catalog)))
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
        self._current_videos = list(videos)
        self.card_widgets.clear()
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        viewport_w = self.grid_scroll.viewport().width() if self.grid_scroll.viewport() else 500
        cols = max(1, viewport_w // 190)
        self._current_cols = cols

        for idx, v in enumerate(videos):
            card = VideoCardWidget(v)
            card.clicked.connect(self.select_video)
            card.double_clicked.connect(self.quick_import_video)
            self.grid_layout.addWidget(card, idx // cols, idx % cols)
            vid = v.get("id")
            if vid:
                self.card_widgets[vid] = card
            animref_api.get_thumbnail(v, callback=self.thumbnail_worker_callback)

    def _reflow_grid(self):
        if not getattr(self, "_current_videos", None) or not self.card_widgets:
            return
        viewport_w = self.grid_scroll.viewport().width() if self.grid_scroll.viewport() else 500
        cols = max(1, viewport_w // 190)
        if cols == getattr(self, "_current_cols", None):
            return
        self._current_cols = cols

        cards = list(self.card_widgets.values())
        for idx, card in enumerate(cards):
            self.grid_layout.removeWidget(card)
            self.grid_layout.addWidget(card, idx // cols, idx % cols)

    def thumbnail_worker_callback(self, video_id, local_path):
        try:
            self.thumbnail_loaded.emit(video_id, local_path or "")
        except Exception:
            pass

    def on_thumbnail_ready(self, video_id, local_path):
        card = self.card_widgets.get(video_id)
        if card:
            if local_path and os.path.isfile(local_path):
                card.set_pixmap(QtGui.QPixmap(local_path))
            else:
                card.set_fallback_preview()

        saved_card = getattr(self, "saved_card_widgets", {}).get(video_id)
        if saved_card:
            if local_path and os.path.isfile(local_path):
                saved_card.set_pixmap(QtGui.QPixmap(local_path))
            else:
                saved_card.set_fallback_preview()

        boards_cards = getattr(self, "boards_card_widgets", {}).get(video_id, [])
        for b_card in boards_cards:
            if local_path and os.path.isfile(local_path):
                b_card.set_pixmap(QtGui.QPixmap(local_path))
            else:
                b_card.set_fallback_preview()

        if self.selected_video and self.selected_video.get("id") == video_id:
            if hasattr(self, "player_widget") and self.player_widget:
                if local_path and os.path.isfile(local_path):
                    self.player_widget.update_thumbnail_preview(local_path)

    def select_video(self, video_data):
        self.selected_video = video_data

        for vid, card in self.card_widgets.items():
            is_sel = (vid == video_data.get("id"))
            card.setProperty("selected", "true" if is_sel else "false")
            card.style().unpolish(card)
            card.style().polish(card)

        # 1. Start Video Playback
        if hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.load_video(video_data)

        # 2. Update Details
        title_text = video_data.get("title") or "Untitled Reference"
        self.detail_title.setText(title_text)
        if getattr(self, "is_compact", False) and hasattr(self, "title_bar"):
            clean_t = title_text[:24] + ".." if len(title_text) > 26 else title_text
            self.title_bar.title_lbl.setText(clean_t)

        dur = video_data.get("duration")
        dur_str = "{:.1f}s".format(dur) if dur else "Clip"
        creator = video_data.get("author_name") or video_data.get("uploader") or "AnimRef Studio"
        self.detail_meta.setText("Duration: {}  |  Creator: {}".format(dur_str, creator))

        # 3. Populate Interactive Tag Chips
        if hasattr(self, "tags_flow_layout"):
            while self.tags_flow_layout.count():
                child = self.tags_flow_layout.takeAt(0)
                if child.widget():
                    child.widget().deleteLater()

            tags = video_data.get("tags", [])
            for t in tags[:5]:
                tag_chip = QtWidgets.QPushButton("#" + t)
                tag_chip.setObjectName("TagChip")
                tag_chip.setCursor(QtCore.Qt.PointingHandCursor)
                tag_chip.clicked.connect(lambda checked=False, tag_val=t: self.filter_by_tag(tag_val))
                self.tags_flow_layout.addWidget(tag_chip)
            self.tags_flow_layout.addStretch()

        self.import_btn.setEnabled(True)

    def select_video_and_show(self, video_data):
        self.sidebar.set_active_index(0)
        self.select_video(video_data)

    def filter_by_tag(self, tag_val):
        self.active_tag = tag_val
        self.search_input.setText(tag_val)
        self.perform_search()

    def toggle_save_selected_video(self):
        if not self.selected_video:
            return
        user = animref_auth.get_current_user()
        if not user:
            self.sidebar.set_active_index(4)
            return
        res = animref_auth.toggle_save_reference(self.selected_video.get("id"))
        if res.get("success"):
            saved = res.get("isSaved", False)
            self.save_btn.setText("Saved" if saved else "Save")
            if cmds:
                cmds.inViewMessage(amg="<span style=\'color:#00E5FF\'>Reference updated in your library!</span>", pos="midCenter", fade=True, fst=150)

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

    def closeEvent(self, event):
        if hasattr(self, "player_widget") and self.player_widget:
            self.player_widget.stop()
        super(AnimRefBrowserWindow, self).closeEvent(event)

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
WORKSPACE_NAME = "AnimRefWorkspaceControl"

def is_docked():
    if cmds and hasattr(cmds, "workspaceControl"):
        return bool(cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True))
    return False

def show_docked_window():
    global _window_instance
    if not cmds or not hasattr(cmds, "workspaceControl"):
        return show_floating_window()

    if _window_instance is not None and not getattr(_window_instance, "is_docked", False):
        try:
            _window_instance.close()
            _window_instance.deleteLater()
        except Exception:
            pass
        _window_instance = None

    if cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True):
        cmds.workspaceControl(WORKSPACE_NAME, edit=True, restore=True)
        cmds.workspaceControl(WORKSPACE_NAME, edit=True, visible=True)
    else:
        dock_target = None
        for cand in ["ChannelBoxLayerEditor", "AttributeEditor"]:
            if cmds.workspaceControl(cand, query=True, exists=True):
                dock_target = cand
                break

        if dock_target:
            cmds.workspaceControl(
                WORKSPACE_NAME,
                label="AnimRef Studio",
                retain=False,
                floating=False,
                initialWidth=360,
                minimumWidth=240,
                minimumHeight=200,
                dockToControl=[dock_target, "tab"]
            )
        else:
            cmds.workspaceControl(
                WORKSPACE_NAME,
                label="AnimRef Studio",
                retain=False,
                floating=True,
                initialWidth=380,
                initialHeight=340,
                minimumWidth=240,
                minimumHeight=200
            )

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
        _window_instance = win
        return win
    return None

def show_floating_window():
    global _window_instance
    if cmds and hasattr(cmds, "workspaceControl"):
        if cmds.workspaceControl(WORKSPACE_NAME, query=True, exists=True):
            try:
                cmds.workspaceControl(WORKSPACE_NAME, edit=True, visible=False)
                cmds.deleteUI(WORKSPACE_NAME, control=True)
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
