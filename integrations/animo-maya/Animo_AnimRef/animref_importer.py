from __future__ import absolute_import, division, print_function

import os
import sys
import re
import glob
import hashlib
import platform
import subprocess
import shutil

try:
    import maya.cmds as cmds
    import maya.OpenMayaUI as omui
except ImportError:
    cmds = None
    omui = None


PIP_PRESETS = {
    "full": {
        "label": "Full Frame",
        "fit": 4,
        "sizeX": 1.0,
        "sizeY": 0.5625,
        "offsetX": 0.0,
        "offsetY": 0.0,
    },
    "top_right": {
        "label": "PiP: Top-Right",
        "fit": 0,
        "sizeX": 0.55,
        "sizeY": 0.35,
        "offsetX": 0.42,
        "offsetY": 0.26,
    },
    "top_left": {
        "label": "PiP: Top-Left",
        "fit": 0,
        "sizeX": 0.55,
        "sizeY": 0.35,
        "offsetX": -0.42,
        "offsetY": 0.26,
    },
    "bottom_right": {
        "label": "PiP: Bottom-Right",
        "fit": 0,
        "sizeX": 0.55,
        "sizeY": 0.35,
        "offsetX": 0.42,
        "offsetY": -0.26,
    },
    "bottom_left": {
        "label": "PiP: Bottom-Left",
        "fit": 0,
        "sizeX": 0.55,
        "sizeY": 0.35,
        "offsetX": -0.42,
        "offsetY": -0.26,
    },
}

POSE_BOOKMARK_PRESETS = {
    "Anticipation": (0.96, 0.62, 0.04),
    "Contact": (0.00, 0.90, 1.00),
    "Passing": (0.65, 0.55, 0.98),
    "Breakdown": (0.06, 0.73, 0.51),
    "Extreme": (0.94, 0.27, 0.27),
    "Overshoot": (0.93, 0.28, 0.60),
}

_PREV_TIMELINE_RANGE = None


def get_animo_data_path():
    if cmds:
        try:
            version_script_dir = cmds.internalVar(userScriptDir=True)
            script_dir = os.path.normpath(os.path.join(version_script_dir, "..", "..", "scripts"))
            candidate = os.path.join(script_dir, "Animo_Data")
            if os.path.isdir(candidate):
                return candidate
        except Exception:
            pass

    module_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.normpath(os.path.join(module_dir, ".."))
    if os.path.basename(parent_dir) == "Animo_Data":
        return parent_dir

    return os.path.join(os.path.expanduser("~"), "maya", "scripts", "Animo_Data")


def locate_ffmpeg():
    env_path = os.environ.get("ANIMO_FFMPEG_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path

    animo_data = get_animo_data_path()
    bundled_candidates = [
        os.path.join(animo_data, "Animo_Reference_Dropper", "ffmpeg.exe" if os.name == "nt" else "ffmpeg"),
        os.path.join(animo_data, "Animo_Reference_Dropper", "mac", "ffmpeg"),
        os.path.join(animo_data, "Animo_Reference_Dropper", "linux", "ffmpeg"),
    ]
    for c in bundled_candidates:
        if os.path.isfile(c):
            return c

    on_path = shutil.which("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if on_path:
        return on_path

    if os.name == "nt":
        std_win = [
            os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "ffmpeg", "bin", "ffmpeg.exe"),
            os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "ffmpeg", "bin", "ffmpeg.exe"),
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
        ]
        for w in std_win:
            if os.path.isfile(w):
                return w

    return None


def get_video_duration_seconds(ffmpeg_path, video_path):
    """Inspects video metadata via ffmpeg to determine exact duration in seconds."""
    if not ffmpeg_path or not os.path.isfile(ffmpeg_path) or not video_path or not os.path.isfile(video_path):
        return None
    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    try:
        command = [ffmpeg_path, "-i", video_path]
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            startupinfo=startupinfo,
            timeout=5
        )
        output = result.stdout.decode("utf-8", "ignore")
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", output)
        if not match:
            return None
        hours, minutes, seconds = match.groups()
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    except Exception:
        return None


def get_scene_fps():
    if not cmds:
        return 24.0

    unit = cmds.currentUnit(query=True, time=True)
    fps_map = {
        "film": 24.0,
        "pal": 25.0,
        "ntsc": 30.0,
        "game": 15.0,
        "show": 48.0,
        "palf": 50.0,
        "ntscf": 60.0,
        "23.976fps": 23.976,
        "24fps": 24.0,
        "25fps": 25.0,
        "29.97fps": 29.97,
        "30fps": 30.0,
        "48fps": 48.0,
        "50fps": 50.0,
        "59.94fps": 59.94,
        "60fps": 60.0,
    }
    return fps_map.get(unit, 24.0)


def get_scene_cameras():
    if not cmds or not hasattr(cmds, "ls"):
        return ["persp"]
    try:
        cams = []
        for c in cmds.ls(type="camera") or []:
            parent = cmds.listRelatives(c, parent=True)
            if parent:
                cams.append(parent[0])
        return sorted(list(set(cams)))
    except Exception:
        return ["persp"]


def resolve_camera_shape(target):
    if not cmds:
        return "perspShape"

    if target == "new_cam":
        cam_nodes = cmds.camera(name="animref_cam")
        return cam_nodes[1]

    cam_name = target
    if target in ("current", "active", "Current Viewport"):
        # Check all visible model panels for the active camera
        for p in cmds.getPanel(visiblePanels=True) or []:
            if cmds.getPanel(typeOf=p) == "modelPanel":
                cam = cmds.modelPanel(p, query=True, camera=True)
                if cam:
                    cam_name = cam
                    break
        if not cam_name or cam_name in ("current", "active", "Current Viewport"):
            cam_name = "persp"

    if cmds.objExists(cam_name):
        if cmds.nodeType(cam_name) == "camera":
            return cam_name
        shapes = cmds.listRelatives(cam_name, shapes=True, type="camera")
        if shapes:
            return shapes[0]

    if cmds.objExists("perspShape"):
        return "perspShape"

    return cam_name


def sanitize_name(name):
    cleaned = re.sub(r"[^A-Za-z0-9_]+", "_", name)
    cleaned = re.sub(r"_+", "_", cleaned).strip("_")
    return cleaned[:30] if cleaned else "animref"


def _resolve_plane_pair(node):
    """Returns (transform_node, shape_node) for an imagePlane node or transform."""
    if not cmds or not node or not cmds.objExists(node):
        return None, None

    ntype = cmds.nodeType(node)
    if ntype == "imagePlane":
        parents = cmds.listRelatives(node, parent=True) or []
        return (parents[0] if parents else node), node

    shapes = cmds.listRelatives(node, shapes=True, type="imagePlane") or []
    if shapes:
        return node, shapes[0]

    # Fallback if Maya created imagePlane with non-standard hierarchy
    children = cmds.listRelatives(node, children=True) or []
    for ch in children:
        if cmds.nodeType(ch) == "imagePlane":
            return node, ch

    return node, node


def normalize_pip_key(preset):
    if not preset:
        return "full"
    p = str(preset).strip().lower()
    if p in PIP_PRESETS:
        return p
    for key, cfg in PIP_PRESETS.items():
        if cfg["label"].lower() == p:
            return key
    if "top" in p and "right" in p:
        return "top_right"
    if "top" in p and "left" in p:
        return "top_left"
    if "bottom" in p and "right" in p:
        return "bottom_right"
    if "bottom" in p and "left" in p:
        return "bottom_left"
    return "full"


def apply_pip_preset(plane_node, preset="full"):
    """Applies a Viewport Corner PiP or Full Frame preset to a camera image plane."""
    if not cmds:
        return False
    transform, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return False

    key = normalize_pip_key(preset)
    cfg = PIP_PRESETS.get(key, PIP_PRESETS["full"])
    try:
        cmds.setAttr(shape + ".fit", cfg["fit"])
        cmds.setAttr(shape + ".sizeX", cfg["sizeX"])
        cmds.setAttr(shape + ".sizeY", cfg["sizeY"])
        cmds.setAttr(shape + ".offsetX", cfg["offsetX"])
        cmds.setAttr(shape + ".offsetY", cfg["offsetY"])
        if transform:
            if not cmds.attributeQuery("animref_pip_preset", node=transform, exists=True):
                cmds.addAttr(transform, ln="animref_pip_preset", dt="string")
            cmds.setAttr(transform + ".animref_pip_preset", key, type="string")
        return True
    except Exception:
        return False


def set_plane_opacity(plane_node, opacity=1.0):
    """Sets the alphaGain (opacity) of an imagePlane between 0.05 and 1.0."""
    if not cmds:
        return False
    _, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return False
    clamped = max(0.05, min(1.0, float(opacity)))
    try:
        cmds.setAttr(shape + ".alphaGain", clamped)
        return True
    except Exception:
        return False


def set_plane_depth(plane_node, depth=100.0):
    """Sets the camera depth of an imagePlane."""
    if not cmds:
        return False
    _, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return False
    try:
        cmds.setAttr(shape + ".depth", max(0.1, float(depth)))
        return True
    except Exception:
        return False


def toggle_plane_mirror(plane_node, mirrored=None):
    """Flips an imagePlane horizontally (either 3D transform scaleX or imagePlane sizeX)."""
    if not cmds:
        return False
    transform, shape = _resolve_plane_pair(plane_node)
    if not transform:
        return False

    current_mirrored = False
    try:
        if cmds.attributeQuery("animref_mirrored", node=transform, exists=True):
            current_mirrored = bool(cmds.getAttr(transform + ".animref_mirrored"))
        else:
            sx = cmds.getAttr(transform + ".scaleX")
            current_mirrored = (sx < 0)
    except Exception:
        pass

    target_state = (not current_mirrored) if mirrored is None else bool(mirrored)

    try:
        sx = abs(float(cmds.getAttr(transform + ".scaleX") or 1.0))
        cmds.setAttr(transform + ".scaleX", -sx if target_state else sx)
    except Exception:
        pass

    try:
        if shape and cmds.attributeQuery("sizeX", node=shape, exists=True):
            sz_x = abs(float(cmds.getAttr(shape + ".sizeX") or 1.0))
            cmds.setAttr(shape + ".sizeX", -sz_x if target_state else sz_x)
    except Exception:
        pass

    try:
        if not cmds.attributeQuery("animref_mirrored", node=transform, exists=True):
            cmds.addAttr(transform, ln="animref_mirrored", at="bool")
        cmds.setAttr(transform + ".animref_mirrored", target_state)
    except Exception:
        pass

    return target_state


def toggle_plane_visibility(plane_node, visible=None):
    """Toggles visibility of a scene reference image plane."""
    if not cmds:
        return False
    transform, shape = _resolve_plane_pair(plane_node)
    if not transform:
        return False

    try:
        cur_vis = bool(cmds.getAttr(transform + ".visibility"))
    except Exception:
        cur_vis = True

    new_vis = (not cur_vis) if visible is None else bool(visible)
    try:
        cmds.setAttr(transform + ".visibility", new_vis)
    except Exception:
        pass
    try:
        if shape:
            cmds.setAttr(shape + ".displayMode", 3 if new_vis else 0)
    except Exception:
        pass
    return new_vis


def delete_plane(plane_node):
    """Deletes an AnimRef plane from the Maya scene."""
    if not cmds:
        return False
    transform, shape = _resolve_plane_pair(plane_node)
    target = transform or shape
    if target and cmds.objExists(target):
        try:
            cmds.delete(target)
            return True
        except Exception:
            return False
    return False


def toggle_plane_lock(plane_node, locked=None):
    """Toggles Maya display-override Reference lock so the plane cannot be accidentally selected."""
    if not cmds:
        return False
    transform, _ = _resolve_plane_pair(plane_node)
    if not transform or not cmds.objExists(transform):
        return False

    cur_locked = False
    try:
        if cmds.attributeQuery("animref_locked", node=transform, exists=True):
            cur_locked = bool(cmds.getAttr(transform + ".animref_locked"))
        else:
            cur_locked = bool(cmds.getAttr(transform + ".overrideEnabled")) and int(cmds.getAttr(transform + ".overrideDisplayType") or 0) == 2
    except Exception:
        pass

    target_state = (not cur_locked) if locked is None else bool(locked)
    try:
        cmds.setAttr(transform + ".overrideEnabled", target_state)
        cmds.setAttr(transform + ".overrideDisplayType", 2 if target_state else 0)
    except Exception:
        pass

    try:
        if not cmds.attributeQuery("animref_locked", node=transform, exists=True):
            cmds.addAttr(transform, ln="animref_locked", at="bool")
        cmds.setAttr(transform + ".animref_locked", target_state)
    except Exception:
        pass
    return target_state


def focus_plane_in_viewport(plane_node):
    """Selects the reference plane and frames it in Maya's active viewport."""
    if not cmds:
        return False
    transform, _ = _resolve_plane_pair(plane_node)
    if not transform or not cmds.objExists(transform):
        return False
    try:
        cmds.select(transform, replace=True)
        if hasattr(cmds, "viewFit"):
            cmds.viewFit(transform, animate=False)
        return True
    except Exception:
        return False


def snap_plane_to_active_camera(plane_node, distance=28.0):
    """Positions a Free 3D Card cleanly in front-left of the active viewport camera and aims it."""
    if not cmds:
        return False
    transform, _ = _resolve_plane_pair(plane_node)
    if not transform or not cmds.objExists(transform):
        return False

    cam_xform = None
    try:
        panel = cmds.getPanel(withFocus=True) if hasattr(cmds, "getPanel") else None
        if panel and cmds.getPanel(typeOf=panel) == "modelPanel":
            cam_xform = cmds.modelPanel(panel, query=True, camera=True)
        if not cam_xform:
            for p in cmds.getPanel(visiblePanels=True) or []:
                if cmds.getPanel(typeOf=p) == "modelPanel":
                    cam_xform = cmds.modelPanel(p, query=True, camera=True)
                    break
    except Exception:
        cam_xform = None

    if not cam_xform:
        cam_xform = "persp"

    try:
        m = cmds.xform(cam_xform, query=True, worldSpace=True, matrix=True)
        # Camera basis vectors in Maya world space (row-major 4x4)
        rx, ry, rz = m[0], m[1], m[2]
        ux, uy, uz = m[4], m[5], m[6]
        bx, by, bz = m[8], m[9], m[10]  # +Z points behind camera; -Z is forward
        cx, cy, cz = m[12], m[13], m[14]

        d = float(distance)
        side = -0.35 * d
        up_off = 0.08 * d
        tx = cx - bx * d + rx * side + ux * up_off
        ty = cy - by * d + ry * side + uy * up_off
        tz = cz - bz * d + rz * side + uz * up_off

        cmds.setAttr(transform + ".translateX", tx)
        cmds.setAttr(transform + ".translateY", ty)
        cmds.setAttr(transform + ".translateZ", tz)

        # Match camera orientation so card faces the viewer cleanly
        rot = cmds.xform(cam_xform, query=True, worldSpace=True, rotation=True)
        if rot and len(rot) == 3:
            cmds.setAttr(transform + ".rotateX", rot[0])
            cmds.setAttr(transform + ".rotateY", rot[1])
            cmds.setAttr(transform + ".rotateZ", rot[2])
        return True
    except Exception:
        return False


def reset_plane_to_zero(plane_node):
    """Resets a scene image plane so frame 1 of the clip aligns with Maya frame 0 (frameOffset = 1)."""
    if not cmds:
        return 1
    _, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return 1
    try:
        cmds.setAttr(shape + ".frameOffset", 1)
    except Exception:
        pass
    return 1


def nudge_plane_offset(plane_node, delta_frames):
    """
    Shifts a scene image plane's frameOffset by delta_frames.
    Positive delta shifts the reference later on Maya's timeline; negative shifts earlier.
    """
    if not cmds:
        return 0
    _, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return 0
    try:
        cur_offset = int(round(float(cmds.getAttr(shape + ".frameOffset") or 0)))
    except Exception:
        cur_offset = 0
    new_offset = cur_offset + int(delta_frames)
    try:
        cmds.setAttr(shape + ".frameOffset", new_offset)
    except Exception:
        pass
    return new_offset


def sync_plane_to_current_frame(plane_node, ref_frame, maya_frame=None):
    """
    Magic Align: aligns the given reference clip frame (1-based) to Maya's current frame
    by computing and setting frameOffset = maya_frame - ref_frame.
    """
    if not cmds:
        return 0
    _, shape = _resolve_plane_pair(plane_node)
    if not shape:
        return 0
    if maya_frame is None:
        maya_frame = int(round(float(cmds.currentTime(query=True))))
    new_offset = int(maya_frame) - max(1, int(ref_frame))
    try:
        cmds.setAttr(shape + ".frameOffset", new_offset)
    except Exception:
        pass
    return new_offset


def list_scene_animref_planes():
    """
    Returns metadata dicts for all AnimRef image planes currently in the Maya scene.
    """
    if not cmds or not hasattr(cmds, "ls"):
        return []

    planes = []
    seen_transforms = set()
    for shape in cmds.ls(type="imagePlane") or []:
        transform, resolved_shape = _resolve_plane_pair(shape)
        if not transform or transform in seen_transforms:
            continue

        is_animref = False
        try:
            if cmds.attributeQuery("animref_id", node=transform, exists=True):
                is_animref = True
            elif str(transform).startswith("animref_"):
                is_animref = True
        except Exception:
            if str(transform).startswith("animref_"):
                is_animref = True

        if not is_animref:
            continue

        seen_transforms.add(transform)

        def _safe_attr(node, attr, default):
            try:
                val = cmds.getAttr(node + "." + attr)
                return default if val is None else val
            except Exception:
                return default

        title = _safe_attr(transform, "animref_title", transform)
        clip_id = _safe_attr(transform, "animref_id", "")
        pip_preset = _safe_attr(transform, "animref_pip_preset", "full")
        mirrored = bool(_safe_attr(transform, "animref_mirrored", False))
        locked = bool(_safe_attr(transform, "animref_locked", False)) or (
            bool(_safe_attr(transform, "overrideEnabled", False)) and int(_safe_attr(transform, "overrideDisplayType", 0)) == 2
        )
        visible = bool(_safe_attr(transform, "visibility", True))
        frame_offset = int(round(float(_safe_attr(resolved_shape, "frameOffset", 0))))
        opacity = float(_safe_attr(resolved_shape, "alphaGain", 1.0))
        depth = float(_safe_attr(resolved_shape, "depth", 100.0))

        planes.append({
            "node": transform,
            "shape": resolved_shape,
            "id": str(clip_id),
            "title": str(title),
            "frame_offset": frame_offset,
            "opacity": opacity,
            "depth": depth,
            "visible": visible,
            "mirrored": mirrored,
            "locked": locked,
            "pip_preset": str(pip_preset),
        })

    return planes


def attach_aim_constraint_to_camera(plane_transform, camera="persp"):
    """Orient a free 3D reference card so it always faces the target camera."""
    if not cmds or not plane_transform or not cmds.objExists(plane_transform):
        return None
    cam_shape = resolve_camera_shape(camera)
    cam_transform = cam_shape
    try:
        if cmds.nodeType(cam_shape) == "camera":
            parents = cmds.listRelatives(cam_shape, parent=True) or []
            if parents:
                cam_transform = parents[0]
        constraint = cmds.aimConstraint(
            cam_transform,
            plane_transform,
            aimVector=(0.0, 0.0, 1.0),
            upVector=(0.0, 1.0, 0.0),
            worldUpType="scene",
        )
        return constraint[0] if isinstance(constraint, (list, tuple)) else constraint
    except Exception:
        return None


def create_pose_bookmark(label="Key Pose", preset=None, frame=None, ref_frame=None):
    """
    Creates a color-coded Maya Time Slider Bookmark at the specified or current frame.
    Falls back to a tagged locator if timeSliderBookmark is unavailable.
    """
    if not cmds:
        raise RuntimeError("Maya cmds is not available in this environment.")

    if frame is None:
        frame = int(round(float(cmds.currentTime(query=True))))
    else:
        frame = int(round(float(frame)))

    color = POSE_BOOKMARK_PRESETS.get(preset or label, (0.0, 0.90, 1.0))
    display_label = str(preset or label or "Pose")
    if ref_frame is not None:
        display_label = "{} (Ref f{})".format(display_label, int(ref_frame))

    bm_node = None
    try:
        if hasattr(cmds, "loadPlugin"):
            try:
                cmds.loadPlugin("timeSliderBookmark", quiet=True)
            except Exception:
                pass
        bm_node = cmds.createNode("timeSliderBookmark")
        cmds.setAttr(bm_node + ".name", display_label, type="string")
        cmds.setAttr(bm_node + ".timeRangeStart", frame)
        cmds.setAttr(bm_node + ".timeRangeStop", frame + 1)
        cmds.setAttr(bm_node + ".color", color[0], color[1], color[2], type="double3")
    except Exception:
        # Fallback for older Maya versions without timeSliderBookmark
        safe_lbl = sanitize_name(display_label)
        loc = cmds.spaceLocator(name="animref_bm_{}_f{}".format(safe_lbl, frame))
        bm_node = loc[0] if isinstance(loc, (list, tuple)) else loc
        try:
            if not cmds.attributeQuery("animref_bookmark", node=bm_node, exists=True):
                cmds.addAttr(bm_node, ln="animref_bookmark", dt="string")
            cmds.setAttr(bm_node + ".animref_bookmark", display_label, type="string")
            cmds.setKeyframe(bm_node, attribute="visibility", time=frame, value=1)
        except Exception:
            pass

    try:
        cmds.inViewMessage(
            amg='Pose Bookmarked at <hl style="color:#00E5FF;">f{}</hl>: {}'.format(frame, display_label),
            pos="topCenter",
            fade=True,
        )
    except Exception:
        pass

    return bm_node


def sync_ab_loop_to_maya(in_frame, out_frame, timeline_offset=0):
    """
    Sets Maya's playback range (minTime, maxTime) to match the selected A-B sub-clip range.
    Stores the previous timeline range so it can be restored later.
    """
    global _PREV_TIMELINE_RANGE
    if not cmds:
        raise RuntimeError("Maya cmds is not available in this environment.")

    if _PREV_TIMELINE_RANGE is None:
        try:
            prev_min = cmds.playbackOptions(query=True, minTime=True)
            prev_max = cmds.playbackOptions(query=True, maxTime=True)
            _PREV_TIMELINE_RANGE = (prev_min, prev_max)
        except Exception:
            pass

    maya_min = int(round(float(in_frame))) + int(timeline_offset)
    maya_max = int(round(float(out_frame))) + int(timeline_offset)
    if maya_max <= maya_min:
        maya_max = maya_min + 1

    cmds.playbackOptions(minTime=maya_min, maxTime=maya_max)
    cmds.currentTime(maya_min)
    return maya_min, maya_max


def restore_maya_timeline_range():
    """Restores the Maya timeline playback range saved prior to sync_ab_loop_to_maya."""
    global _PREV_TIMELINE_RANGE
    if not cmds or _PREV_TIMELINE_RANGE is None:
        return None
    prev_min, prev_max = _PREV_TIMELINE_RANGE
    _PREV_TIMELINE_RANGE = None
    try:
        cmds.playbackOptions(minTime=prev_min, maxTime=prev_max)
        return prev_min, prev_max
    except Exception:
        return None


def convert_video_to_sequence(video_path, target_fps=None, progress_callback=None):
    ffmpeg = locate_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg executable not found. Unable to convert video to image sequence.")

    try:
        fps = target_fps if target_fps else int(round(get_scene_fps()))
    except Exception:
        fps = target_fps if target_fps else 24

    base_dir = os.path.dirname(video_path)
    file_stem = os.path.splitext(os.path.basename(video_path))[0]
    out_dir = os.path.join(base_dir, file_stem + "_sequence")
    os.makedirs(out_dir, exist_ok=True)

    out_pattern = os.path.join(out_dir, file_stem + ".%04d.jpg")

    existing_frames = sorted(glob.glob(os.path.join(out_dir, file_stem + ".*.jpg")))
    if existing_frames:
        return out_dir, file_stem, existing_frames

    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    cmd = [
        ffmpeg,
        "-y",
        "-threads", "0",
        "-i", video_path,
        "-r", str(fps),
        "-q:v", "3",
        out_pattern
    ]

    p = subprocess.Popen(
        cmd,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        startupinfo=startupinfo,
        universal_newlines=True
    )
    try:
        _, err = p.communicate(timeout=60)
    except Exception:
        try:
            p.kill()
        except Exception:
            pass
        raise RuntimeError("FFmpeg conversion timed out or failed.")

    if p.returncode != 0:
        raise RuntimeError("FFmpeg failed: " + str(err))

    frames = sorted(glob.glob(os.path.join(out_dir, file_stem + ".*.jpg")))
    if not frames:
        raise RuntimeError("No frames generated from video conversion.")

    return out_dir, file_stem, frames


def import_animref_to_maya(video_dict, local_video_path, mode="sequence", target_camera="free",
                           start_at_current_frame=True, fit_timeline=True,
                           pip_corner="full", opacity=1.0, depth=100.0,
                           mirror=False, face_camera=False, custom_frame_offset=None):
    if not cmds:
        raise RuntimeError("Maya cmds is not available in this environment.")

    # Check for direct 3D model files (.obj, .fbx, .gltf, .glb) from Sketchfab / ArtStation
    lower_path = str(local_video_path or "").lower()
    if lower_path.endswith((".obj", ".fbx")):
        try:
            if lower_path.endswith(".obj"):
                cmds.file(local_video_path, i=True, type="OBJ", ignoreVersion=True, mergeNamespacesOnClash=False)
            else:
                cmds.file(local_video_path, i=True, type="FBX", ignoreVersion=True, mergeNamespacesOnClash=False)
            title = video_dict.get("title") or "3D Reference Model"
            cmds.inViewMessage(amg='3D Model imported to scene: <hl style="color:#00E5FF;">{}</hl>'.format(title), pos="midCenter", fade=True)
            return "imported_model"
        except Exception as e:
            pass
    if not cmds:
        raise RuntimeError("Maya cmds is not available in this environment.")

    title = video_dict.get("title") or "AnimRef"
    clean_title = sanitize_name(title)
    video_id = video_dict.get("id") or "clip"
    fps = get_scene_fps()

    # Determine start frame on Maya's timeline
    # If start_at_current_frame is False, align the reference to frame 0 (or scene start)
    if start_at_current_frame:
        start_frame = int(cmds.currentTime(query=True))
    else:
        # Default import aligns the reference to frame 0
        start_frame = 0

    current_frame = start_frame

    # Maya imagePlane frame evaluation formula:
    # frame_to_display = current_time + frameOffset
    # Since image sequences start at frame 1 (.0001.jpg):
    # 1 = start_frame + frameOffset  ==>  frameOffset = 1 - start_frame
    if custom_frame_offset is not None:
        frame_offset = int(custom_frame_offset)
    else:
        frame_offset = 1 - int(start_frame)

    plane = None
    total_frames = 1
    is_cam_attached = (target_camera not in ("free", "Free 3D Plane", "Free 3D Card (Move in Viewport)"))
    clean_local_path = os.path.normpath(str(local_video_path)).replace("\\", "/")

    is_static_image = clean_local_path.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    if is_static_image:
        if is_cam_attached:
            cam_shape = resolve_camera_shape(target_camera)
            plane = cmds.imagePlane(camera=cam_shape, fileName=clean_local_path)
            plane_shape = plane[1]
            cmds.setAttr(plane_shape + ".displayOnlyIfCurrent", False)
            cmds.setAttr(plane_shape + ".fit", 4)
            cmds.setAttr(plane_shape + ".depth", float(depth))
            cmds.setAttr(plane_shape + ".displayMode", 3)
        else:
            plane = cmds.imagePlane(fileName=clean_local_path)
            plane_transform = plane[0]
            try:
                cmds.setAttr(plane_transform + ".translateX", -12.0)
                cmds.setAttr(plane_transform + ".translateY", 10.0)
                cmds.setAttr(plane_transform + ".translateZ", 0.0)
            except Exception:
                pass
        plane_shape = plane[1]
        cmds.setAttr(plane_shape + ".useFrameExtension", False)
    else:
        # For all video files, image sequence is the only 100% reliable format for Maya VP2
        frames = None
        try:
            out_dir, stem, frames = convert_video_to_sequence(clean_local_path, target_fps=int(round(fps)))
        except Exception:
            frames = None

        if frames and len(frames) > 0:
            total_frames = len(frames)
            first_frame = os.path.normpath(frames[0]).replace("\\", "/")
            padded_pattern = os.path.normpath(os.path.join(out_dir, stem + ".####.jpg")).replace("\\", "/")

            if is_cam_attached:
                cam_shape = resolve_camera_shape(target_camera)
                plane = cmds.imagePlane(camera=cam_shape, fileName=first_frame)
                plane_shape = plane[1]
                cmds.setAttr(plane_shape + ".displayOnlyIfCurrent", False)
                cmds.setAttr(plane_shape + ".fit", 4)  # Fit Best
                cmds.setAttr(plane_shape + ".depth", float(depth))
                cmds.setAttr(plane_shape + ".displayMode", 3)  # RGB
            else:
                plane = cmds.imagePlane(fileName=first_frame)
                plane_transform = plane[0]
                plane_shape = plane[1]
                try:
                    cmds.setAttr(plane_transform + ".translateX", -12.0)
                    cmds.setAttr(plane_transform + ".translateY", 10.0)
                    cmds.setAttr(plane_transform + ".translateZ", 0.0)
                    cov = cmds.getAttr(plane_shape + ".coverage") or []
                    cov_w, cov_h = (cov[0] if cov and len(cov[0]) == 2 else (16, 9))
                    if cov_w and cov_h and cov_w > 0 and cov_h > 0:
                        if cov_w >= cov_h:
                            plane_w = 16.0
                            plane_h = 16.0 * (float(cov_h) / float(cov_w))
                        else:
                            plane_h = 14.0
                            plane_w = 14.0 * (float(cov_w) / float(cov_h))
                    else:
                        plane_w, plane_h = 16.0, 9.0
                    cmds.setAttr(plane_shape + ".width", plane_w)
                    cmds.setAttr(plane_shape + ".height", plane_h)
                except Exception:
                    pass

            plane_shape = plane[1]
            cmds.setAttr(plane_shape + ".imageName", padded_pattern, type="string")
            cmds.setAttr(plane_shape + ".useFrameExtension", True)
            cmds.setAttr(plane_shape + ".frameOffset", frame_offset)
            cmds.setAttr(plane_shape + ".frameIn", 1)
            cmds.setAttr(plane_shape + ".frameOut", total_frames)
            cmds.setAttr(plane_shape + ".frameCache", total_frames)
        else:
            duration = video_dict.get("duration") or video_dict.get("durationSeconds")
            if not duration and os.path.isfile(clean_local_path):
                try:
                    ffmpeg_bin = locate_ffmpeg()
                    if ffmpeg_bin:
                        duration = get_video_duration_seconds(ffmpeg_bin, clean_local_path)
                except Exception:
                    pass
            if duration:
                try:
                    total_frames = max(1, int(round(float(duration) * float(fps))))
                except Exception:
                    total_frames = 1

            # Fallback to direct Movie node if sequence conversion failed
            if is_cam_attached:
                cam_shape = resolve_camera_shape(target_camera)
                plane = cmds.imagePlane(camera=cam_shape, fileName=clean_local_path)
                plane_shape = plane[1]
                cmds.setAttr(plane_shape + ".displayOnlyIfCurrent", False)
                cmds.setAttr(plane_shape + ".fit", 4)
                cmds.setAttr(plane_shape + ".depth", float(depth))
                cmds.setAttr(plane_shape + ".displayMode", 3)
            else:
                plane = cmds.imagePlane(fileName=clean_local_path)
                plane_transform = plane[0]
                plane_shape = plane[1]
                try:
                    cmds.setAttr(plane_transform + ".translateX", -12.0)
                    cmds.setAttr(plane_transform + ".translateY", 10.0)
                    cmds.setAttr(plane_transform + ".translateZ", 0.0)
                    cov = cmds.getAttr(plane_shape + ".coverage") or []
                    cov_w, cov_h = (cov[0] if cov and len(cov[0]) == 2 else (16, 9))
                    if cov_w and cov_h and cov_w > 0 and cov_h > 0:
                        if cov_w >= cov_h:
                            plane_w = 16.0
                            plane_h = 16.0 * (float(cov_h) / float(cov_w))
                        else:
                            plane_h = 14.0
                            plane_w = 14.0 * (float(cov_w) / float(cov_h))
                    else:
                        plane_w, plane_h = 16.0, 9.0
                    cmds.setAttr(plane_shape + ".width", plane_w)
                    cmds.setAttr(plane_shape + ".height", plane_h)
                except Exception:
                    pass

            plane_shape = plane[1]
            try:
                cmds.setAttr(plane_shape + ".type", 2)  # 2 = Movie
            except Exception:
                pass
            cmds.setAttr(plane_shape + ".useFrameExtension", True)
            cmds.setAttr(plane_shape + ".frameOffset", frame_offset)
            if total_frames > 1:
                try:
                    cmds.setAttr(plane_shape + ".frameIn", 1)
                    cmds.setAttr(plane_shape + ".frameOut", total_frames)
                    cmds.setAttr(plane_shape + ".frameCache", total_frames)
                except Exception:
                    pass

    # Ensure model panels show image planes
    try:
        for p in cmds.getPanel(visiblePanels=True) or []:
            if cmds.getPanel(typeOf=p) == "modelPanel":
                try:
                    cmds.modelEditor(p, edit=True, imagePlane=True)
                except Exception:
                    pass
    except Exception:
        pass

    plane_transform = plane[0]
    new_name = "animref_" + clean_title
    try:
        plane_transform = cmds.rename(plane_transform, new_name)
    except Exception:
        pass

    # Apply PiP preset, opacity, mirror, and optional camera aim constraint
    if is_cam_attached and pip_corner and normalize_pip_key(pip_corner) != "full":
        apply_pip_preset(plane_transform, pip_corner)
    elif is_cam_attached:
        try:
            if not cmds.attributeQuery("animref_pip_preset", node=plane_transform, exists=True):
                cmds.addAttr(plane_transform, ln="animref_pip_preset", dt="string")
            cmds.setAttr(plane_transform + ".animref_pip_preset", "full", type="string")
        except Exception:
            pass

    if opacity is not None and float(opacity) < 1.0:
        set_plane_opacity(plane_transform, opacity)

    if mirror:
        toggle_plane_mirror(plane_transform, mirrored=True)

    if not is_cam_attached and face_camera:
        attach_aim_constraint_to_camera(plane_transform, camera="current")

    # Tag with AnimRef metadata
    try:
        for attr in ["animref_id", "animref_title", "animref_url", "animref_creator"]:
            if not cmds.attributeQuery(attr, node=plane_transform, exists=True):
                cmds.addAttr(plane_transform, ln=attr, dt="string")

        cmds.setAttr(plane_transform + ".animref_id", str(video_id), type="string")
        cmds.setAttr(plane_transform + ".animref_title", str(title), type="string")
        cmds.setAttr(plane_transform + ".animref_url", "https://animationreference.org/video/" + str(video_id), type="string")
        creator = video_dict.get("author_name") or video_dict.get("uploader") or ""
        cmds.setAttr(plane_transform + ".animref_creator", str(creator), type="string")
    except Exception:
        pass

    if fit_timeline and total_frames > 1:
        try:
            target_min = int(current_frame)
            target_max = target_min + int(total_frames) - 1
            # Expand playback slider range if needed
            ast = cmds.playbackOptions(query=True, animationStartTime=True)
            aet = cmds.playbackOptions(query=True, animationEndTime=True)
            new_ast = min(ast, target_min) if ast is not None else target_min
            new_aet = max(aet, target_max) if aet is not None else target_max
            cmds.playbackOptions(
                animationStartTime=new_ast,
                animationEndTime=new_aet,
                minTime=target_min,
                maxTime=target_max
            )
            # Ensure the current time is set to the start frame (frame 0) so the timeline doesn't skip forward
            cmds.currentTime(target_min)
        except Exception:
            pass

    cmds.select(plane_transform, replace=True)

    # Force Maya Viewport 2.0 to redraw immediately so the image plane is displayed!
    try:
        cmds.refresh(force=True)
    except Exception:
        pass

    try:
        cmds.inViewMessage(
            amg='AnimRef imported: <hl style="color:#00E5FF;">{}</hl> ({:.0f} frames)'.format(title, total_frames),
            pos="midCenter",
            fade=True
        )
    except Exception:
        pass

    try:
        print("[AnimRef] ✓ Reference added to Maya Viewport: '{}' ({})".format(title, plane_transform))
    except Exception:
        pass

    return plane_transform
