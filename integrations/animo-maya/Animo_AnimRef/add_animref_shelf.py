from __future__ import absolute_import, division, print_function

import os
import sys

try:
    import maya.cmds as cmds
except ImportError:
    cmds = None


SHELF_NAME = "AnimRef"


def get_animo_data_path():
    version_scripts = ""
    if cmds and hasattr(cmds, "internalVar"):
        try:
            version_scripts = cmds.internalVar(userScriptDir=True) or ""
        except Exception:
            version_scripts = ""
    candidates = []
    if version_scripts:
        candidates.extend([
            os.path.normpath(os.path.join(version_scripts, "..", "..", "scripts", "Animo_Data")),
            os.path.normpath(os.path.join(version_scripts, "Animo_Data")),
        ])
    candidates.extend([
        os.path.normpath(os.path.join(os.path.expanduser("~"), "OneDrive", "Documents", "maya", "scripts", "Animo_Data")),
        os.path.normpath(os.path.join(os.path.expanduser("~"), "Documents", "maya", "scripts", "Animo_Data")),
    ])
    for c in candidates:
        if os.path.isdir(c):
            return c
    return candidates[0] if candidates else ""


def _resolve_launcher_icon():
    animo_data_path = get_animo_data_path()
    for rel in (
        os.path.join("Animo_AnimRef", "animref_icon.png"),
        os.path.join("Animo_Launcher", "animref_icon.png"),
    ):
        cand = os.path.normpath(os.path.join(animo_data_path, rel))
        if os.path.exists(cand):
            return cand
    return "playblast.png"


def _bootstrap_header():
    return (
        "import sys, os, maya.cmds as cmds\n"
        "vs = cmds.internalVar(userScriptDir=True) if cmds else ''\n"
        "cands = [\n"
        "    os.path.normpath(os.path.join(vs, '..', '..', 'scripts', 'Animo_Data')),\n"
        "    os.path.normpath(os.path.join(vs, 'Animo_Data')),\n"
        "    os.path.normpath(os.path.join(os.path.expanduser('~'), 'OneDrive', 'Documents', 'maya', 'scripts', 'Animo_Data')),\n"
        "    os.path.normpath(os.path.join(os.path.expanduser('~'), 'Documents', 'maya', 'scripts', 'Animo_Data')),\n"
        "]\n"
        "ad = next((c for c in cands if os.path.isdir(c)), cands[0])\n"
        "tp = os.path.normpath(os.path.join(ad, 'Animo_AnimRef'))\n"
        "for p in (ad, tp):\n"
        "    if p not in sys.path: sys.path.insert(0, p)\n"
    )


def _plane_action_cmd(action_code):
    return (
        _bootstrap_header()
        + "from Animo_AnimRef import animref_importer\n"
        + "node = animref_importer.get_active_or_latest_plane()\n"
        + "if not node:\n"
        + "    cmds.inViewMessage(amg='No AnimRef plane in scene — click <hl style=\"color:#a78bfa;\">AnimRef</hl> to import one.', pos='topCenter', fade=True)\n"
        + "else:\n"
        + "    " + action_code.replace("\n", "\n    ") + "\n"
    )


def ensure_animref_shelf(select=True, notify=False):
    """
    Create (or refresh) the dedicated top 'AnimRef' Maya shelf with live reference
    plane controls matching Blender's Scene Plane Controller.
    """
    if not cmds or not hasattr(cmds, "shelfTabLayout") or not hasattr(cmds, "shelfLayout"):
        return False

    try:
        if not cmds.shelfTabLayout("ShelfLayout", query=True, exists=True):
            return False

        # Create dedicated 'AnimRef' shelf tab if it does not exist yet
        if not cmds.shelfLayout(SHELF_NAME, query=True, exists=True):
            cmds.shelfLayout(SHELF_NAME, parent="ShelfLayout")
        else:
            # Clear existing AnimRef buttons so we always have the latest clean toolbar
            existing = cmds.shelfLayout(SHELF_NAME, query=True, childArray=True) or []
            for child in existing:
                try:
                    cmds.deleteUI(child)
                except Exception:
                    pass

        launcher_cmd = (
            _bootstrap_header()
            + "for m in list(sys.modules.keys()):\n"
            + "    if 'animref' in m.lower(): del sys.modules[m]\n"
            + "from Animo_AnimRef import animref_launcher\n"
            + "animref_launcher.launch(force_new=True)\n"
        )

        buttons = [
            (
                "AnimRef",
                "Studio",
                _resolve_launcher_icon(),
                launcher_cmd,
                "Open AnimationReference.org Studio Window",
            ),
            (
                "Center",
                "0,0,0",
                "move_M.png",
                _plane_action_cmd("animref_importer.center_plane_origin(node)"),
                "Center reference plane at world origin (0, 0, 0)",
            ),
            (
                "Frame",
                "Frame",
                "zoom.png",
                _plane_action_cmd("cmds.select(node, replace=True); cmds.viewFit(node)"),
                "Frame / focus the reference plane in the active viewport",
            ),
            (
                "Align",
                "Align",
                "timeplay.png",
                _plane_action_cmd(
                    "off = animref_importer.sync_plane_to_current_frame(node, ref_frame=1)\n"
                    "cmds.inViewMessage(amg='Aligned reference start to current frame (offset: <hl style=\"color:#a78bfa;\">{:+d}f</hl>)'.format(off), pos='topCenter', fade=True)"
                ),
                "Magic Align: start reference clip at Maya's current timeline frame",
            ),
            (
                "-5f",
                "-5f",
                "timerew.png",
                _plane_action_cmd(
                    "off = animref_importer.nudge_plane_offset(node, -5)\n"
                    "cmds.inViewMessage(amg='Ref Offset: <hl style=\"color:#a78bfa;\">{:+d}f</hl>'.format(off), pos='topCenter', fade=True)"
                ),
                "Shift reference timing -5 frames",
            ),
            (
                "-1f",
                "-1f",
                "timeprev.png",
                _plane_action_cmd(
                    "off = animref_importer.nudge_plane_offset(node, -1)\n"
                    "cmds.inViewMessage(amg='Ref Offset: <hl style=\"color:#a78bfa;\">{:+d}f</hl>'.format(off), pos='topCenter', fade=True)"
                ),
                "Shift reference timing -1 frame",
            ),
            (
                "+1f",
                "+1f",
                "timenext.png",
                _plane_action_cmd(
                    "off = animref_importer.nudge_plane_offset(node, 1)\n"
                    "cmds.inViewMessage(amg='Ref Offset: <hl style=\"color:#a78bfa;\">{:+d}f</hl>'.format(off), pos='topCenter', fade=True)"
                ),
                "Shift reference timing +1 frame",
            ),
            (
                "+5f",
                "+5f",
                "timefwd.png",
                _plane_action_cmd(
                    "off = animref_importer.nudge_plane_offset(node, 5)\n"
                    "cmds.inViewMessage(amg='Ref Offset: <hl style=\"color:#a78bfa;\">{:+d}f</hl>'.format(off), pos='topCenter', fade=True)"
                ),
                "Shift reference timing +5 frames",
            ),
            (
                "0f",
                "0f",
                "timestart.png",
                _plane_action_cmd(
                    "animref_importer.reset_plane_to_zero(node)\n"
                    "cmds.inViewMessage(amg='Ref reset to <hl style=\"color:#a78bfa;\">Frame 0</hl>', pos='topCenter', fade=True)"
                ),
                "Reset reference clip start to Maya Frame 0",
            ),
            (
                "Flip",
                "Flip",
                "polyFlipUV.png",
                _plane_action_cmd(
                    "animref_importer.toggle_plane_mirror(node)\n"
                    "cmds.inViewMessage(amg='Flipped reference horizontally', pos='topCenter', fade=True)"
                ),
                "Flip / mirror reference plane horizontally",
            ),
            (
                "Alpha",
                "Alpha",
                "layeredTexture.svg",
                _plane_action_cmd("animref_importer.cycle_plane_opacity(node)"),
                "Cycle reference opacity (100% / 75% / 50% / 25%)",
            ),
            (
                "Lock",
                "Lock",
                "Lock_OFF_grey.png",
                _plane_action_cmd("animref_importer.toggle_plane_lock_hud(node)"),
                "Lock / Unlock reference plane (unselectable reference mode)",
            ),
            (
                "Hide",
                "Hide",
                "hidden.png",
                _plane_action_cmd("animref_importer.toggle_plane_visibility(node)"),
                "Show / Hide reference plane",
            ),
            (
                "Del",
                "Del",
                "delete.png",
                _plane_action_cmd(
                    "cmds.delete(node)\n"
                    "cmds.inViewMessage(amg='Deleted reference plane', pos='topCenter', fade=True)"
                ),
                "Delete active reference plane from scene",
            ),
        ]

        for label, overlay, icon, cmd_str, tip in buttons:
            kwargs = {
                "parent": SHELF_NAME,
                "image": icon,
                "label": label,
                "imageOverlayLabel": overlay,
                "overlayLabelColor": (0.95, 0.95, 0.98),
                "overlayLabelBackColor": (0.10, 0.08, 0.18, 0.85),
                "command": cmd_str,
                "sourceType": "python",
                "annotation": tip,
            }
            try:
                cmds.shelfButton(**kwargs)
            except Exception:
                # Fallback if a specific Maya version lacks a built-in icon name
                kwargs["image"] = "commandButton.png"
                cmds.shelfButton(**kwargs)

        if select:
            try:
                cmds.shelfTabLayout("ShelfLayout", edit=True, selectTab=SHELF_NAME)
            except Exception:
                pass

        if notify and hasattr(cmds, "inViewMessage"):
            cmds.inViewMessage(
                amg='<span style="color:#a78bfa; font-weight:bold;">AnimRef Shelf ready on top!</span>',
                pos="topCenter",
                fade=True,
                fst=250,
                fad=400,
            )
        return True
    except Exception as e:
        print("[AnimRef Shelf] " + str(e))
        return False


def remove_animref_shelf():
    """Remove the dedicated top 'AnimRef' Maya shelf if present."""
    if not cmds or not hasattr(cmds, "shelfLayout"):
        return False
    try:
        if cmds.shelfLayout(SHELF_NAME, query=True, exists=True):
            cmds.deleteUI(SHELF_NAME, layout=True)
            return True
    except Exception:
        pass
    return False


def add_to_shelf(shelf_name=None):
    """Creates/updates the dedicated AnimRef top shelf with live plane controls."""
    return ensure_animref_shelf(select=True, notify=True)


def main():
    add_to_shelf()


if __name__ == "__main__":
    add_to_shelf()
