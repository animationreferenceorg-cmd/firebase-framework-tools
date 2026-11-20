"""
AnimationReference.org Studio Plugin for Autodesk Maya — Drag & Drop Installer.

Usage:
    Unzip animref_maya_plugin.zip, then drag and drop this file
    (drag_and_drop_install.py) directly into the Autodesk Maya viewport.

Supports Maya 2022–2027 (Python 3, PySide2 & PySide6) on Windows, macOS, and Linux.
"""

from __future__ import absolute_import, division, print_function

import os
import shutil
import sys


def _get_maya_scripts_dir():
    import maya.cmds as cmds

    user_scripts = cmds.internalVar(userScriptDir=True) or ""
    if user_scripts:
        # Prefer the version-independent maya/scripts folder when it exists
        shared_scripts = os.path.normpath(os.path.join(user_scripts, "..", "..", "scripts"))
        if os.path.isdir(shared_scripts):
            return shared_scripts
        return os.path.normpath(user_scripts)
    return os.path.normpath(os.path.join(os.path.expanduser("~"), "Documents", "maya", "scripts"))


def _find_source_package(installer_dir):
    candidates = [
        os.path.join(installer_dir, "Animo_Data", "Animo_AnimRef"),
        os.path.join(installer_dir, "Animo_AnimRef"),
    ]
    for path in candidates:
        if os.path.isdir(path) and os.path.isfile(os.path.join(path, "animref_launcher.py")):
            return path
    return None


def install(installer_dir=None):
    import maya.cmds as cmds

    if not installer_dir:
        installer_dir = os.path.dirname(os.path.abspath(__file__))

    src_pkg = _find_source_package(installer_dir)
    if not src_pkg:
        cmds.confirmDialog(
            title="Animation Reference Installer",
            message=(
                "Could not locate the Animo_AnimRef package next to drag_and_drop_install.py.\n\n"
                "Please unzip the full animref_maya_plugin.zip archive before dragging the installer into Maya."
            ),
            button=["OK"],
            icon="critical",
        )
        return False

    scripts_dir = _get_maya_scripts_dir()
    animo_data_dir = os.path.join(scripts_dir, "Animo_Data")
    dest_pkg = os.path.join(animo_data_dir, "Animo_AnimRef")

    os.makedirs(animo_data_dir, exist_ok=True)
    if os.path.isdir(dest_pkg):
        shutil.rmtree(dest_pkg, ignore_errors=True)
    shutil.copytree(
        src_pkg,
        dest_pkg,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo", ".DS_Store"),
    )

    if animo_data_dir not in sys.path:
        sys.path.insert(0, animo_data_dir)
    if dest_pkg not in sys.path:
        sys.path.insert(0, dest_pkg)

    for mod_name in list(sys.modules.keys()):
        if "animref" in mod_name.lower():
            del sys.modules[mod_name]

    from Animo_AnimRef import add_animref_shelf, animref_launcher

    add_animref_shelf.add_to_shelf()
    animref_launcher.launch(force_new=True)

    cmds.inViewMessage(
        amg='<span style="color:#a78bfa; font-weight:bold;">Animation Reference Studio installed!</span> Shelf button added.',
        pos="midCenter",
        fade=True,
        fst=350,
        fad=500,
    )
    print("[AnimRef] Installed to:", dest_pkg)
    return True


def onMayaDroppedPythonFile(*args, **kwargs):
    """Entry point invoked automatically by Autodesk Maya on drag-and-drop."""
    install()


if __name__ == "__main__":
    install()
