"""
Blender Viewport Playblast (MP4 / AVI) & Direct Upload to AnimationReference.org.

Uses Blender's built-in FFmpeg encoder via `bpy.ops.render.opengl(animation=True)`
so no external FFmpeg installation is required, and always restores the user's
original render settings inside a `try/finally` block.
"""

from __future__ import annotations

import os
import time

try:
    import bpy
except ImportError:
    bpy = None

from . import animref_api, animref_auth


def get_playblast_dir() -> str:
    d = os.path.join(animref_auth.get_storage_dir(), "playblasts")
    os.makedirs(d, exist_ok=True)
    return d


def record_viewport_playblast(
    context,
    file_format: str = "MP4",
    resolution_x: int = 1280,
    resolution_y: int = 720,
    output_path: str = "",
) -> str:
    """
    Record the active 3D Viewport animation range to MP4 (H.264) or AVI (MJPEG).
    Restores all modified scene render properties before returning.
    """
    if bpy is None:
        raise RuntimeError("Blender bpy module is not available.")

    scene = context.scene
    render = scene.render
    img_settings = render.image_settings
    ffmpeg = render.ffmpeg

    fmt = (file_format or "MP4").strip().upper()
    ext = ".avi" if fmt == "AVI" else ".mp4"

    if output_path:
        clean_out = os.path.abspath(output_path)
        if not clean_out.lower().endswith(ext):
            clean_out += ext
        os.makedirs(os.path.dirname(clean_out), exist_ok=True)
    else:
        ts = int(time.time())
        clean_out = os.path.join(get_playblast_dir(), f"blender_playblast_{ts}{ext}")

    # Snapshot original render settings so user scene is never altered
    prev = {
        "filepath": render.filepath,
        "resolution_x": render.resolution_x,
        "resolution_y": render.resolution_y,
        "resolution_percentage": render.resolution_percentage,
        "file_format": img_settings.file_format,
        "ffmpeg_format": getattr(ffmpeg, "format", None),
        "ffmpeg_codec": getattr(ffmpeg, "codec", None),
        "ffmpeg_crf": getattr(ffmpeg, "constant_rate_factor", None),
    }

    try:
        render.filepath = clean_out
        render.resolution_x = max(320, int(resolution_x))
        render.resolution_y = max(240, int(resolution_y))
        render.resolution_percentage = 100

        if fmt == "AVI":
            img_settings.file_format = "AVI_JPEG"
        else:
            img_settings.file_format = "FFMPEG"
            ffmpeg.format = "MPEG4"
            ffmpeg.codec = "H264"
            if hasattr(ffmpeg, "constant_rate_factor"):
                ffmpeg.constant_rate_factor = "HIGH"

        bpy.ops.render.opengl(animation=True, write_still=False)
    finally:
        render.filepath = prev["filepath"]
        render.resolution_x = prev["resolution_x"]
        render.resolution_y = prev["resolution_y"]
        render.resolution_percentage = prev["resolution_percentage"]
        img_settings.file_format = prev["file_format"]
        if prev["ffmpeg_format"] is not None:
            ffmpeg.format = prev["ffmpeg_format"]
        if prev["ffmpeg_codec"] is not None:
            ffmpeg.codec = prev["ffmpeg_codec"]
        if prev["ffmpeg_crf"] is not None and hasattr(ffmpeg, "constant_rate_factor"):
            ffmpeg.constant_rate_factor = prev["ffmpeg_crf"]

    return clean_out


def upload_playblast(
    file_path: str,
    title: str,
    description: str = "",
    category: str = "Acting",
    wip_stage: str = "blocking",
    tags: str = "blender,playblast",
    board_id: str = "",
    publish_to_portfolio: bool = True,
    is_private: bool = False,
    draft: bool = True,
) -> dict:
    return animref_api.upload_playblast_to_site(
        file_path=file_path,
        title=title,
        description=description,
        category=category,
        wip_stage=wip_stage,
        tags=tags,
        board_id=board_id,
        publish_to_portfolio=publish_to_portfolio,
        is_private=is_private,
        draft=draft,
    )
