from __future__ import absolute_import, division, print_function

import os
import sys
import time
import importlib

try:
    from PySide6 import QtWidgets, QtCore
    from shiboken6 import wrapInstance
except ImportError:
    try:
        from PySide2 import QtWidgets, QtCore
        from shiboken2 import wrapInstance
    except ImportError:
        QtWidgets = None
        QtCore = None
        wrapInstance = None

try:
    import maya.cmds as cmds
    import maya.OpenMayaUI as omui
except ImportError:
    cmds = None
    omui = None


_last_launch_time = 0
_current_window = None


def get_maya_main_window():
    if not (QtWidgets and hasattr(QtWidgets, "QApplication") and QtWidgets.QApplication.instance()):
        return None
    if omui and wrapInstance and QtWidgets:
        try:
            main_ptr = omui.MQtUtil.mainWindow()
            if main_ptr:
                return wrapInstance(int(main_ptr), QtWidgets.QMainWindow)
        except Exception:
            pass
    return None


def close_existing_windows():
    """Ensure strictly single-instance: closes any existing open AnimRef windows."""
    global _current_window

    # 1. Close globally tracked reference in animref_window
    for mod_name in ("Animo_AnimRef.animref_window", "animref_window"):
        if mod_name in sys.modules:
            try:
                mod = sys.modules[mod_name]
                inst = getattr(mod, "_window_instance", None)
                if inst is not None:
                    try:
                        inst.close()
                        inst.deleteLater()
                    except Exception:
                        pass
                    mod._window_instance = None
            except Exception:
                pass

    if _current_window is not None:
        try:
            _current_window.close()
            _current_window.deleteLater()
        except Exception:
            pass
        _current_window = None

    # 2. Close any child windows of Maya MainWindow
    main_win = get_maya_main_window()
    if main_win:
        try:
            for child in main_win.children():
                if isinstance(child, QtWidgets.QWidget):
                    try:
                        if child.objectName() == "AnimRefUIWindow":
                            child.close()
                            child.deleteLater()
                    except (RuntimeError, AttributeError):
                        pass
        except Exception:
            pass

    # 3. Close any top-level widgets
    if QtWidgets and hasattr(QtWidgets, "QApplication") and QtWidgets.QApplication.instance():
        try:
            for widget in QtWidgets.QApplication.topLevelWidgets():
                try:
                    if widget and getattr(widget, "objectName", lambda: "")() == "AnimRefUIWindow":
                        widget.close()
                        widget.deleteLater()
                except (RuntimeError, AttributeError):
                    pass
        except Exception:
            pass

    # 4. Close Maya workspaceControl if docked
    if cmds and hasattr(cmds, "workspaceControl"):
        try:
            if cmds.workspaceControl("AnimRefWorkspaceControl", query=True, exists=True):
                cmds.workspaceControl("AnimRefWorkspaceControl", edit=True, visible=False)
                cmds.deleteUI("AnimRefWorkspaceControl", control=True)
        except Exception:
            pass


def get_existing_active_window():
    """Return an active, valid AnimRef window if one is already open."""
    global _current_window

    for mod_name in ("Animo_AnimRef.animref_window", "animref_window"):
        if mod_name in sys.modules:
            mod = sys.modules[mod_name]
            inst = getattr(mod, "_window_instance", None)
            if inst is not None:
                try:
                    if inst.isVisible():
                        _current_window = inst
                        return inst
                except (RuntimeError, AttributeError):
                    pass

    if _current_window is not None:
        try:
            if _current_window.isVisible():
                return _current_window
        except (RuntimeError, AttributeError):
            _current_window = None

    main_win = get_maya_main_window()
    if main_win:
        try:
            for child in main_win.children():
                if isinstance(child, QtWidgets.QWidget):
                    try:
                        if child.objectName() == "AnimRefUIWindow" and child.isVisible():
                            _current_window = child
                            return child
                    except (RuntimeError, AttributeError):
                        pass
        except Exception:
            pass

    if QtWidgets and hasattr(QtWidgets, "QApplication"):
        try:
            for widget in QtWidgets.QApplication.topLevelWidgets():
                try:
                    if widget and getattr(widget, "objectName", lambda: "")() == "AnimRefUIWindow" and widget.isVisible():
                        _current_window = widget
                        return widget
                except (RuntimeError, AttributeError):
                    pass
        except Exception:
            pass

    return None


_LOADED_MTIMES = {}


def _reload_if_updated():
    """Reloads animref_* modules when their source files on disk have been updated."""
    import importlib
    order = ["animref_auth", "animref_api", "animref_importer", "animref_playblast", "animref_window"]
    any_reloaded = False
    for short_name in order:
        mod = None
        for cand in ("Animo_AnimRef." + short_name, short_name):
            if cand in sys.modules:
                mod = sys.modules[cand]
                break
        if mod is None:
            continue
        mfile = getattr(mod, "__file__", None)
        if not mfile:
            continue
        py_file = mfile[:-1] if mfile.endswith(".pyc") else mfile
        if not os.path.isfile(py_file):
            continue
        try:
            mtime = os.path.getmtime(py_file)
        except OSError:
            continue
        prev = _LOADED_MTIMES.get(py_file)
        if prev is not None and (mtime > prev or any_reloaded):
            try:
                importlib.reload(mod)
                any_reloaded = True
            except Exception:
                pass
        _LOADED_MTIMES[py_file] = mtime


def launch(dock=True, force_new=False):
    global _last_launch_time, _current_window

    now = time.time()
    elapsed = now - _last_launch_time
    _last_launch_time = now

    # Single-instance debounce: if launch was called within 1.2s (such as when
    # 'import animref_launcher' self-starts and is immediately followed by
    # 'animref_launcher.launch()'), activate and return the existing window.
    if not force_new and elapsed < 1.2:
        existing = get_existing_active_window()
        if existing is not None:
            try:
                existing.show()
                existing.raise_()
                existing.activateWindow()
                return existing
            except Exception:
                pass

    this_dir = os.path.dirname(os.path.abspath(__file__))
    if this_dir not in sys.path:
        sys.path.insert(0, this_dir)

    parent_dir = os.path.normpath(os.path.join(this_dir, ".."))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    animref_dir = os.path.normpath(os.path.join(parent_dir, "Animo_AnimRef"))
    if os.path.isdir(animref_dir) and animref_dir not in sys.path:
        sys.path.insert(0, animref_dir)

    close_existing_windows()
    _reload_if_updated()

    try:
        from Animo_AnimRef import animref_window
        win = animref_window.show_window(dock=dock)
    except ImportError:
        import animref_window
        win = animref_window.show_window(dock=dock)

    _reload_if_updated()
    _current_window = win
    return win


def show():
    return launch()

def main():
    return launch()

def ui():
    return launch()

def run():
    return launch()

def add_animref_shelf():
    try:
        from Animo_AnimRef import add_animref_shelf as _aas
        _aas.add_to_shelf()
    except Exception:
        pass

def add_to_shelf():
    add_animref_shelf()


def _is_running_in_test():
    if "unittest" in sys.modules or "pytest" in sys.modules:
        return True
    if cmds and hasattr(cmds, "about"):
        try:
            if cmds.about(batch=True):
                return True
        except Exception:
            pass
    return False


# Self-start so Animo toolbar and direct execution open the window immediately.
# When running unit tests or batch/headless Maya, suppress self-start.
# The 1.2s debounce guard ensures any consecutive launch() call safely focuses the single window.
if not _is_running_in_test() and __name__ in ("__main__", "animref_launcher"):
    launch()
