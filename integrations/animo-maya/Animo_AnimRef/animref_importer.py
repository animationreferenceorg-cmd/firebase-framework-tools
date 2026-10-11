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


def convert_video_to_sequence(video_path, target_fps=None, progress_callback=None):
    ffmpeg = locate_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg executable not found. Unable to convert video to image sequence.")

    fps = target_fps if target_fps else int(round(get_scene_fps()))
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
        "-i", video_path,
        "-r", str(fps),
        "-q:v", "2",
        out_pattern
    ]

    p = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        startupinfo=startupinfo,
        universal_newlines=True
    )
    _, err = p.communicate()

    if p.returncode != 0:
        raise RuntimeError("FFmpeg failed: " + str(err))

    frames = sorted(glob.glob(os.path.join(out_dir, file_stem + ".*.jpg")))
    if not frames:
        raise RuntimeError("No frames generated from video conversion.")

    return out_dir, file_stem, frames


def import_animref_to_maya(video_dict, local_video_path, mode="sequence", target_camera="free",
                           start_at_current_frame=True, fit_timeline=True):
    if not cmds:
        raise RuntimeError("Maya cmds is not available in this environment.")

    title = video_dict.get("title") or "AnimRef"
    clean_title = sanitize_name(title)
    video_id = video_dict.get("id") or "clip"
    fps = get_scene_fps()

    current_frame = int(cmds.currentTime(query=True)) if start_at_current_frame else 1
    frame_offset = (current_frame - 1) if start_at_current_frame else 0

    plane = None
    total_frames = 1
    is_cam_attached = (target_camera not in ("free", "Free 3D Plane", "Free 3D Card (Move in Viewport)"))

    if mode == "sequence":
        out_dir, stem, frames = convert_video_to_sequence(local_video_path, target_fps=int(round(fps)))
        total_frames = len(frames)
        first_frame = frames[0]
        padded_pattern = os.path.join(out_dir, stem + ".####.jpg")

        if is_cam_attached:
            cam_shape = resolve_camera_shape(target_camera)
            plane = cmds.imagePlane(camera=cam_shape, fileName=first_frame)
            plane_shape = plane[1]
            cmds.setAttr(plane_shape + ".displayOnlyIfCurrent", False)
            cmds.setAttr(plane_shape + ".fit", 4)  # Fit Best
            cmds.setAttr(plane_shape + ".depth", 100.0)
            cmds.setAttr(plane_shape + ".displayMode", 3)  # RGB
        else:
            plane = cmds.imagePlane(fileName=first_frame)
            plane_transform = plane[0]
            # Place free 3D card nicely to the side of the origin
            try:
                cmds.setAttr(plane_transform + ".translateX", -12.0)
                cmds.setAttr(plane_transform + ".translateY", 8.0)
                cmds.setAttr(plane_transform + ".scaleX", 16.0)
                cmds.setAttr(plane_transform + ".scaleY", 9.0)
            except Exception:
                pass

        plane_shape = plane[1]
        cmds.setAttr(plane_shape + ".imageName", padded_pattern, type="string")
        cmds.setAttr(plane_shape + ".useFrameExtension", True)
        cmds.setAttr(plane_shape + ".frameOffset", frame_offset)
        cmds.setAttr(plane_shape + ".frameIn", 1)
        cmds.setAttr(plane_shape + ".frameOut", total_frames)
        cmds.setAttr(plane_shape + ".frameCache", total_frames)

    else:  # Direct Movie MP4
        if is_cam_attached:
            cam_shape = resolve_camera_shape(target_camera)
            plane = cmds.imagePlane(camera=cam_shape, fileName=local_video_path)
            plane_shape = plane[1]
            cmds.setAttr(plane_shape + ".displayOnlyIfCurrent", False)
            cmds.setAttr(plane_shape + ".fit", 4)
            cmds.setAttr(plane_shape + ".depth", 100.0)
            cmds.setAttr(plane_shape + ".displayMode", 3)
        else:
            plane = cmds.imagePlane(fileName=local_video_path)
            plane_transform = plane[0]
            try:
                cmds.setAttr(plane_transform + ".translateX", -12.0)
                cmds.setAttr(plane_transform + ".translateY", 8.0)
                cmds.setAttr(plane_transform + ".scaleX", 16.0)
                cmds.setAttr(plane_transform + ".scaleY", 9.0)
            except Exception:
                pass

        plane_shape = plane[1]
        cmds.setAttr(plane_shape + ".useFrameExtension", True)
        cmds.setAttr(plane_shape + ".frameOffset", frame_offset)

    plane_transform = plane[0]
    new_name = "animref_" + clean_title
    try:
        plane_transform = cmds.rename(plane_transform, new_name)
    except Exception:
        pass

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
            cmds.playbackOptions(minTime=current_frame, maxTime=current_frame + total_frames - 1)
        except Exception:
            pass

    cmds.select(plane_transform, replace=True)

    try:
        cmds.inViewMessage(
            amg='AnimRef imported: <hl style="color:#00E5FF;">{}</hl> ({:.0f} frames)'.format(title, total_frames),
            pos="midCenter",
            fade=True
        )
    except Exception:
        pass

    return plane_transform
