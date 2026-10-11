from __future__ import absolute_import, division, print_function

import os
import sys
import subprocess
import time

try:
    import maya.cmds as cmds
except ImportError:
    cmds = None

from . import animref_importer


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


def record_playblast(width=1280, height=720, camera=None, start_frame=None, end_frame=None):
    if not cmds:
        raise RuntimeError("Maya cmds is not available.")

    info = get_playblast_info()
    start = start_frame if start_frame is not None else info["start"]
    end = end_frame if end_frame is not None else info["end"]
    fps = info["fps"]
    cam = camera if camera else info["camera"]

    pb_dir = get_playblast_cache_dir()
    timestamp = int(time.time())
    raw_output_base = os.path.join(pb_dir, "raw_pb_{}".format(timestamp))
    clean_mp4 = os.path.join(pb_dir, "playblast_{}.mp4".format(timestamp))

    ffmpeg = animref_importer.locate_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg not found. Cannot encode playblast to MP4.")

    # Run Maya Playblast with uncompressed image sequence / movie
    # We use format='image' and compression='jpg' because it is 100% reliable across all Windows Maya installs
    raw_images = cmds.playblast(
        filename=raw_output_base,
        format="image",
        compression="jpg",
        widthHeight=(width, height),
        percent=100,
        quality=100,
        forceOverwrite=True,
        viewer=False,
        showOrnaments=False,
        startTime=start,
        endTime=end,
        offScreen=True
    )

    # Convert the frames using FFmpeg to high-quality H.264 MP4
    raw_pattern = raw_output_base + ".%04d.jpg"
    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

    cmd = [
        ffmpeg,
        "-y",
        "-framerate", str(fps),
        "-i", raw_pattern,
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        "-movflags", "+faststart",
        clean_mp4
    ]

    p = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        startupinfo=startupinfo,
        universal_newlines=True
    )
    _, err = p.communicate()

    if p.returncode != 0 or not os.path.isfile(clean_mp4):
        raise RuntimeError("FFmpeg playblast encoding failed: " + str(err))

    # Clean up raw jpgs
    import glob
    for f in glob.glob(raw_output_base + ".*.jpg"):
        try:
            os.remove(f)
        except Exception:
            pass

    return clean_mp4
