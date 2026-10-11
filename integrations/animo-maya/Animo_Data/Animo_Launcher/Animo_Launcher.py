import maya.cmds as cmds
import maya.mel as mel
import maya.OpenMayaUI as mui

try:
    from PySide2 import QtWidgets, QtCore, QtGui
    from shiboken2 import wrapInstance
    import shiboken2 as shiboken_mod
    QAction = QtWidgets.QAction  # PySide2: QAction is in QtWidgets
except ImportError:
    from PySide6 import QtWidgets, QtCore, QtGui
    from shiboken6 import wrapInstance
    import shiboken6 as shiboken_mod
    QAction = QtGui.QAction  # PySide6: QAction moved to QtGui

import os
import sys
import importlib
import json
import platform
import time

IS_MAC = platform.system() == "Darwin"


def get_animo_data_path():
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.normpath(os.path.join(script_dir, ".."))
    except NameError:
        version_script_dir = cmds.internalVar(userScriptDir=True)
        script_dir = os.path.normpath(os.path.join(version_script_dir, "..", "..", "scripts"))
        return os.path.join(script_dir, "Animo_Data")


def get_prefs_path():
    animo_data = get_animo_data_path()
    prefs_dir = os.path.join(animo_data, "Animo_Prefs")
    # Create the folder if it doesn't exist
    if not os.path.exists(prefs_dir):
        try:
            os.makedirs(prefs_dir)
        except:
            pass
    return prefs_dir


def get_prefs_file():
    return os.path.join(get_prefs_path(), "dock_mode.json")


def enable_usersetup_security():
    if not cmds.optionVar(exists='startupScriptIsEnabled'):
        cmds.optionVar(intValue=('startupScriptIsEnabled', 1))
    elif cmds.optionVar(query='startupScriptIsEnabled') == 0:
        cmds.optionVar(intValue=('startupScriptIsEnabled', 1))


ANIMO_DATA_PATH = get_animo_data_path()
ICONS_PATH = os.path.join(ANIMO_DATA_PATH, "Animo_Launcher")
MAYA_VERSION = int(cmds.about(version=True)[:4])


def _load_anim_ref_dropper_plugin():
    plugin_path = os.path.join(ANIMO_DATA_PATH, "Animo_Reference_Dropper", "anim_ref_dropper_plugin.py")
    if not os.path.exists(plugin_path):
        return
    try:
        if not cmds.pluginInfo(plugin_path, query=True, loaded=True):
            cmds.loadPlugin(plugin_path)
    except Exception:
        pass


def _apply_saved_animo_hotkeys():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "animo_hotkeys_loader" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        if 'animo_hotkeys_loader' in sys.modules:
            del sys.modules['animo_hotkeys_loader']

        import animo_hotkeys_loader
        animo_hotkeys_loader.apply_saved_hotkeys(ANIMO_DATA_PATH)
    except Exception as e:
        cmds.warning("Animo: Could not apply saved hotkeys - {}".format(str(e)))


if ANIMO_DATA_PATH not in sys.path:
    sys.path.insert(0, ANIMO_DATA_PATH)

TOOLTIP_PATH = os.path.join(ANIMO_DATA_PATH, "Animo_Tools_Tip")
if TOOLTIP_PATH not in sys.path:
    sys.path.insert(0, TOOLTIP_PATH)

ANIMO_PREFS_PATH = os.path.join(ANIMO_DATA_PATH, "Animo_Prefs")

def _ensure_prefs_dir():
    if not os.path.exists(ANIMO_PREFS_PATH):
        try:
            os.makedirs(ANIMO_PREFS_PATH)
        except OSError:
            pass

def _get_tooltip_pref():
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "tooltip_prefs.json")
    if os.path.exists(pref_file):
        try:
            with open(pref_file, 'r') as f:
                import json
                data = json.load(f)
                return data.get("tooltips_enabled", True)
        except:
            pass
    return True  # Default: tooltips enabled

def _set_tooltip_pref(enabled):
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "tooltip_prefs.json")
    try:
        import json
        with open(pref_file, 'w') as f:
            json.dump({"tooltips_enabled": enabled}, f, indent=2)
    except:
        pass


def _get_center_pivot_pref():
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "center_pivot_prefs.json")
    if os.path.exists(pref_file):
        try:
            with open(pref_file, 'r') as f:
                import json
                data = json.load(f)
                return data.get("center_pivot_enabled", False)
        except:
            pass
    return False  # Default: disabled


def _set_center_pivot_pref(enabled):
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "center_pivot_prefs.json")
    try:
        import json
        with open(pref_file, 'w') as f:
            json.dump({"center_pivot_enabled": enabled}, f, indent=2)
    except:
        pass


def _is_center_pivot_active():
    # First check if the node exists and mode is engaged
    try:
        if cmds.objExists("pivotAnchorDataHolder"):
            if cmds.getAttr("pivotAnchorDataHolder.modeEngaged"):
                return True
    except:
        pass
    # Fall back to saved preference (for startup before node is created)
    return _get_center_pivot_pref()


def _get_tracify_camera_space_pref():
    if cmds.optionVar(exists='TracifyUI_CameraSpace'):
        try:
            return bool(cmds.optionVar(q='TracifyUI_CameraSpace'))
        except:
            pass
    return False


def _get_xform_bake_only_keys_pref():
    if cmds.optionVar(exists='XformAlignUI_bakeKeys'):
        try:
            return bool(cmds.optionVar(q='XformAlignUI_bakeKeys'))
        except:
            pass
    return True


def _get_wrap_icons_pref():
    return True


def _set_wrap_icons_pref(enabled):
    pass


def _get_show_all_sliders_pref():
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "show_all_sliders.json")
    if os.path.exists(pref_file):
        try:
            with open(pref_file, 'r') as f:
                data = json.load(f)
                return data.get("show_all_sliders", False)
        except:
            pass
    return False


def _set_show_all_sliders_pref(enabled):
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "show_all_sliders.json")
    try:
        with open(pref_file, 'w') as f:
            json.dump({"show_all_sliders": enabled}, f, indent=2)
    except:
        pass


ALL_SLIDERS_TOGGLE_LIST = [
    ("EA", "ease", "Ease"),
    ("BE", "blend_ease", "Blend to Ease"),
    ("PP", "push_pull", "Push / Pull"),
    ("SR", "scale_right", "Scale from Right"),
    ("SA", "scale_avg", "Scale from Average"),
    ("SD", "scale_default", "Scale from Default"),
    ("BD", "blend_default", "Blend to Default"),
    ("TO", "time_offset", "Time Offset"),
    ("TS", "time_offset_stagger", "Time Offset Stagger"),
    ("NW", "noise_wave", "Noise / Wave"),
    ("CN", "blend_world", "Connect to Neighbour"),
    ("SH", "smooth_harsh", "Smooth | Harsh"),
    ("SB", "simplify_bake", "Simplify | Bake"),
    ("BI", "blend_infinity", "Blend to Infinity"),
    ("BM", "blend_mirror", "Blend to Mirror"),
]

_all_sliders_widgets = {}
_all_sliders_row_items = []


def _get_slider_visibility_prefs():
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "show_all_sliders_visibility.json")
    if os.path.exists(pref_file):
        try:
            with open(pref_file, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}


def _is_slider_visible_pref(slider_mode):
    return _get_slider_visibility_prefs().get(slider_mode, True)


def _set_slider_visibility_pref(slider_mode, enabled):
    _ensure_prefs_dir()
    pref_file = os.path.join(ANIMO_PREFS_PATH, "show_all_sliders_visibility.json")
    data = _get_slider_visibility_prefs()
    data[slider_mode] = enabled
    try:
        with open(pref_file, 'w') as f:
            json.dump(data, f, indent=2)
    except:
        pass


def _refresh_all_sliders_row_height():
    if not _show_all_sliders_container:
        return
    if not _show_all_sliders_container.isVisible():
        return
    extra_height = _get_all_sliders_row_height(_show_all_sliders_container)
    container_width = _show_all_sliders_container.width()
    if container_width <= 0:
        container_width = _show_all_sliders_container.sizeHint().width()
    if _show_all_sliders_container.minimumHeight() != extra_height:
        _show_all_sliders_container.setMinimumHeight(extra_height)
        _show_all_sliders_container.setMaximumHeight(extra_height)
    _show_all_sliders_container.resize(container_width, extra_height)
    parent_toolbar = _show_all_sliders_container.parent()
    if parent_toolbar:
        base_height = style.TOOLBAR_HEIGHT
        new_height = base_height + extra_height + style.scaled(8)
        parent_toolbar.setFixedHeight(new_height)
        parent_toolbar.updateGeometry()


def _rebuild_all_sliders_row_items():
    if not _show_all_sliders_container:
        return
    row_layout = _show_all_sliders_container.layout()
    if not row_layout:
        return
    while row_layout.count():
        row_layout.takeAt(0)
    pending_gap = None
    added_any = False
    for entry in _all_sliders_row_items:
        if entry[0] == "gap":
            gap_widget = entry[1]
            gap_widget.hide()
            pending_gap = gap_widget
        else:
            slider_mode, widget = entry[1], entry[2]
            if _is_slider_visible_pref(slider_mode):
                if pending_gap is not None and added_any:
                    row_layout.addWidget(pending_gap)
                    pending_gap.show()
                row_layout.addWidget(widget)
                widget.show()
                added_any = True
                pending_gap = None
            else:
                widget.hide()
    row_layout.invalidate()
    if _show_all_sliders_container.width() > 0:
        row_layout._doLayout(_show_all_sliders_container.rect(), False)
    _show_all_sliders_container.updateGeometry()
    _show_all_sliders_container.update()


def _toggle_individual_slider_visibility(slider_mode, checked):
    _set_slider_visibility_pref(slider_mode, checked)
    _rebuild_all_sliders_row_items()
    _refresh_all_sliders_row_height()


MENU_SIZE_BOOST = 1.1


def _menu_scaled(px):
    return int(round(style.scaled(px) * MENU_SIZE_BOOST))


def _animo_menu_qss(with_indicator=True, disabled=False):
    pad_v = _menu_scaled(6)
    pad_h = _menu_scaled(25)
    ind = _menu_scaled(13)
    lines = []
    lines.append("QMenu { background-color: #3a3a3a; border: 1px solid #555; padding: 3px; }")
    lines.append("QMenu::item { padding: " + str(pad_v) + "px " + str(pad_h) + "px; color: #ccc; }")
    if disabled:
        lines.append("QMenu::item:selected { background-color: #555; }")
        lines.append("QMenu::item:disabled { color: #666; }")
    else:
        lines.append("QMenu::item:selected { background-color: #555; color: #fff; }")
    if with_indicator:
        lines.append("QMenu::indicator { width: " + str(ind) + "px; height: " + str(ind) + "px; }")
        lines.append("QMenu::indicator:checked { background-color: #4aa3df; border: 1px solid #4aa3df; border-radius: 2px; }")
        lines.append("QMenu::indicator:unchecked { background-color: transparent; border: 1px solid #666; border-radius: 2px; }")
    return "\n".join(lines)


def _animo_checkbox_qss():
    pad_tb = _menu_scaled(6)
    pad_r = _menu_scaled(25)
    pad_l = _menu_scaled(10)
    ind = _menu_scaled(13)
    lines = []
    lines.append("QCheckBox { color: #ccc; padding: " + str(pad_tb) + "px " + str(pad_r) + "px " + str(pad_tb) + "px " + str(pad_l) + "px; background: transparent; }")
    lines.append("QCheckBox::indicator { width: " + str(ind) + "px; height: " + str(ind) + "px; }")
    lines.append("QCheckBox::indicator:checked { background-color: #4aa3df; border: 1px solid #4aa3df; border-radius: 2px; }")
    lines.append("QCheckBox::indicator:unchecked { background-color: transparent; border: 1px solid #666; border-radius: 2px; }")
    return "\n".join(lines)


class _CenteredMenuItemWidget(QtWidgets.QWidget):
    # Qt style sheets don't support text-align for QMenu::item (native menu
    # items are painted by the style engine, not laid out like a normal
    # widget), so the only reliable way to get centered text in a QMenu is
    # to host a real widget per row via QWidgetAction and center a QLabel
    # inside it ourselves. A fixed-width indicator slot (a real checkbox
    # square for checkable rows, an invisible placeholder of the same size
    # for plain rows) is reserved on both sides so every row's text sits
    # on the same center line regardless of whether it has a checkbox.
    def __init__(self, text, menu, checkable=False, checked=False, callback=None, parent=None):
        super(_CenteredMenuItemWidget, self).__init__(parent)
        self._menu = menu
        self._checkable = checkable
        self._checked = checked
        self._callback = callback

        self.setAttribute(QtCore.Qt.WA_StyledBackground, True)
        # Set once at construction only - never touched again on
        # hover/leave. Qt's native style engine handles the :hover state
        # from here on with zero further Python involvement, which is
        # what keeps this stable (repeated setStyleSheet calls on every
        # Enter/Leave event is what caused instability previously).
        self.setStyleSheet(
            "_CenteredMenuItemWidget { background-color: transparent; }"
            "_CenteredMenuItemWidget:hover { background-color: #555; }"
        )

        pad_v = _menu_scaled(6)
        pad_h = _menu_scaled(25)
        ind = _menu_scaled(13)
        # Small inset for the checkbox column, separate from the text's
        # own padding - this is what puts the checkbox back flush near
        # the left edge (matching where it sat in the native menu)
        # instead of indented by the same amount as the text.
        indicator_inset = _menu_scaled(10)

        layout = QtWidgets.QHBoxLayout(self)
        layout.setContentsMargins(indicator_inset, pad_v, pad_h, pad_v)
        layout.setSpacing(_menu_scaled(8))

        self._indicator = QtWidgets.QLabel(self)
        self._indicator.setFixedSize(ind, ind)
        if checkable:
            self._updateIndicatorStyle()
        else:
            self._indicator.setStyleSheet("background-color: transparent; border: none;")
        layout.addWidget(self._indicator)

        self._label = QtWidgets.QLabel(text, self)
        self._label.setAlignment(QtCore.Qt.AlignCenter)
        self._label.setStyleSheet("color: #ccc; background: transparent;")
        layout.addWidget(self._label, 1)

        self.setCursor(QtCore.Qt.PointingHandCursor)

    def _updateIndicatorStyle(self):
        if self._checked:
            self._indicator.setStyleSheet(
                "background-color: #4aa3df; border: 1px solid #4aa3df; border-radius: 2px;")
        else:
            self._indicator.setStyleSheet(
                "background-color: transparent; border: 1px solid #666; border-radius: 2px;")

    def isChecked(self):
        return self._checked

    def setChecked(self, checked):
        self._checked = checked
        if self._checkable:
            self._updateIndicatorStyle()

    def mouseReleaseEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton and self.rect().contains(event.pos()):
            if self._checkable:
                self.setChecked(not self._checked)
            if self._callback:
                self._callback(self._checked if self._checkable else None)
            if self._menu is not None:
                self._menu.close()
            event.accept()
            return
        super(_CenteredMenuItemWidget, self).mouseReleaseEvent(event)


def _add_centered_menu_item(menu, text, checkable=False, checked=False, callback=None):
    action = QtWidgets.QWidgetAction(menu)
    widget = _CenteredMenuItemWidget(text, menu, checkable=checkable, checked=checked, callback=callback)
    action.setDefaultWidget(widget)
    menu.addAction(action)
    return widget


class _SlidersVisibilityMenu(QtWidgets.QMenu):
    def __init__(self, *args, **kwargs):
        super(_SlidersVisibilityMenu, self).__init__(*args, **kwargs)
        self._row_checkboxes = []
        self._row_bounds = []
        self._hovered_index = -1
        self._press_row = None
        self.setMouseTracking(True)
    
    def showEvent(self, event):
        super(_SlidersVisibilityMenu, self).showEvent(event)
        self._recomputeRowBounds()
        # Reset ALL interaction state every time the submenu (re)opens.
        # This clears any stale hover highlight left over from a
        # previous time it was shown, and makes sure a release event
        # delivered right after opening (e.g. the click on the parent
        # "Sliders" item that triggered this submenu to appear) can
        # never be mistaken for a real click that started here.
        self._press_row = None
        if self._hovered_index != -1:
            self._hovered_index = -1
            self.update()
    
    def _recomputeRowBounds(self):
        self._row_bounds = []
        count = len(self._row_checkboxes)
        for i, cb in enumerate(self._row_checkboxes):
            rect = cb.geometry()
            if i > 0:
                prev_bottom = self._row_checkboxes[i - 1].geometry().bottom()
                top = (prev_bottom + rect.top()) // 2
            else:
                top = 0
            if i < count - 1:
                next_top = self._row_checkboxes[i + 1].geometry().top()
                bottom = (rect.bottom() + next_top) // 2
            else:
                bottom = self.height()
            self._row_bounds.append((top, bottom, cb))
    
    def _rowIndexAt(self, pos):
        # Guard against events delivered with coordinates outside this
        # widget's own rectangle. QMenu popups hold a mouse grab while
        # open, so clicks/moves that physically happen over the PARENT
        # menu (e.g. while the cursor still sits on the "Sliders" text
        # that opened this submenu) can still be delivered here. Only
        # count it as "over a row" if the point is actually inside our
        # bounds.
        if not self.rect().contains(pos):
            return -1
        for i, (top, bottom, cb) in enumerate(self._row_bounds):
            if top <= pos.y() <= bottom:
                return i
        return -1
    
    def _rowAt(self, pos):
        idx = self._rowIndexAt(pos)
        if idx == -1:
            return None
        return self._row_bounds[idx][2]
    
    def mouseMoveEvent(self, event):
        super(_SlidersVisibilityMenu, self).mouseMoveEvent(event)
        # Lightweight hover feedback: just track which row index is under
        # the cursor and request a repaint. No stylesheet/style-engine
        # calls here (that's what made the old version unstable) - the
        # actual highlight is drawn directly in paintEvent below.
        pos = event.pos() if hasattr(event, 'pos') else event.position().toPoint()
        idx = self._rowIndexAt(pos)
        if idx != self._hovered_index:
            self._hovered_index = idx
            self.update()
    
    def mousePressEvent(self, event):
        pos = event.pos() if hasattr(event, 'pos') else event.position().toPoint()
        target = self._rowAt(pos)
        if target is not None:
            # Remember which row the press actually started on. Only a
            # release that pairs up with a press that began on THIS
            # widget is allowed to toggle a checkbox - this is what
            # stops a click on the parent "Sliders" item (whose press
            # happens on the parent menu, not here) from toggling
            # whatever row the submenu happens to open under.
            self._press_row = target
            event.accept()
            return
        self._press_row = None
        super(_SlidersVisibilityMenu, self).mousePressEvent(event)
    
    def mouseReleaseEvent(self, event):
        pos = event.pos() if hasattr(event, 'pos') else event.position().toPoint()
        target = self._rowAt(pos)
        press_row = self._press_row
        self._press_row = None
        if target is not None and target is press_row:
            target.setChecked(not target.isChecked())
            event.accept()
            return
        if target is not None:
            # A release landed on a row, but no matching press started
            # here (e.g. this is the very click that opened the
            # submenu) - swallow it silently instead of toggling.
            event.accept()
            return
        super(_SlidersVisibilityMenu, self).mouseReleaseEvent(event)
    
    def leaveEvent(self, event):
        super(_SlidersVisibilityMenu, self).leaveEvent(event)
        if self._hovered_index != -1:
            self._hovered_index = -1
            self.update()
    
    def paintEvent(self, event):
        super(_SlidersVisibilityMenu, self).paintEvent(event)
        if 0 <= self._hovered_index < len(self._row_bounds):
            top, bottom, cb = self._row_bounds[self._hovered_index]
            painter = QtGui.QPainter(self)
            painter.fillRect(0, top, self.width(), bottom - top, QtGui.QColor(85, 85, 85))
            painter.end()


def _build_sliders_visibility_submenu(parent_menu):
    sliders_submenu = _SlidersVisibilityMenu("Sliders", parent_menu)
    sliders_submenu.setStyleSheet(parent_menu.styleSheet())
    
    checkbox_style = _animo_checkbox_qss()
    
    pending = []
    max_width = style.scaled(190)
    for label, slider_mode, display_name in ALL_SLIDERS_TOGGLE_LIST:
        checkbox = QtWidgets.QCheckBox(display_name, sliders_submenu)
        checkbox.setChecked(_is_slider_visible_pref(slider_mode))
        checkbox.setAttribute(QtCore.Qt.WA_Hover, True)
        checkbox.setAttribute(QtCore.Qt.WA_TransparentForMouseEvents, True)
        checkbox.setStyleSheet(checkbox_style)
        checkbox.toggled.connect(
            lambda checked, m=slider_mode: _toggle_individual_slider_visibility(m, checked))
        max_width = max(max_width, checkbox.sizeHint().width())
        pending.append(checkbox)
    
    for checkbox in pending:
        checkbox.setFixedWidth(max_width)
        widget_action = QtWidgets.QWidgetAction(sliders_submenu)
        widget_action.setDefaultWidget(checkbox)
        sliders_submenu.addAction(widget_action)
        sliders_submenu._row_checkboxes.append(checkbox)
    
    sliders_menu_action = parent_menu.addMenu(sliders_submenu)
    blank_pixmap = QtGui.QPixmap(13, 13)
    blank_pixmap.fill(QtCore.Qt.transparent)
    sliders_menu_action.setIcon(QtGui.QIcon(blank_pixmap))
    return sliders_submenu


_show_all_sliders_container = None
_show_all_sliders_visible = False


def _toggle_center_pivot(enable):
    try:
        # Find the script (.py or .pyc)
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "KeepSelectionsCenter" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break
        
        if not script_path:
            cmds.warning("KeepSelectionsCenter script not found in: {}".format(ICONS_PATH))
            return
        
        # Add to path if needed
        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)
        
        # Clear cached module
        for mod_name in list(sys.modules.keys()):
            if 'KeepSelectionsCenter' in mod_name:
                del sys.modules[mod_name]
        
        # Import and run appropriate function
        import KeepSelectionsCenter
        
        if enable:
            KeepSelectionsCenter.activateCenterPivot()
            _set_center_pivot_pref(True)
            cmds.inViewMessage(
                amg='<span style="color:#4aa3df;">Keep Selections at Center: ON</span>',
                pos='midCenter', fade=True, fadeStayTime=1000
            )
        else:
            KeepSelectionsCenter.deactivateCenterPivot()
            _set_center_pivot_pref(False)
            cmds.inViewMessage(
                amg='<span style="color:#ff9900;">Keep Selections at Center: OFF</span>',
                pos='midCenter', fade=True, fadeStayTime=1000
            )
    except Exception as e:
        cmds.warning("Failed to toggle Keep Selections at Center: {}".format(str(e)))


def _viewport_reference_dropper_plugin_path():
    return os.path.join(ANIMO_DATA_PATH, "Animo_Reference_Dropper", "anim_ref_dropper_plugin.py")


def _activate_viewport_reference_dropper():
    plugin_path = _viewport_reference_dropper_plugin_path()
    if not os.path.exists(plugin_path):
        cmds.warning("Viewport Reference Dropper plugin not found in: {}".format(os.path.dirname(plugin_path)))
        return
    try:
        if not cmds.pluginInfo(plugin_path, query=True, loaded=True):
            cmds.loadPlugin(plugin_path)
        cmds.inViewMessage(
            amg='<span style="color:#4aa3df;">Viewport Reference Dropper: ON</span>',
            pos='midCenter', fade=True, fadeStayTime=1000
        )
    except Exception as e:
        cmds.warning("Failed to enable Viewport Reference Dropper: {}".format(str(e)))


def _run_mirror_launcher():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "mirror_launcher" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            cmds.warning("mirror_launcher script not found in: {}".format(ICONS_PATH))
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_launcher' in mod_name:
                del sys.modules[mod_name]

        importlib.invalidate_caches()
        import mirror_launcher
    except Exception as e:
        cmds.warning("Failed to run Mirror Launcher: {}".format(str(e)))


def _run_mirror_snapshot():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "mirror_snapshot" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            cmds.warning("mirror_snapshot script not found in: {}".format(ICONS_PATH))
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_snapshot' in mod_name:
                del sys.modules[mod_name]

        import mirror_snapshot
    except Exception as e:
        cmds.warning("Failed to run Mirror Snapshot: {}".format(str(e)))


def _run_mirror_all_keys():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "mirror_all_keys" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            cmds.warning("mirror_all_keys script not found in: {}".format(ICONS_PATH))
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_all_keys' in mod_name:
                del sys.modules[mod_name]

        import mirror_all_keys
    except Exception as e:
        cmds.warning("Failed to run Mirror All Keys: {}".format(str(e)))


def _run_mirror_fix_settings():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "mirror_fix_settings" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            cmds.warning("mirror_fix_settings script not found in: {}".format(ICONS_PATH))
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_fix_settings' in mod_name:
                del sys.modules[mod_name]

        import mirror_fix_settings
    except Exception as e:
        cmds.warning("Failed to run Fix Mirror Settings: {}".format(str(e)))


def _run_tools_editor_launcher():
    try:
        script_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(ICONS_PATH, "tools_editor_launcher" + ext)
            if os.path.exists(potential_path):
                script_path = potential_path
                break

        if not script_path:
            cmds.warning("tools_editor_launcher script not found in: {}".format(ICONS_PATH))
            return

        if ICONS_PATH not in sys.path:
            sys.path.insert(0, ICONS_PATH)

        try:
            maya_main_ptr = mui.MQtUtil.mainWindow()
            if maya_main_ptr:
                maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                for child in maya_main.children():
                    try:
                        if child.objectName() != "AnimoToolsEditorUIWindow":
                            continue
                        child.close()
                        child.setParent(None)
                        child.deleteLater()
                    except (AttributeError, RuntimeError):
                        continue
                app = QtWidgets.QApplication.instance()
                if app:
                    app.sendPostedEvents(None, QtCore.QEvent.DeferredDelete)
                    app.processEvents()
        except Exception:
            pass

        if 'tools_editor_launcher' in sys.modules:
            del sys.modules['tools_editor_launcher']

        import tools_editor_launcher
        tools_editor_launcher.show()
    except Exception as e:
        cmds.warning("Failed to launch Animo Tools Editor: {}".format(str(e)))


def _run_about_launcher():
    # about_launcher.py lives directly in the Animo_Launcher folder
    # (ICONS_PATH), so this uses the same relative bar.run_launcher(...)
    # convention as every other launcher in this file - it resolves the
    # path itself and works on any machine. tool_folder=None/entry_func=None
    # match the "about_launcher" entry in barMod.ICON_DATA.
    try:
        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "about_launcher", None, None)
    except Exception as e:
        cmds.warning("Failed to launch About: {}".format(str(e)))


MIRROR_LAUNCHER_SHELF_COMMAND = '''
import maya.cmds as cmds
import os
import sys
import importlib

try:
    icons_path = {icons_path!r}

    script_path = None
    for ext in [".py", ".pyc"]:
        potential_path = os.path.join(icons_path, "mirror_launcher" + ext)
        if os.path.exists(potential_path):
            script_path = potential_path
            break

    if not script_path:
        cmds.warning("mirror_launcher script not found in: " + icons_path)
    else:
        if icons_path not in sys.path:
            sys.path.insert(0, icons_path)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_launcher' in mod_name:
                del sys.modules[mod_name]

        importlib.invalidate_caches()
        import mirror_launcher
except Exception as e:
    cmds.warning("Failed to run Mirror Launcher: " + str(e))
'''.format(icons_path=ICONS_PATH)

MIRROR_SNAPSHOT_SHELF_COMMAND = '''
import maya.cmds as cmds
import os
import sys

try:
    animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
    icons_path = os.path.join(animo_data_path, "Animo_Launcher")

    script_path = None
    for ext in [".py", ".pyc"]:
        potential_path = os.path.join(icons_path, "mirror_snapshot" + ext)
        if os.path.exists(potential_path):
            script_path = potential_path
            break

    if not script_path:
        cmds.warning("mirror_snapshot script not found in: " + icons_path)
    else:
        if icons_path not in sys.path:
            sys.path.insert(0, icons_path)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_snapshot' in mod_name:
                del sys.modules[mod_name]

        import mirror_snapshot
except Exception as e:
    cmds.warning("Failed to run Mirror Snapshot: " + str(e))
'''

MIRROR_ALL_KEYS_SHELF_COMMAND = '''
import maya.cmds as cmds
import os
import sys

try:
    animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
    icons_path = os.path.join(animo_data_path, "Animo_Launcher")

    script_path = None
    for ext in [".py", ".pyc"]:
        potential_path = os.path.join(icons_path, "mirror_all_keys" + ext)
        if os.path.exists(potential_path):
            script_path = potential_path
            break

    if not script_path:
        cmds.warning("mirror_all_keys script not found in: " + icons_path)
    else:
        if icons_path not in sys.path:
            sys.path.insert(0, icons_path)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_all_keys' in mod_name:
                del sys.modules[mod_name]

        import mirror_all_keys
except Exception as e:
    cmds.warning("Failed to run Mirror All Keys: " + str(e))
'''

MIRROR_FIX_SETTINGS_SHELF_COMMAND = '''
import maya.cmds as cmds
import os
import sys

try:
    animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
    icons_path = os.path.join(animo_data_path, "Animo_Launcher")

    script_path = None
    for ext in [".py", ".pyc"]:
        potential_path = os.path.join(icons_path, "mirror_fix_settings" + ext)
        if os.path.exists(potential_path):
            script_path = potential_path
            break

    if not script_path:
        cmds.warning("mirror_fix_settings script not found in: " + icons_path)
    else:
        if icons_path not in sys.path:
            sys.path.insert(0, icons_path)

        for mod_name in list(sys.modules.keys()):
            if 'mirror_fix_settings' in mod_name:
                del sys.modules[mod_name]

        import mirror_fix_settings
except Exception as e:
    cmds.warning("Failed to run Fix Mirror Settings: " + str(e))
'''

def add_mirror_to_shelf(icon_path):
    import maya.cmds as cmds
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path,
        label="Mirror Animation",
        command=MIRROR_LAUNCHER_SHELF_COMMAND,
        sourceType="python",
        annotation="Mirror Animation"
    )
    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Mirror Animation added to shelf</span>', pos='midCenter', fade=True, fst=200, fad=400)

def add_mirror_snapshot_to_shelf(icon_path):
    import maya.cmds as cmds
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path,
        label="Snapshot Default Rig",
        command=MIRROR_SNAPSHOT_SHELF_COMMAND,
        sourceType="python",
        annotation="Snapshot Default Rig"
    )
    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Snapshot Default Rig added to shelf</span>', pos='midCenter', fade=True, fst=200, fad=400)

def add_mirror_all_keys_to_shelf(icon_path):
    import maya.cmds as cmds
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path,
        label="Mirror All Keys",
        command=MIRROR_ALL_KEYS_SHELF_COMMAND,
        sourceType="python",
        annotation="Mirror All Keys"
    )
    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Mirror All Keys added to shelf</span>', pos='midCenter', fade=True, fst=200, fad=400)

def add_mirror_fix_settings_to_shelf(icon_path):
    import maya.cmds as cmds
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path,
        label="Fix Mirror Settings",
        command=MIRROR_FIX_SETTINGS_SHELF_COMMAND,
        sourceType="python",
        annotation="Fix Mirror Settings"
    )
    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Fix Mirror Settings added to shelf</span>', pos='midCenter', fade=True, fst=200, fad=400)

def assign_mirror_hotkey(icon_path):
    import maya.cmds as cmds
    import sys
    import os

    try:
        animo_data_path = os.path.normpath(os.path.join(
            cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'
        ))
        ui_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_UI'))

        if ui_path not in sys.path:
            sys.path.insert(0, ui_path)

        if 'hotkeyMod' in sys.modules:
            del sys.modules['hotkeyMod']

        import hotkeyMod

        hotkeyMod.show_hotkey_dialog("Mirror Animation", MIRROR_LAUNCHER_SHELF_COMMAND, None, None, icon_path)

    except Exception as e:
        cmds.warning("Could not open hotkey dialog: {}".format(str(e)))

def assign_mirror_snapshot_hotkey(icon_path):
    import maya.cmds as cmds
    import sys
    import os

    try:
        animo_data_path = os.path.normpath(os.path.join(
            cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'
        ))
        ui_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_UI'))

        if ui_path not in sys.path:
            sys.path.insert(0, ui_path)

        if 'hotkeyMod' in sys.modules:
            del sys.modules['hotkeyMod']

        import hotkeyMod

        hotkeyMod.show_hotkey_dialog("Snapshot Default Rig", MIRROR_SNAPSHOT_SHELF_COMMAND, None, None, icon_path)

    except Exception as e:
        cmds.warning("Could not open hotkey dialog: {}".format(str(e)))

def assign_mirror_all_keys_hotkey(icon_path):
    import maya.cmds as cmds
    import sys
    import os

    try:
        animo_data_path = os.path.normpath(os.path.join(
            cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'
        ))
        ui_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_UI'))

        if ui_path not in sys.path:
            sys.path.insert(0, ui_path)

        if 'hotkeyMod' in sys.modules:
            del sys.modules['hotkeyMod']

        import hotkeyMod

        hotkeyMod.show_hotkey_dialog("Mirror All Keys", MIRROR_ALL_KEYS_SHELF_COMMAND, None, None, icon_path)

    except Exception as e:
        cmds.warning("Could not open hotkey dialog: {}".format(str(e)))

def assign_mirror_fix_settings_hotkey(icon_path):
    import maya.cmds as cmds
    import sys
    import os

    try:
        animo_data_path = os.path.normpath(os.path.join(
            cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'
        ))
        ui_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_UI'))

        if ui_path not in sys.path:
            sys.path.insert(0, ui_path)

        if 'hotkeyMod' in sys.modules:
            del sys.modules['hotkeyMod']

        import hotkeyMod

        hotkeyMod.show_hotkey_dialog("Fix Mirror Settings", MIRROR_FIX_SETTINGS_SHELF_COMMAND, None, None, icon_path)

    except Exception as e:
        cmds.warning("Could not open hotkey dialog: {}".format(str(e)))

def create_mirror_context_menu(button, icon_path):
    button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
    def show_mirror_menu(pos):
        menu_style = _animo_menu_qss(with_indicator=False)
        menu = QtWidgets.QMenu(button)
        menu.setStyleSheet(menu_style)
        
        snapshot_action = menu.addAction("Snapshot Default Rig")
        snapshot_action.triggered.connect(_run_mirror_snapshot)
        mirror_all_keys_action = menu.addAction("Mirror All Keys")
        mirror_all_keys_action.triggered.connect(_run_mirror_all_keys)
        
        menu.addSeparator()
        
        fix_settings_action = menu.addAction("Fix Mirror Settings")
        fix_settings_action.triggered.connect(_run_mirror_fix_settings)
        
        menu.exec_(button.mapToGlobal(pos))
    button.customContextMenuRequested.connect(show_mirror_menu)


enable_usersetup_security()

USERSETUP_ANIMO_CODE = '''# ANIMO_START
from maya import cmds
if not cmds.about(batch=True):
    def _launch_animo():
        import sys
        import os
        maya_version = int(cmds.about(version=True)[:4])
        if maya_version < 2022:
            return
        version_script_dir = cmds.internalVar(userScriptDir=True)
        script_dir = os.path.normpath(os.path.join(version_script_dir, "..", "..", "scripts"))
        animo = os.path.join(script_dir, "Animo_Data")
        if not os.path.exists(animo):
            return
        launcher = os.path.join(animo, "Animo_Launcher")
        for p in [script_dir, animo, launcher]:
            if p not in sys.path:
                sys.path.insert(0, p)
        for m in [k for k in sys.modules if 'Animo' in k]:
            del sys.modules[m]
        import Animo_Launcher
    cmds.evalDeferred(lambda: cmds.evalDeferred(_launch_animo, lowestPriority=True))
# ANIMO_END
'''

def _get_usersetup_path():
    version_script_dir = cmds.internalVar(userScriptDir=True)
    script_dir = os.path.normpath(os.path.join(version_script_dir, "..", "..", "scripts"))
    return os.path.join(script_dir, "userSetup.py")

def _is_animo_in_usersetup():
    usersetup_path = _get_usersetup_path()
    if not os.path.exists(usersetup_path):
        return False
    try:
        with open(usersetup_path, 'r') as f:
            content = f.read()
        return '# ANIMO_START' in content and '# ANIMO_END' in content
    except:
        return False

def _add_animo_to_usersetup():
    usersetup_path = _get_usersetup_path()
    try:
        if os.path.exists(usersetup_path):
            with open(usersetup_path, 'r') as f:
                content = f.read()
            if '# ANIMO_START' in content:
                return True
            with open(usersetup_path, 'a') as f:
                f.write("\n\n")
                f.write(USERSETUP_ANIMO_CODE)
        else:
            with open(usersetup_path, 'w') as f:
                f.write(USERSETUP_ANIMO_CODE)
        return True
    except Exception as e:
        cmds.warning("Failed to add Animo to userSetup.py: {}".format(e))
        return False

def _remove_animo_from_usersetup():
    usersetup_path = _get_usersetup_path()
    if not os.path.exists(usersetup_path):
        return True
    try:
        with open(usersetup_path, 'r') as f:
            content = f.read()
        if '# ANIMO_START' not in content:
            return True
        # Remove everything between ANIMO_START and ANIMO_END (inclusive)
        start_idx = content.find('# ANIMO_START')
        end_idx = content.find('# ANIMO_END')
        if start_idx != -1 and end_idx != -1:
            end_idx = end_idx + len('# ANIMO_END')
            # Also remove trailing newline if present
            if end_idx < len(content) and content[end_idx] == '\n':
                end_idx += 1
            new_content = content[:start_idx] + content[end_idx:]
            # Clean up extra newlines
            while '\n\n\n' in new_content:
                new_content = new_content.replace('\n\n\n', '\n\n')
            new_content = new_content.strip()
            if not new_content:
                if os.path.exists(usersetup_path):
                    os.remove(usersetup_path)
            else:
                with open(usersetup_path, 'w') as f:
                    f.write(new_content)
        return True
    except Exception as e:
        cmds.warning("Failed to remove Animo from userSetup.py: {}".format(e))
        return False

def _check_first_run_startup():
    if IS_MAC:
        return
    prefs_path = os.path.join(ANIMO_DATA_PATH, "Animo_Prefs")
    if not os.path.exists(prefs_path):
        try:
            os.makedirs(prefs_path)
        except:
            pass
    startup_pref_file = os.path.join(prefs_path, "startup_configured.txt")
    if not os.path.exists(startup_pref_file):
        _add_animo_to_usersetup()
        try:
            with open(startup_pref_file, 'w') as f:
                f.write("1")
        except:
            pass

_check_first_run_startup()

for mod_name in list(sys.modules.keys()):
    if 'Animo_UI' in mod_name or 'Animo_Sliders' in mod_name or 'Animo_Nudge_Keys' in mod_name:
        del sys.modules[mod_name]

from Animo_UI import styleMod as style
from Animo_UI import barMod as bar
from Animo_UI import shelfMod as shelf
from Animo_UI import graphSliderMod
from Animo_UI.dpi_scale import dpi
from Animo_Sliders import tween_slider, blend_slider, scale_slider, cascade_slider, slider_utils
from Animo_Sliders import bd_slider, to_slider, ts_slider, nw_slider, bw_slider, pp_slider
from Animo_Sliders import be_slider, sh_slider, sb_slider, bi_slider, bm_slider, sd_slider
from Animo_Selection_Count import selection_counter
from Animo_Selection_Count.selection_counter import SelectionCounter
from Animo_Nudge_Keys import nudge_keys

# Import ease_slider module for Ctrl+TW functionality
try:
    from Animo_Sliders import ease_slider
except ImportError:
    ease_slider = None

graphSliderMod.register_modules({
    "tween_slider": tween_slider,
    "to_slider": to_slider,
    "ts_slider": ts_slider,
    "bd_slider": bd_slider,
    "nw_slider": nw_slider,
    "bw_slider": bw_slider,
    "cascade_slider": cascade_slider,
    "pp_slider": pp_slider,
    "blend_slider": blend_slider,
    "scale_slider": scale_slider,
    "ease_slider": ease_slider,
    "be_slider": be_slider,
    "sh_slider": sh_slider,
    "sb_slider": sb_slider,
    "bi_slider": bi_slider,
    "bm_slider": bm_slider,
    "sd_slider": sd_slider,
})
graphSliderMod.register_bar_module(bar)
graphSliderMod.register_style_module(style)

# Import tooltip system
try:
    import tooltip_manager as tt_manager
    importlib.reload(tt_manager)
    TOOLTIP_ENABLED = True
except ImportError:
    TOOLTIP_ENABLED = False
    tt_manager = None

# Import the sliders guide dialog
try:
    import sliders_guide as sliders_guide_module
    importlib.reload(sliders_guide_module)
except ImportError:
    sliders_guide_module = None

importlib.reload(style)
importlib.reload(bar)
importlib.reload(tween_slider)
importlib.reload(blend_slider)
importlib.reload(scale_slider)
importlib.reload(cascade_slider)
importlib.reload(slider_utils)
importlib.reload(bd_slider)
importlib.reload(to_slider)
importlib.reload(ts_slider)
importlib.reload(nw_slider)
importlib.reload(bw_slider)
importlib.reload(pp_slider)
importlib.reload(selection_counter)
importlib.reload(nudge_keys)
if ease_slider:
    importlib.reload(ease_slider)

# Initialize tooltip manager (registration always happens; saved preference only controls initial visibility)
_tooltip_manager = None
_tooltips_user_enabled = _get_tooltip_pref()
if TOOLTIP_ENABLED:
    _tooltip_manager = tt_manager.init_tooltip_manager(ANIMO_DATA_PATH)
    _tooltip_manager.set_enabled(_tooltips_user_enabled)
    graphSliderMod.register_tooltip_manager(_tooltip_manager)


class AnimoSizeSettingsDialog(QtWidgets.QDialog):
    
    def __init__(self, parent=None):
        super(AnimoSizeSettingsDialog, self).__init__(parent)
        self.setWindowTitle("Animo Size Settings")
        self.setFixedSize(dpi(280), dpi(280))
        self.setWindowFlags(self.windowFlags() & ~QtCore.Qt.WindowContextHelpButtonHint)
        
        layout = QtWidgets.QVBoxLayout(self)
        layout.setContentsMargins(dpi(15), dpi(15), dpi(15), dpi(15))
        layout.setSpacing(dpi(8))
        
        label = QtWidgets.QLabel("Select UI Size:")
        label.setStyleSheet("font-weight: bold; font-size: 9pt;")
        layout.addWidget(label)
        
        self.button_group = QtWidgets.QButtonGroup(self)
        
        current_scale = style.get_user_scale()
        
        size_options = [
            ("20% Smaller", 0.8),
            ("10% Smaller", 0.9),
            ("Default", 1.0),
            ("10% Bigger", 1.1),
            ("20% Bigger", 1.2),
            ("30% Bigger", 1.3),
            ("40% Bigger", 1.4),
        ]
        
        for name, scale in size_options:
            radio = QtWidgets.QRadioButton(name)
            radio.setStyleSheet("font-size: 8pt;")
            if abs(current_scale - scale) < 0.01:
                radio.setChecked(True)
            radio._scale_value = scale
            self.button_group.addButton(radio)
            layout.addWidget(radio)
        
        layout.addStretch()
        
        btn_layout = QtWidgets.QHBoxLayout()
        
        apply_btn = QtWidgets.QPushButton("Apply")
        apply_btn.setMinimumWidth(dpi(80))
        apply_btn.setMinimumHeight(dpi(28))
        apply_btn.clicked.connect(self._apply_size)
        btn_layout.addStretch()
        btn_layout.addWidget(apply_btn)
        
        cancel_btn = QtWidgets.QPushButton("Cancel")
        cancel_btn.setMinimumWidth(dpi(80))
        cancel_btn.setMinimumHeight(dpi(28))
        cancel_btn.clicked.connect(self.reject)
        btn_layout.addWidget(cancel_btn)
        
        layout.addLayout(btn_layout)
        
        self.setStyleSheet("""
            QDialog {{ background-color: #3d3d3d; }}
            QLabel {{ color: #ccc; }}
            QRadioButton {{ color: #ccc; }}
            QRadioButton::indicator {{ width: {0}px; height: {0}px; }}
            QPushButton {{ 
                background-color: #555; 
                color: #ccc; 
                border: 1px solid #666; 
                border-radius: 3px; 
                padding: {1}px {2}px;
            }}
            QPushButton:pressed {{ background-color: #444; }}
        """.format(dpi(12), dpi(6), dpi(12)))
    
    def _apply_size(self):
        for btn in self.button_group.buttons():
            if btn.isChecked():
                new_scale = btn._scale_value
                current_scale = style.get_user_scale()
                
                if abs(new_scale - current_scale) > 0.01:
                    style.set_user_scale(new_scale)
                    self.accept()
                    
                    cmds.inViewMessage(
                        amg='<span style="color:#4aa3df;">Animo size updated - Restarting UI...</span>',
                        pos='midCenter', fade=True, fadeStayTime=1000
                    )
                    
                    def restart_animo():
                        import runpy
                        toggle_py = os.path.join(ANIMO_DATA_PATH, "Animo_Launcher", "toggle.py")
                        if os.path.exists(toggle_py):
                            runpy.run_path(toggle_py, run_name="__main__")
                            def reopen(path=toggle_py):
                                import runpy as rp
                                rp.run_path(path, run_name="__main__")
                            QtCore.QTimer.singleShot(100, reopen)
                    
                    QtCore.QTimer.singleShot(500, restart_animo)
                else:
                    self.reject()
                return
        self.reject()


def _show_size_settings():
    dialog = AnimoSizeSettingsDialog(None)
    dialog.exec_()


def run_smooth_keys_plugin():
    import maya.cmds as cmds
    
    plugin_name = "AnimoSmoothKeysPlugin"
    plugin_folder = os.path.join(ANIMO_DATA_PATH, "Animo_Tools_Editor", "animo_tools", "tools")
    
    # Check if plugin is already loaded
    is_loaded = False
    try:
        is_loaded = cmds.pluginInfo(plugin_name, query=True, loaded=True)
    except:
        pass
    
    if not is_loaded:
        # Try to find and load the plugin (.py or .pyc)
        plugin_path = None
        for ext in [".py", ".pyc"]:
            potential_path = os.path.join(plugin_folder, plugin_name + ext)
            if os.path.exists(potential_path):
                plugin_path = potential_path
                break
        
        if plugin_path:
            try:
                cmds.loadPlugin(plugin_path)
            except Exception as e:
                cmds.warning("Failed to load AnimoSmoothKeysPlugin: {}".format(e))
                return
        else:
            cmds.warning("AnimoSmoothKeysPlugin not found in: {}".format(plugin_folder))
            return
    
    # Run the smooth keys command
    try:
        cmds.smoothKeysAPI(strength=0.5, iterations=1)
    except Exception as e:
        cmds.warning("Failed to run smoothKeysAPI: {}".format(e))


def run_global_tangent(script_name):
    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, script_name, "Animo_Keys_Tangent", None)
    
    # Show confirmation message based on tangent type
    tangent_messages = {
        "auto_tangent_global": "Auto Tangent set as Maya default",
        "linear_tangent_global": "Linear Tangent set as Maya default",
        "step_tangent_global": "Stepped Tangent set as Maya default"
    }
    message = tangent_messages.get(script_name, "Global tangent applied")
    cmds.inViewMessage(
        amg='<span style="color:#4aa3df;">{}</span>'.format(message),
        pos='midCenter', fade=True, fadeStayTime=1000
    )


# Shelf command for smooth keys plugin
SMOOTH_KEYS_SHELF_COMMAND = '''
import maya.cmds as cmds
import os

plugin_name = "AnimoSmoothKeysPlugin"

# Get Animo_Data path - same as shelfMod.py
animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
plugin_folder = os.path.join(animo_data_path, "Animo_Tools_Editor", "animo_tools", "tools")

try:
    is_loaded = False
    try:
        is_loaded = cmds.pluginInfo(plugin_name, query=True, loaded=True)
    except:
        pass
    
    if not is_loaded:
        plugin_loaded = False
        for ext in [".py", ".pyc"]:
            plugin_path = os.path.join(plugin_folder, plugin_name + ext)
            if os.path.exists(plugin_path):
                cmds.loadPlugin(plugin_path)
                plugin_loaded = True
                break
        if not plugin_loaded:
            cmds.warning("AnimoSmoothKeysPlugin not found in: " + plugin_folder)
    
    if cmds.pluginInfo(plugin_name, query=True, loaded=True):
        cmds.smoothKeysAPI(strength=0.5, iterations=1)
    else:
        cmds.warning("Could not load AnimoSmoothKeysPlugin")
except Exception as e:
    cmds.warning("Smooth Keys Error: " + str(e))
'''

def add_smooth_to_shelf(icon_path):
    import maya.cmds as cmds
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path,
        label="Smooth Keys",
        command=SMOOTH_KEYS_SHELF_COMMAND,
        sourceType="python",
        annotation="Smooth Selected Keys"
    )
    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Smooth Keys added to shelf</span>', pos='midCenter', fade=True, fst=200, fad=400)

def assign_smooth_hotkey(icon_path):
    import maya.cmds as cmds
    import sys
    import os
    import importlib
    
    try:
        animo_data_path = os.path.normpath(os.path.join(
            cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'
        ))
        ui_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_UI'))
        
        if ui_path not in sys.path:
            sys.path.insert(0, ui_path)
        
        if 'hotkeyMod' in sys.modules:
            del sys.modules['hotkeyMod']
        
        import hotkeyMod
        
        hotkeyMod.show_hotkey_dialog("Smooth Keys", SMOOTH_KEYS_SHELF_COMMAND, None, None, icon_path)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        cmds.warning("Could not open hotkey dialog: {}".format(str(e)))

def create_smooth_context_menu(button, icon_path):
    def show_context_menu(pos):
        menu = QtWidgets.QMenu(button)
        menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
        
        shelf_action = menu.addAction("Add to Shelf")
        shelf_action.triggered.connect(lambda: add_smooth_to_shelf(icon_path))
        
        hotkey_action = menu.addAction("Assign Hotkey")
        hotkey_action.triggered.connect(lambda: assign_smooth_hotkey(icon_path))
        
        menu.exec_(button.mapToGlobal(pos))
    
    button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
    button.customContextMenuRequested.connect(show_context_menu)

ANIMREF_SHELF_COMMAND = '''
import sys
import os
import importlib
import maya.cmds as cmds

animo_data_path = os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts', 'Animo_Data'))
tool_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_AnimRef'))
if tool_path not in sys.path:
    sys.path.insert(0, tool_path)

for mod in list(sys.modules.keys()):
    if 'animref_launcher' in mod:
        del sys.modules[mod]

import animref_launcher
animref_launcher.launch()
'''

def add_animref_to_shelf(icon_path=None):
    import maya.cmds as cmds
    import os
    if not icon_path or not os.path.exists(icon_path):
        animo_data_path = get_animo_data_path()
        icon_path = os.path.normpath(os.path.join(animo_data_path, 'Animo_AnimRef', 'animref_icon.png'))
    current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
    cmds.shelfButton(
        parent=current_shelf,
        image=icon_path if os.path.exists(icon_path) else "commandButton.png",
        label="AnimRef",
        command=ANIMREF_SHELF_COMMAND,
        sourceType="python",
        annotation="Animation Reference Browser"
    )
    cmds.inViewMessage(amg='<span style="color:#f39c12; font-weight:bold;">Animation Reference added to shelf</span>', pos='midCenter', fade=True, fst=250, fad=400)

WorkspaceName = 'animo'

# Modern tooltip style - pure black background
TOOLTIP_STYLE = """
    QToolTip {
        background-color: #000000;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
    }
"""


class DelayedTooltipFilter(QtCore.QObject):
    HOVER_CSS_INSTALLED_PROPERTY = "_animoHoverCssInstalled"
    DESTROY_WATCH_PROPERTY = "_animoDestroyWatchInstalled"
    HOVER_HOVER_RULE = "\nQAbstractButton:hover { background-color: rgba(255,255,255,60); border-radius: 8px; padding: 2px; }"

    def __init__(self):
        super(DelayedTooltipFilter, self).__init__()
        self._timer = QtCore.QTimer()
        self._timer.setSingleShot(True)
        self._timer.setInterval(500)
        self._current_widget = None
        self._timer.timeout.connect(self._showTooltip)
        self._hover_check_timer = QtCore.QTimer()
        self._hover_check_timer.setInterval(150)
        self._hover_check_timer.timeout.connect(self._checkHoverState)
        self._hover_check_timer.start()

    def _isValid(self, widget):
        if widget is None:
            return False
        try:
            return bool(shiboken_mod.isValid(widget))
        except Exception:
            return False

    def _onWidgetDestroyed(self, obj=None):
        self._timer.stop()
        self._current_widget = None

    def _watchForDestruction(self, widget):
        try:
            if widget.property(self.DESTROY_WATCH_PROPERTY):
                return
            widget.destroyed.connect(self._onWidgetDestroyed)
            widget.setProperty(self.DESTROY_WATCH_PROPERTY, True)
        except Exception:
            pass

    def _showTooltip(self):
        widget = self._current_widget
        if not self._isValid(widget):
            self._current_widget = None
            return
        try:
            tip = widget.toolTip()
            if tip:
                QtWidgets.QToolTip.showText(QtGui.QCursor.pos(), tip, widget)
        except RuntimeError:
            self._current_widget = None

    def _checkHoverState(self):
        widget = self._current_widget
        if widget is None:
            return
        if not self._isValid(widget):
            self._current_widget = None
            self._timer.stop()
            return
        try:
            still_inside = widget.isVisible() and widget.rect().contains(widget.mapFromGlobal(QtGui.QCursor.pos()))
        except RuntimeError:
            still_inside = False
        if not still_inside:
            self._forceLeave(widget)

    def _ensureHoverCss(self, widget):
        if not isinstance(widget, QtWidgets.QAbstractButton):
            return
        if not self._isValid(widget):
            return
        try:
            if widget.property(self.HOVER_CSS_INSTALLED_PROPERTY):
                return
            base_style = widget.styleSheet() or ""
            widget.setStyleSheet(base_style + self.HOVER_HOVER_RULE)
            widget.setProperty(self.HOVER_CSS_INSTALLED_PROPERTY, True)
        except RuntimeError:
            pass

    def _forceLeave(self, widget):
        self._timer.stop()
        self._current_widget = None
        try:
            QtWidgets.QToolTip.hideText()
        except Exception:
            pass

    def eventFilter(self, obj, event):
        try:
            etype = event.type()
            if etype == QtCore.QEvent.Enter:
                if self._isValid(obj):
                    self._current_widget = obj
                    self._watchForDestruction(obj)
                    self._timer.start()
                    self._ensureHoverCss(obj)
            elif etype == QtCore.QEvent.Leave:
                if self._current_widget is obj:
                    self._timer.stop()
                    self._current_widget = None
                try:
                    QtWidgets.QToolTip.hideText()
                except Exception:
                    pass
        except RuntimeError:
            self._current_widget = None
        return False



# Global filter instance

_tooltip_filter = DelayedTooltipFilter()


class GlobalOffsetFlashAnimator(QtCore.QObject):
    def __init__(self):
        super(GlobalOffsetFlashAnimator, self).__init__()
        self._animations = {}

    def start(self, widget):
        if widget not in self._animations:
            effect = QtWidgets.QGraphicsOpacityEffect(widget)
            effect.setOpacity(1.0)
            widget.setGraphicsEffect(effect)

            anim_group = QtCore.QSequentialAnimationGroup(widget)

            anim1 = QtCore.QPropertyAnimation(effect, b"opacity")
            anim1.setDuration(500)
            anim1.setStartValue(1.0)
            anim1.setEndValue(0.2)
            anim1.setEasingCurve(QtCore.QEasingCurve.InOutSine)

            anim2 = QtCore.QPropertyAnimation(effect, b"opacity")
            anim2.setDuration(500)
            anim2.setStartValue(0.2)
            anim2.setEndValue(1.0)
            anim2.setEasingCurve(QtCore.QEasingCurve.InOutSine)

            anim_group.addAnimation(anim1)
            anim_group.addAnimation(anim2)
            anim_group.setLoopCount(-1)

            self._animations[widget] = (effect, anim_group)

        effect, anim_group = self._animations[widget]
        anim_group.start()

    def stop(self, widget):
        if widget in self._animations:
            effect, anim_group = self._animations[widget]
            anim_group.stop()
            effect.setOpacity(1.0)


_global_offset_flash_animator = GlobalOffsetFlashAnimator()


def _get_global_offset_module():
    try:
        folder = os.path.join(ANIMO_DATA_PATH, "Animo_Global_Offset")
        if folder not in sys.path:
            sys.path.insert(0, folder)
        for mod_name in list(sys.modules.keys()):
            if mod_name == "global_offset":
                del sys.modules[mod_name]
        import global_offset
        return global_offset
    except Exception:
        return None


def _handle_global_offset_click(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef, gbtn):
    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
    mod = _get_global_offset_module()
    if mod is None:
        return
    try:
        enabled = mod.is_enabled()
    except Exception:
        enabled = False
    if enabled:
        _global_offset_flash_animator.start(gbtn)
    else:
        _global_offset_flash_animator.stop(gbtn)


class DraggableIconFilter(QtCore.QObject):
    def __init__(self, parent_ui):
        super(DraggableIconFilter, self).__init__()
        self.parent_ui = parent_ui
        self.dragging = False
        self.drag_start_x = 0
        self.original_offset = 0
        self.current_widget = None
        self.icon_index = None
    
    def eventFilter(self, obj, event):
        if not hasattr(self.parent_ui, '_edit_mode') or not self.parent_ui._edit_mode:
            return False
        
        if event.type() == QtCore.QEvent.MouseButtonPress:
            if event.button() == QtCore.Qt.LeftButton:
                self.dragging = True
                self.drag_start_x = event.globalX()
                self.current_widget = obj
                self.icon_index = getattr(obj, '_icon_index', None)
                if self.icon_index is not None:
                    self.original_offset = bar.ICON_OFFSETS.get(self.icon_index, 0)
                return True
        
        elif event.type() == QtCore.QEvent.MouseMove:
            if self.dragging and self.current_widget:
                delta = event.globalX() - self.drag_start_x
                new_offset = self.original_offset + delta
                
                # Update the offset in bar module
                if self.icon_index is not None:
                    bar.ICON_OFFSETS[self.icon_index] = new_offset
                    
                    # Move widget directly for real-time feedback
                    current_pos = self.current_widget.pos()
                    # Calculate new position based on original + delta
                    if not hasattr(self.current_widget, '_original_x'):
                        self.current_widget._original_x = current_pos.x()
                    
                    new_x = self.current_widget._original_x + new_offset
                    self.current_widget.move(new_x, current_pos.y())
                    
                    self.current_widget.setStyleSheet("""
                        QPushButton { border: 2px solid #00ff00; background: rgba(0,255,0,30); }
                    """)
                return True
        
        elif event.type() == QtCore.QEvent.MouseButtonRelease:
            if self.dragging:
                self.dragging = False
                self.current_widget = None
                return True
        
        return False


_draggable_filter = None  # Will be initialized with parent_ui


class FlowLayout(QtWidgets.QLayout):
    
    def __init__(self, parent=None, margin=0, h_spacing=4, v_spacing=4):
        super(FlowLayout, self).__init__(parent)
        
        if parent is not None:
            self.setContentsMargins(margin, margin, margin, margin)
        
        self._h_spacing = h_spacing
        self._v_spacing = v_spacing
        self._item_list = []
    
    def __del__(self):
        item = self.takeAt(0)
        while item:
            item = self.takeAt(0)
    
    def addItem(self, item):
        self._item_list.append(item)
    
    def _isItemVisible(self, item):
        widget = item.widget()
        return widget is not None and not widget.isHidden()
    
    def horizontalSpacing(self):
        if self._h_spacing >= 0:
            return self._h_spacing
        return self._smartSpacing(QtWidgets.QStyle.PM_LayoutHorizontalSpacing)
    
    def verticalSpacing(self):
        if self._v_spacing >= 0:
            return self._v_spacing
        return self._smartSpacing(QtWidgets.QStyle.PM_LayoutVerticalSpacing)
    
    def _smartSpacing(self, pm):
        parent = self.parent()
        if parent is None:
            return -1
        elif parent.isWidgetType():
            return parent.style().pixelMetric(pm, None, parent)
        else:
            return parent.spacing()
    
    def count(self):
        return len(self._item_list)
    
    def itemAt(self, index):
        if 0 <= index < len(self._item_list):
            return self._item_list[index]
        return None
    
    def takeAt(self, index):
        if 0 <= index < len(self._item_list):
            return self._item_list.pop(index)
        return None
    
    def expandingDirections(self):
        return QtCore.Qt.Orientations(QtCore.Qt.Orientation(0))
    
    def hasHeightForWidth(self):
        return True
    
    def heightForWidth(self, width):
        height = self._doLayout(QtCore.QRect(0, 0, width, 0), True)
        return height
    
    def setGeometry(self, rect):
        super(FlowLayout, self).setGeometry(rect)
        self._doLayout(rect, False)
    
    def sizeHint(self):
        # Return a size hint that allows horizontal expansion
        # Width should be large enough to fit all items in one row (preferred)
        # But minimumSize() allows wrapping when space is limited
        total_width = 0
        max_height = 0
        h_space = self.horizontalSpacing()
        
        for i, item in enumerate(self._item_list):
            if not self._isItemVisible(item):
                continue
            size = item.sizeHint()
            if i > 0:
                total_width += h_space
            total_width += size.width()
            max_height = max(max_height, size.height())
        
        margins = self.contentsMargins()
        return QtCore.QSize(
            total_width + margins.left() + margins.right(),
            max_height + margins.top() + margins.bottom()
        )
    
    def minimumSize(self):
        # Minimum size should be the largest single item (to allow wrapping)
        size = QtCore.QSize()
        for item in self._item_list:
            if not self._isItemVisible(item):
                continue
            size = size.expandedTo(item.minimumSize())
        
        margins = self.contentsMargins()
        size += QtCore.QSize(margins.left() + margins.right(), 
                            margins.top() + margins.bottom())
        return size
    
    def _doLayout(self, rect, test_only):
        margins = self.contentsMargins()
        effective_rect = rect.adjusted(margins.left(), margins.top(), 
                                       -margins.right(), -margins.bottom())
        available_width = effective_rect.width()
        h_space = self.horizontalSpacing()
        v_space = self.verticalSpacing()
        
        # Collect all visible items
        items = [item for item in self._item_list if self._isItemVisible(item)]
        if not items:
            return margins.top() + margins.bottom()
        
        # Calculate widths
        item_widths = [item.sizeHint().width() for item in items]
        
        # Greedy fill: pack as many items as will fit into the current row
        # before wrapping to the next one. This always maximizes horizontal
        # space usage per row, regardless of which items are visible/selected
        # or whether they're contiguous in the original ordering.
        rows = []
        current_row = []
        current_row_width = 0
        for i, item in enumerate(items):
            item_width = item_widths[i]
            space_needed = h_space if current_row else 0
            if current_row and current_row_width + space_needed + item_width > available_width:
                rows.append((current_row, current_row_width))
                current_row = [item]
                current_row_width = item_width
            else:
                current_row.append(item)
                current_row_width += space_needed + item_width
        if current_row:
            rows.append((current_row, current_row_width))
        
        # Calculate row heights
        row_heights = []
        for row_items, row_width in rows:
            row_height = max(item.sizeHint().height() for item in row_items) if row_items else 0
            row_heights.append(row_height)
        
        # Calculate total height
        total_height = sum(row_heights)
        if len(rows) > 1:
            total_height += v_space * (len(rows) - 1)
        
        if test_only:
            return total_height + margins.top() + margins.bottom()
        
        # Position items with centering
        content_height = total_height
        available_height = effective_rect.height()
        if available_height > content_height:
            y = effective_rect.y() + (available_height - content_height) // 2
        else:
            y = effective_rect.y()
        
        for row_idx, (row_items, row_width) in enumerate(rows):
            row_height = row_heights[row_idx]
            
            # Horizontal centering
            x_offset = (available_width - row_width) // 2
            x = effective_rect.x() + x_offset
            
            for item in row_items:
                item_size = item.sizeHint()
                item_y = y + (row_height - item_size.height()) // 2
                item.setGeometry(QtCore.QRect(QtCore.QPoint(x, item_y), item_size))
                x += item_size.width() + h_space
            
            y += row_height + v_space
        
        return total_height + margins.top() + margins.bottom()


def _connect_neighbor_slider_logic(value, mouse_pressed, last_update_time, update_throttle_ms):
    remapped_value = value - 100
    last_update_time, status = bw_slider.slider_logic(remapped_value, mouse_pressed, last_update_time, update_throttle_ms)
    if status:
        status = status.replace("Blend to World", "Connect to Neighbour")
    return last_update_time, status


def _connect_neighbor_reset_slider(slider_widget):
    bw_slider.reset_slider(slider_widget)
    slider_widget.blockSignals(True)
    slider_widget.setValue(100)
    slider_widget.blockSignals(False)


def _cascade_slider_logic_remapped(value, mouse_pressed, last_update_time, update_throttle_ms):
    remapped_value = value + 100
    return cascade_slider.slider_logic(remapped_value, mouse_pressed, last_update_time, update_throttle_ms)


def _cascade_reset_slider_remapped(slider_widget):
    raw_value = slider_widget.value()
    remapped_value = raw_value + 100
    slider_widget.blockSignals(True)
    slider_widget.setValue(remapped_value)
    slider_widget.blockSignals(False)
    cascade_slider.reset_slider(slider_widget)
    slider_widget.blockSignals(True)
    slider_widget.setValue(0)
    slider_widget.blockSignals(False)


def _toggle_overshoot_native(state):
    enabled = bool(state)
    slider_utils.set_overshoot_enabled(enabled)
    _apply_overshoot_to_all_sliders(enabled)


def _apply_overshoot_to_all_sliders(enabled):
    roots = []
    app = QtWidgets.QApplication.instance()
    if app is not None:
        roots.append(app)
    try:
        ptr = mui.MQtUtil.mainWindow()
        if ptr:
            maya_main_window = wrapInstance(int(ptr), QtWidgets.QWidget)
            if maya_main_window is not None:
                roots.append(maya_main_window)
    except:
        pass
    
    seen = set()
    for root in roots:
        for widget in root.findChildren(AnimoSlider):
            if id(widget) not in seen:
                seen.add(id(widget))
                widget.set_overshoot(enabled)
        for widget in root.findChildren(ExpandedSlider):
            if id(widget) not in seen:
                seen.add(id(widget))
                widget.set_overshoot(enabled)
    
    graphSliderMod.apply_overshoot_to_all(enabled)


class AnimoSlider(QtWidgets.QSlider):
    
    statusChanged = QtCore.Signal(str)
    
    def __init__(self, label="TW", handle_color=(80, 200, 120), slider_type="tween", parent=None):
        super(AnimoSlider, self).__init__(QtCore.Qt.Horizontal, parent)
        
        self.label_text = label
        self.original_label = label
        self.handle_color = QtGui.QColor(*handle_color)
        self.icon_color = QtGui.QColor(*handle_color)
        self.slider_type = slider_type
        
        self.mouse_pressed = False
        self.last_update_time = 0
        self.update_throttle_ms = 1
        self.shift_pressed = False
        self.ctrl_pressed = False
        self.needs_cursor_restore = False
        
        self.overshoot_enabled = False
        self._normal_min = None
        self._normal_max = None
        
        self.setMinimumHeight(style.scaled(21))
        self.setMaximumHeight(style.scaled(21))
        self.setMinimumWidth(style.scaled(200))
        self.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        
        self.valueChanged.connect(self._onValueChanged)
        
    # GEOFF EDIT BELOW:        
        # if self.slider_type == "scale" or self.slider_type == "tween":
        #     QtWidgets.QApplication.instance().installEventFilter(self)
        
    def mousePressEvent(self, event):
        if self.slider_type == "scale" or self.slider_type == "tween":
            QtWidgets.QApplication.instance().installEventFilter(self)
        super(AnimoSlider, self).mousePressEvent(event)

    def mouseReleaseEvent(self, event):
        if self.slider_type == "scale" or self.slider_type == "tween":
            QtWidgets.QApplication.instance().removeEventFilter(self)
        super(AnimoSlider, self).mouseReleaseEvent(event)
    
    # GEOFF EDIT ABOVE:     

    def setLabel(self, label):
        self.label_text = label
        self.update()
    
    def set_overshoot(self, enabled):
        enabled = bool(enabled)
        if enabled == self.overshoot_enabled:
            return
        if enabled:
            self._normal_min = self.minimum()
            self._normal_max = self.maximum()
            span = self._normal_max - self._normal_min
            extra = int(round(span * slider_utils.OVERSHOOT_RANGE_RATIO))
            self.blockSignals(True)
            self.setMinimum(self._normal_min - extra)
            self.setMaximum(self._normal_max + extra)
            self.blockSignals(False)
        else:
            if self._normal_min is not None and self._normal_max is not None:
                clamped_value = max(self._normal_min, min(self._normal_max, self.value()))
                self.blockSignals(True)
                self.setMinimum(self._normal_min)
                self.setMaximum(self._normal_max)
                self.setValue(clamped_value)
                self.blockSignals(False)
        self.overshoot_enabled = enabled
        self.update()
    
    def eventFilter(self, obj, event):
        if self.slider_type == "scale":
            if event.type() == QtCore.QEvent.KeyPress:
                if event.key() == QtCore.Qt.Key_Shift:
                    self.shift_pressed = True
                    self._updateScaleLabel()
                elif event.key() == QtCore.Qt.Key_Control:
                    self.ctrl_pressed = True
                    self._updateScaleLabel()
            elif event.type() == QtCore.QEvent.KeyRelease:
                if event.key() == QtCore.Qt.Key_Shift:
                    self.shift_pressed = False
                    self._updateScaleLabel()
                elif event.key() == QtCore.Qt.Key_Control:
                    self.ctrl_pressed = False
                    self._updateScaleLabel()
        elif self.slider_type == "tween":
            if event.type() == QtCore.QEvent.KeyPress:
                if event.key() == QtCore.Qt.Key_Control:
                    self.ctrl_pressed = True
                    self._updateTweenLabel()
            elif event.type() == QtCore.QEvent.KeyRelease:
                if event.key() == QtCore.Qt.Key_Control:
                    self.ctrl_pressed = False
                    self._updateTweenLabel()
        return False
    
    def _updateTweenLabel(self):
        if self.slider_type == "tween":
            if self.ctrl_pressed:
                self.setLabel("EA")
            else:
                self.setLabel("TW")
    
    def _updateScaleLabel(self):
        if self.slider_type == "scale":
            if self.ctrl_pressed:
                self.setLabel("SA")
            elif self.shift_pressed:
                self.setLabel("SR")
            else:
                self.setLabel("SL")
    
    def _onValueChanged(self, value):
        if not self.mouse_pressed:
            return
        
        modifiers = QtWidgets.QApplication.keyboardModifiers()
        self.shift_pressed = bool(modifiers & QtCore.Qt.ShiftModifier)
        self.ctrl_pressed = bool(modifiers & QtCore.Qt.ControlModifier)
        
        if self.slider_type == "tween":
            self._updateTweenLabel()
            if self.ctrl_pressed and ease_slider:
                # Use ease_slider when Ctrl is held
                ease_slider.update_ease(value)
                status = "Ease: {}".format(value)
                self.statusChanged.emit(status)
            else:
                self.last_update_time, status = tween_slider.slider_logic(
                    value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
                if status:
                    self.statusChanged.emit(status)
        elif self.slider_type == "blend":
            self.last_update_time, status = blend_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_type == "scale":
            self._updateScaleLabel()
            if self.ctrl_pressed:
                self.last_update_time, status = scale_slider.scale_avg_logic(
                    value, self.last_update_time, self.update_throttle_ms)
            elif self.shift_pressed:
                self.last_update_time, status = scale_slider.scale_right_logic(
                    value, self.last_update_time, self.update_throttle_ms)
            else:
                self.last_update_time, status = scale_slider.scale_left_logic(
                    value, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_type == "cascade":
            self.last_update_time, status = _connect_neighbor_slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        
    def paintEvent(self, event):
        painter = QtGui.QPainter(self)
        painter.setRenderHint(QtGui.QPainter.Antialiasing)
        
        rect = self.rect()
        
        icon_size = style.scaled(6)
        num_dots = 7
        total_items = num_dots + 2
        
        margin = style.scaled(8)
        # Blend slider gets extra right margin to prevent overlap with tangent icons
        right_margin = style.scaled(12) if self.slider_type == "blend" else margin
        available_width = rect.width() - margin - right_margin
        item_spacing = available_width / (total_items - 1)
        
        icon_left = margin
        icon_y = rect.height() // 2 - icon_size // 2
        
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(self.icon_color)
        painter.drawRoundedRect(icon_left, icon_y, icon_size, icon_size, 1, 1)
        
        full_track_start = margin + item_spacing
        full_track_end = rect.width() - right_margin - item_spacing
        track_y = rect.height() // 2
        
        min_val = self.minimum()
        max_val = self.maximum()
        curr_val = self.value()
        
        dot_track_start = full_track_start
        dot_track_end = full_track_end
        
        if self.overshoot_enabled and self._normal_min is not None and self._normal_max is not None and max_val != min_val:
            normal_fraction = float(self._normal_max - self._normal_min) / float(max_val - min_val)
            normal_fraction = max(0.05, min(1.0, normal_fraction))
            overshoot_zone_each_side = (full_track_end - full_track_start) * (1.0 - normal_fraction) / 2.0
            dot_track_start = full_track_start + overshoot_zone_each_side
            dot_track_end = full_track_end - overshoot_zone_each_side
            
            overshoot_pen = QtGui.QPen(QtGui.QColor(230, 70, 70, 220), style.scaled(2), QtCore.Qt.DashLine)
            painter.setPen(overshoot_pen)
            painter.drawLine(QtCore.QPointF(full_track_start, track_y), QtCore.QPointF(dot_track_start, track_y))
            painter.drawLine(QtCore.QPointF(dot_track_end, track_y), QtCore.QPointF(full_track_end, track_y))
            painter.setPen(QtCore.Qt.NoPen)
        
        dot_color = QtGui.QColor(self.handle_color)
        dot_color.setAlpha(220)
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(dot_color)
        
        dot_spacing = (dot_track_end - dot_track_start) / (num_dots - 1)
        dot_radius = style.scaled(2.15)
        
        for i in range(num_dots):
            dot_x = dot_track_start + i * dot_spacing
            painter.drawEllipse(QtCore.QPointF(dot_x, track_y), dot_radius, dot_radius)
        
        if max_val != min_val:
            normalized = float(curr_val - min_val) / float(max_val - min_val)
        else:
            normalized = 0.5
            
        handle_x = full_track_start + normalized * (full_track_end - full_track_start)
        handle_y = track_y
        
        handle_size = style.scaled(22)
        handle_rect = QtCore.QRectF(
            handle_x - handle_size / 2,
            handle_y - handle_size / 2,
            handle_size,
            handle_size
        )
        
        painter.setBrush(self.handle_color)
        painter.setPen(QtCore.Qt.NoPen)
        painter.drawRoundedRect(handle_rect, 3, 3)
        
        painter.setPen(QtGui.QColor(40, 40, 40))
        font = painter.font()
        font.setPointSize(7)
        font.setBold(True)
        painter.setFont(font)
        painter.drawText(handle_rect, QtCore.Qt.AlignCenter, self.label_text)
        
        icon_right = rect.width() - right_margin - icon_size
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(self.icon_color)
        painter.drawRoundedRect(icon_right, icon_y, icon_size, icon_size, 1, 1)

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            if hasattr(event, 'position'):
                click_pos = event.position().toPoint()
            else:
                click_pos = event.pos()
            
            rect = self.rect()
            
            icon_size = style.scaled(6)
            margin = style.scaled(8)
            right_margin = style.scaled(12) if self.slider_type == "blend" else margin
            icon_y = rect.height() // 2 - icon_size // 2
            num_dots = 7
            total_items = num_dots + 2
            available_width = rect.width() - margin - right_margin
            item_spacing = available_width / (total_items - 1)
            track_start = margin + item_spacing
            track_end = rect.width() - right_margin - item_spacing
            
            left_icon_rect = QtCore.QRect(margin, icon_y, icon_size, icon_size)
            
            icon_right = rect.width() - right_margin - icon_size
            right_icon_rect = QtCore.QRect(icon_right, icon_y, icon_size, icon_size)
            
            modifiers = QtWidgets.QApplication.keyboardModifiers()
            self.shift_pressed = bool(modifiers & QtCore.Qt.ShiftModifier)
            self.ctrl_pressed = bool(modifiers & QtCore.Qt.ControlModifier)
            
            getCurves = slider_utils.get_anim_curves()
            anim_curves = getCurves[0]
            if anim_curves and len(anim_curves) > 400:
                QtWidgets.QApplication.setOverrideCursor(QtCore.Qt.WaitCursor)
                self.needs_cursor_restore = True
            else:
                self.needs_cursor_restore = False
            
            self.mouse_pressed = True
            self._updateScaleLabel()
            
            if left_icon_rect.contains(click_pos):
                self.setValue(self.minimum())
                release_delay = 100 if slider_utils.IS_MACOS else 50
                QtCore.QTimer.singleShot(release_delay, self._onRelease)
            elif right_icon_rect.contains(click_pos):
                self.setValue(self.maximum())
                release_delay = 100 if slider_utils.IS_MACOS else 50
                QtCore.QTimer.singleShot(release_delay, self._onRelease)
            else:
                normalized = (click_pos.x() - track_start) / (track_end - track_start)
                normalized = max(0.0, min(1.0, normalized))
                new_value = self.minimum() + normalized * (self.maximum() - self.minimum())
                self.setValue(int(new_value))

    def mouseMoveEvent(self, event):
        if self.mouse_pressed and event.buttons() & QtCore.Qt.LeftButton:
            if hasattr(event, 'position'):
                click_pos = event.position().toPoint()
            else:
                click_pos = event.pos()
            
            rect = self.rect()
            margin = style.scaled(8)
            right_margin = style.scaled(12) if self.slider_type == "blend" else margin
            icon_size = style.scaled(6)
            num_dots = 7
            total_items = num_dots + 2
            available_width = rect.width() - margin - right_margin
            item_spacing = available_width / (total_items - 1)
            
            track_start = margin + item_spacing
            track_end = rect.width() - right_margin - item_spacing
            
            normalized = (click_pos.x() - track_start) / (track_end - track_start)
            normalized = max(0.0, min(1.0, normalized))
            
            new_value = self.minimum() + normalized * (self.maximum() - self.minimum())
            self.setValue(int(new_value))
            
            modifiers = QtWidgets.QApplication.keyboardModifiers()
            self.shift_pressed = bool(modifiers & QtCore.Qt.ShiftModifier)
            self.ctrl_pressed = bool(modifiers & QtCore.Qt.ControlModifier)
            self._updateScaleLabel()
    
    def mouseReleaseEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton and self.mouse_pressed:
            release_delay = 100 if slider_utils.IS_MACOS else 50
            QtCore.QTimer.singleShot(release_delay, self._onRelease)
    
    def contextMenuEvent(self, event):
        menu = QtWidgets.QMenu(self)
        menu.setStyleSheet(_animo_menu_qss())
        
        show_all_action = QAction("Show Other Sliders", menu)
        show_all_action.setCheckable(True)
        show_all_action.setChecked(_get_show_all_sliders_pref())
        show_all_action.triggered.connect(self._toggleShowAllSliders)
        menu.addAction(show_all_action)
        
        _build_sliders_visibility_submenu(menu)
        
        menu.addSeparator()
        
        overshoot_action = QAction("Sliders Overshoot Mode", menu)
        overshoot_action.setCheckable(True)
        overshoot_action.setChecked(slider_utils.is_overshoot_enabled())
        overshoot_action.triggered.connect(self._toggleOvershootFromMenu)
        menu.addAction(overshoot_action)
        
        if self.slider_type == "scale":
            menu.addSeparator()
            info_action = QAction("SL = Scale from Left", menu)
            info_action.setEnabled(False)
            menu.addAction(info_action)
            info_action2 = QAction("Shift = Scale from Right", menu)
            info_action2.setEnabled(False)
            menu.addAction(info_action2)
            info_action3 = QAction("Ctrl = Scale from Average", menu)
            info_action3.setEnabled(False)
            menu.addAction(info_action3)
        elif self.slider_type == "tween":
            menu.addSeparator()
            info_action = QAction("TW = Tween", menu)
            info_action.setEnabled(False)
            menu.addAction(info_action)
            info_action2 = QAction("Ctrl = Ease", menu)
            info_action2.setEnabled(False)
            menu.addAction(info_action2)
        
        menu.exec_(event.globalPos())
    
    def _toggleOvershootFromMenu(self, checked):
        slider_utils.set_overshoot_enabled(checked)
        _apply_overshoot_to_all_sliders(checked)
    
    def _toggleShowAllSliders(self, checked):
        global _show_all_sliders_visible, _show_all_sliders_container
        _set_show_all_sliders_pref(checked)
        _show_all_sliders_visible = checked
        if _show_all_sliders_container:
            _show_all_sliders_container.setVisible(checked)
            if checked:
                _rebuild_all_sliders_row_items()
                _refresh_all_sliders_row_height()
            else:
                parent_toolbar = _show_all_sliders_container.parent()
                if parent_toolbar:
                    parent_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
                    parent_toolbar.updateGeometry()
    
    def _onRelease(self):
        self.mouse_pressed = False
        
        if self.slider_type == "tween":
            # Finish ease_slider if it was active
            if ease_slider:
                ease_slider.finish_ease()
            tween_slider.reset_slider(self)
            self.setLabel(self.original_label)
        elif self.slider_type == "blend":
            blend_slider.reset_slider(self)
        elif self.slider_type == "scale":
            scale_slider.reset_slider(self)
            self.setLabel(self.original_label)
        elif self.slider_type == "cascade":
            _connect_neighbor_reset_slider(self)
        
        self.statusChanged.emit("")
        
        if self.needs_cursor_restore:
            QtWidgets.QApplication.restoreOverrideCursor()
            self.needs_cursor_restore = False


class ExpandedSlider(QtWidgets.QSlider):
    
    statusChanged = QtCore.Signal(str)
    
    def __init__(self, label="EA", handle_color=(225, 175, 45), slider_mode="ease", parent=None):
        super(ExpandedSlider, self).__init__(QtCore.Qt.Horizontal, parent)
        
        self.label_text = label
        self.original_label = label
        self.handle_color = QtGui.QColor(*handle_color)
        self.icon_color = QtGui.QColor(*handle_color)
        self.slider_mode = slider_mode
        
        self.mouse_pressed = False
        self.last_update_time = 0
        self.update_throttle_ms = 1
        self.needs_cursor_restore = False
        
        self.overshoot_enabled = False
        self._normal_min = None
        self._normal_max = None
        
        self.setMinimumHeight(style.scaled(21))
        self.setMaximumHeight(style.scaled(21))
        self.setMinimumWidth(style.scaled(160))
        self.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        
        self.valueChanged.connect(self._onValueChanged)
    
    def setLabel(self, label):
        self.label_text = label
        self.update()
    
    def set_overshoot(self, enabled):
        enabled = bool(enabled)
        if enabled == self.overshoot_enabled:
            return
        if enabled:
            self._normal_min = self.minimum()
            self._normal_max = self.maximum()
            span = self._normal_max - self._normal_min
            extra = int(round(span * slider_utils.OVERSHOOT_RANGE_RATIO))
            self.blockSignals(True)
            self.setMinimum(self._normal_min - extra)
            self.setMaximum(self._normal_max + extra)
            self.blockSignals(False)
        else:
            if self._normal_min is not None and self._normal_max is not None:
                clamped_value = max(self._normal_min, min(self._normal_max, self.value()))
                self.blockSignals(True)
                self.setMinimum(self._normal_min)
                self.setMaximum(self._normal_max)
                self.setValue(clamped_value)
                self.blockSignals(False)
        self.overshoot_enabled = enabled
        self.update()
    
    def _onValueChanged(self, value):
        if not self.mouse_pressed:
            return
        
        if self.slider_mode == "ease":
            if ease_slider:
                ease_slider.update_ease(value)
                status = "Ease: {}".format(value)
                self.statusChanged.emit(status)
        elif self.slider_mode == "scale_right":
            self.last_update_time, status = scale_slider.scale_right_logic(
                value, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "scale_avg":
            self.last_update_time, status = scale_slider.scale_avg_logic(
                value, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "scale_default":
            self.last_update_time, status = sd_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "blend_default":
            self.last_update_time, status = bd_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "time_offset":
            self.last_update_time, status = to_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "time_offset_stagger":
            self.last_update_time, status = ts_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "noise_wave":
            self.last_update_time, status = nw_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "blend_world":
            self.last_update_time, status = _cascade_slider_logic_remapped(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "push_pull":
            self.last_update_time, status = pp_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "blend_ease":
            self.last_update_time, status = be_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "smooth_harsh":
            self.last_update_time, status = sh_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "simplify_bake":
            self.last_update_time, status = sb_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "blend_infinity":
            self.last_update_time, status = bi_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
        elif self.slider_mode == "blend_mirror":
            self.last_update_time, status = bm_slider.slider_logic(
                value, self.mouse_pressed, self.last_update_time, self.update_throttle_ms)
            if status:
                self.statusChanged.emit(status)
    
    def paintEvent(self, event):
        painter = QtGui.QPainter(self)
        painter.setRenderHint(QtGui.QPainter.Antialiasing)
        
        rect = self.rect()
        
        icon_size = style.scaled(6)
        num_dots = 7
        total_items = num_dots + 2
        
        margin = style.scaled(8)
        right_margin = margin
        available_width = rect.width() - margin - right_margin
        item_spacing = available_width / (total_items - 1)
        
        icon_left = margin
        icon_y = rect.height() // 2 - icon_size // 2
        
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(self.icon_color)
        painter.drawRoundedRect(icon_left, icon_y, icon_size, icon_size, 1, 1)
        
        full_track_start = margin + item_spacing
        full_track_end = rect.width() - right_margin - item_spacing
        track_y = rect.height() // 2
        
        min_val = self.minimum()
        max_val = self.maximum()
        curr_val = self.value()
        
        dot_track_start = full_track_start
        dot_track_end = full_track_end
        
        if self.overshoot_enabled and self._normal_min is not None and self._normal_max is not None and max_val != min_val:
            normal_fraction = float(self._normal_max - self._normal_min) / float(max_val - min_val)
            normal_fraction = max(0.05, min(1.0, normal_fraction))
            overshoot_zone_each_side = (full_track_end - full_track_start) * (1.0 - normal_fraction) / 2.0
            dot_track_start = full_track_start + overshoot_zone_each_side
            dot_track_end = full_track_end - overshoot_zone_each_side
            
            overshoot_pen = QtGui.QPen(QtGui.QColor(230, 70, 70, 220), style.scaled(2), QtCore.Qt.DashLine)
            painter.setPen(overshoot_pen)
            painter.drawLine(QtCore.QPointF(full_track_start, track_y), QtCore.QPointF(dot_track_start, track_y))
            painter.drawLine(QtCore.QPointF(dot_track_end, track_y), QtCore.QPointF(full_track_end, track_y))
            painter.setPen(QtCore.Qt.NoPen)
        
        dot_color = QtGui.QColor(self.handle_color)
        dot_color.setAlpha(220)
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(dot_color)
        
        dot_spacing = (dot_track_end - dot_track_start) / (num_dots - 1)
        dot_radius = style.scaled(2.15)
        
        for i in range(num_dots):
            dot_x = dot_track_start + i * dot_spacing
            painter.drawEllipse(QtCore.QPointF(dot_x, track_y), dot_radius, dot_radius)
        
        if max_val != min_val:
            normalized = float(curr_val - min_val) / float(max_val - min_val)
        else:
            normalized = 0.5
            
        handle_x = full_track_start + normalized * (full_track_end - full_track_start)
        handle_y = track_y
        
        handle_size = style.scaled(22)
        handle_rect = QtCore.QRectF(
            handle_x - handle_size / 2,
            handle_y - handle_size / 2,
            handle_size,
            handle_size
        )
        
        painter.setBrush(self.handle_color)
        painter.setPen(QtCore.Qt.NoPen)
        painter.drawRoundedRect(handle_rect, 3, 3)
        
        painter.setPen(QtGui.QColor(40, 40, 40))
        font = painter.font()
        font.setPointSize(7)
        font.setBold(True)
        painter.setFont(font)
        painter.drawText(handle_rect, QtCore.Qt.AlignCenter, self.label_text)
        
        icon_right = rect.width() - right_margin - icon_size
        painter.setPen(QtCore.Qt.NoPen)
        painter.setBrush(self.icon_color)
        painter.drawRoundedRect(icon_right, icon_y, icon_size, icon_size, 1, 1)

    def mousePressEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton:
            if hasattr(event, 'position'):
                click_pos = event.position().toPoint()
            else:
                click_pos = event.pos()
            
            rect = self.rect()
            
            icon_size = style.scaled(6)
            margin = style.scaled(8)
            right_margin = margin
            icon_y = rect.height() // 2 - icon_size // 2
            num_dots = 7
            total_items = num_dots + 2
            available_width = rect.width() - margin - right_margin
            item_spacing = available_width / (total_items - 1)
            track_start = margin + item_spacing
            track_end = rect.width() - right_margin - item_spacing
            
            left_icon_rect = QtCore.QRect(margin, icon_y, icon_size, icon_size)
            icon_right = rect.width() - right_margin - icon_size
            right_icon_rect = QtCore.QRect(icon_right, icon_y, icon_size, icon_size)
            
            getCurves = slider_utils.get_anim_curves()
            anim_curves = getCurves[0]
            if anim_curves and len(anim_curves) > 400:
                QtWidgets.QApplication.setOverrideCursor(QtCore.Qt.WaitCursor)
                self.needs_cursor_restore = True
            else:
                self.needs_cursor_restore = False
            
            self.mouse_pressed = True
            
            if left_icon_rect.contains(click_pos):
                self.setValue(self.minimum())
                release_delay = 100 if slider_utils.IS_MACOS else 50
                QtCore.QTimer.singleShot(release_delay, self._onRelease)
            elif right_icon_rect.contains(click_pos):
                self.setValue(self.maximum())
                release_delay = 100 if slider_utils.IS_MACOS else 50
                QtCore.QTimer.singleShot(release_delay, self._onRelease)
            else:
                normalized = (click_pos.x() - track_start) / (track_end - track_start)
                normalized = max(0.0, min(1.0, normalized))
                new_value = self.minimum() + normalized * (self.maximum() - self.minimum())
                self.setValue(int(new_value))

    def mouseMoveEvent(self, event):
        if self.mouse_pressed and event.buttons() & QtCore.Qt.LeftButton:
            if hasattr(event, 'position'):
                click_pos = event.position().toPoint()
            else:
                click_pos = event.pos()
            
            rect = self.rect()
            margin = style.scaled(8)
            right_margin = margin
            icon_size = style.scaled(6)
            num_dots = 7
            total_items = num_dots + 2
            available_width = rect.width() - margin - right_margin
            item_spacing = available_width / (total_items - 1)
            
            track_start = margin + item_spacing
            track_end = rect.width() - right_margin - item_spacing
            
            normalized = (click_pos.x() - track_start) / (track_end - track_start)
            normalized = max(0.0, min(1.0, normalized))
            
            new_value = self.minimum() + normalized * (self.maximum() - self.minimum())
            self.setValue(int(new_value))
    
    def mouseReleaseEvent(self, event):
        if event.button() == QtCore.Qt.LeftButton and self.mouse_pressed:
            release_delay = 100 if slider_utils.IS_MACOS else 50
            QtCore.QTimer.singleShot(release_delay, self._onRelease)
    
    def _onRelease(self):
        self.mouse_pressed = False
        
        if self.slider_mode == "ease":
            if ease_slider:
                ease_slider.finish_ease()
            self.setValue(0)
        elif self.slider_mode in ("scale_right", "scale_avg"):
            scale_slider.reset_slider(self)
        elif self.slider_mode == "scale_default":
            sd_slider.reset_slider(self)
        elif self.slider_mode == "blend_default":
            bd_slider.reset_slider(self)
        elif self.slider_mode == "time_offset":
            to_slider.reset_slider(self)
        elif self.slider_mode == "time_offset_stagger":
            ts_slider.reset_slider(self)
        elif self.slider_mode == "noise_wave":
            nw_slider.reset_slider(self)
        elif self.slider_mode == "blend_world":
            _cascade_reset_slider_remapped(self)
        elif self.slider_mode == "push_pull":
            pp_slider.reset_slider(self)
        elif self.slider_mode == "blend_ease":
            be_slider.reset_slider(self)
        elif self.slider_mode == "smooth_harsh":
            sh_slider.reset_slider(self)
        elif self.slider_mode == "simplify_bake":
            sb_slider.reset_slider(self)
        elif self.slider_mode == "blend_infinity":
            bi_slider.reset_slider(self)
        elif self.slider_mode == "blend_mirror":
            bm_slider.reset_slider(self)
        
        self.statusChanged.emit("")
        
        if self.needs_cursor_restore:
            QtWidgets.QApplication.restoreOverrideCursor()
            self.needs_cursor_restore = False


def _get_all_sliders_row_height(row):
    min_height = style.scaled(28)
    try:
        if row is None:
            return min_height
        row_width = row.width()
        if row_width <= 0:
            row_width = row.sizeHint().width()
        row_layout = row.layout()
        if row_layout and hasattr(row_layout, 'heightForWidth') and row_width > 0:
            required = row_layout.heightForWidth(row_width)
            if required > 0:
                return max(min_height, required)
    except (RuntimeError, ReferenceError):
        pass
    return min_height


def create_all_sliders_container():
    global _show_all_sliders_container, _all_sliders_widgets, _all_sliders_row_items
    
    container = QtWidgets.QWidget()
    container.setStyleSheet("background: transparent;")
    container.setSizePolicy(QtWidgets.QSizePolicy.Ignored, QtWidgets.QSizePolicy.MinimumExpanding)
    container.setMinimumHeight(style.scaled(28))
    
    layout = FlowLayout(container, margin=2, h_spacing=style.scaled(10), v_spacing=style.scaled(10))
    
    row_items = []
    
    def add_gap(width):
        gap = QtWidgets.QWidget()
        gap.setFixedSize(width, 1)
        gap.setStyleSheet("background: transparent;")
        layout.addWidget(gap)
        row_items.append(("gap", gap))
    
    ease_slider_widget = ExpandedSlider("EA", (92, 184, 214), "ease")
    ease_slider_widget.setMinimum(-100)
    ease_slider_widget.setMaximum(100)
    ease_slider_widget.setValue(0)
    ease_slider_widget.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(ease_slider_widget, "ease_slider", None, hover_delay=1000)
    layout.addWidget(ease_slider_widget)
    row_items.append(("slider", "ease", ease_slider_widget))
    
    blend_ease_slider = ExpandedSlider("BE", (100, 192, 218), "blend_ease")
    blend_ease_slider.setMinimum(-100)
    blend_ease_slider.setMaximum(100)
    blend_ease_slider.setValue(0)
    blend_ease_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(blend_ease_slider, "blend_ease_slider", None, hover_delay=1000)
    layout.addWidget(blend_ease_slider)
    row_items.append(("slider", "blend_ease", blend_ease_slider))
    
    add_gap(style.scaled(12))
    
    push_pull_slider = ExpandedSlider("PP", (84, 206, 212), "push_pull")
    push_pull_slider.setMinimum(-100)
    push_pull_slider.setMaximum(100)
    push_pull_slider.setValue(0)
    push_pull_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(push_pull_slider, "push_pull_slider", None, hover_delay=1000)
    layout.addWidget(push_pull_slider)
    row_items.append(("slider", "push_pull", push_pull_slider))
    
    add_gap(style.scaled(12))
    
    scale_right_slider = ExpandedSlider("SR", (113, 167, 214), "scale_right")
    scale_right_slider.setMinimum(-100)
    scale_right_slider.setMaximum(100)
    scale_right_slider.setValue(0)
    scale_right_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(scale_right_slider, "scale_right_slider", None, hover_delay=1000)
    layout.addWidget(scale_right_slider)
    row_items.append(("slider", "scale_right", scale_right_slider))
    
    scale_avg_slider = ExpandedSlider("SA", (131, 158, 216), "scale_avg")
    scale_avg_slider.setMinimum(-100)
    scale_avg_slider.setMaximum(100)
    scale_avg_slider.setValue(0)
    scale_avg_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(scale_avg_slider, "scale_avg_slider", None, hover_delay=1000)
    layout.addWidget(scale_avg_slider)
    row_items.append(("slider", "scale_avg", scale_avg_slider))
    
    add_gap(style.scaled(12))
    
    scale_default_slider = ExpandedSlider("SD", (145, 161, 224), "scale_default")
    scale_default_slider.setMinimum(-100)
    scale_default_slider.setMaximum(100)
    scale_default_slider.setValue(0)
    scale_default_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(scale_default_slider, "scale_default_slider", None, hover_delay=1000)
    layout.addWidget(scale_default_slider)
    row_items.append(("slider", "scale_default", scale_default_slider))
    
    add_gap(style.scaled(12))
    
    blend_default_slider = ExpandedSlider("BD", (157, 164, 231), "blend_default")
    blend_default_slider.setMinimum(-100)
    blend_default_slider.setMaximum(100)
    blend_default_slider.setValue(0)
    blend_default_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(blend_default_slider, "blend_default_slider", None, hover_delay=1000)
    layout.addWidget(blend_default_slider)
    row_items.append(("slider", "blend_default", blend_default_slider))
    
    add_gap(style.scaled(12))
    
    time_offset_slider = ExpandedSlider("TO", (150, 135, 222), "time_offset")
    time_offset_slider.setMinimum(-100)
    time_offset_slider.setMaximum(100)
    time_offset_slider.setValue(0)
    time_offset_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(time_offset_slider, "time_offset_slider", None, hover_delay=1000)
    layout.addWidget(time_offset_slider)
    row_items.append(("slider", "time_offset", time_offset_slider))
    
    add_gap(style.scaled(12))
    
    time_offset_stagger_slider = ExpandedSlider("TS", (163, 133, 226), "time_offset_stagger")
    time_offset_stagger_slider.setMinimum(-100)
    time_offset_stagger_slider.setMaximum(100)
    time_offset_stagger_slider.setValue(0)
    time_offset_stagger_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(time_offset_stagger_slider, "time_offset_stagger_slider", None, hover_delay=1000)
    layout.addWidget(time_offset_stagger_slider)
    row_items.append(("slider", "time_offset_stagger", time_offset_stagger_slider))
    
    add_gap(style.scaled(12))
    
    noise_wave_slider = ExpandedSlider("NW", (178, 140, 227), "noise_wave")
    noise_wave_slider.setMinimum(-100)
    noise_wave_slider.setMaximum(100)
    noise_wave_slider.setValue(0)
    noise_wave_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(noise_wave_slider, "noise_wave_slider", None, hover_delay=1000)
    layout.addWidget(noise_wave_slider)
    row_items.append(("slider", "noise_wave", noise_wave_slider))
    
    add_gap(style.scaled(12))
    
    blend_world_slider = ExpandedSlider("CN", (205, 147, 230), "blend_world")
    blend_world_slider.setMinimum(-100)
    blend_world_slider.setMaximum(100)
    blend_world_slider.setValue(0)
    blend_world_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(blend_world_slider, "blend_world_slider", None, hover_delay=1000)
    layout.addWidget(blend_world_slider)
    row_items.append(("slider", "blend_world", blend_world_slider))
    
    add_gap(style.scaled(12))
    
    smooth_harsh_slider = ExpandedSlider("SH", (212, 144, 228), "smooth_harsh")
    smooth_harsh_slider.setMinimum(-100)
    smooth_harsh_slider.setMaximum(100)
    smooth_harsh_slider.setValue(0)
    smooth_harsh_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(smooth_harsh_slider, "smooth_harsh_slider", None, hover_delay=1000)
    layout.addWidget(smooth_harsh_slider)
    row_items.append(("slider", "smooth_harsh", smooth_harsh_slider))
    
    add_gap(style.scaled(12))
    
    simplify_bake_slider = ExpandedSlider("SB", (218, 142, 226), "simplify_bake")
    simplify_bake_slider.setMinimum(-100)
    simplify_bake_slider.setMaximum(100)
    simplify_bake_slider.setValue(0)
    simplify_bake_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(simplify_bake_slider, "simplify_bake_slider", None, hover_delay=1000)
    layout.addWidget(simplify_bake_slider)
    row_items.append(("slider", "simplify_bake", simplify_bake_slider))
    
    blend_infinity_slider = ExpandedSlider("BI", (224, 140, 224), "blend_infinity")
    blend_infinity_slider.setMinimum(-100)
    blend_infinity_slider.setMaximum(100)
    blend_infinity_slider.setValue(0)
    blend_infinity_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(blend_infinity_slider, "blend_infinity_slider", None, hover_delay=1000)
    layout.addWidget(blend_infinity_slider)
    row_items.append(("slider", "blend_infinity", blend_infinity_slider))
    
    add_gap(style.scaled(12))
    
    blend_mirror_slider = ExpandedSlider("BM", (230, 138, 205), "blend_mirror")
    blend_mirror_slider.setMinimum(-100)
    blend_mirror_slider.setMaximum(100)
    blend_mirror_slider.setValue(0)
    blend_mirror_slider.setFixedWidth(style.scaled(160))
    if _tooltip_manager:
        _tooltip_manager.register_button(blend_mirror_slider, "blend_mirror_slider", None, hover_delay=1000)
    layout.addWidget(blend_mirror_slider)
    row_items.append(("slider", "blend_mirror", blend_mirror_slider))
    
    container.setVisible(_get_show_all_sliders_pref())
    _show_all_sliders_container = container
    
    _all_sliders_widgets = {
        "ease": ease_slider_widget,
        "blend_ease": blend_ease_slider,
        "push_pull": push_pull_slider,
        "scale_right": scale_right_slider,
        "scale_avg": scale_avg_slider,
        "scale_default": scale_default_slider,
        "blend_default": blend_default_slider,
        "time_offset": time_offset_slider,
        "time_offset_stagger": time_offset_stagger_slider,
        "noise_wave": noise_wave_slider,
        "blend_world": blend_world_slider,
        "smooth_harsh": smooth_harsh_slider,
        "simplify_bake": simplify_bake_slider,
        "blend_infinity": blend_infinity_slider,
        "blend_mirror": blend_mirror_slider,
    }
    _all_sliders_row_items = row_items
    
    _rebuild_all_sliders_row_items()
    
    return container


class NudgeKeysWidget(QtWidgets.QWidget):

    def __init__(self, parent=None):
        super(NudgeKeysWidget, self).__init__(parent)

        self._amount = nudge_keys.load_last_amount(get_prefs_path())

        layout = QtWidgets.QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(5)

        self.left_btn = QtWidgets.QPushButton("<")
        self.left_btn.setFlat(True)
        self.left_btn.setFocusPolicy(QtCore.Qt.NoFocus)
        self.left_btn.setToolTip("Nudge Keys Backward")
        self.left_btn.clicked.connect(lambda: self._nudge(-1))

        self.amount_field = QtWidgets.QLineEdit()
        self.amount_field.setAlignment(QtCore.Qt.AlignCenter)
        self.amount_field.setValidator(QtGui.QDoubleValidator(0.001, 999999.0, 3, self.amount_field))
        self.amount_field.setToolTip("Nudge Keys Amount")
        self.amount_field.setText(self._format_amount(self._amount))
        self.amount_field.editingFinished.connect(self._on_amount_edited)

        self.right_btn = QtWidgets.QPushButton(">")
        self.right_btn.setFlat(True)
        self.right_btn.setFocusPolicy(QtCore.Qt.NoFocus)
        self.right_btn.setToolTip("Nudge Keys Forward")
        self.right_btn.clicked.connect(lambda: self._nudge(1))

        for btn in (self.left_btn, self.right_btn):
            btn.setStyleSheet("""
                QPushButton { border: none; background: rgba(255,255,255,20); color: white; border-radius: 4px; }
                QPushButton:pressed { background-color: rgba(255,255,255,110); }
            """)

        self.amount_field.setStyleSheet("""
            QLineEdit { border: 1px solid rgba(255,255,255,40); border-radius: 4px; background: rgba(58,58,58,140); color: #d8d8d8; }
        """)

        layout.addWidget(self.left_btn)
        layout.addWidget(self.amount_field)
        layout.addWidget(self.right_btn)

        for w in (self.left_btn, self.amount_field, self.right_btn):
            w.installEventFilter(_tooltip_filter)
            if _tooltip_manager:
                _tooltip_manager.register_button(w, "nudge_keys_widget", None)

        self.set_scaled_size(lambda v: v)

    def set_scaled_size(self, scale_fn):
        nudge_scale = 1.10
        vertical_scale = 1.11
        font_scale = 1.16
        btn_width = int(round(scale_fn(20) * nudge_scale))
        btn_height = int(round(btn_width * vertical_scale))
        self.left_btn.setFixedSize(btn_width, btn_height)
        self.right_btn.setFixedSize(btn_width, btn_height)
        self.amount_field.setFixedSize(int(round(scale_fn(40) * nudge_scale)), btn_height)
        font = self.amount_field.font()
        font.setPixelSize(max(9, int(round(scale_fn(8) * font_scale * 1.333))))
        self.amount_field.setFont(font)

    def _format_amount(self, amount):
        if amount == int(amount):
            return str(int(amount))
        return ("%.3f" % amount).rstrip('0').rstrip('.')

    def _on_amount_edited(self):
        try:
            amount = float(self.amount_field.text())
        except ValueError:
            amount = self._amount
        if amount <= 0:
            amount = nudge_keys.DEFAULT_NUDGE_AMOUNT
        self._amount = amount
        self.amount_field.setText(self._format_amount(self._amount))
        nudge_keys.save_last_amount(get_prefs_path(), self._amount)

    def _nudge(self, direction):
        self._on_amount_edited()
        nudge_keys.nudge_keys_by_amount(self._amount * direction)


class toolbar(object):
    
    def __init__(self):
        self.current_dock_mode = None
        self.qt_toolbar = None  # For embedded timeline mode
        self._ui_building = False  # Prevent duplicate UI builds
        self._scroll_offset = 0
        self._content_width = 0
        self._master_container = None
        self._clip_container = None
        self._left_arrow = None
        self._right_arrow = None
        self._resize_filter = None
        self._clip_resize_filter = None
        self._wrap_resize_filter = None  # For Keep Icons Visible mode
        self._master_resize_filter = None  # For Keep Icons Visible mode
        self._toolbar_resize_filter = None  # For Keep Icons Visible mode
        self._all_sliders_resize_filter = None
        self._splitter = None  # Store splitter for height adjustments
        self._last_toolbar_height = 0  # Track height changes
        self._edit_mode = False  # Icon repositioning mode
        self._wrap_icons_enabled = False  # Keep Icons Visible mode
        self._draggable_filter = DraggableIconFilter(self)
        
        # Load saved dock mode from JSON prefs file
        self._loadDockMode()
    
    def _loadDockMode(self):
        prefs_file = get_prefs_file()
        try:
            if os.path.exists(prefs_file):
                with open(prefs_file, 'r') as f:
                    prefs = json.load(f)
                    saved_mode = prefs.get('dock_mode', None)
                    if saved_mode in ['channelbox', 'toolbox', 'timeline_top', 'timeline_bottom', 'shelf', 'statusline']:
                        self.current_dock_mode = saved_mode
        except:
            pass
    
    def _saveDockMode(self, mode):
        prefs_file = get_prefs_file()
        try:
            # Load existing prefs or create new
            prefs = {}
            if os.path.exists(prefs_file):
                try:
                    with open(prefs_file, 'r') as f:
                        prefs = json.load(f)
                except:
                    pass
            
            # Update dock mode
            prefs['dock_mode'] = mode
            
            # Save back to file
            with open(prefs_file, 'w') as f:
                json.dump(prefs, f, indent=4)
        except Exception as e:
            cmds.warning("Animo: Could not save preferences - {}".format(str(e)))
    
    def _showToolbarContextMenu(self, pos):
        menu = QtWidgets.QMenu()
        menu.setStyleSheet(_animo_menu_qss())
        
        show_all_action = QAction("Show Other Sliders", menu)
        show_all_action.setCheckable(True)
        show_all_action.setChecked(_get_show_all_sliders_pref())
        show_all_action.triggered.connect(self._toggleShowAllSlidersFromMenu)
        menu.addAction(show_all_action)
        
        _build_sliders_visibility_submenu(menu)
        
        menu.addSeparator()
        
        overshoot_action = QAction("Sliders Overshoot Mode", menu)
        overshoot_action.setCheckable(True)
        overshoot_action.setChecked(slider_utils.is_overshoot_enabled())
        overshoot_action.triggered.connect(self._toggleOvershootFromMenu)
        menu.addAction(overshoot_action)
        
        menu.addSeparator()
        
        graph_toolbar_action = QAction("Graph Editor Toolbar", menu)
        graph_toolbar_action.setCheckable(True)
        graph_toolbar_action.setChecked(graphSliderMod.is_toolbar_enabled())
        graph_toolbar_action.triggered.connect(self._toggleGraphToolbarFromMenu)
        menu.addAction(graph_toolbar_action)
        
        menu.addSeparator()
        
        guide_action = QAction("Animo Sliders Guide", menu)
        guide_action.triggered.connect(self._showSlidersGuide)
        menu.addAction(guide_action)
        
        tools_editor_action = QAction("Tools Editor and Hotkeys", menu)
        tools_editor_action.triggered.connect(_run_tools_editor_launcher)
        menu.addAction(tools_editor_action)
        
        menu.exec_(self.qt_toolbar.mapToGlobal(pos))
    
    def _toggleOvershootFromMenu(self, checked):
        slider_utils.set_overshoot_enabled(checked)
        _apply_overshoot_to_all_sliders(checked)
    
    def _toggleGraphToolbarFromMenu(self, checked):
        if checked:
            graphSliderMod.enable_toolbar()
        else:
            graphSliderMod.disable_toolbar()
    
    def _showSlidersGuide(self):
        if sliders_guide_module is None:
            cmds.warning("Animo: Sliders Guide could not be loaded.")
            return
        try:
            sliders_guide_module.show_sliders_guide(self.qt_toolbar)
        except Exception as e:
            cmds.warning("Animo: Could not open Sliders Guide - {}".format(str(e)))
    
    def _toggleShowAllSlidersFromMenu(self, checked):
        global _show_all_sliders_visible, _show_all_sliders_container
        _set_show_all_sliders_pref(checked)
        _show_all_sliders_visible = checked
        if _show_all_sliders_container:
            _show_all_sliders_container.setVisible(checked)
            if checked:
                _rebuild_all_sliders_row_items()
                _refresh_all_sliders_row_height()
            else:
                if self.qt_toolbar:
                    self._last_toolbar_height = style.TOOLBAR_HEIGHT
                    self.qt_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
                    self.qt_toolbar.updateGeometry()
    
    def toggle(self, *args):
        if self.current_dock_mode in ('timeline_top', 'timeline_bottom') and self.qt_toolbar:
            if self.qt_toolbar.isVisible():
                self.qt_toolbar.hide()
            else:
                self.qt_toolbar.show()
        elif cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            if cmds.workspaceControl(WorkspaceName, query=True, visible=True):
                cmds.workspaceControl(WorkspaceName, edit=True, visible=False)
            else:
                cmds.workspaceControl(WorkspaceName, edit=True, restore=True)
        else:
            self.reload()
    
    def reload(self, *args):
        # Clean up Qt toolbar
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
                self._restoreTimelineArea()
            except:
                pass
        
        for mod in list(sys.modules.keys()):
            if 'Animo' in mod:
                del sys.modules[mod]
        if cmds.workspaceControl(WorkspaceName, q=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        import Animo_Launcher
        Animo_Launcher.tb.startUI()
    
    def getImage(self, image):
        path = os.path.join(ICONS_PATH, image)
        if not os.path.exists(path):
            alt_path = os.path.join(ANIMO_DATA_PATH, "Animo_AnimRef", image)
            if os.path.exists(alt_path):
                return alt_path
        return path
    
    def isDockTargetAvailable(self, mode):
        if mode == 'channelbox':
            # Check if ChannelBox is visible
            try:
                if cmds.workspaceControl("ChannelBoxLayerEditor", query=True, exists=True):
                    if cmds.workspaceControl("ChannelBoxLayerEditor", query=True, visible=True):
                        return True
            except:
                pass
            # Fallback - check if we can find the widget
            try:
                ptr = mui.MQtUtil.findControl("ChannelBoxLayerEditor")
                if ptr:
                    widget = wrapInstance(int(ptr), QtWidgets.QWidget)
                    return widget.isVisible()
            except:
                pass
            return False
        elif mode == 'toolbox':
            # Check if ToolBox is visible
            try:
                if cmds.workspaceControl("ToolBox", query=True, exists=True):
                    if cmds.workspaceControl("ToolBox", query=True, visible=True):
                        return True
            except:
                pass
            # Fallback - check if we can find the widget
            try:
                ptr = mui.MQtUtil.findControl("ToolBox")
                if ptr:
                    widget = wrapInstance(int(ptr), QtWidgets.QWidget)
                    return widget.isVisible()
            except:
                pass
            return False
        elif mode in ('timeline', 'timeline_top', 'timeline_bottom'):
            # Check if timeline/playback slider is visible
            try:
                time_slider_name = mel.eval('$tmpVar=$gPlayBackSlider')
                if time_slider_name:
                    if cmds.timeControl(time_slider_name, query=True, visible=True):
                        return True
            except:
                pass
            # Fallback - check if we can find the widget
            try:
                ptr = mui.MQtUtil.findControl(mel.eval('$tmpVar=$gPlayBackSlider'))
                if ptr:
                    widget = wrapInstance(int(ptr), QtWidgets.QWidget)
                    return widget.isVisible()
            except:
                pass
            return False
        elif mode == 'bottom_toolbar':
            # Bottom toolbar is always available
            return True
        elif mode == 'shelf':
            # Check if shelf is visible
            try:
                shelf_layout = mel.eval('$tmpVar=$gShelfTopLevel')
                if shelf_layout and cmds.shelfTabLayout(shelf_layout, query=True, exists=True):
                    if cmds.shelfTabLayout(shelf_layout, query=True, visible=True):
                        return True
            except:
                pass
            # Fallback - check Qt widget
            try:
                ptr = mui.MQtUtil.findControl(mel.eval('$tmpVar=$gShelfTopLevel'))
                if ptr:
                    widget = wrapInstance(int(ptr), QtWidgets.QWidget)
                    return widget.isVisible()
            except:
                pass
            return False
        elif mode == 'statusline':
            # Check if status line is visible
            try:
                status_line = mel.eval('$tmpVar=$gStatusLine')
                if status_line:
                    ptr = mui.MQtUtil.findControl(status_line)
                    if ptr:
                        widget = wrapInstance(int(ptr), QtWidgets.QWidget)
                        return widget.isVisible()
            except:
                pass
            return False
        return False
    
    def _refreshDockMenu(self, menu, *args):
        # Clear existing items
        menu_items = cmds.popupMenu(menu, query=True, itemArray=True) or []
        for item in menu_items:
            cmds.deleteUI(item)
        
        cmds.menuItem(l="Reset Animo", c=lambda x: self._resetUI(), p=menu)
        cmds.menuItem(l="Add Animo to Shelf", c=lambda x: self._addToShelf(), p=menu)
        cmds.menuItem(
            l="Sliders Overshoot Mode",
            checkBox=slider_utils.is_overshoot_enabled(),
            c=lambda state: _toggle_overshoot_native(state),
            p=menu
        )
    
    def _resetUI(self):
        import runpy
        toggle_py = os.path.join(ANIMO_DATA_PATH, "Animo_Launcher", "toggle.py")
        if os.path.exists(toggle_py):
            runpy.run_path(toggle_py, run_name="__main__")
            def reopen(path=toggle_py):
                import runpy as rp
                rp.run_path(path, run_name="__main__")
            QtCore.QTimer.singleShot(100, reopen)
    
    def _addToShelf(self):
        try:
            current_shelf = cmds.shelfTabLayout("ShelfLayout", query=True, selectTab=True)
            animo_icon_path = os.path.join(ICONS_PATH, "animo.png")
            cmds.shelfButton(
                parent=current_shelf,
                image=animo_icon_path,
                label="Animo",
                command="import runpy; import os; import maya.cmds as cmds; runpy.run_path(os.path.join(os.path.normpath(os.path.join(cmds.internalVar(userScriptDir=True), '..', '..', 'scripts')), 'Animo_Data', 'Animo_Launcher', 'toggle.py'), run_name='__main__')",
                sourceType="python",
                annotation="Animo Toolbar"
            )
            cmds.inViewMessage(amg='<span style="color:#82C99A;">Animo added to shelf</span>', pos='topCenter', fade=True, fadeStayTime=1000)
        except Exception as e:
            cmds.warning("Could not add to shelf: {}".format(str(e)))
    
    def _toggleEditMode(self):
        self._edit_mode = not self._edit_mode
        
        if self._edit_mode:
            cmds.inViewMessage(amg='<span style="color:#00ff00;">Edit Mode ON</span> - Drag icons to reposition. Click "Save Layout" when done.', pos='topCenter', fade=True, fadeStayTime=2000)
            # Update all icon buttons to show edit mode styling
            self._updateEditModeStyle(True)
        else:
            cmds.inViewMessage(amg='<span style="color:#ffaa00;">Edit Mode OFF</span>', pos='topCenter', fade=True, fadeStayTime=1000)
            self._updateEditModeStyle(False)
    
    def _updateEditModeStyle(self, edit_mode):
        if not hasattr(self, '_icon_buttons'):
            return
        
        for btn, icon_index in self._icon_buttons:
            if edit_mode:
                # Store original position if not already stored
                if not hasattr(btn, '_original_x'):
                    btn._original_x = btn.pos().x()
                
                # Apply current offset
                offset = bar.ICON_OFFSETS.get(icon_index, 0)
                new_x = btn._original_x + offset
                btn.move(new_x, btn.pos().y())
                
                btn.setStyleSheet("""
                    QPushButton { border: 2px solid #00ff00; background: rgba(0,255,0,20); }
                """)
            else:
                # Keep position but restore normal style
                btn.setStyleSheet("""
                    QPushButton { border: none; background: transparent; }
                    QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                    QPushButton::menu-indicator { width: 0; height: 0; }
                """)
    
    def _saveIconLayout(self):
        try:
            # Get path to barMod.py
            bar_mod_path = os.path.join(ANIMO_DATA_PATH, 'Animo_UI', 'barMod.py')
            
            if not os.path.exists(bar_mod_path):
                cmds.warning("Could not find barMod.py at: {}".format(bar_mod_path))
                return
            
            # Read the file
            with open(bar_mod_path, 'r') as f:
                content = f.read()
            
            # Build new ICON_OFFSETS string
            new_offsets = "ICON_OFFSETS = {\n"
            new_offsets += "    # Transify group (indices 0, 1, 2)\n"
            new_offsets += "    0: {},   # transify\n".format(bar.ICON_OFFSETS.get(0, 0))
            new_offsets += "    1: {},   # keys_time\n".format(bar.ICON_OFFSETS.get(1, 0))
            new_offsets += "    2: {},   # fast_anim_layers\n".format(bar.ICON_OFFSETS.get(2, 0))
            new_offsets += "    \n"
            new_offsets += "    # Pickify group (indices 5, 3, 4)\n"
            new_offsets += "    5: {},   # pickify\n".format(bar.ICON_OFFSETS.get(5, 0))
            new_offsets += "    3: {},   # tweenify\n".format(bar.ICON_OFFSETS.get(3, 0))
            new_offsets += "    4: {},   # tracify\n".format(bar.ICON_OFFSETS.get(4, 0))
            new_offsets += "    \n"
            new_offsets += "    # Spacify group (indices 6, 7, 8, 9)\n"
            new_offsets += "    6: {},   # spacify\n".format(bar.ICON_OFFSETS.get(6, 0))
            new_offsets += "    7: {},   # xform_align\n".format(bar.ICON_OFFSETS.get(7, 0))
            new_offsets += "    8: {},   # attributes_space_switcher\n".format(bar.ICON_OFFSETS.get(8, 0))
            new_offsets += "    9: {},   # temp_pivot\n".format(bar.ICON_OFFSETS.get(9, 0))
            new_offsets += "    \n"
            new_offsets += "    # Global offset group (indices 10, 11, 12)\n"
            new_offsets += "    10: {},  # global_offset\n".format(bar.ICON_OFFSETS.get(10, 0))
            new_offsets += "    11: {},  # twosify\n".format(bar.ICON_OFFSETS.get(11, 0))
            new_offsets += "    12: {},  # vectorify\n".format(bar.ICON_OFFSETS.get(12, 0))
            new_offsets += "    \n"
            new_offsets += "    # Tangent icons (indices 13, 14, 15)\n"
            new_offsets += "    13: {},  # auto_tangent\n".format(bar.ICON_OFFSETS.get(13, 0))
            new_offsets += "    14: {},  # linear_tangent\n".format(bar.ICON_OFFSETS.get(14, 0))
            new_offsets += "    15: {},  # step_tangent\n".format(bar.ICON_OFFSETS.get(15, 0))
            new_offsets += "    \n"
            new_offsets += "    # Exporter group (indices 16, 17, 18)\n"
            new_offsets += "    16: {},  # quick_exporter\n".format(bar.ICON_OFFSETS.get(16, 0))
            new_offsets += "    17: {},  # tools_editor\n".format(bar.ICON_OFFSETS.get(17, 0))
            new_offsets += "    18: {},  # about\n".format(bar.ICON_OFFSETS.get(18, 0))
            new_offsets += "    \n"
            new_offsets += "    # Left slider icons (indices 19, 20, 21)\n"
            new_offsets += "    19: {},  # reset\n".format(bar.ICON_OFFSETS.get(19, 0))
            new_offsets += "    20: {},  # bake\n".format(bar.ICON_OFFSETS.get(20, 0))
            new_offsets += "    21: {},  # share_keys\n".format(bar.ICON_OFFSETS.get(21, 0))
            new_offsets += "    \n"
            new_offsets += "    # White icons near cascade (indices 22, 23, 24, 25, 26, 27)\n"
            new_offsets += "    22: {},  # SelectOpposite\n".format(bar.ICON_OFFSETS.get(22, 0))
            new_offsets += "    23: {},  # Playblaster\n".format(bar.ICON_OFFSETS.get(23, 0))
            new_offsets += "    24: {},  # CropAnimation\n".format(bar.ICON_OFFSETS.get(24, 0))
            new_offsets += "    25: {},  # DeleteRedundantKeys\n".format(bar.ICON_OFFSETS.get(25, 0))
            new_offsets += "    26: {},  # SmoothSelectedKeys\n".format(bar.ICON_OFFSETS.get(26, 0))
            new_offsets += "    27: {},  # SmartSnapKeys\n".format(bar.ICON_OFFSETS.get(27, 0))
            new_offsets += "}"
            
            # Find and replace the ICON_OFFSETS block
            import re
            pattern = r'ICON_OFFSETS = \{[^}]+\}'
            content = re.sub(pattern, new_offsets, content, flags=re.DOTALL)
            
            # Write back
            with open(bar_mod_path, 'w') as f:
                f.write(content)
            
            cmds.inViewMessage(amg='<span style="color:#82C99A;">Icon layout saved!</span>', pos='topCenter', fade=True, fadeStayTime=1500)
            
            # Turn off edit mode
            if self._edit_mode:
                self._toggleEditMode()
                
        except Exception as e:
            cmds.warning("Could not save icon layout: {}".format(str(e)))
    
    def _applySavedOffsets(self):
        if not hasattr(self, '_icon_buttons'):
            return
        
        def apply_offsets():
            for btn, icon_index in self._icon_buttons:
                offset = bar.ICON_OFFSETS.get(icon_index, 0)
                if offset != 0:
                    # Store original position
                    if not hasattr(btn, '_original_x'):
                        btn._original_x = btn.pos().x()
                    # Apply offset
                    new_x = btn._original_x + offset
                    btn.move(new_x, btn.pos().y())
        
        # Delay to ensure layout is complete
        QtCore.QTimer.singleShot(100, apply_offsets)
    
    def _saveCurrentPosition(self):
        if self.current_dock_mode:
            self._saveDockMode(self.current_dock_mode)
            cmds.inViewMessage(amg='<span style="color:#82C99A;">Animo position saved: {}</span>'.format(
                self.current_dock_mode.title()), pos='topCenter', fade=True, fadeStayTime=1000)
    
    def setDockMode(self, mode):
        # If target not available, just return - don't try to restore
        if not self.isDockTargetAvailable(mode):
            return
        
        self.current_dock_mode = mode
        self._saveDockMode(mode)  # Save to JSON prefs file
        self.startUI()
    
    def startUI(self):
        self._ui_building = False

        try:
            mel.eval('setTimeSliderVisible 1;')
        except:
            pass

        if self._ui_building:
            return
        self._ui_building = True

        try:
            if hasattr(self, '_dock_anim_group') and self._dock_anim_group:
                try:
                    self._dock_anim_group.stop()
                except:
                    pass

            self.current_dock_mode = 'timeline_top'
            dock_mode = self.current_dock_mode

            if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
                try:
                    cmds.deleteUI(WorkspaceName, control=True)
                except:
                    pass

            local_ref = self.qt_toolbar
            self.qt_toolbar = None
            if local_ref is not None:
                try:
                    local_ref.hide()
                    local_ref.setParent(None)
                    local_ref.deleteLater()
                except:
                    pass
                try:
                    self._restoreTimelineArea()
                except:
                    pass

            try:
                if cmds.toolBar("animo_timeline_toolbar", query=True, exists=True):
                    cmds.deleteUI("animo_timeline_toolbar")
            except:
                pass
            try:
                if cmds.window("animo_toolbar_win", query=True, exists=True):
                    cmds.deleteUI("animo_toolbar_win")
            except:
                pass

            try:
                maya_main_ptr = mui.MQtUtil.mainWindow()
                if maya_main_ptr:
                    maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                    for orphan in maya_main.findChildren(QtWidgets.QWidget, "animo_qt_toolbar"):
                        try:
                            orphan.hide()
                            orphan.setParent(None)
                            orphan.deleteLater()
                        except:
                            pass
            except:
                pass

            self._scroll_offset = 0
            self._content_width = 0
            self._master_container = None
            self._clip_container = None
            self._left_arrow = None
            self._right_arrow = None
            self._resize_filter = None
            self._clip_resize_filter = None
            self._wrap_resize_filter = None
            self._master_resize_filter = None
            self._toolbar_resize_filter = None
            self._all_sliders_resize_filter = None
            self._splitter = None
            self._last_toolbar_height = 0
            self._wrap_icons_enabled = False

            if dock_mode == 'timeline_top':
                self.buildTimelineUI(position='top')

        finally:
            self._ui_building = False
    
    def buildSideUI(self, target):
        
        # Clean up existing
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
            except:
                pass
        
        # Clean up any workspaceControl
        if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        
        # Find target widget
        target_widget = None
        target_name = "ChannelBoxLayerEditor" if target == 'channelbox' else "ToolBox"
        
        try:
            ptr = mui.MQtUtil.findControl(target_name)
            if ptr:
                target_widget = wrapInstance(int(ptr), QtWidgets.QWidget)
        except:
            pass
        
        if not target_widget:
            cmds.warning("Animo: Could not find {} - using fallback".format(target_name))
            self._buildSideFallback(target)
            return
        
        # Find parent with layout we can insert into
        insert_parent = None
        insert_widget = target_widget
        insert_side = 'left' if target == 'channelbox' else 'right'
        
        # Walk up to find a suitable parent with QHBoxLayout or QSplitter
        current = target_widget
        for _ in range(10):
            parent = current.parent()
            if not parent:
                break
            
            if parent.__class__.__name__ == 'QSplitter':
                insert_parent = parent
                insert_widget = current
                break
            
            layout = parent.layout()
            if layout and layout.__class__.__name__ == 'QHBoxLayout':
                insert_parent = parent
                insert_widget = current
                break
            
            current = parent
        
        if not insert_parent:
            cmds.warning("Animo: Could not find suitable parent layout - using fallback")
            self._buildSideFallback(target)
            return
        
        # Create our toolbar widget
        self.qt_toolbar = QtWidgets.QWidget()
        self.qt_toolbar.setObjectName("animo_qt_toolbar")
        self.qt_toolbar.setFixedWidth(style.TOOLBAR_WIDTH)
        
        # Style to match Maya
        bg_color = "rgb({}, {}, {})".format(
            int(style.TOOLBAR_BG_COLOR[0] * 255),
            int(style.TOOLBAR_BG_COLOR[1] * 255),
            int(style.TOOLBAR_BG_COLOR[2] * 255)
        )
        self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }} {}".format(bg_color, TOOLTIP_STYLE))
        
        # Create vertical layout
        layout = QtWidgets.QVBoxLayout(self.qt_toolbar)
        layout.setContentsMargins(4, 8, 4, 8)
        layout.setSpacing(0)
        
        # Create a container widget for the icons
        icon_container = QtWidgets.QWidget()
        icon_layout = QtWidgets.QVBoxLayout(icon_container)
        icon_layout.setContentsMargins(0, 0, 0, 0)
        icon_layout.setSpacing(style.ICON_SPACING_VERTICAL)
        
        # Add tool icons
        for i, icon_data in enumerate(bar.ICON_DATA):
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            offset = icon_data[6] if len(icon_data) > 6 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            
            margin_style = ""
            if offset:
                margin_left = max(0, offset[0])
                margin_right = max(0, -offset[0])
                margin_style = "margin-left: {}px; margin-right: {}px;".format(margin_left, margin_right)
            
            btn.setStyleSheet("""
                QPushButton {{ border: none; background: transparent; {} }}
                QPushButton:pressed {{ background-color: rgba(255,255,255,100); border-radius: 8px; }}
                QPushButton::menu-indicator {{ width: 0; height: 0; }}
            """.format(margin_style))
            
            if menu_options:
                # Create popup menu for this button
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        btn.clicked.connect(
                            lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                else:
                    btn.setMenu(btn_menu)
                # Enable right-click to show same menu
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            else:
                if i == 17:
                    btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                    btn.setToolTip("Mirror Animation")
                    def tools_editor_wip():
                        _run_mirror_launcher()
                    btn.clicked.connect(tools_editor_wip)
                elif i == 4:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
                    def create_tracify_settings_menu_side(button):
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        def show_menu(pos):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            camera_space_action = QAction("Camera Space", menu)
                            camera_space_action.setCheckable(True)
                            camera_space_action.setChecked(_get_tracify_camera_space_pref())
                            camera_space_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                            )
                            menu.addAction(camera_space_action)
                            menu.addSeparator()
                            settings_action = menu.addAction("Tracify Settings")
                            settings_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                            )
                            menu.exec_(button.mapToGlobal(pos))
                        button.customContextMenuRequested.connect(show_menu)
                    create_tracify_settings_menu_side(btn)
                elif i == 7:
                    def create_xform_align_menu_side(button):
                        menu = QtWidgets.QMenu(button)
                        menu.setStyleSheet(_animo_menu_qss())
                        bake_only_keys_action = QAction("Bake Only Keys", menu)
                        bake_only_keys_action.setCheckable(True)
                        bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        def _on_toggle_xform_bake_only_keys(checked):
                            cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                        bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                        menu.addAction(bake_only_keys_action)
                        menu.addSeparator()
                        copy_xform_action = menu.addAction("Copy XForm World")
                        copy_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                        )
                        copy_xform_range_action = menu.addAction("Copy XForm World Range")
                        copy_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        paste_xform_action = menu.addAction("Paste XForm World")
                        paste_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                        )
                        paste_xform_range_action = menu.addAction("Paste XForm World Range")
                        paste_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                        copy_xform_rel_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                        )
                        paste_relationship_action = menu.addAction("Paste Relationship")
                        paste_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                        )
                        paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                        paste_range_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        align_translate_action = menu.addAction("Align (Translate) World")
                        align_translate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                        )
                        align_rotate_action = menu.addAction("Align (Rotate) World")
                        align_rotate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                        )
                        align_action = menu.addAction("Align World")
                        align_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        xform_align_ui_action = menu.addAction("Xform Align UI")
                        xform_align_ui_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                        )
                        def refresh_xform_align_menu_side():
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        menu.aboutToShow.connect(refresh_xform_align_menu_side)
                        button.setMenu(menu)
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                    create_xform_align_menu_side(btn)
                else:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
            
            if i == 5:
                self.nudge_keys_widget = NudgeKeysWidget()
                self.nudge_keys_widget.set_scaled_size(style.scaled)
                icon_layout.addWidget(self.nudge_keys_widget)
            icon_layout.addWidget(btn)
        
        # Dock mode button at the very bottom
        dock_btn = QtWidgets.QPushButton()
        dock_btn.setFixedSize(int(style.ICON_WIDTH * 1.01), int(style.ICON_HEIGHT * 1.01))
        dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
        dock_btn.setIconSize(QtCore.QSize(int(style.ICON_WIDTH * 1.01) - 2, int(style.ICON_HEIGHT * 1.01) - 2))
        dock_btn.setToolTip("Animo Settings")
        dock_btn.installEventFilter(_tooltip_filter)
        dock_btn.setFlat(True)
        dock_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
        """)
        
        # Layout: [small spacer] [stretch] [icons] [stretch] [dock]
        # Small top spacer to offset icons slightly higher than center
        top_spacer = QtWidgets.QWidget()
        top_spacer.setFixedHeight(8)
        layout.addWidget(top_spacer)
        layout.addStretch(2)
        layout.addWidget(icon_container, 0, QtCore.Qt.AlignCenter)
        layout.addStretch(3)  # Slightly larger bottom stretch pushes icons up a bit
        layout.addWidget(dock_btn, 0, QtCore.Qt.AlignCenter)
        
        # Create popup menu
        dock_menu = QtWidgets.QMenu(dock_btn)
        dock_menu.setStyleSheet(_animo_menu_qss(disabled=True))
        
        # Refresh menu items every time it's about to show
        def refresh_qt_menu():
            dock_menu.clear()
            _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
            _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
            dock_menu.addSeparator()
            def toggle_tooltips(checked):
                global _tooltip_manager
                _set_tooltip_pref(checked)
                if _tooltip_manager:
                    _tooltip_manager.set_enabled(checked)
                if checked:
                    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                else:
                    cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
            _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips)
            def toggle_overshoot_1(checked):
                slider_utils.set_overshoot_enabled(checked)
                _apply_overshoot_to_all_sliders(checked)
            _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_1)
            def toggle_center_pivot_1(checked):
                _toggle_center_pivot(checked)
            _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_1)
            _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())
            dock_menu.addSeparator()
            _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())

        dock_menu.aboutToShow.connect(refresh_qt_menu)
        dock_btn.setMenu(dock_menu)
        
        if insert_parent.__class__.__name__ == 'QSplitter':
            idx = insert_parent.indexOf(insert_widget)
            if insert_side == 'left':
                insert_parent.insertWidget(idx, self.qt_toolbar)
            else:
                insert_parent.insertWidget(idx + 1, self.qt_toolbar)
        else:
            parent_layout = insert_parent.layout()
            idx = parent_layout.indexOf(insert_widget)
            if idx >= 0:
                if insert_side == 'left':
                    parent_layout.insertWidget(idx, self.qt_toolbar)
                else:
                    parent_layout.insertWidget(idx + 1, self.qt_toolbar)
            else:
                parent_layout.addWidget(self.qt_toolbar)
        
        self.qt_toolbar.show()
    
    def _buildSideFallback(self, target):
        if target == 'channelbox':
            cmds.workspaceControl(WorkspaceName, l="", iw=style.TOOLBAR_WIDTH, mw=style.TOOLBAR_WIDTH,
                li=True, wp="fixed", floating=False, retain=False, collapse=False,
                dockToMainWindow=["right", True])
            try:
                CHAN_BOX = mel.eval('getUIComponentDockControl("Channel Box / Layer Editor", false)')
                if CHAN_BOX:
                    cmds.workspaceControl(WorkspaceName, edit=True, dtc=(CHAN_BOX, "left"))
            except:
                pass
        else:  # toolbox
            cmds.workspaceControl(WorkspaceName, l="", iw=style.TOOLBAR_WIDTH, mw=style.TOOLBAR_WIDTH,
                li=True, wp="fixed", floating=False, retain=False, collapse=False,
                dockToMainWindow=["left", True])
            try:
                cmds.workspaceControl(WorkspaceName, edit=True, dtc=("ToolBox", "right"))
            except:
                pass
        
        cmds.workspaceControl(WorkspaceName, edit=True, resizeWidth=style.TOOLBAR_WIDTH)
        self.buildUI(False)
        try:
            workspace_ptr = mui.MQtUtil.findControl(WorkspaceName)
            if workspace_ptr:
                workspace_widget = wrapInstance(int(workspace_ptr), QtWidgets.QWidget)
                workspace_widget.setFixedWidth(style.TOOLBAR_WIDTH)
        except:
            pass
        
        # Layout nudge - force refresh by temporarily resizing
        self._layoutNudge(target)
    
    def _layoutNudge(self, target):
        def do_nudge():
            try:
                # Nudge wider
                cmds.workspaceControl(WorkspaceName, edit=True, resizeWidth=style.TOOLBAR_WIDTH + 30)
            except:
                pass
        
        def revert_nudge():
            try:
                # Revert to original
                cmds.workspaceControl(WorkspaceName, edit=True, resizeWidth=style.TOOLBAR_WIDTH)
            except:
                pass
        
        # Schedule nudge and revert
        QtCore.QTimer.singleShot(100, do_nudge)
        QtCore.QTimer.singleShot(250, revert_nudge)
    
    def buildTimelineUI(self, position='top'):
        
        # Clean up existing Qt toolbar
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
            except:
                pass
        
        # Delete any existing workspaceControl
        if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        
        # Clean up old toolbar styles
        if cmds.toolBar("animo_timeline_toolbar", query=True, exists=True):
            cmds.deleteUI("animo_timeline_toolbar")
        if cmds.window("animo_toolbar_win", query=True, exists=True):
            cmds.deleteUI("animo_toolbar_win")
        
        # Get the playback slider via MEL - this is the actual timeline widget
        time_slider_widget = None
        try:
            time_slider_name = mel.eval('$tmpVar=$gPlayBackSlider')
            if time_slider_name:
                ptr = mui.MQtUtil.findControl(time_slider_name)
                if ptr:
                    time_slider_widget = wrapInstance(int(ptr), QtWidgets.QWidget)
        except:
            pass
        
        if not time_slider_widget:
            cmds.warning("Animo: Could not find TimeSlider")
            return
        
        # Walk up from timeline widget to find QSplitter parent
        splitter = None
        timeline_container = None
        
        current = time_slider_widget
        for level in range(15):
            parent = current.parent()
            if not parent:
                break
            
            if parent.__class__.__name__ == 'QSplitter':
                splitter = parent
                timeline_container = current
                break
            
            current = parent
        
        if not splitter or not timeline_container:
            cmds.warning("Animo: Could not find QSplitter parent")
            return
        
        # Get timeline container's index in splitter
        timeline_idx = splitter.indexOf(timeline_container)
        if timeline_idx < 0:
            cmds.warning("Animo: Could not find timeline index in splitter")
            return
        
        initial_height = style.TOOLBAR_HEIGHT
        if _get_show_all_sliders_pref():
            initial_height += style.scaled(28)
        
        self.qt_toolbar = QtWidgets.QWidget()
        self.qt_toolbar.setObjectName("animo_qt_toolbar")
        self.qt_toolbar.setFixedHeight(initial_height)
        self.qt_toolbar.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Fixed)
        self.qt_toolbar.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        self.qt_toolbar.customContextMenuRequested.connect(self._showToolbarContextMenu)
        
        bg_color = "rgb({}, {}, {})".format(
            int(style.TOOLBAR_BG_COLOR_LIGHT[0] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[1] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[2] * 255)
        )
        self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }} {}".format(bg_color, TOOLTIP_STYLE))
        
        self._buildTimelineToolbarContent(self.qt_toolbar)
        
        self._splitter = splitter
        actual_height = self._last_toolbar_height if self._last_toolbar_height else initial_height
        
        sizes_before = list(splitter.sizes())
        
        if position == 'bottom':
            insert_idx = timeline_idx + 1
            donor_idx = timeline_idx
        else:
            insert_idx = timeline_idx
            donor_idx = timeline_idx - 1 if timeline_idx > 0 else timeline_idx + 1
        
        splitter.insertWidget(insert_idx, self.qt_toolbar)
        
        sizes_after = list(sizes_before)
        sizes_after.insert(insert_idx, actual_height)
        donor_idx_after = donor_idx + 1 if donor_idx >= insert_idx else donor_idx
        if 0 <= donor_idx < len(sizes_before) and 0 <= donor_idx_after < len(sizes_after) and donor_idx_after != insert_idx:
            sizes_after[donor_idx_after] = max(0, sizes_before[donor_idx] - actual_height)
        splitter.setSizes(sizes_after)
        
        self.qt_toolbar.show()
        
        self._splitter_guard = _AnimoSplitterGuard(self, _animo_window_filter)
        splitter.installEventFilter(self._splitter_guard)
        self.qt_toolbar.installEventFilter(self._splitter_guard)
    
    def _buildTimelineToolbarContent(self, parent_widget):
        
        wrap_icons_enabled = _get_wrap_icons_pref()
        
        main_vbox = QtWidgets.QVBoxLayout(parent_widget)
        main_vbox.setContentsMargins(0, 0, 0, style.scaled(4))
        main_vbox.setSpacing(0)
        
        toolbar_row = QtWidgets.QWidget()
        toolbar_row.setStyleSheet("background: transparent;")
        layout = QtWidgets.QHBoxLayout(toolbar_row)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        all_sliders_row = create_all_sliders_container()
        
        main_vbox.addWidget(toolbar_row)
        main_vbox.addWidget(all_sliders_row)
        
        icon_container = QtWidgets.QWidget()
        icon_container.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        icon_layout = QtWidgets.QHBoxLayout(icon_container)
        icon_layout.setContentsMargins(0, 0, 0, 0)
        icon_layout.setSpacing(bar.ICON_SPACING_WITHIN_GROUP)
        icon_layout.setAlignment(QtCore.Qt.AlignVCenter)
        
        icon_groups = [
            [0, 1, 2],
            [5, 3, 4],
            [6, 7, 8, 9],
            [10, 11, 12],
        ]
        
        group_spacing = bar.GROUP_SPACING
        
        self._icon_buttons = []
        
        def create_icon_button(icon_data, icon_index=None):
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            offset = icon_data[6] if len(icon_data) > 6 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            icon_path = self.getImage(icon_file)
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(icon_path))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            
            btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
                QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                QPushButton::menu-indicator { width: 0; height: 0; }
            """)
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        btn.clicked.connect(
                            lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                else:
                    btn.setMenu(btn_menu)
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            else:
                if i == 17:
                    btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                    btn.setToolTip("Mirror Animation")
                    def tools_editor_wip():
                        _run_mirror_launcher()
                    btn.clicked.connect(tools_editor_wip)
                elif i == 4:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
                elif i == 7:
                    pass
                else:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
                # Add right-click context menu - skip for About icon
                if icon_file != "about_icon.png":
                    if i == 17:
                        create_mirror_context_menu(btn, icon_path)
                    elif launcher_name == "tracify_track_arcs":
                        def create_tracify_settings_menu(button):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss())
                                camera_space_action = QAction("Camera Space", menu)
                                camera_space_action.setCheckable(True)
                                camera_space_action.setChecked(_get_tracify_camera_space_pref())
                                camera_space_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                                )
                                menu.addAction(camera_space_action)
                                menu.addSeparator()
                                settings_action = menu.addAction("Tracify Settings")
                                settings_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_tracify_settings_menu(btn)
                    elif launcher_name == "xform_align_launcher":
                        def create_xform_align_menu(button):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            bake_only_keys_action = QAction("Bake Only Keys", menu)
                            bake_only_keys_action.setCheckable(True)
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            def _on_toggle_xform_bake_only_keys(checked):
                                cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                            bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                            menu.addAction(bake_only_keys_action)
                            menu.addSeparator()
                            copy_xform_action = menu.addAction("Copy XForm World")
                            copy_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                            )
                            copy_xform_range_action = menu.addAction("Copy XForm World Range")
                            copy_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            paste_xform_action = menu.addAction("Paste XForm World")
                            paste_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                            )
                            paste_xform_range_action = menu.addAction("Paste XForm World Range")
                            paste_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                            copy_xform_rel_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                            )
                            paste_relationship_action = menu.addAction("Paste Relationship")
                            paste_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                            )
                            paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                            paste_range_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            align_translate_action = menu.addAction("Align (Translate) World")
                            align_translate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                            )
                            align_rotate_action = menu.addAction("Align (Rotate) World")
                            align_rotate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                            )
                            align_action = menu.addAction("Align World")
                            align_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            xform_align_ui_action = menu.addAction("Xform Align UI")
                            xform_align_ui_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                            )
                            def refresh_xform_align_menu():
                                bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            menu.aboutToShow.connect(refresh_xform_align_menu)
                            button.setMenu(menu)
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                        create_xform_align_menu(btn)
                    elif launcher_name == "temp_pivot_launcher":
                        # Special context menu for temp_pivot with Reset Pivot option
                        def create_temp_pivot_menu(button, ip, tt, ln, tf, ef):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                                reset_action = menu.addAction("Reset Pivot")
                                reset_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "reset_pivot", "Animo_Temp_Pivot", None)
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_temp_pivot_menu(btn, icon_path, tooltip, launcher_name, tool_folder, entry_func)
                    elif i == 19:
                        def create_reset_pose_menu(button, ip, tt, ln, tf, ef):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                                reset_translate_action = menu.addAction("Reset Translate")
                                reset_translate_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "reset_translate", "Animo_Reset", None)
                                )
                                reset_rotate_action = menu.addAction("Reset Rotate")
                                reset_rotate_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "reset_rotate", "Animo_Reset", None)
                                )
                                reset_scale_action = menu.addAction("Reset Scale")
                                reset_scale_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "reset_scale", "Animo_Reset", None)
                                )
                                reset_transform_action = menu.addAction("Reset Tran + Rot + Scale")
                                reset_transform_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "reset_transform", "Animo_Reset", None)
                                )
                                menu.addSeparator()
                                reset_pose_action = menu.addAction(tt)
                                reset_pose_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_reset_pose_menu(btn, icon_path, tooltip, launcher_name, tool_folder, entry_func)
                    elif i == 3:
                        def create_tweenify_hotkey_menu(button, ip, tt, ln, tf, ef):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                                hotkey_action = menu.addAction("Assign Hotkey")
                                hotkey_action.triggered.connect(
                                    lambda: shelf.assign_hotkey_to_tool(ip, tt, ln, tf, ef)
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                    elif launcher_name == "animref_launcher" or i == 28:
                        def create_animref_menu(button, ip, tt, ln, tf, ef):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                                open_action = menu.addAction("Open Animation Reference")
                                open_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                                )
                                menu.addSeparator()
                                shelf_action = menu.addAction("Add to Maya Shelf")
                                shelf_action.triggered.connect(
                                    lambda: add_animref_to_shelf(ip)
                                )
                                hotkey_action = menu.addAction("Assign Hotkey")
                                hotkey_action.triggered.connect(
                                    lambda: shelf.assign_hotkey_to_tool(ip, tt, ln, tf, ef)
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_animref_menu(btn, icon_path, tooltip, launcher_name, tool_folder, entry_func)
                    else:
                        pass
            
            # Store icon index for edit mode dragging
            if icon_index is not None:
                btn._icon_index = icon_index
                btn.installEventFilter(self._draggable_filter)
                self._icon_buttons.append((btn, icon_index))
            
            # Register with tooltip manager
            if _tooltip_manager:
                # Use launcher_name if available, otherwise map by index
                tooltip_key = launcher_name
                if not tooltip_key and icon_index is not None:
                    # Fallback map for icons without launcher_name
                    tooltip_fallback_map = {
                        20: "fast_bake_launcher",  # Fast Bake
                    }
                    tooltip_key = tooltip_fallback_map.get(icon_index)
                if tooltip_key:
                    _tooltip_manager.register_button(btn, tooltip_key, icon_path)
            
            return btn
        
        self.nudge_keys_widget = NudgeKeysWidget()
        self.nudge_keys_widget.set_scaled_size(style.scaled)
        
        for group_idx, group in enumerate(icon_groups):
            if group_idx == 1:
                icon_layout.addWidget(self.nudge_keys_widget)
                icon_layout.addSpacing(group_spacing)
            
            # Special handling for global_offset/twosify/vectorify group (index 3) - tighter spacing
            if group_idx == 3:
                sub_container = QtWidgets.QWidget()
                sub_layout = QtWidgets.QHBoxLayout(sub_container)
                sub_layout.setContentsMargins(0, 0, 0, 0)
                sub_layout.setSpacing(0)
                for i in group:
                    if i < len(bar.ICON_DATA):
                        icon_data = bar.ICON_DATA[i]
                        icon_file = icon_data[0]
                        tooltip = icon_data[1]
                        launcher_name = icon_data[2]
                        tool_folder = icon_data[3]
                        entry_func = icon_data[4]
                        custom_size = icon_data[5] if len(icon_data) > 5 else None
                        menu_options = icon_data[7] if len(icon_data) > 7 else None
                        
                        icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
                        icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
                        icon_path = self.getImage(icon_file)
                        
                        btn = QtWidgets.QPushButton()
                        btn.setFixedSize(icon_w + 2, icon_h + 2)  # Reduced padding from +6 to +2
                        btn.setIcon(QtGui.QIcon(icon_path))
                        btn.setIconSize(QtCore.QSize(icon_w, icon_h))
                        btn.setToolTip(tooltip)
                        btn.installEventFilter(_tooltip_filter)
                        btn.setFlat(True)
                        
                        btn.setStyleSheet("""
                            QPushButton { border: none; background: transparent; }
                            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                            QPushButton::menu-indicator { width: 0; height: 0; }
                        """)
                        if menu_options:
                            group_menu = QtWidgets.QMenu(btn)
                            group_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                            for menu_item in menu_options:
                                option_name = menu_item[0]
                                if option_name == "---":
                                    group_menu.addSeparator()
                                    continue
                                option_launcher = menu_item[1]
                                option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                                action = group_menu.addAction(option_name)
                                action.triggered.connect(
                                    lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                                    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                                )
                            btn.setMenu(group_menu)
                            btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            btn.customContextMenuRequested.connect(lambda pos, gbtn=btn, gmenu=group_menu: gmenu.exec_(gbtn.mapToGlobal(pos)))
                        elif i == 10:
                            btn.clicked.connect(
                                lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func, gbtn=btn:
                                _handle_global_offset_click(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef, gbtn)
                            )
                        else:
                            btn.clicked.connect(
                                lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                            )
                        
                        # Store icon index for edit mode dragging
                        btn._icon_index = i
                        btn.installEventFilter(self._draggable_filter)
                        self._icon_buttons.append((btn, i))
                        
                        # Register with tooltip manager
                        if _tooltip_manager and launcher_name:
                            _tooltip_manager.register_button(btn, launcher_name, icon_path)
                        
                        sub_layout.addWidget(btn)
                icon_layout.addWidget(sub_container)
            else:
                for idx_in_group, i in enumerate(group):
                    if i < len(bar.ICON_DATA):
                        btn = create_icon_button(bar.ICON_DATA[i], i)
                        icon_layout.addWidget(btn)
            
            # Add spacing after each group except the last
            if group_idx < len(icon_groups) - 1:
                icon_layout.addSpacing(group_spacing)
        
        # Set fixed size on icon_container after all icons are added (like sliders use setFixedWidth)
        icon_container.adjustSize()
        icon_container.setFixedSize(icon_container.sizeHint())
        
        # Create tangent icon buttons container (indices 13, 14, 15)
        tangent_indices = [13, 14, 15]
        tangent_container = QtWidgets.QWidget()
        tangent_container.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        tangent_layout = QtWidgets.QHBoxLayout(tangent_container)
        tangent_layout.setContentsMargins(4, 0, 0, 0)  # Left margin to prevent icon clipping
        tangent_layout.setSpacing(0)
        
        # Map tangent indices to global script names
        tangent_global_scripts = {
            13: "auto_tangent_global",
            14: "linear_tangent_global",
            15: "step_tangent_global"
        }
        
        # Map tangent indices to launcher names for "Selected" and "All Keys" options
        tangent_launcher_map = {
            13: {"selected": "auto_current_launcher", "all": "auto_all_launcher"},
            14: {"selected": "linear_current_launcher", "all": "linear_all_launcher"},
            15: {"selected": "step_current_launcher", "all": "step_all_launcher"}
        }
        
        for i in tangent_indices:
            icon_data = bar.ICON_DATA[i]
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            # Get full icon path for shelf
            tangent_icon_path = self.getImage(icon_file)
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(tangent_icon_path))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            
            btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
                QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                QPushButton::menu-indicator { width: 0; height: 0; }
            """)
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    elif option_name == "Selected":
                        continue
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                
                # Add "Apply Maya Global Tangents" option after Selected
                if i in tangent_global_scripts:
                    global_script = tangent_global_scripts[i]
                    btn_menu.addSeparator()
                    global_action = btn_menu.addAction("Apply Maya Global Tangents")
                    global_action.triggered.connect(
                        lambda checked=False, gs=global_script:
                        run_global_tangent(gs)
                    )
                
                # Store menu reference on button for modifier click handling
                btn._tangent_menu = btn_menu
                btn._tangent_index = i
                btn._tangent_launchers = tangent_launcher_map.get(i, {})
                
                def tangent_click_handler(checked=False, button=btn):
                    mods = cmds.getModifiers()
                    idx = button._tangent_index
                    launchers = button._tangent_launchers
                    if mods == 13:
                        if "all" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["all"], None, None)
                    else:
                        if "selected" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["selected"], None, None)
                
                btn.clicked.connect(tangent_click_handler)
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            
            # Store icon index for edit mode dragging
            btn._icon_index = i
            btn.installEventFilter(self._draggable_filter)
            self._icon_buttons.append((btn, i))
            
            # Register with tooltip manager - use icon file name to derive tooltip key
            if _tooltip_manager:
                # Map tangent icon indices to tooltip keys
                tangent_tooltip_map = {
                    13: "auto_tangent",
                    14: "linear_tangent", 
                    15: "step_tangent"
                }
                tooltip_key = tangent_tooltip_map.get(i)
                if tooltip_key:
                    _tooltip_manager.register_button(btn, tooltip_key, tangent_icon_path)
            
            tangent_layout.addWidget(btn)
        tangent_container.adjustSize()
        tangent_container.setFixedSize(tangent_container.sizeHint())
        
        # Create tools icons container (tools_editor, quick_exporter, playblaster, animref) - indices 17, 16, 23, 28
        tools_indices = [17, 16, 23, 28]
        tools_container = QtWidgets.QWidget()
        tools_container.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        tools_layout = QtWidgets.QHBoxLayout(tools_container)
        tools_layout.setContentsMargins(0, 0, 0, 0)
        tools_layout.setSpacing(0)
        for i in tools_indices:
            if i < len(bar.ICON_DATA):
                btn = create_icon_button(bar.ICON_DATA[i], i)
                tools_layout.addWidget(btn)
        tools_container.adjustSize()
        tools_container.setFixedSize(tools_container.sizeHint())
        
        # Create left slider icons container (reset, bake, share_keys)
        left_slider_indices = [19, 20, 21]
        left_slider_container = QtWidgets.QWidget()
        left_slider_container.setSizePolicy(QtWidgets.QSizePolicy.Fixed, QtWidgets.QSizePolicy.Fixed)
        left_slider_layout = QtWidgets.QHBoxLayout(left_slider_container)
        left_slider_layout.setContentsMargins(0, 0, 0, 0)
        left_slider_layout.setSpacing(bar.LEFT_SLIDER_SPACING)
        for i in left_slider_indices:
            if i < len(bar.ICON_DATA):
                btn = create_icon_button(bar.ICON_DATA[i], i)
                left_slider_layout.addWidget(btn)
        left_slider_container.adjustSize()
        left_slider_container.setFixedSize(left_slider_container.sizeHint())
        
        # Create sliders
        tween_slider = AnimoSlider("TW", (225, 175, 45), "tween")
        tween_slider.setMinimum(-100)
        tween_slider.setMaximum(100)
        tween_slider.setValue(0)
        tween_slider.setFixedWidth(style.scaled(200))
        
        blend_slider = AnimoSlider("BN", (220, 140, 60), "blend")
        blend_slider.setMinimum(-100)
        blend_slider.setMaximum(100)
        blend_slider.setValue(0)
        blend_slider.setFixedWidth(style.scaled(200))
        
        scale_slider = AnimoSlider("SL", (100, 180, 220), "scale")
        scale_slider.setMinimum(-100)
        scale_slider.setMaximum(100)
        scale_slider.setValue(0)
        scale_slider.setFixedWidth(style.scaled(200))
        
        cascade_slider = AnimoSlider("BW", (180, 120, 200), "cascade")
        cascade_slider.setMinimum(0)
        cascade_slider.setMaximum(200)
        cascade_slider.setValue(100)
        cascade_slider.setFixedWidth(style.scaled(200))
        
        # Register sliders with tooltip manager (1 second delay)
        if _tooltip_manager:
            _tooltip_manager.register_button(tween_slider, "tween_slider", None, hover_delay=1000)
            _tooltip_manager.register_button(blend_slider, "blend_slider", None, hover_delay=1000)
            _tooltip_manager.register_button(scale_slider, "scale_slider", None, hover_delay=1000)
            _tooltip_manager.register_button(cascade_slider, "cascade_slider", None, hover_delay=1000)
        
        # SmoothSelectedKeys button (index 26 in ICON_DATA)
        smooth_data = bar.ICON_DATA[26]
        smooth_icon_file = smooth_data[0]
        smooth_tooltip = smooth_data[1]
        smooth_launcher = smooth_data[2]
        smooth_tool_folder = smooth_data[3]
        smooth_size = smooth_data[5] if len(smooth_data) > 5 and smooth_data[5] else None
        
        smooth_w = int((style.scaled(smooth_size[0]) if smooth_size else style.ICON_WIDTH) * 0.99)
        smooth_h = int((style.scaled(smooth_size[1]) if smooth_size else style.ICON_HEIGHT) * 0.99)
        
        smooth_icon_path = os.path.normpath(os.path.join(ANIMO_DATA_PATH, smooth_tool_folder, smooth_icon_file))
        
        smooth_btn = QtWidgets.QPushButton()
        smooth_btn.setFixedSize(smooth_w + 2, smooth_h + 2)
        smooth_btn.setIcon(QtGui.QIcon(smooth_icon_path))
        smooth_btn.setIconSize(QtCore.QSize(smooth_w, smooth_h))
        smooth_btn.setToolTip(smooth_tooltip)
        smooth_btn.installEventFilter(_tooltip_filter)
        smooth_btn.setFlat(True)
        smooth_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
        """)
        smooth_btn.clicked.connect(run_smooth_keys_plugin)
        
        smooth_btn._icon_index = 25
        smooth_btn.installEventFilter(self._draggable_filter)
        self._icon_buttons.append((smooth_btn, 25))
        
        # Register with tooltip manager
        if _tooltip_manager:
            _tooltip_manager.register_button(smooth_btn, "SmoothSelectedKeys", smooth_icon_path)
        
        # SmartSnapKeys button (index 27 in ICON_DATA)
        snap_data = bar.ICON_DATA[27]
        snap_icon_file = snap_data[0]
        snap_tooltip = snap_data[1]
        snap_launcher = snap_data[2]
        snap_tool_folder = snap_data[3]
        snap_size = snap_data[5] if len(snap_data) > 5 and snap_data[5] else None
        
        snap_w = int((style.scaled(snap_size[0]) if snap_size else style.ICON_WIDTH) * 0.99)
        snap_h = int((style.scaled(snap_size[1]) if snap_size else style.ICON_HEIGHT) * 0.99)
        
        snap_icon_path = os.path.normpath(os.path.join(ANIMO_DATA_PATH, snap_tool_folder, snap_icon_file))
        
        snap_btn = QtWidgets.QPushButton()
        snap_btn.setFixedSize(snap_w + 2, snap_h + 2)
        snap_btn.setIcon(QtGui.QIcon(snap_icon_path))
        snap_btn.setIconSize(QtCore.QSize(snap_w, snap_h))
        snap_btn.setToolTip(snap_tooltip)
        snap_btn.installEventFilter(_tooltip_filter)
        snap_btn.setFlat(True)
        snap_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
        """)
        snap_btn.clicked.connect(
            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, snap_launcher, snap_tool_folder, None)
        )
        
        snap_btn._icon_index = 26
        snap_btn.installEventFilter(self._draggable_filter)
        self._icon_buttons.append((snap_btn, 26))
        
        # Register with tooltip manager
        if _tooltip_manager:
            _tooltip_manager.register_button(snap_btn, "SmartSnapKeys", snap_icon_path)
        
        # CropAnimation button (index 24 in ICON_DATA)
        crop_data = bar.ICON_DATA[24]
        crop_icon_file = crop_data[0]
        crop_tooltip = crop_data[1]
        crop_launcher = crop_data[2]
        crop_tool_folder = crop_data[3]
        crop_size = crop_data[5] if len(crop_data) > 5 and crop_data[5] else None
        
        crop_w = int((style.scaled(crop_size[0]) if crop_size else style.ICON_WIDTH) * 0.99)
        crop_h = int((style.scaled(crop_size[1]) if crop_size else style.ICON_HEIGHT) * 0.99)
        
        # Icon is in tool folder, not icons folder
        crop_icon_path = os.path.normpath(os.path.join(ANIMO_DATA_PATH, crop_tool_folder, crop_icon_file))
        
        crop_btn = QtWidgets.QPushButton()
        crop_btn.setFixedSize(crop_w + 2, crop_h + 2)
        crop_btn.setIcon(QtGui.QIcon(crop_icon_path))
        crop_btn.setIconSize(QtCore.QSize(crop_w, crop_h))
        crop_btn.setToolTip(crop_tooltip)
        crop_btn.installEventFilter(_tooltip_filter)
        crop_btn.setFlat(True)
        crop_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
        """)
        crop_btn.clicked.connect(
            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, crop_launcher, crop_tool_folder, None)
        )
        
        # Store icon index for edit mode dragging
        crop_btn._icon_index = 23
        crop_btn.installEventFilter(self._draggable_filter)
        self._icon_buttons.append((crop_btn, 23))
        
        # Register with tooltip manager
        if _tooltip_manager:
            _tooltip_manager.register_button(crop_btn, "CropAnimation", crop_icon_path)
        
        # DeleteRedundantKeys button (index 25 in ICON_DATA)
        delkeys_data = bar.ICON_DATA[25]
        delkeys_icon_file = delkeys_data[0]
        delkeys_tooltip = delkeys_data[1]
        delkeys_launcher = delkeys_data[2]
        delkeys_tool_folder = delkeys_data[3]
        delkeys_size = delkeys_data[5] if len(delkeys_data) > 5 and delkeys_data[5] else None
        
        delkeys_w = int((style.scaled(delkeys_size[0]) if delkeys_size else style.ICON_WIDTH) * 0.99)
        delkeys_h = int((style.scaled(delkeys_size[1]) if delkeys_size else style.ICON_HEIGHT) * 0.99)
        
        # Icon is in tool folder, not icons folder
        delkeys_icon_path = os.path.normpath(os.path.join(ANIMO_DATA_PATH, delkeys_tool_folder, delkeys_icon_file))
        
        delkeys_btn = QtWidgets.QPushButton()
        delkeys_btn.setFixedSize(delkeys_w + 2, delkeys_h + 2)
        delkeys_btn.setIcon(QtGui.QIcon(delkeys_icon_path))
        delkeys_btn.setIconSize(QtCore.QSize(delkeys_w, delkeys_h))
        delkeys_btn.setToolTip(delkeys_tooltip)
        delkeys_btn.installEventFilter(_tooltip_filter)
        delkeys_btn.setFlat(True)
        delkeys_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
        """)
        delkeys_btn.clicked.connect(
            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, delkeys_launcher, delkeys_tool_folder, None)
        )
        
        # Store icon index for edit mode dragging
        delkeys_btn._icon_index = 24
        delkeys_btn.installEventFilter(self._draggable_filter)
        self._icon_buttons.append((delkeys_btn, 24))
        
        # Register with tooltip manager
        if _tooltip_manager:
            _tooltip_manager.register_button(delkeys_btn, "DeleteRedundantKeys", delkeys_icon_path)
        
        # Select Opposite button - next to dock
        about_small_size = int(style.scaled(22) * 0.99)
        about_tool_folder = "Animo_Tools_Editor/animo_tools/tools"
        
        about_btn = QtWidgets.QPushButton()
        about_btn.setFixedSize(about_small_size + 2, about_small_size + 2)
        about_icon_path = os.path.normpath(os.path.join(ANIMO_DATA_PATH, about_tool_folder, "SelectOpposite.png"))
        about_btn.setIcon(QtGui.QIcon(about_icon_path))
        about_btn.setIconSize(QtCore.QSize(about_small_size, about_small_size))
        about_btn.setToolTip("Select Opposite")
        about_btn.installEventFilter(_tooltip_filter)
        about_btn.setFlat(True)
        about_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
            QPushButton::menu-indicator { width: 0; height: 0; }
        """)
        about_menu = QtWidgets.QMenu(about_btn)
        about_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
        about_add_action = about_menu.addAction("Add Opposite Ctrls")
        about_add_action.triggered.connect(
            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "SelectAddOppositeCtrls", about_tool_folder, None)
        )
        about_select_action = about_menu.addAction("Select Opposite Ctrls")
        about_select_action.triggered.connect(
            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "SelectOppositeCtrls", about_tool_folder, None)
        )
        about_btn.setMenu(about_menu)
        about_btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        about_btn.customContextMenuRequested.connect(lambda pos: about_menu.exec_(about_btn.mapToGlobal(pos)))
        
        # Store icon index for edit mode dragging
        about_btn._icon_index = 17
        about_btn.installEventFilter(self._draggable_filter)
        self._icon_buttons.append((about_btn, 17))
        
        # Register with tooltip manager
        if _tooltip_manager:
            _tooltip_manager.register_button(about_btn, "SelectOppositeCtrls", about_icon_path)
        
        # Dock mode button - smaller size
        dock_btn = QtWidgets.QPushButton()
        dock_small_size = style.scaled(23)
        dock_btn.setFixedSize(int((dock_small_size + 2) * 1.01), int((dock_small_size + 2) * 1.01))
        dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
        dock_btn.setIconSize(QtCore.QSize(int(dock_small_size * 1.01), int(dock_small_size * 1.01)))
        dock_btn.setToolTip("Animo Settings")
        dock_btn.installEventFilter(_tooltip_filter)
        dock_btn.setFlat(True)
        dock_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
            QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
            QPushButton::menu-indicator { width: 0; height: 0; }
        """)
        
        dock_menu = QtWidgets.QMenu(dock_btn)
        dock_menu.setStyleSheet(_animo_menu_qss())
        _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
        _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
        dock_menu.addSeparator()
        
        def toggle_tooltips_h(checked):
            global _tooltip_manager
            _set_tooltip_pref(checked)
            if _tooltip_manager:
                _tooltip_manager.set_enabled(checked)
            if checked:
                cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
            else:
                cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
        tooltip_widget_h = _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips_h)
        def toggle_overshoot_2(checked):
            slider_utils.set_overshoot_enabled(checked)
            _apply_overshoot_to_all_sliders(checked)
        overshoot_widget_h = _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_2)
        def toggle_center_pivot_h(checked):
            _toggle_center_pivot(checked)
        center_pivot_widget_h = _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_h)
        _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())

        dock_menu.addSeparator()
        _add_centered_menu_item(dock_menu, "Animo Size Settings...", callback=lambda checked: _show_size_settings())
        _add_centered_menu_item(dock_menu, "Tools Editor and Hotkeys", callback=lambda checked: _run_tools_editor_launcher())
        _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())
        
        def sync_dock_menu_checks_h():
            tooltip_widget_h.setChecked(_get_tooltip_pref())
            overshoot_widget_h.setChecked(slider_utils.is_overshoot_enabled())
            center_pivot_widget_h.setChecked(_is_center_pivot_active())
        dock_menu.aboutToShow.connect(sync_dock_menu_checks_h)
        
        dock_btn.setMenu(dock_menu)
        dock_btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
        dock_btn.customContextMenuRequested.connect(lambda pos: dock_menu.exec_(dock_btn.mapToGlobal(pos)))
        
        TOOLBAR_CONTENT_WIDTH = style.scaled(bar.TOOLBAR_CONTENT_WIDTH)
        
        # Check if wrap icons mode is enabled
        wrap_icons_enabled = _get_wrap_icons_pref()
        
        # Create master container
        master_container = QtWidgets.QWidget()
        
        if wrap_icons_enabled:
            # Wrap mode: allow container to expand both ways and wrap content
            # Use Ignored for horizontal so it fills available space regardless of content
            master_container.setSizePolicy(QtWidgets.QSizePolicy.Ignored, QtWidgets.QSizePolicy.MinimumExpanding)
            master_layout = FlowLayout(master_container, margin=4, h_spacing=6, v_spacing=4)
        else:
            # Fixed width with horizontal layout (default behavior)
            master_container.setFixedWidth(TOOLBAR_CONTENT_WIDTH)
            master_layout = QtWidgets.QHBoxLayout(master_container)
            master_layout.setContentsMargins(0, 0, 0, 0)
            master_layout.setSpacing(0)
        
        if wrap_icons_enabled:
            # With FlowLayout, add widgets directly (they will wrap)
            master_layout.addWidget(left_slider_container)
            master_layout.addWidget(tween_slider)
            master_layout.addWidget(blend_slider)
            master_layout.addWidget(tangent_container)
            master_layout.addWidget(icon_container)
            master_layout.addWidget(scale_slider)
            master_layout.addWidget(cascade_slider)
            master_layout.addWidget(tools_container)
            master_layout.addWidget(smooth_btn)
            master_layout.addWidget(snap_btn)
            master_layout.addWidget(crop_btn)
            master_layout.addWidget(delkeys_btn)
            master_layout.addWidget(about_btn)
            master_layout.addWidget(dock_btn)
        else:
            # Add all widgets to master container with spacing
            master_layout.addWidget(left_slider_container, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_LEFT_SLIDER_TO_TWEEN)
            master_layout.addWidget(tween_slider, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_TWEEN_TO_BLEND)
            master_layout.addWidget(blend_slider, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_BLEND_TO_TANGENT)
            master_layout.addWidget(tangent_container, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_TANGENT_TO_ICONS)
            master_layout.addWidget(icon_container, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_ICONS_TO_SCALE)
            master_layout.addWidget(scale_slider, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_SCALE_TO_CASCADE)
            master_layout.addWidget(cascade_slider, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_CASCADE_TO_COUNTER)
            master_layout.addWidget(tools_container, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_CASCADE_TO_COUNTER)
            master_layout.addWidget(smooth_btn, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_WHITE_ICONS)
            master_layout.addWidget(snap_btn, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_WHITE_ICONS)
            master_layout.addWidget(crop_btn, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_WHITE_ICONS)
            master_layout.addWidget(delkeys_btn, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(bar.SPACING_DELKEYS_TO_DOCK)
            master_layout.addWidget(about_btn, 0, QtCore.Qt.AlignVCenter)
            master_layout.addSpacing(8)
            master_layout.addWidget(dock_btn, 0, QtCore.Qt.AlignVCenter)
        
        # Create left arrow button (hidden by default)
        left_arrow = QtWidgets.QPushButton("<")
        left_arrow.setFixedSize(20, style.TOOLBAR_HEIGHT - 4)
        left_arrow.setStyleSheet("""
            QPushButton {
                background: rgba(45, 45, 45, 230);
                color: #bbb;
                border: none;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:pressed {
                background: rgba(80, 80, 80, 250);
            }
        """)
        left_arrow.hide()
        
        # Create right arrow button (hidden by default)
        right_arrow = QtWidgets.QPushButton(">")
        right_arrow.setFixedSize(20, style.TOOLBAR_HEIGHT - 4)
        right_arrow.setStyleSheet("""
            QPushButton {
                background: rgba(45, 45, 45, 230);
                color: #bbb;
                border: none;
                font-weight: bold;
                font-size: 14px;
            }
            QPushButton:pressed {
                background: rgba(80, 80, 80, 250);
            }
        """)
        right_arrow.hide()
        
        # Store scroll state
        self._scroll_offset = 0
        self._content_width = TOOLBAR_CONTENT_WIDTH
        self._master_container = master_container
        self._left_arrow = left_arrow
        self._right_arrow = right_arrow
        self._wrap_icons_enabled = wrap_icons_enabled
        
        # Connect arrow buttons
        left_arrow.clicked.connect(lambda: self._scrollToolbar(-200))
        right_arrow.clicked.connect(lambda: self._scrollToolbar(200))
        
        if wrap_icons_enabled:
            # Wrap mode: no scroll area needed, add master container directly
            # and hide the arrows permanently
            left_arrow.hide()
            right_arrow.hide()
            left_arrow.setVisible(False)
            right_arrow.setVisible(False)
            
            # Add master container with stretch to fill available width
            # FlowLayout inside handles centering of content
            layout.addWidget(master_container, 1)  # stretch=1 to expand
            
            self._clip_container = None
            
        else:
            # Normal mode: use scroll area as clip container
            clip_container = QtWidgets.QScrollArea()
            clip_container.setWidgetResizable(False)
            clip_container.setHorizontalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
            clip_container.setVerticalScrollBarPolicy(QtCore.Qt.ScrollBarAlwaysOff)
            clip_container.setFrameShape(QtWidgets.QFrame.NoFrame)
            clip_container.setStyleSheet("QScrollArea { background: transparent; border: none; }")
            clip_container.viewport().setStyleSheet("background: transparent;")
            clip_container.setSizePolicy(QtWidgets.QSizePolicy.Expanding, QtWidgets.QSizePolicy.Expanding)
            clip_container.setAlignment(QtCore.Qt.AlignCenter)  # Center content when it fits
            
            # Put master_container inside clip_container
            clip_container.setWidget(master_container)
            
            self._clip_container = clip_container
            
            # Add to main layout with arrows on edges
            layout.addWidget(left_arrow, 0, QtCore.Qt.AlignVCenter)
            layout.addWidget(clip_container, 1)  # Takes available space
            layout.addWidget(right_arrow, 0, QtCore.Qt.AlignVCenter)
        
        # Create event filter for resize events
        class ResizeFilter(QtCore.QObject):
            def __init__(self, callback, parent=None):
                super(ResizeFilter, self).__init__(parent)
                self._callback = callback
            
            def eventFilter(self, obj, event):
                if event.type() == QtCore.QEvent.Resize:
                    self._callback()
                return False
        
        def update_toolbar_height():
            try:
                if not self.qt_toolbar:
                    return
                
                icon_height = style.TOOLBAR_HEIGHT
                if wrap_icons_enabled and self._master_container:
                    container_width = self._master_container.width()
                    if container_width <= 0:
                        container_width = toolbar_row.width()
                    if container_width > 0:
                        master_layout = self._master_container.layout()
                        if master_layout and hasattr(master_layout, 'heightForWidth'):
                            required_icon_height = master_layout.heightForWidth(container_width)
                            if required_icon_height > 0:
                                icon_height = max(style.TOOLBAR_HEIGHT, required_icon_height + 2)
                    master_layout = self._master_container.layout()
                    if master_layout:
                        master_layout.invalidate()
                    self._master_container.updateGeometry()
                    self._master_container.update()
                
                slider_height = 0
                if _show_all_sliders_container and _show_all_sliders_container.isVisible():
                    slider_height = _get_all_sliders_row_height(all_sliders_row)
                    if all_sliders_row.minimumHeight() != slider_height:
                        all_sliders_row.setMinimumHeight(slider_height)
                        all_sliders_row.setMaximumHeight(slider_height)
                    slider_height += style.scaled(8)
                
                new_height = icon_height + slider_height
                old_height = self._last_toolbar_height
                if new_height != old_height:
                    self._last_toolbar_height = new_height
                    self.qt_toolbar.setFixedHeight(new_height)
                    try:
                        if self._splitter and self.qt_toolbar:
                            toolbar_idx = self._splitter.indexOf(self.qt_toolbar)
                            if toolbar_idx >= 0:
                                sizes = self._splitter.sizes()
                                diff = sizes[toolbar_idx] - new_height
                                if diff != 0 and toolbar_idx > 0:
                                    sizes[toolbar_idx - 1] += diff
                                    sizes[toolbar_idx] = new_height
                                    self._splitter.setSizes(sizes)
                    except (RuntimeError, ReferenceError):
                        pass
            except (RuntimeError, ReferenceError):
                pass
        
        if wrap_icons_enabled:
            self._wrap_resize_filter = ResizeFilter(update_toolbar_height, toolbar_row)
            toolbar_row.installEventFilter(self._wrap_resize_filter)
            
            self._master_resize_filter = ResizeFilter(update_toolbar_height, master_container)
            master_container.installEventFilter(self._master_resize_filter)
            
            self._toolbar_resize_filter = ResizeFilter(update_toolbar_height, self.qt_toolbar)
            self.qt_toolbar.installEventFilter(self._toolbar_resize_filter)
        else:
            self._resize_filter = ResizeFilter(self._updateScrollArrows, toolbar_row)
            toolbar_row.installEventFilter(self._resize_filter)
            
            self._clip_resize_filter = ResizeFilter(self._onClipResize, clip_container)
            clip_container.installEventFilter(self._clip_resize_filter)
            
            self._toolbar_resize_filter = ResizeFilter(update_toolbar_height, toolbar_row)
            toolbar_row.installEventFilter(self._toolbar_resize_filter)
        
        self._all_sliders_resize_filter = ResizeFilter(update_toolbar_height, all_sliders_row)
        all_sliders_row.installEventFilter(self._all_sliders_resize_filter)
        
        # Real widths aren't available yet (widget isn't inserted into the
        # splitter or shown until after this function returns), so measuring
        # now would compute wrapping based on a stale/zero width and leave
        # the toolbar too tall until a manual resize corrects it. Defer the
        # height correction until after layout settles.
        QtCore.QTimer.singleShot(0, update_toolbar_height)
        QtCore.QTimer.singleShot(75, update_toolbar_height)
        
        # Apply saved icon offsets after layout is complete
        self._applySavedOffsets()
    
    def _onClipResize(self):
        if not self._master_container:
            return
        
        # In wrap mode, no clip container to handle
        if hasattr(self, '_wrap_icons_enabled') and self._wrap_icons_enabled:
            return
            
        if not self._clip_container:
            return
        
        clip_width = self._clip_container.viewport().width()
        content_width = self._content_width
        
        # Update master container height to match viewport
        self._master_container.setFixedHeight(self._clip_container.viewport().height())
        
        if content_width <= clip_width:
            # Content fits - reset scroll
            self._scroll_offset = 0
            self._clip_container.horizontalScrollBar().setValue(0)
        else:
            # Content doesn't fit - clamp scroll offset to valid range
            max_offset = content_width - clip_width
            if self._scroll_offset > max_offset:
                self._scroll_offset = max_offset
                self._applyScrollOffset()
        
        self._updateScrollArrows()
    
    def _updateScrollArrows(self):
        # In wrap mode, arrows are not used
        if hasattr(self, '_wrap_icons_enabled') and self._wrap_icons_enabled:
            return
            
        if not self._master_container or not self._left_arrow or not self._right_arrow:
            return
        
        if not hasattr(self, '_clip_container') or not self._clip_container:
            return
        
        clip_width = self._clip_container.viewport().width()
        content_width = self._content_width
        
        if content_width > clip_width:
            # Content is clipped, show appropriate arrows
            max_offset = content_width - clip_width
            self._left_arrow.setVisible(self._scroll_offset > 0)
            self._right_arrow.setVisible(self._scroll_offset < max_offset)
        else:
            # Content fits, hide arrows and reset offset
            self._left_arrow.hide()
            self._right_arrow.hide()
            if self._scroll_offset != 0:
                self._scroll_offset = 0
                self._applyScrollOffset()
    
    def _scrollToolbar(self, delta):
        if not self._master_container or not hasattr(self, '_clip_container') or not self._clip_container:
            return
        
        clip_width = self._clip_container.viewport().width()
        content_width = self._content_width
        max_offset = max(0, content_width - clip_width)
        
        self._scroll_offset = max(0, min(max_offset, self._scroll_offset + delta))
        self._applyScrollOffset()
        self._updateScrollArrows()
    
    def _applyScrollOffset(self):
        if not hasattr(self, '_clip_container') or not self._clip_container:
            return
        
        # Use the QScrollArea's horizontal scrollbar
        self._clip_container.horizontalScrollBar().setValue(self._scroll_offset)

    def _restoreTimelineArea(self):
        # Clean up the new toolbar style
        if cmds.toolBar("animo_timeline_toolbar", query=True, exists=True):
            try:
                cmds.deleteUI("animo_timeline_toolbar")
            except:
                pass
        
        if cmds.window("animo_toolbar_win", query=True, exists=True):
            try:
                cmds.deleteUI("animo_toolbar_win")
            except:
                pass
    
    def buildShelfUI(self):
        # Clean up existing
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
            except:
                pass
        
        if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        
        try:
            # Find the shelf widget
            shelf_layout = mel.eval('$tmpVar=$gShelfTopLevel')
            ptr = mui.MQtUtil.findControl(shelf_layout)
            if not ptr:
                cmds.warning("Animo: Could not find shelf widget")
                return
            shelf_widget = wrapInstance(int(ptr), QtWidgets.QWidget)
            
            # Get the shelf's parent
            target_parent = shelf_widget.parent()
            if not target_parent:
                cmds.warning("Animo: Could not find shelf parent")
                return
            
            # Build the toolbar widget - use lighter color for shelf mode
            bg_color = "rgb({}, {}, {})".format(
                int(style.TOOLBAR_BG_COLOR_LIGHTER[0] * 255),
                int(style.TOOLBAR_BG_COLOR_LIGHTER[1] * 255),
                int(style.TOOLBAR_BG_COLOR_LIGHTER[2] * 255)
            )
            
            self.qt_toolbar = QtWidgets.QWidget()
            self.qt_toolbar.setObjectName("animo_qt_toolbar")
            self.qt_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
            self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }} {}".format(bg_color, TOOLTIP_STYLE))
            
            # Create horizontal layout
            layout = QtWidgets.QHBoxLayout(self.qt_toolbar)
            layout.setContentsMargins(8, 0, 8, 0)
            layout.setSpacing(0)
            
            # Create icon container
            icon_container = QtWidgets.QWidget()
            icon_layout = QtWidgets.QHBoxLayout(icon_container)
            icon_layout.setContentsMargins(0, 0, 0, 0)
            icon_layout.setSpacing(style.ICON_SPACING + 4)
            icon_layout.setAlignment(QtCore.Qt.AlignVCenter)
            
            # Tangent icon indices to skip from main loop
            tangent_indices = [13, 14, 15]
            
            self.nudge_keys_widget = NudgeKeysWidget()
            self.nudge_keys_widget.set_scaled_size(style.scaled)
            
            # Add tool icons (skip tangent icons)
            for i, icon_data in enumerate(bar.ICON_DATA):
                if i in tangent_indices:
                    continue
                
                if i == 5:
                    icon_layout.addWidget(self.nudge_keys_widget)
                    
                icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
                custom_size = icon_data[5] if len(icon_data) > 5 else None
                offset = icon_data[6] if len(icon_data) > 6 else None
                menu_options = icon_data[7] if len(icon_data) > 7 else None
                
                icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
                icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
                
                btn = QtWidgets.QPushButton()
                btn.setFixedSize(icon_w + 6, icon_h + 6)
                btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
                btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
                btn.setToolTip(tooltip)
                btn.installEventFilter(_tooltip_filter)
                btn.setFlat(True)
                
                margin_style = ""
                if offset:
                    margin_left = max(0, offset[0])
                    margin_right = max(0, -offset[0])
                    margin_style = "margin-left: {}px; margin-right: {}px;".format(margin_left, margin_right)
                
                btn.setStyleSheet("""
                    QPushButton {{ border: none; background: transparent; {} }}
                    QPushButton:pressed {{ background-color: rgba(255,255,255,100); border-radius: 8px; }}
                QPushButton::menu-indicator {{ width: 0; height: 0; }}
                """.format(margin_style))
                
                if menu_options:
                    btn_menu = QtWidgets.QMenu(btn)
                    btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            btn_menu.addSeparator()
                        else:
                            action = btn_menu.addAction(option_name)
                            action.triggered.connect(
                                lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    if icon_file == "bake_icon.png":
                        default_bake_launcher = None
                        default_bake_tool_folder = None
                        for _bake_opt in menu_options:
                            if _bake_opt[0].strip().endswith("1s"):
                                default_bake_launcher = _bake_opt[1]
                                default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                                break
                        if default_bake_launcher:
                            btn.clicked.connect(
                                lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    else:
                        btn.setMenu(btn_menu)
                    # Enable right-click to show same menu
                    btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                    btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
                else:
                    if i == 17:
                        btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                        btn.setToolTip("Mirror Animation")
                        def tools_editor_wip():
                            _run_mirror_launcher()
                        btn.clicked.connect(tools_editor_wip)
                    elif i == 4:
                        btn.clicked.connect(
                            lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                        )
                        def create_tracify_settings_menu_shelf(button):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss())
                                camera_space_action = QAction("Camera Space", menu)
                                camera_space_action.setCheckable(True)
                                camera_space_action.setChecked(_get_tracify_camera_space_pref())
                                camera_space_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                                )
                                menu.addAction(camera_space_action)
                                menu.addSeparator()
                                settings_action = menu.addAction("Tracify Settings")
                                settings_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_tracify_settings_menu_shelf(btn)
                    elif i == 7:
                        def create_xform_align_menu_shelf(button):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            bake_only_keys_action = QAction("Bake Only Keys", menu)
                            bake_only_keys_action.setCheckable(True)
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            def _on_toggle_xform_bake_only_keys(checked):
                                cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                            bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                            menu.addAction(bake_only_keys_action)
                            menu.addSeparator()
                            copy_xform_action = menu.addAction("Copy XForm World")
                            copy_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                            )
                            copy_xform_range_action = menu.addAction("Copy XForm World Range")
                            copy_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            paste_xform_action = menu.addAction("Paste XForm World")
                            paste_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                            )
                            paste_xform_range_action = menu.addAction("Paste XForm World Range")
                            paste_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                            copy_xform_rel_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                            )
                            paste_relationship_action = menu.addAction("Paste Relationship")
                            paste_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                            )
                            paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                            paste_range_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            align_translate_action = menu.addAction("Align (Translate) World")
                            align_translate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                            )
                            align_rotate_action = menu.addAction("Align (Rotate) World")
                            align_rotate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                            )
                            align_action = menu.addAction("Align World")
                            align_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            xform_align_ui_action = menu.addAction("Xform Align UI")
                            xform_align_ui_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                            )
                            def refresh_xform_align_menu_shelf():
                                bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            menu.aboutToShow.connect(refresh_xform_align_menu_shelf)
                            button.setMenu(menu)
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                        create_xform_align_menu_shelf(btn)
                    else:
                        btn.clicked.connect(
                            lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                        )
                
                icon_layout.addWidget(btn)
            
            # Create tangent icon buttons
            tangent_launcher_map = {
                13: {"selected": "auto_current_launcher", "all": "auto_all_launcher"},
                14: {"selected": "linear_current_launcher", "all": "linear_all_launcher"},
                15: {"selected": "step_current_launcher", "all": "step_all_launcher"}
            }
            tangent_buttons = []
            for i in tangent_indices:
                icon_data = bar.ICON_DATA[i]
                icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
                custom_size = icon_data[5] if len(icon_data) > 5 else None
                menu_options = icon_data[7] if len(icon_data) > 7 else None
                
                icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
                icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
                
                btn = QtWidgets.QPushButton()
                btn.setFixedSize(icon_w + 6, icon_h + 6)
                btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
                btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
                btn.setToolTip(tooltip)
                btn.installEventFilter(_tooltip_filter)
                btn.setFlat(True)
                btn.setStyleSheet("""
                    QPushButton { border: none; background: transparent; }
                    QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                    QPushButton::menu-indicator { width: 0; height: 0; }
                """)
                
                if menu_options:
                    btn_menu = QtWidgets.QMenu(btn)
                    btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            btn_menu.addSeparator()
                        elif option_name == "Selected":
                            continue
                        else:
                            action = btn_menu.addAction(option_name)
                            action.triggered.connect(
                                lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    
                    # Add global tangent option
                    tangent_global_map = {13: "auto_tangent_global", 14: "linear_tangent_global", 15: "step_tangent_global"}
                    if i in tangent_global_map:
                        global_script = tangent_global_map[i]
                        btn_menu.addSeparator()
                        global_action = btn_menu.addAction("Apply Maya Global Tangents")
                        global_action.triggered.connect(
                            lambda checked=False, gs=global_script:
                            run_global_tangent(gs)
                        )
                    
                    btn._tangent_menu = btn_menu
                    btn._tangent_index = i
                    btn._tangent_launchers = tangent_launcher_map.get(i, {})
                    
                    def tangent_click_handler_2(checked=False, button=btn):
                        mods = cmds.getModifiers()
                        launchers = button._tangent_launchers
                        if mods == 13:
                            if "all" in launchers:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["all"], None, None)
                        else:
                            if "selected" in launchers:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["selected"], None, None)
                    
                    btn.clicked.connect(tangent_click_handler_2)
                    btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                    btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
                
                tangent_buttons.append(btn)
            
            # Dock mode button
            dock_btn = QtWidgets.QPushButton()
            dock_btn.setFixedSize(int(style.ICON_WIDTH * 1.01), int(style.ICON_HEIGHT * 1.01))
            dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
            dock_btn.setIconSize(QtCore.QSize(int(style.ICON_WIDTH * 1.01) - 2, int(style.ICON_HEIGHT * 1.01) - 2))
            dock_btn.setToolTip("Animo Settings")
            dock_btn.installEventFilter(_tooltip_filter)
            dock_btn.setFlat(True)
            dock_btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
            """)
            
            # Create popup menu
            dock_menu = QtWidgets.QMenu(dock_btn)
            dock_menu.setStyleSheet(_animo_menu_qss(disabled=True))
            
            def refresh_qt_menu():
                dock_menu.clear()
                _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
                _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
                dock_menu.addSeparator()
                def toggle_tooltips(checked):
                    global _tooltip_manager
                    _set_tooltip_pref(checked)
                    if _tooltip_manager:
                        _tooltip_manager.set_enabled(checked)
                    if checked:
                        cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                    else:
                        cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips)
                def toggle_overshoot_3(checked):
                    slider_utils.set_overshoot_enabled(checked)
                    _apply_overshoot_to_all_sliders(checked)
                _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_3)
                def toggle_center_pivot_3(checked):
                    _toggle_center_pivot(checked)
                _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_3)
                _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())

                dock_menu.addSeparator()
                _add_centered_menu_item(dock_menu, "Animo Size Settings...", callback=lambda checked: _show_size_settings())
                _add_centered_menu_item(dock_menu, "Tools Editor and Hotkeys", callback=lambda checked: _run_tools_editor_launcher())
                _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())
            
            dock_menu.aboutToShow.connect(refresh_qt_menu)
            dock_btn.setMenu(dock_menu)
            
            tween_slider = AnimoSlider("TW", (225, 175, 45), "tween")
            tween_slider.setMinimum(-100)
            tween_slider.setMaximum(100)
            tween_slider.setValue(0)
            tween_slider.setFixedWidth(style.scaled(200))
            
            blend_slider = AnimoSlider("BN", (220, 140, 60), "blend")
            blend_slider.setMinimum(-100)
            blend_slider.setMaximum(100)
            blend_slider.setValue(0)
            blend_slider.setFixedWidth(style.scaled(200))
            
            # Right side sliders
            scale_slider = AnimoSlider("SL", (100, 180, 220), "scale")
            scale_slider.setMinimum(-100)
            scale_slider.setMaximum(100)
            scale_slider.setValue(0)
            scale_slider.setFixedWidth(style.scaled(200))
            
            cascade_slider = AnimoSlider("BW", (180, 120, 200), "cascade")
            cascade_slider.setMinimum(0)
            cascade_slider.setMaximum(200)
            cascade_slider.setValue(100)
            cascade_slider.setFixedWidth(style.scaled(200))
            
            # Layout: [stretch] [TW] [BN] [tangent icons] [spacing] [icons] [spacing] [SL] [CA] [stretch] [dock]
            layout.addStretch(1)
            layout.addWidget(tween_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(16)
            layout.addWidget(blend_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(18)
            for tbtn in tangent_buttons:
                layout.addWidget(tbtn, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(20)
            layout.addWidget(icon_container, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(20)
            layout.addWidget(scale_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(16)
            layout.addWidget(cascade_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addStretch(1)
            layout.addWidget(dock_btn)
            
            # Walk up to find a parent with a QVBoxLayout we can insert into
            current = shelf_widget
            inserted = False
            for _ in range(15):
                parent = current.parent()
                if not parent:
                    break
                parent_layout = parent.layout()
                if parent_layout and hasattr(parent_layout, 'insertWidget'):
                    idx = parent_layout.indexOf(current)
                    if idx >= 0:
                        parent_layout.insertWidget(idx + 1, self.qt_toolbar)
                        inserted = True
                        break
                current = parent
            
            if not inserted:
                # Fallback - just parent to shelf's parent
                self.qt_toolbar.setParent(target_parent)
            
            self.qt_toolbar.show()
            
        except Exception as e:
            cmds.warning("Animo: Could not build shelf toolbar - {}".format(str(e)))
    
    def buildStatusLineUI(self):
        # Clean up existing
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
            except:
                pass
        
        if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        
        try:
            # Find the status line widget
            status_line = mel.eval('$tmpVar=$gStatusLine')
            ptr = mui.MQtUtil.findControl(status_line)
            if not ptr:
                cmds.warning("Animo: Could not find status line widget")
                return
            status_widget = wrapInstance(int(ptr), QtWidgets.QWidget)
            
            # Get the status line's parent
            target_parent = status_widget.parent()
            if not target_parent:
                cmds.warning("Animo: Could not find status line parent")
                return
            
            # Build the toolbar widget - use lighter color for status line mode
            bg_color = "rgb({}, {}, {})".format(
                int(style.TOOLBAR_BG_COLOR_LIGHTER[0] * 255),
                int(style.TOOLBAR_BG_COLOR_LIGHTER[1] * 255),
                int(style.TOOLBAR_BG_COLOR_LIGHTER[2] * 255)
            )
            
            self.qt_toolbar = QtWidgets.QWidget()
            self.qt_toolbar.setObjectName("animo_qt_toolbar")
            self.qt_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
            self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }} {}".format(bg_color, TOOLTIP_STYLE))
            
            # Create horizontal layout
            layout = QtWidgets.QHBoxLayout(self.qt_toolbar)
            layout.setContentsMargins(8, 0, 8, 0)
            layout.setSpacing(0)
            
            # Create icon container
            icon_container = QtWidgets.QWidget()
            icon_layout = QtWidgets.QHBoxLayout(icon_container)
            icon_layout.setContentsMargins(0, 0, 0, 0)
            icon_layout.setSpacing(style.ICON_SPACING + 4)
            icon_layout.setAlignment(QtCore.Qt.AlignVCenter)
            
            # Tangent icon indices to skip from main loop
            tangent_indices = [13, 14, 15]
            
            self.nudge_keys_widget = NudgeKeysWidget()
            self.nudge_keys_widget.set_scaled_size(style.scaled)
            
            # Add tool icons (skip tangent icons)
            for i, icon_data in enumerate(bar.ICON_DATA):
                if i in tangent_indices:
                    continue
                
                if i == 5:
                    icon_layout.addWidget(self.nudge_keys_widget)
                    
                icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
                custom_size = icon_data[5] if len(icon_data) > 5 else None
                offset = icon_data[6] if len(icon_data) > 6 else None
                menu_options = icon_data[7] if len(icon_data) > 7 else None
                
                icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
                icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
                
                btn = QtWidgets.QPushButton()
                btn.setFixedSize(icon_w + 6, icon_h + 6)
                btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
                btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
                btn.setToolTip(tooltip)
                btn.installEventFilter(_tooltip_filter)
                btn.setFlat(True)
                
                margin_style = ""
                if offset:
                    margin_left = max(0, offset[0])
                    margin_right = max(0, -offset[0])
                    margin_style = "margin-left: {}px; margin-right: {}px;".format(margin_left, margin_right)
                
                btn.setStyleSheet("""
                    QPushButton {{ border: none; background: transparent; {} }}
                    QPushButton:pressed {{ background-color: rgba(255,255,255,100); border-radius: 8px; }}
                QPushButton::menu-indicator {{ width: 0; height: 0; }}
                """.format(margin_style))
                
                if menu_options:
                    btn_menu = QtWidgets.QMenu(btn)
                    btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            btn_menu.addSeparator()
                        else:
                            action = btn_menu.addAction(option_name)
                            action.triggered.connect(
                                lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    if icon_file == "bake_icon.png":
                        default_bake_launcher = None
                        default_bake_tool_folder = None
                        for _bake_opt in menu_options:
                            if _bake_opt[0].strip().endswith("1s"):
                                default_bake_launcher = _bake_opt[1]
                                default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                                break
                        if default_bake_launcher:
                            btn.clicked.connect(
                                lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    else:
                        btn.setMenu(btn_menu)
                    # Enable right-click to show same menu
                    btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                    btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
                else:
                    if i == 17:
                        btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                        btn.setToolTip("Mirror Animation")
                        def tools_editor_wip():
                            _run_mirror_launcher()
                        btn.clicked.connect(tools_editor_wip)
                    elif i == 4:
                        btn.clicked.connect(
                            lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                        )
                        def create_tracify_settings_menu_statusline(button):
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            def show_menu(pos):
                                menu = QtWidgets.QMenu(button)
                                menu.setStyleSheet(_animo_menu_qss())
                                camera_space_action = QAction("Camera Space", menu)
                                camera_space_action.setCheckable(True)
                                camera_space_action.setChecked(_get_tracify_camera_space_pref())
                                camera_space_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                                )
                                menu.addAction(camera_space_action)
                                menu.addSeparator()
                                settings_action = menu.addAction("Tracify Settings")
                                settings_action.triggered.connect(
                                    lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                                )
                                menu.exec_(button.mapToGlobal(pos))
                            button.customContextMenuRequested.connect(show_menu)
                        create_tracify_settings_menu_statusline(btn)
                    elif i == 7:
                        def create_xform_align_menu_statusline(button):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            bake_only_keys_action = QAction("Bake Only Keys", menu)
                            bake_only_keys_action.setCheckable(True)
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            def _on_toggle_xform_bake_only_keys(checked):
                                cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                            bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                            menu.addAction(bake_only_keys_action)
                            menu.addSeparator()
                            copy_xform_action = menu.addAction("Copy XForm World")
                            copy_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                            )
                            copy_xform_range_action = menu.addAction("Copy XForm World Range")
                            copy_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            paste_xform_action = menu.addAction("Paste XForm World")
                            paste_xform_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                            )
                            paste_xform_range_action = menu.addAction("Paste XForm World Range")
                            paste_xform_range_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                            copy_xform_rel_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                            )
                            paste_relationship_action = menu.addAction("Paste Relationship")
                            paste_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                            )
                            paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                            paste_range_relationship_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            align_translate_action = menu.addAction("Align (Translate) World")
                            align_translate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                            )
                            align_rotate_action = menu.addAction("Align (Rotate) World")
                            align_rotate_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                            )
                            align_action = menu.addAction("Align World")
                            align_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                            )
                            menu.addSeparator()
                            xform_align_ui_action = menu.addAction("Xform Align UI")
                            xform_align_ui_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                            )
                            def refresh_xform_align_menu_statusline():
                                bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                            menu.aboutToShow.connect(refresh_xform_align_menu_statusline)
                            button.setMenu(menu)
                            button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                            button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                        create_xform_align_menu_statusline(btn)
                    else:
                        btn.clicked.connect(
                            lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                        )
                
                icon_layout.addWidget(btn)
            
            # Create tangent icon buttons
            tangent_launcher_map = {
                13: {"selected": "auto_current_launcher", "all": "auto_all_launcher"},
                14: {"selected": "linear_current_launcher", "all": "linear_all_launcher"},
                15: {"selected": "step_current_launcher", "all": "step_all_launcher"}
            }
            tangent_buttons = []
            for i in tangent_indices:
                icon_data = bar.ICON_DATA[i]
                icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
                custom_size = icon_data[5] if len(icon_data) > 5 else None
                menu_options = icon_data[7] if len(icon_data) > 7 else None
                
                icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
                icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
                
                btn = QtWidgets.QPushButton()
                btn.setFixedSize(icon_w + 6, icon_h + 6)
                btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
                btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
                btn.setToolTip(tooltip)
                btn.installEventFilter(_tooltip_filter)
                btn.setFlat(True)
                btn.setStyleSheet("""
                    QPushButton { border: none; background: transparent; }
                    QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                    QPushButton::menu-indicator { width: 0; height: 0; }
                """)
                
                if menu_options:
                    btn_menu = QtWidgets.QMenu(btn)
                    btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            btn_menu.addSeparator()
                        elif option_name == "Selected":
                            continue
                        else:
                            action = btn_menu.addAction(option_name)
                            action.triggered.connect(
                                lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                            )
                    
                    # Add global tangent option
                    tangent_global_map = {13: "auto_tangent_global", 14: "linear_tangent_global", 15: "step_tangent_global"}
                    if i in tangent_global_map:
                        global_script = tangent_global_map[i]
                        btn_menu.addSeparator()
                        global_action = btn_menu.addAction("Apply Maya Global Tangents")
                        global_action.triggered.connect(
                            lambda checked=False, gs=global_script:
                            run_global_tangent(gs)
                        )
                    
                    btn._tangent_menu = btn_menu
                    btn._tangent_index = i
                    btn._tangent_launchers = tangent_launcher_map.get(i, {})
                    
                    def tangent_click_handler_3(checked=False, button=btn):
                        mods = cmds.getModifiers()
                        launchers = button._tangent_launchers
                        if mods == 13:
                            if "all" in launchers:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["all"], None, None)
                        else:
                            if "selected" in launchers:
                                bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["selected"], None, None)
                    
                    btn.clicked.connect(tangent_click_handler_3)
                    btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                    btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
                
                tangent_buttons.append(btn)
            
            # Dock mode button
            dock_btn = QtWidgets.QPushButton()
            dock_btn.setFixedSize(int(style.ICON_WIDTH * 1.01), int(style.ICON_HEIGHT * 1.01))
            dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
            dock_btn.setIconSize(QtCore.QSize(int(style.ICON_WIDTH * 1.01) - 2, int(style.ICON_HEIGHT * 1.01) - 2))
            dock_btn.setToolTip("Animo Settings")
            dock_btn.installEventFilter(_tooltip_filter)
            dock_btn.setFlat(True)
            dock_btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
            """)
            
            # Create popup menu
            dock_menu = QtWidgets.QMenu(dock_btn)
            dock_menu.setStyleSheet(_animo_menu_qss(disabled=True))
            
            def refresh_qt_menu():
                dock_menu.clear()
                _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
                _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
                dock_menu.addSeparator()
                def toggle_tooltips(checked):
                    global _tooltip_manager
                    _set_tooltip_pref(checked)
                    if _tooltip_manager:
                        _tooltip_manager.set_enabled(checked)
                    if checked:
                        cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                    else:
                        cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips)
                def toggle_overshoot_4(checked):
                    slider_utils.set_overshoot_enabled(checked)
                    _apply_overshoot_to_all_sliders(checked)
                _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_4)
                def toggle_center_pivot_4(checked):
                    _toggle_center_pivot(checked)
                _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_4)
                _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())

                dock_menu.addSeparator()
                _add_centered_menu_item(dock_menu, "Animo Size Settings...", callback=lambda checked: _show_size_settings())
                _add_centered_menu_item(dock_menu, "Tools Editor and Hotkeys", callback=lambda checked: _run_tools_editor_launcher())
                _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())
            
            dock_menu.aboutToShow.connect(refresh_qt_menu)
            dock_btn.setMenu(dock_menu)
            
            tween_slider = AnimoSlider("TW", (225, 175, 45), "tween")
            tween_slider.setMinimum(-100)
            tween_slider.setMaximum(100)
            tween_slider.setValue(0)
            tween_slider.setFixedWidth(style.scaled(200))
            
            blend_slider = AnimoSlider("BN", (220, 140, 60), "blend")
            blend_slider.setMinimum(-100)
            blend_slider.setMaximum(100)
            blend_slider.setValue(0)
            blend_slider.setFixedWidth(style.scaled(200))
            
            # Right side sliders
            scale_slider = AnimoSlider("SL", (100, 180, 220), "scale")
            scale_slider.setMinimum(-100)
            scale_slider.setMaximum(100)
            scale_slider.setValue(0)
            scale_slider.setFixedWidth(style.scaled(200))
            
            cascade_slider = AnimoSlider("BW", (180, 120, 200), "cascade")
            cascade_slider.setMinimum(0)
            cascade_slider.setMaximum(200)
            cascade_slider.setValue(100)
            cascade_slider.setFixedWidth(style.scaled(200))
            
            # Layout: [stretch] [TW] [BN] [tangent icons] [spacing] [icons] [spacing] [SL] [CA] [stretch] [dock]
            layout.addStretch(1)
            layout.addWidget(tween_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(16)
            layout.addWidget(blend_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(18)
            for tbtn in tangent_buttons:
                layout.addWidget(tbtn, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(20)
            layout.addWidget(icon_container, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(20)
            layout.addWidget(scale_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addSpacing(16)
            layout.addWidget(cascade_slider, 0, QtCore.Qt.AlignVCenter)
            layout.addStretch(1)
            layout.addWidget(dock_btn)
            
            # Walk up to find a parent with a layout we can insert into
            current = status_widget
            inserted = False
            for _ in range(15):
                parent = current.parent()
                if not parent:
                    break
                parent_layout = parent.layout()
                if parent_layout and hasattr(parent_layout, 'insertWidget'):
                    idx = parent_layout.indexOf(current)
                    if idx >= 0:
                        # Insert ABOVE the status line (at idx, not idx+1)
                        parent_layout.insertWidget(idx, self.qt_toolbar)
                        inserted = True
                        break
                current = parent
            
            if not inserted:
                # Fallback - just parent to status line's parent
                self.qt_toolbar.setParent(target_parent)
            
            self.qt_toolbar.show()
            
        except Exception as e:
            cmds.warning("Animo: Could not build status line toolbar - {}".format(str(e)))
    
    def buildBottomToolbar(self):
        # Clean up existing Qt toolbar
        if self.qt_toolbar:
            try:
                self.qt_toolbar.hide()
                self.qt_toolbar.setParent(None)
                self.qt_toolbar.deleteLater()
                self.qt_toolbar = None
            except:
                pass
        
        if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            cmds.deleteUI(WorkspaceName, control=True)
        
        # Clean up existing bottom toolbar
        if cmds.toolBar("animo_bottom_toolbar", query=True, exists=True):
            cmds.deleteUI("animo_bottom_toolbar")
        if cmds.window("animo_bottom_win", query=True, exists=True):
            cmds.deleteUI("animo_bottom_win")
        
        # Create window to hold toolbar content (like aTools)
        self.bottom_win = cmds.window("animo_bottom_win", sizeable=True)
        cmds.frameLayout(labelVisible=False, borderVisible=False, w=10, marginHeight=0, marginWidth=0, collapsable=False)
        cmds.rowLayout(numberOfColumns=2, adjustableColumn=1, columnAttach=([2, 'right', 0]), h=style.TOOLBAR_HEIGHT)
        cmds.text(label="")
        main_row = cmds.rowLayout("animo_main_row", numberOfColumns=50)
        
        # Add icons
        tangent_indices = [13, 14, 15]
        for i, icon_data in enumerate(bar.ICON_DATA):
            if i in tangent_indices:
                continue
            
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = cmds.iconTextButton(style='iconOnly', w=icon_w, h=icon_h,
                image=self.getImage(icon_file), ann=tooltip)
            
            if menu_options:
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        cmds.iconTextButton(btn, edit=True,
                            c=lambda ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                else:
                    popup = cmds.popupMenu(parent=btn, button=1)
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup)
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
            else:
                cmds.iconTextButton(btn, edit=True,
                    c=lambda ln=launcher_name, tf=tool_folder, ef=entry_func:
                    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef))
            
            cmds.separator(style='none', width=style.ICON_SPACING + 4)
        
        # Add dock button
        dock_btn = cmds.iconTextButton(style='iconOnly', w=style.scaled(16), h=style.scaled(16),
            image=self.getImage("dock_icon.png"), ann="Animo Settings")
        dock_menu = cmds.popupMenu(button=1, parent=dock_btn,
            postMenuCommand=lambda menu, *args: self._refreshDockMenu(menu))
        
        # Create toolbar at bottom
        cmds.toolBar("animo_bottom_toolbar", area='bottom', content=self.bottom_win, allowedArea=['bottom'])
    
    def _buildWorkspaceContent(self):
        # Get the workspaceControl's Qt widget
        ptr = mui.MQtUtil.findControl(WorkspaceName)
        if not ptr:
            return
        workspace_widget = wrapInstance(int(ptr), QtWidgets.QWidget)
        
        # Force the workspace to be small
        workspace_widget.setFixedHeight(style.TOOLBAR_HEIGHT)
        workspace_widget.setMaximumHeight(style.TOOLBAR_WIDTH)
        
        # Build the toolbar - lighter for horizontal modes
        bg_color = "rgb({}, {}, {})".format(
            int(style.TOOLBAR_BG_COLOR_LIGHT[0] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[1] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[2] * 255)
        )
        
        self.qt_toolbar = QtWidgets.QWidget(workspace_widget)
        self.qt_toolbar.setObjectName("animo_qt_toolbar")
        self.qt_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
        self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }} {}".format(bg_color, TOOLTIP_STYLE))
        
        # Create horizontal layout
        layout = QtWidgets.QHBoxLayout(self.qt_toolbar)
        layout.setContentsMargins(8, 0, 8, 0)
        layout.setSpacing(0)
        
        # Create icon container
        icon_container = QtWidgets.QWidget()
        icon_layout = QtWidgets.QHBoxLayout(icon_container)
        icon_layout.setContentsMargins(0, 0, 0, 0)
        icon_layout.setSpacing(style.ICON_SPACING + 4)
        
        # Tangent icon indices to skip from main loop
        tangent_indices = [13, 14, 15]
        
        self.nudge_keys_widget = NudgeKeysWidget()
        self.nudge_keys_widget.set_scaled_size(style.scaled)
        
        # Add tool icons (skip tangent icons)
        for i, icon_data in enumerate(bar.ICON_DATA):
            if i in tangent_indices:
                continue
            
            if i == 5:
                icon_layout.addWidget(self.nudge_keys_widget)
                
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            offset = icon_data[6] if len(icon_data) > 6 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            
            margin_style = ""
            if offset:
                margin_left = max(0, offset[0])
                margin_right = max(0, -offset[0])
                margin_style = "margin-left: {}px; margin-right: {}px;".format(margin_left, margin_right)
            
            btn.setStyleSheet("""
                QPushButton {{ border: none; background: transparent; {} }}
                QPushButton:pressed {{ background-color: rgba(255,255,255,100); border-radius: 8px; }}
                QPushButton::menu-indicator {{ width: 0; height: 0; }}
            """.format(margin_style))
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        btn.clicked.connect(
                            lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                else:
                    btn.setMenu(btn_menu)
                # Enable right-click to show same menu
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            else:
                if i == 17:
                    btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                    btn.setToolTip("Mirror Animation")
                    def tools_editor_wip():
                        _run_mirror_launcher()
                    btn.clicked.connect(tools_editor_wip)
                elif i == 4:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
                    def create_tracify_settings_menu_workspace(button):
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        def show_menu(pos):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            camera_space_action = QAction("Camera Space", menu)
                            camera_space_action.setCheckable(True)
                            camera_space_action.setChecked(_get_tracify_camera_space_pref())
                            camera_space_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                            )
                            menu.addAction(camera_space_action)
                            menu.addSeparator()
                            settings_action = menu.addAction("Tracify Settings")
                            settings_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                            )
                            menu.exec_(button.mapToGlobal(pos))
                        button.customContextMenuRequested.connect(show_menu)
                    create_tracify_settings_menu_workspace(btn)
                elif i == 7:
                    def create_xform_align_menu_workspace(button):
                        menu = QtWidgets.QMenu(button)
                        menu.setStyleSheet(_animo_menu_qss())
                        bake_only_keys_action = QAction("Bake Only Keys", menu)
                        bake_only_keys_action.setCheckable(True)
                        bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        def _on_toggle_xform_bake_only_keys(checked):
                            cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                        bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                        menu.addAction(bake_only_keys_action)
                        menu.addSeparator()
                        copy_xform_action = menu.addAction("Copy XForm World")
                        copy_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                        )
                        copy_xform_range_action = menu.addAction("Copy XForm World Range")
                        copy_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        paste_xform_action = menu.addAction("Paste XForm World")
                        paste_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                        )
                        paste_xform_range_action = menu.addAction("Paste XForm World Range")
                        paste_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                        copy_xform_rel_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                        )
                        paste_relationship_action = menu.addAction("Paste Relationship")
                        paste_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                        )
                        paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                        paste_range_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        align_translate_action = menu.addAction("Align (Translate) World")
                        align_translate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                        )
                        align_rotate_action = menu.addAction("Align (Rotate) World")
                        align_rotate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                        )
                        align_action = menu.addAction("Align World")
                        align_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        xform_align_ui_action = menu.addAction("Xform Align UI")
                        xform_align_ui_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                        )
                        def refresh_xform_align_menu_workspace():
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        menu.aboutToShow.connect(refresh_xform_align_menu_workspace)
                        button.setMenu(menu)
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                    create_xform_align_menu_workspace(btn)
                else:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
            
            icon_layout.addWidget(btn)
        
        # Create tangent icon buttons
        tangent_launcher_map = {
            13: {"selected": "auto_current_launcher", "all": "auto_all_launcher"},
            14: {"selected": "linear_current_launcher", "all": "linear_all_launcher"},
            15: {"selected": "step_current_launcher", "all": "step_all_launcher"}
        }
        tangent_buttons = []
        for i in tangent_indices:
            icon_data = bar.ICON_DATA[i]
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
                QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                QPushButton::menu-indicator { width: 0; height: 0; }
            """)
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    elif option_name == "Selected":
                        continue
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                
                # Add global tangent option
                tangent_global_map = {13: "auto_tangent_global", 14: "linear_tangent_global", 15: "step_tangent_global"}
                if i in tangent_global_map:
                    global_script = tangent_global_map[i]
                    btn_menu.addSeparator()
                    global_action = btn_menu.addAction("Apply Maya Global Tangents")
                    global_action.triggered.connect(
                        lambda checked=False, gs=global_script:
                        run_global_tangent(gs)
                    )
                
                btn._tangent_menu = btn_menu
                btn._tangent_index = i
                btn._tangent_launchers = tangent_launcher_map.get(i, {})
                
                def tangent_click_handler_4(checked=False, button=btn):
                    mods = cmds.getModifiers()
                    launchers = button._tangent_launchers
                    if mods == 13:
                        if "all" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["all"], None, None)
                    else:
                        if "selected" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["selected"], None, None)
                
                btn.clicked.connect(tangent_click_handler_4)
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            
            tangent_buttons.append(btn)
        
        # Dock mode button
        dock_btn = QtWidgets.QPushButton()
        dock_btn.setFixedSize(int(style.ICON_WIDTH * 1.01), int(style.ICON_HEIGHT * 1.01))
        dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
        dock_btn.setIconSize(QtCore.QSize(int(style.ICON_WIDTH * 1.01) - 2, int(style.ICON_HEIGHT * 1.01) - 2))
        dock_btn.setToolTip("Animo Settings")
        dock_btn.installEventFilter(_tooltip_filter)
        dock_btn.setFlat(True)
        dock_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
        """)
        
        # Create popup menu
        dock_menu = QtWidgets.QMenu(dock_btn)
        dock_menu.setStyleSheet(_animo_menu_qss(disabled=True))
        
        def refresh_qt_menu():
            dock_menu.clear()
            _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
            _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
            dock_menu.addSeparator()
            def toggle_tooltips(checked):
                global _tooltip_manager
                _set_tooltip_pref(checked)
                if _tooltip_manager:
                    _tooltip_manager.set_enabled(checked)
                if checked:
                    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                else:
                    cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
            _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips)
            def toggle_overshoot_5(checked):
                slider_utils.set_overshoot_enabled(checked)
                _apply_overshoot_to_all_sliders(checked)
            _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_5)
            def toggle_center_pivot_5(checked):
                _toggle_center_pivot(checked)
            _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_5)
            _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())

            dock_menu.addSeparator()
            _add_centered_menu_item(dock_menu, "Animo Size Settings...", callback=lambda checked: _show_size_settings())
            _add_centered_menu_item(dock_menu, "Tools Editor and Hotkeys", callback=lambda checked: _run_tools_editor_launcher())
            _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())
        
        dock_menu.aboutToShow.connect(refresh_qt_menu)
        dock_btn.setMenu(dock_menu)
        
        tween_slider = AnimoSlider("TW", (225, 175, 45), "tween")
        tween_slider.setMinimum(-100)
        tween_slider.setMaximum(100)
        tween_slider.setValue(0)
        tween_slider.setFixedWidth(style.scaled(200))
        
        blend_slider = AnimoSlider("BN", (220, 140, 60), "blend")
        blend_slider.setMinimum(-100)
        blend_slider.setMaximum(100)
        blend_slider.setValue(0)
        blend_slider.setFixedWidth(style.scaled(200))
        
        # Right side sliders
        scale_slider = AnimoSlider("SL", (100, 180, 220), "scale")
        scale_slider.setMinimum(-100)
        scale_slider.setMaximum(100)
        scale_slider.setValue(0)
        scale_slider.setFixedWidth(style.scaled(200))
        
        cascade_slider = AnimoSlider("BW", (180, 120, 200), "cascade")
        cascade_slider.setMinimum(0)
        cascade_slider.setMaximum(200)
        cascade_slider.setValue(100)
        cascade_slider.setFixedWidth(style.scaled(200))
        
        # Layout: [stretch] [TW] [BN] [tangent icons] [spacing] [icons] [spacing] [SL] [CA] [stretch] [dock]
        layout.addStretch(1)
        layout.addWidget(tween_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(16)
        layout.addWidget(blend_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(18)
        for tbtn in tangent_buttons:
            layout.addWidget(tbtn, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(20)
        layout.addWidget(icon_container, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(20)
        layout.addWidget(scale_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(16)
        layout.addWidget(cascade_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addStretch(1)
        layout.addWidget(dock_btn)
        
        # Set layout on workspace widget
        if workspace_widget.layout():
            workspace_widget.layout().addWidget(self.qt_toolbar)
        else:
            workspace_layout = QtWidgets.QVBoxLayout(workspace_widget)
            workspace_layout.setContentsMargins(0, 0, 0, 0)
            workspace_layout.addWidget(self.qt_toolbar)
        
        self.qt_toolbar.show()
    
    def _buildHorizontalToolbarDirect(self, target_parent, target_widget, below=True):
        # Build the toolbar widget - lighter for horizontal modes
        bg_color = "rgb({}, {}, {})".format(
            int(style.TOOLBAR_BG_COLOR_LIGHT[0] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[1] * 255),
            int(style.TOOLBAR_BG_COLOR_LIGHT[2] * 255)
        )
        
        self.qt_toolbar = QtWidgets.QWidget()
        self.qt_toolbar.setObjectName("animo_qt_toolbar")
        self.qt_toolbar.setFixedHeight(style.TOOLBAR_HEIGHT)
        self.qt_toolbar.setStyleSheet("QWidget#animo_qt_toolbar {{ background-color: {}; }}".format(bg_color))
        
        # Create horizontal layout
        layout = QtWidgets.QHBoxLayout(self.qt_toolbar)
        layout.setContentsMargins(8, 0, 8, 0)
        layout.setSpacing(style.ICON_SPACING + 4)
        
        # Create icon container
        icon_container = QtWidgets.QWidget()
        icon_layout = QtWidgets.QHBoxLayout(icon_container)
        icon_layout.setContentsMargins(0, 0, 0, 0)
        icon_layout.setSpacing(style.ICON_SPACING + 4)
        
        # Tangent icon indices to skip from main loop
        tangent_indices = [13, 14, 15]
        
        self.nudge_keys_widget = NudgeKeysWidget()
        self.nudge_keys_widget.set_scaled_size(style.scaled)
        
        # Add tool icons (skip tangent icons)
        for i, icon_data in enumerate(bar.ICON_DATA):
            if i in tangent_indices:
                continue
            
            if i == 5:
                icon_layout.addWidget(self.nudge_keys_widget)
                
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            offset = icon_data[6] if len(icon_data) > 6 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            
            margin_style = ""
            if offset:
                margin_left = max(0, offset[0])
                margin_right = max(0, -offset[0])
                margin_style = "margin-left: {}px; margin-right: {}px;".format(margin_left, margin_right)
            
            btn.setStyleSheet("""
                QPushButton {{ border: none; background: transparent; {} }}
                QPushButton:pressed {{ background-color: rgba(255,255,255,100); border-radius: 8px; }}
                QPushButton::menu-indicator {{ width: 0; height: 0; }}
            """.format(margin_style))
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        btn.clicked.connect(
                            lambda checked=False, ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                else:
                    btn.setMenu(btn_menu)
                # Enable right-click to show same menu
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            else:
                if i == 17:
                    btn.setIcon(QtGui.QIcon(self.getImage("mirror_icon.png")))
                    btn.setToolTip("Mirror Animation")
                    def tools_editor_wip():
                        _run_mirror_launcher()
                    btn.clicked.connect(tools_editor_wip)
                elif i == 4:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
                    def create_tracify_settings_menu_horizontal(button):
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        def show_menu(pos):
                            menu = QtWidgets.QMenu(button)
                            menu.setStyleSheet(_animo_menu_qss())
                            camera_space_action = QAction("Camera Space", menu)
                            camera_space_action.setCheckable(True)
                            camera_space_action.setChecked(_get_tracify_camera_space_pref())
                            camera_space_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_toggle_camera_space", None, None)
                            )
                            menu.addAction(camera_space_action)
                            menu.addSeparator()
                            settings_action = menu.addAction("Tracify Settings")
                            settings_action.triggered.connect(
                                lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "tracify_launcher", None, "ui")
                            )
                            menu.exec_(button.mapToGlobal(pos))
                        button.customContextMenuRequested.connect(show_menu)
                    create_tracify_settings_menu_horizontal(btn)
                elif i == 7:
                    def create_xform_align_menu_horizontal(button):
                        menu = QtWidgets.QMenu(button)
                        menu.setStyleSheet(_animo_menu_qss())
                        bake_only_keys_action = QAction("Bake Only Keys", menu)
                        bake_only_keys_action.setCheckable(True)
                        bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        def _on_toggle_xform_bake_only_keys(checked):
                            cmds.optionVar(iv=('XformAlignUI_bakeKeys', 1 if checked else 0))
                        bake_only_keys_action.triggered.connect(_on_toggle_xform_bake_only_keys)
                        menu.addAction(bake_only_keys_action)
                        menu.addSeparator()
                        copy_xform_action = menu.addAction("Copy XForm World")
                        copy_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy", "Animo_Space_Switcher", None)
                        )
                        copy_xform_range_action = menu.addAction("Copy XForm World Range")
                        copy_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_copy_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        paste_xform_action = menu.addAction("Paste XForm World")
                        paste_xform_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste", "Animo_Space_Switcher", None)
                        )
                        paste_xform_range_action = menu.addAction("Paste XForm World Range")
                        paste_xform_range_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_paste_range", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        copy_xform_rel_action = menu.addAction("Copy XForm Relationship")
                        copy_xform_rel_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_copy", "Animo_Space_Switcher", None)
                        )
                        paste_relationship_action = menu.addAction("Paste Relationship")
                        paste_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_paste", "Animo_Space_Switcher", None)
                        )
                        paste_range_relationship_action = menu.addAction("Paste Range Relationship")
                        paste_range_relationship_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_relationship_bake", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        align_translate_action = menu.addAction("Align (Translate) World")
                        align_translate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_translate", "Animo_Space_Switcher", None)
                        )
                        align_rotate_action = menu.addAction("Align (Rotate) World")
                        align_rotate_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute_rotate", "Animo_Space_Switcher", None)
                        )
                        align_action = menu.addAction("Align World")
                        align_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_execute", "Animo_Space_Switcher", None)
                        )
                        menu.addSeparator()
                        xform_align_ui_action = menu.addAction("Xform Align UI")
                        xform_align_ui_action.triggered.connect(
                            lambda: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, "xform_align_launcher", None, None)
                        )
                        def refresh_xform_align_menu_horizontal():
                            bake_only_keys_action.setChecked(_get_xform_bake_only_keys_pref())
                        menu.aboutToShow.connect(refresh_xform_align_menu_horizontal)
                        button.setMenu(menu)
                        button.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                        button.customContextMenuRequested.connect(lambda pos, m=menu, b=button: m.exec_(b.mapToGlobal(pos)))
                    create_xform_align_menu_horizontal(btn)
                else:
                    btn.clicked.connect(
                        lambda checked=False, ln=launcher_name, tf=tool_folder, ef=entry_func:
                        bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef)
                    )
            
            icon_layout.addWidget(btn)
        
        # Create tangent icon buttons
        tangent_launcher_map = {
            13: {"selected": "auto_current_launcher", "all": "auto_all_launcher"},
            14: {"selected": "linear_current_launcher", "all": "linear_all_launcher"},
            15: {"selected": "step_current_launcher", "all": "step_all_launcher"}
        }
        tangent_buttons = []
        for i in tangent_indices:
            icon_data = bar.ICON_DATA[i]
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = QtWidgets.QPushButton()
            btn.setFixedSize(icon_w + 6, icon_h + 6)
            btn.setIcon(QtGui.QIcon(self.getImage(icon_file)))
            btn.setIconSize(QtCore.QSize(icon_w - 2, icon_h - 2))
            btn.setToolTip(tooltip)
            btn.installEventFilter(_tooltip_filter)
            btn.setFlat(True)
            btn.setStyleSheet("""
                QPushButton { border: none; background: transparent; }
                QPushButton:pressed { background-color: rgba(255,255,255,100); border-radius: 8px; }
                QPushButton::menu-indicator { width: 0; height: 0; }
            """)
            
            if menu_options:
                btn_menu = QtWidgets.QMenu(btn)
                btn_menu.setStyleSheet(_animo_menu_qss(with_indicator=False))
                for menu_item in menu_options:
                    option_name = menu_item[0]
                    option_launcher = menu_item[1]
                    option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                    if option_name == "---":
                        btn_menu.addSeparator()
                    elif option_name == "Selected":
                        continue
                    else:
                        action = btn_menu.addAction(option_name)
                        action.triggered.connect(
                            lambda checked=False, ln=option_launcher, tf=option_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None)
                        )
                
                # Add global tangent option
                tangent_global_map = {13: "auto_tangent_global", 14: "linear_tangent_global", 15: "step_tangent_global"}
                if i in tangent_global_map:
                    global_script = tangent_global_map[i]
                    btn_menu.addSeparator()
                    global_action = btn_menu.addAction("Apply Maya Global Tangents")
                    global_action.triggered.connect(
                        lambda checked=False, gs=global_script:
                        run_global_tangent(gs)
                    )
                
                btn._tangent_menu = btn_menu
                btn._tangent_index = i
                btn._tangent_launchers = tangent_launcher_map.get(i, {})
                
                def tangent_click_handler_5(checked=False, button=btn):
                    mods = cmds.getModifiers()
                    launchers = button._tangent_launchers
                    if mods == 13:
                        if "all" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["all"], None, None)
                    else:
                        if "selected" in launchers:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, launchers["selected"], None, None)
                
                btn.clicked.connect(tangent_click_handler_5)
                btn.setContextMenuPolicy(QtCore.Qt.CustomContextMenu)
                btn.customContextMenuRequested.connect(lambda pos, m=btn_menu, b=btn: m.exec_(b.mapToGlobal(pos)))
            
            tangent_buttons.append(btn)
        
        # Dock mode button
        dock_btn = QtWidgets.QPushButton()
        dock_btn.setFixedSize(int(style.ICON_WIDTH * 1.01), int(style.ICON_HEIGHT * 1.01))
        dock_btn.setIcon(QtGui.QIcon(self.getImage("dock_icon.png")))
        dock_btn.setIconSize(QtCore.QSize(int(style.ICON_WIDTH * 1.01) - 2, int(style.ICON_HEIGHT * 1.01) - 2))
        dock_btn.setToolTip("Animo Settings")
        dock_btn.installEventFilter(_tooltip_filter)
        dock_btn.setFlat(True)
        dock_btn.setStyleSheet("""
            QPushButton { border: none; background: transparent; }
        """)
        
        # Create popup menu
        dock_menu = QtWidgets.QMenu(dock_btn)
        dock_menu.setStyleSheet(_animo_menu_qss(disabled=True))
        
        # Refresh menu
        def refresh_qt_menu():
            dock_menu.clear()
            _add_centered_menu_item(dock_menu, "Reset Animo", callback=lambda checked: self._resetUI())
            _add_centered_menu_item(dock_menu, "Add Animo to Shelf", callback=lambda checked: self._addToShelf())
            dock_menu.addSeparator()
            def toggle_tooltips(checked):
                global _tooltip_manager
                _set_tooltip_pref(checked)
                if _tooltip_manager:
                    _tooltip_manager.set_enabled(checked)
                if checked:
                    cmds.inViewMessage(amg='<span style="color:#4aa3df;">Tool Tips Enabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
                else:
                    cmds.inViewMessage(amg='<span style="color:#ff9900;">Tool Tips Disabled</span>', pos='midCenter', fade=True, fst=200, fad=400)
            _add_centered_menu_item(dock_menu, "Show Tool Tips", checkable=True, checked=_get_tooltip_pref(), callback=toggle_tooltips)
            def toggle_overshoot_6(checked):
                slider_utils.set_overshoot_enabled(checked)
                _apply_overshoot_to_all_sliders(checked)
            _add_centered_menu_item(dock_menu, "Sliders Overshoot Mode", checkable=True, checked=slider_utils.is_overshoot_enabled(), callback=toggle_overshoot_6)
            def toggle_center_pivot_6(checked):
                _toggle_center_pivot(checked)
            _add_centered_menu_item(dock_menu, "Keep Selections at Center", checkable=True, checked=_is_center_pivot_active(), callback=toggle_center_pivot_6)
            _add_centered_menu_item(dock_menu, "Enable Reference Dropper", callback=lambda checked: _activate_viewport_reference_dropper())

            dock_menu.addSeparator()
            _add_centered_menu_item(dock_menu, "Animo Size Settings...", callback=lambda checked: _show_size_settings())
            _add_centered_menu_item(dock_menu, "Tools Editor and Hotkeys", callback=lambda checked: _run_tools_editor_launcher())
            _add_centered_menu_item(dock_menu, "About", callback=lambda checked: _run_about_launcher())
        
        dock_menu.aboutToShow.connect(refresh_qt_menu)
        dock_btn.setMenu(dock_menu)
        
        tween_slider = AnimoSlider("TW", (225, 175, 45), "tween")
        tween_slider.setMinimum(-100)
        tween_slider.setMaximum(100)
        tween_slider.setValue(0)
        tween_slider.setFixedWidth(style.scaled(200))
        
        blend_slider = AnimoSlider("BN", (220, 140, 60), "blend")
        blend_slider.setMinimum(-100)
        blend_slider.setMaximum(100)
        blend_slider.setValue(0)
        blend_slider.setFixedWidth(style.scaled(200))
        
        # Right side sliders
        scale_slider = AnimoSlider("SL", (100, 180, 220), "scale")
        scale_slider.setMinimum(-100)
        scale_slider.setMaximum(100)
        scale_slider.setValue(0)
        scale_slider.setFixedWidth(style.scaled(200))
        
        cascade_slider = AnimoSlider("BW", (180, 120, 200), "cascade")
        cascade_slider.setMinimum(0)
        cascade_slider.setMaximum(200)
        cascade_slider.setValue(100)
        cascade_slider.setFixedWidth(style.scaled(200))
        
        # Layout: [stretch] [TW] [BN] [tangent icons] [spacing] [icons] [spacing] [SL] [CA] [stretch] [dock]
        layout.addStretch(1)
        layout.addWidget(tween_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(16)
        layout.addWidget(blend_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(18)
        for tbtn in tangent_buttons:
            layout.addWidget(tbtn, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(20)
        layout.addWidget(icon_container, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(20)
        layout.addWidget(scale_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addSpacing(16)
        layout.addWidget(cascade_slider, 0, QtCore.Qt.AlignVCenter)
        layout.addStretch(1)
        layout.addWidget(dock_btn)
        
        # Insert into parent layout
        parent_layout = target_parent.layout()
        if parent_layout:
            idx = parent_layout.indexOf(target_widget)
            if idx >= 0:
                if below:
                    parent_layout.insertWidget(idx + 1, self.qt_toolbar)
                else:
                    parent_layout.insertWidget(idx, self.qt_toolbar)
                self.qt_toolbar.show()
                return
            else:
                # Try adding to layout if widget not found in it
                parent_layout.addWidget(self.qt_toolbar)
                self.qt_toolbar.show()
                return
        
        # Fallback - just parent to target_parent and show
        self.qt_toolbar.setParent(target_parent)
        self.qt_toolbar.show()
    
    def _buildTimelineFallback(self):
        cmds.workspaceControl(WorkspaceName, l="", 
            ih=style.TOOLBAR_WIDTH,
            mh=style.TOOLBAR_WIDTH,
            li=True, 
            hp="fixed",
            floating=False, 
            retain=False, 
            collapse=False,
            dockToMainWindow=["bottom", True])
        try:
            mel.eval('workspaceControl -e -dtc "TimeSlider" "top" "{}";'.format(WorkspaceName))
        except:
            pass
        
        # Build horizontal UI using Maya commands
        cmds.setParent(WorkspaceName)
        
        icon_count = len(bar.ICON_DATA)
        cmds.formLayout("animo_formtoolbar", bgc=style.TOOLBAR_BG_COLOR_LIGHT)
        cmds.rowLayout("animo_rowtoolbar", numberOfColumns=(icon_count * 2) + 3,
            bgc=style.TOOLBAR_BG_COLOR_LIGHT, p="animo_formtoolbar")
        
        for i, icon_data in enumerate(bar.ICON_DATA):
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = cmds.iconTextButton(l="", style="iconOnly", w=icon_w, h=icon_h,
                image=self.getImage(icon_file), ann=tooltip)
            
            if menu_options:
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        cmds.iconTextButton(btn, edit=True,
                            c=lambda ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                else:
                    popup = cmds.popupMenu(parent=btn, button=1)
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup)
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
            else:
                cmds.iconTextButton(btn, edit=True,
                    c=lambda ln=launcher_name, tf=tool_folder, ef=entry_func: 
                    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef))
            
            if i < icon_count - 1:
                cmds.separator(style='none', width=style.ICON_SPACING + 4, p="animo_rowtoolbar")
        
        cmds.separator(style='none', width=style.ICON_SPACING + 10, p="animo_rowtoolbar")
        
        dock_btn = cmds.iconTextButton(l="", style="iconOnly", w=style.scaled(16), h=style.scaled(16),
            image=self.getImage("dock_icon.png"), ann="Animo Settings")
        dock_menu = cmds.popupMenu(button=1, parent=dock_btn, 
            postMenuCommand=lambda menu, *args: self._refreshDockMenu(menu))
        
        cmds.formLayout("animo_formtoolbar", edit=True,
            attachForm=[("animo_rowtoolbar", "top", 0), ("animo_rowtoolbar", "bottom", 0)],
            attachPosition=[("animo_rowtoolbar", "left", 0, 50)],
            attachNone=[("animo_rowtoolbar", "right")])
        
        spacing_total = (style.ICON_SPACING + 4) * (icon_count - 1) + (style.ICON_SPACING + 10) + style.scaled(16)
        total_width = (style.ICON_WIDTH * icon_count) + spacing_total
        
        cmds.formLayout("animo_formtoolbar", edit=True,
            attachPosition=[("animo_rowtoolbar", "left", -(total_width // 2), 50)])
        
        cmds.workspaceControl(WorkspaceName, edit=True, resizeHeight=style.TOOLBAR_HEIGHT)
    
    def buildUI(self, is_horizontal=False):
        if not cmds.workspaceControl(WorkspaceName, query=True, exists=True):
            return
        
        cmds.setParent(WorkspaceName)
        
        for layout_name in ["animo_formtoolbar", "animo_columntoolbar"]:
            try:
                if cmds.layout(layout_name, exists=True):
                    cmds.deleteUI(layout_name)
            except:
                pass
        
        icon_count = len(bar.ICON_DATA)
        
        cmds.formLayout("animo_formtoolbar", bgc=style.TOOLBAR_BG_COLOR)
        cmds.columnLayout("animo_columntoolbar", adj=True, cat=["both", 4],
            bgc=style.TOOLBAR_BG_COLOR, p="animo_formtoolbar")
        
        for i, icon_data in enumerate(bar.ICON_DATA):
            icon_file, tooltip, launcher_name, tool_folder, entry_func = icon_data[:5]
            custom_size = icon_data[5] if len(icon_data) > 5 else None
            offset = icon_data[6] if len(icon_data) > 6 else None
            menu_options = icon_data[7] if len(icon_data) > 7 else None
            
            icon_w = style.scaled(custom_size[0]) if custom_size else style.ICON_WIDTH
            icon_h = style.scaled(custom_size[1]) if custom_size else style.ICON_HEIGHT
            
            btn = cmds.iconTextButton(l="", style="iconOnly", w=icon_w, h=icon_h,
                image=self.getImage(icon_file), ann=tooltip, p="animo_columntoolbar")
            
            if menu_options:
                # Create popup menu for this button
                if icon_file == "bake_icon.png":
                    default_bake_launcher = None
                    default_bake_tool_folder = None
                    for _bake_opt in menu_options:
                        if _bake_opt[0].strip().endswith("1s"):
                            default_bake_launcher = _bake_opt[1]
                            default_bake_tool_folder = _bake_opt[2] if len(_bake_opt) > 2 else None
                            break
                    if default_bake_launcher:
                        cmds.iconTextButton(btn, edit=True,
                            c=lambda ln=default_bake_launcher, tf=default_bake_tool_folder:
                            bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                else:
                    popup = cmds.popupMenu(parent=btn, button=1)
                    popup_right = cmds.popupMenu(parent=btn, button=3)
                    for menu_item in menu_options:
                        option_name = menu_item[0]
                        option_launcher = menu_item[1]
                        option_tool_folder = menu_item[2] if len(menu_item) > 2 else None
                        if option_name == "---":
                            cmds.menuItem(divider=True, parent=popup)
                            cmds.menuItem(divider=True, parent=popup_right)
                        else:
                            cmds.menuItem(label=option_name, parent=popup,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
                            cmds.menuItem(label=option_name, parent=popup_right,
                                c=lambda x, ln=option_launcher, tf=option_tool_folder: bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, None))
            else:
                cmds.iconTextButton(btn, edit=True,
                    c=lambda ln=launcher_name, tf=tool_folder, ef=entry_func:
                    bar.run_launcher(ANIMO_DATA_PATH, ICONS_PATH, MAYA_VERSION, ln, tf, ef))
            
            try:
                btn_widget = wrapInstance(int(mui.MQtUtil.findControl(btn)), QtWidgets.QWidget)
                btn_widget.setToolTip(tooltip)
                btn_widget.installEventFilter(_tooltip_filter)
                btn_widget.setFixedSize(icon_w, icon_h)
                if offset:
                    btn_widget.setStyleSheet("margin-left: {}px; margin-right: {}px;".format(
                        max(0, offset[0]), max(0, -offset[0])))
            except:
                pass
            
            cmds.separator(style='none', height=style.ICON_SPACING_VERTICAL, p="animo_columntoolbar")
        
        dock_btn = cmds.iconTextButton(l="", style="iconOnly", w=style.scaled(16), h=style.scaled(16),
            image=self.getImage("dock_icon.png"), ann="Animo Settings", p="animo_columntoolbar")
        dock_menu = cmds.popupMenu(button=1, parent=dock_btn,
            postMenuCommand=lambda menu, *args: self._refreshDockMenu(menu))
        
        cmds.formLayout("animo_formtoolbar", edit=True,
            attachForm=[("animo_columntoolbar", "left", 0), ("animo_columntoolbar", "right", 0)],
            attachPosition=[("animo_columntoolbar", "top", 0, 50)],
            attachNone=[("animo_columntoolbar", "bottom")])
        
        total_h = (style.ICON_HEIGHT * icon_count) + (style.ICON_SPACING_VERTICAL * (icon_count + 1)) + style.scaled(16)
        cmds.formLayout("animo_formtoolbar", edit=True,
            attachPosition=[("animo_columntoolbar", "top", -(total_h // 2), 50)])


try:
    from PySide2.QtCore import QTimer
except ImportError:
    from PySide6.QtCore import QTimer

# Clean up existing workspace control
if cmds.workspaceControl(WorkspaceName, query=True, exists=True):
    cmds.deleteUI(WorkspaceName, control=True)

# Clean up ALL existing Qt toolbars (not just one)
maya_main_ptr = mui.MQtUtil.mainWindow()
if maya_main_ptr:
    maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
    # Find ALL widgets with this object name
    existing_toolbars = maya_main.findChildren(QtWidgets.QWidget, "animo_qt_toolbar")
    for existing in existing_toolbars:
        try:
            existing.hide()
            existing.setParent(None)
            existing.deleteLater()
        except:
            pass

# Module-level quit handler - cleans up Animo when Maya quits
_animo_quit_job = None
_animo_shutdown_started = False


def _force_delete_widget(widget):
    if widget is None:
        return
    try:
        widget.hide()
    except Exception:
        pass
    try:
        widget.blockSignals(True)
    except Exception:
        pass
    try:
        widget.setParent(None)
    except Exception:
        pass
    try:
        widget.deleteLater()
    except Exception:
        pass


def _animo_quit_cleanup():
    try:
        if cmds.workspaceControl('animo', exists=True):
            if cmds.workspaceControl('animo', query=True, visible=True):
                cmds.workspaceControl('animo', edit=True, visible=False)
    except:
        pass
    try:
        _animo_pre_quit()
    except Exception:
        pass

def _find_loaded_module(name):
    for mod_name, mod in list(sys.modules.items()):
        if mod is not None and mod_name.split('.')[-1] == name:
            return mod
    return None


def _animo_pre_quit():
    global tb, _animo_window_filter, _animo_quit_job
    global _tooltip_filter, _global_offset_flash_animator
    global _animo_shutdown_started

    if _animo_shutdown_started:
        return
    _animo_shutdown_started = True

    try:
        if _tooltip_filter is not None:
            _tooltip_filter._hover_check_timer.stop()
    except Exception:
        pass

    try:
        graph_mod = _find_loaded_module("graphSliderMod")
        if graph_mod is not None:
            graph_mod.stop_auto_attach_script_job()
    except Exception:
        pass

    try:
        global_offset_mod = _find_loaded_module("global_offset")
        if global_offset_mod is not None:
            global_offset_mod.kill_jobs()
    except Exception:
        pass

    try:
        tracify_mod = _find_loaded_module("tracify")
        if tracify_mod is not None:
            tracify_mod._clearJobs()
    except Exception:
        pass

    try:
        keep_center_mod = _find_loaded_module("KeepSelectionsCenter")
        if keep_center_mod is not None:
            keep_center_mod.terminateWatchers()
    except Exception:
        pass

    try:
        pickify_mod = _find_loaded_module("pickify_launcher")
        if pickify_mod is not None:
            job = getattr(pickify_mod, "_pickify_persistent_sync_job", None)
            if job and cmds.scriptJob(exists=job):
                cmds.scriptJob(kill=job, force=True)
            pickify_mod._pickify_persistent_sync_job = None
    except Exception:
        pass

    try:
        if _tooltip_filter is not None:
            _force_delete_widget(_tooltip_filter)
    except Exception:
        pass
    finally:
        _tooltip_filter = None

    try:
        if _global_offset_flash_animator is not None:
            _force_delete_widget(_global_offset_flash_animator)
    except Exception:
        pass
    finally:
        _global_offset_flash_animator = None

    try:
        if _animo_window_filter is not None:
            try:
                maya_main_ptr = mui.MQtUtil.mainWindow()
                if maya_main_ptr:
                    maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                    maya_main.removeEventFilter(_animo_window_filter)
            except Exception:
                pass
            try:
                _force_delete_widget(_animo_window_filter)
            except Exception:
                pass
    except Exception:
        pass
    finally:
        _animo_window_filter = None

    try:
        if tb is not None:
            guard = getattr(tb, '_splitter_guard', None)
            if guard is not None:
                splitter = getattr(tb, '_splitter', None)
                qt = getattr(tb, 'qt_toolbar', None)
                try:
                    if splitter is not None:
                        splitter.removeEventFilter(guard)
                except Exception:
                    pass
                try:
                    if qt is not None:
                        qt.removeEventFilter(guard)
                except Exception:
                    pass
                try:
                    _force_delete_widget(guard)
                except Exception:
                    pass
                tb._splitter_guard = None
            try:
                qt = getattr(tb, 'qt_toolbar', None)
                if qt is not None:
                    tb.qt_toolbar = None
                    _force_delete_widget(qt)
            except Exception:
                pass
    except Exception:
        pass

    _animo_quit_job = None

class _AnimoSplitterGuard(QtCore.QObject):

    def __init__(self, tb_ref, window_filter_ref):
        super(_AnimoSplitterGuard, self).__init__()
        self._tb = tb_ref
        self._wf = window_filter_ref
        self._done = False

    def _is_minimizing(self):
        try:
            wf = self._wf
            if wf is not None and wf._was_minimized:
                return True
            maya_main_ptr = mui.MQtUtil.mainWindow()
            if maya_main_ptr:
                maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                if maya_main.windowState() & QtCore.Qt.WindowMinimized:
                    return True
        except Exception:
            pass
        return False

    def eventFilter(self, obj, event):
        if self._done:
            return False
        etype = event.type()
        if etype == QtCore.QEvent.Hide:
            if self._is_minimizing():
                return False
            self._done = True
            self._pull()
        elif etype in (QtCore.QEvent.ParentAboutToChange, QtCore.QEvent.WinIdChange):
            if self._is_minimizing():
                return False
            self._done = True
            self._pull()
        return False

    def _pull(self):
        try:
            qt = getattr(self._tb, 'qt_toolbar', None)
            if qt is None:
                return
            self._tb.qt_toolbar = None
            qt.hide()
            qt.setParent(None)
            qt.deleteLater()
        except Exception:
            pass
        try:
            self.deleteLater()
        except Exception:
            pass


class _AnimoWindowStateFilter(QtCore.QObject):

    def __init__(self, tb_ref):
        super(_AnimoWindowStateFilter, self).__init__()
        self._tb = tb_ref
        self._was_minimized = False
        self._was_open = False
        self._rebuild_pending = False

    def eventFilter(self, obj, event):
        if event.type() == QtCore.QEvent.WindowStateChange:
            is_minimized = bool(obj.windowState() & QtCore.Qt.WindowMinimized)
            if is_minimized:
                self._was_minimized = True
                self._rebuild_pending = False
                try:
                    qt = getattr(self._tb, 'qt_toolbar', None)
                    self._was_open = qt is not None and qt.parent() is not None
                except Exception:
                    self._was_open = False
            elif self._was_minimized:
                self._was_minimized = False
                if self._was_open and not self._rebuild_pending:
                    self._rebuild_pending = True
                    QTimer.singleShot(300, self._rebuild)
        return False

    def _rebuild(self):
        self._rebuild_pending = False
        if _animo_shutdown_started:
            return
        try:
            maya_main_ptr = mui.MQtUtil.mainWindow()
            if maya_main_ptr:
                maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                if maya_main.windowState() & QtCore.Qt.WindowMinimized:
                    return
        except Exception:
            return
        try:
            qt = getattr(self._tb, 'qt_toolbar', None)
            if qt is not None and qt.parent() is not None:
                qt.show()
            elif qt is None or qt.parent() is None:
                self._tb.startUI()
        except Exception:
            pass


tb = None
_animo_window_filter = None
ENABLE_QUIT_SCRIPTJOB = False

def _animo_startup():
    global _animo_quit_job, tb, _animo_window_filter
    if ENABLE_QUIT_SCRIPTJOB:
        try:
            _animo_quit_job = cmds.scriptJob(event=["quitApplication", _animo_quit_cleanup])
        except:
            pass

    try:
        app = QtWidgets.QApplication.instance()
        if app:
            app.aboutToQuit.connect(_animo_pre_quit)
    except Exception:
        pass

    startup_app = QtWidgets.QApplication.instance()
    if startup_app:
        startup_app.setOverrideCursor(QtCore.Qt.WaitCursor)

    try:
        _load_anim_ref_dropper_plugin()

        _apply_saved_animo_hotkeys()

        # Restore Keep Selections at Center if it was enabled (silent restore)
        try:
            if _get_center_pivot_pref():
                def restore_center_pivot():
                    try:
                        if ICONS_PATH not in sys.path:
                            sys.path.insert(0, ICONS_PATH)
                        for mod_name in list(sys.modules.keys()):
                            if 'KeepSelectionsCenter' in mod_name:
                                del sys.modules[mod_name]
                        import KeepSelectionsCenter
                        KeepSelectionsCenter.activateCenterPivot()
                    except:
                        pass
                QTimer.singleShot(500, restore_center_pivot)
        except:
            pass

        tb = toolbar()

        try:
            maya_main_ptr = mui.MQtUtil.mainWindow()
            if maya_main_ptr:
                maya_main = wrapInstance(int(maya_main_ptr), QtWidgets.QMainWindow)
                _animo_window_filter = _AnimoWindowStateFilter(tb)
                maya_main.installEventFilter(_animo_window_filter)
        except Exception:
            pass
    finally:
        if startup_app:
            startup_app.restoreOverrideCursor()

    QTimer.singleShot(200, tb.startUI)
    QTimer.singleShot(500, lambda: _apply_overshoot_to_all_sliders(slider_utils.is_overshoot_enabled()))
    QTimer.singleShot(500, graphSliderMod.start_auto_attach_script_job)


QTimer.singleShot(0, _animo_startup)

try:
    from Animo_AnimRef import animref_launcher
except Exception:
    try:
        import animref_launcher
    except Exception:
        animref_launcher = None

def launch_animref():
    if animref_launcher and hasattr(animref_launcher, 'launch'):
        animref_launcher.launch()