from __future__ import absolute_import, division, print_function

import os
import sys
import subprocess
import time

try:
    import maya.cmds as cmds
except ImportError:
    cmds = None

try:
    from . import animref_importer
except (ImportError, ValueError):
    import animref_importer


def get_playblast_cache_dir():
    base = animref_importer.get_animo_data_path()
    pb_dir = os.path.join(base, "Animo_Prefs", "animref_cache", "playblasts")
    os.makedirs(pb_dir, exist_ok=True)
    return pb_dir


def get_active_camera():
    if not cmds or not hasattr(cmds, "getPanel"):
        return "persp"
    try:
        panel = cmds.getPanel(withFocus=True)
        if panel and cmds.getPanel(typeOf=panel) == "modelPanel":
            cam = cmds.modelPanel(panel, query=True, camera=True)
            if cam:
                return cam
    except Exception:
        pass
    return "persp"


def get_playblast_info():
    if not cmds or not hasattr(cmds, "playbackOptions"):
        return {
            "start": 1,
            "end": 120,
            "fps": 24.0,
            "camera": "persp"
        }
    try:
        return {
            "start": int(cmds.playbackOptions(query=True, minTime=True)),
            "end": int(cmds.playbackOptions(query=True, maxTime=True)),
            "fps": animref_importer.get_scene_fps(),
            "camera": get_active_camera()
        }
    except Exception:
        return {
            "start": 1,
            "end": 120,
            "fps": 24.0,
            "camera": "persp"
        }


def convert_to_mp4(input_path, output_path=None):
    """Converts a local .avi/.mov video to H.264 MP4 using FFmpeg."""
    if not input_path or not os.path.isfile(input_path):
        raise RuntimeError("Source video file not found.")
    if input_path.lower().endswith(".mp4"):
        return input_path
    ffmpeg = animref_importer.locate_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg not found. Record directly as MP4 or install FFmpeg to convert AVI.")

    if not output_path:
        base, _ = os.path.splitext(input_path)
        output_path = base + "_upload.mp4"

    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    cmd = [
        ffmpeg, "-y", "-i", input_path,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
        "-movflags", "+faststart", output_path
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, startupinfo=startupinfo, universal_newlines=True)
    _, err = p.communicate()
    if p.returncode != 0 or not os.path.isfile(output_path):
        raise RuntimeError("FFmpeg MP4 conversion failed: " + str(err))
    return output_path


def record_playblast(width=1280, height=720, camera=None, start_frame=None, end_frame=None, output_path=None, show_ornaments=False, file_format="mp4"):
    if not cmds:
        raise RuntimeError("Maya cmds is not available.")

    fmt = (file_format or "mp4").strip().lower().lstrip(".")
    if output_path and output_path.lower().endswith(".avi"):
        fmt = "avi"
    elif output_path and output_path.lower().endswith(".mp4"):
        fmt = "mp4"
    if fmt not in ("mp4", "avi"):
        fmt = "mp4"

    info = get_playblast_info()
    start = int(start_frame) if start_frame is not None else info["start"]
    end = int(end_frame) if end_frame is not None else info["end"]
    if end < start:
        start, end = end, start
    fps = info["fps"]

    pb_dir = get_playblast_cache_dir()
    timestamp = int(time.time())
    raw_output_base = os.path.join(pb_dir, "raw_pb_{}".format(timestamp))
    ext = "." + fmt
    if output_path:
        clean_out = os.path.normpath(output_path)
        if not clean_out.lower().endswith(ext):
            clean_out += ext
        os.makedirs(os.path.dirname(clean_out), exist_ok=True)
    else:
        clean_out = os.path.join(pb_dir, "playblast_{}{}".format(timestamp, ext))

    ffmpeg = animref_importer.locate_ffmpeg()
    if fmt == "mp4" and not ffmpeg:
        raise RuntimeError("FFmpeg not found. Switch format to AVI or install FFmpeg for MP4 encoding.")

    # If a specific camera was requested, temporarily point the active modelPanel at it
    active_panel = None
    prev_cam = None
    if camera and hasattr(cmds, "getPanel") and hasattr(cmds, "modelPanel"):
        try:
            panel = cmds.getPanel(withFocus=True)
            if panel and cmds.getPanel(typeOf=panel) == "modelPanel":
                active_panel = panel
                prev_cam = cmds.modelPanel(panel, query=True, camera=True)
                if prev_cam != camera and cmds.objExists(camera):
                    cmds.modelPanel(panel, edit=True, camera=camera)
        except Exception:
            active_panel = None
            prev_cam = None

    try:
        if fmt == "avi" and not ffmpeg:
            cmds.playblast(
                filename=clean_out,
                format="avi",
                widthHeight=(width, height),
                percent=100,
                quality=100,
                forceOverwrite=True,
                viewer=False,
                showOrnaments=bool(show_ornaments),
                startTime=start,
                endTime=end,
                offScreen=True
            )
            return clean_out

        # Run Maya Playblast with uncompressed image sequence
        # We use format='image' and compression='jpg' because it is 100% reliable across all Windows Maya installs
        cmds.playblast(
            filename=raw_output_base,
            format="image",
            compression="jpg",
            widthHeight=(width, height),
            percent=100,
            quality=100,
            forceOverwrite=True,
            viewer=False,
            showOrnaments=bool(show_ornaments),
            startTime=start,
            endTime=end,
            offScreen=True
        )
    finally:
        if active_panel and prev_cam and prev_cam != camera:
            try:
                cmds.modelPanel(active_panel, edit=True, camera=prev_cam)
            except Exception:
                pass

    # Convert the frames using FFmpeg to MP4 (H.264) or AVI (MJPEG)
    raw_pattern = raw_output_base + ".%04d.jpg"
    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    if fmt == "avi":
        cmd = [
            ffmpeg,
            "-y",
            "-framerate", str(fps),
            "-start_number", str(start),
            "-i", raw_pattern,
            "-c:v", "mjpeg",
            "-q:v", "2",
            clean_out
        ]
    else:
        cmd = [
            ffmpeg,
            "-y",
            "-framerate", str(fps),
            "-start_number", str(start),
            "-i", raw_pattern,
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "18",
            "-movflags", "+faststart",
            clean_out
        ]

    p = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        startupinfo=startupinfo,
        universal_newlines=True
    )
    _, err = p.communicate()

    if p.returncode != 0 or not os.path.isfile(clean_out):
        raise RuntimeError("FFmpeg playblast encoding failed: " + str(err))

    # Clean up raw jpgs
    import glob
    for f in glob.glob(raw_output_base + ".*.jpg"):
        try:
            os.remove(f)
        except Exception:
            pass

    return clean_out
