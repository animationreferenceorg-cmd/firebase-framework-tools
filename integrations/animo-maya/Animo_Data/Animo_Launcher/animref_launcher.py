from __future__ import absolute_import, division, print_function

import os
import sys
import importlib

def launch():
    this_dir = os.path.dirname(os.path.abspath(__file__))
    if this_dir not in sys.path:
        sys.path.insert(0, this_dir)

    parent_dir = os.path.normpath(os.path.join(this_dir, ".."))
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)

    animref_dir = os.path.normpath(os.path.join(parent_dir, "Animo_AnimRef"))
    if os.path.isdir(animref_dir) and animref_dir not in sys.path:
        sys.path.insert(0, animref_dir)

    modules_to_reload = [
        "Animo_AnimRef.animref_api",
        "Animo_AnimRef.animref_importer",
        "Animo_AnimRef.animref_auth",
        "Animo_AnimRef.animref_playblast",
        "Animo_AnimRef.animref_window",
        "animref_api",
        "animref_importer",
        "animref_auth",
        "animref_playblast",
        "animref_window",
    ]
    for mod_name in modules_to_reload:
        if mod_name in sys.modules:
            try:
                importlib.reload(sys.modules[mod_name])
            except Exception:
                pass

    try:
        from Animo_AnimRef import animref_window
        return animref_window.show_window()
    except ImportError:
        import animref_window
        return animref_window.show_window()

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

if __name__ in ("__main__", "animref_launcher"):
    launch()
