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
        animref_window.show_window()
    except ImportError:
        import animref_window
        animref_window.show_window()

if __name__ == "__main__":
    launch()
