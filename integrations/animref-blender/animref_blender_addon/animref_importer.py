"""
Blender 3.6–5.0 Viewport Reference Importer & Active Scene Manager.

Supports:
- Camera Background Video/Image with Picture-in-Picture (PiP) corner presets
- 3D Reference Empty (IMAGE) with optional Track-To camera constraint
- Video Sequencer (VSE) movie strip import
- Active Scene Manager: Magic Align, Nudge/Slip, Opacity, Flip, Show/Hide, Delete
- 1-click Timeline Pose Markers (Anticipation, Contact, Passing, Breakdown, Extreme, Overshoot)
"""

from __future__ import annotations

import math
import os
import re

try:
    import bpy
except ImportError:
    bpy = None


PIP_PRESETS = {
    "FULL": (0.0, 0.0, 1.0),
    "TOP_RIGHT": (0.31, 0.31, 0.35),
    "TOP_LEFT": (-0.31, 0.31, 0.35),
    "BOTTOM_RIGHT": (0.31, -0.31, 0.35),
    "BOTTOM_LEFT": (-0.31, -0.31, 0.35),
}

POSE_MARKERS = [
    ("ANTICIPATION", "Anticipation"),
    ("CONTACT", "Contact"),
    ("PASSING", "Passing"),
    ("BREAKDOWN", "Breakdown"),
    ("EXTREME", "Extreme"),
    ("OVERSHOOT", "Overshoot"),
]


def clean_name(title: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "_", title or "Clip").strip("_")
    return (cleaned[:28] or "Clip")


def is_video_file(path: str) -> bool:
    ext = os.path.splitext(path or "")[1].lower()
    return ext in (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v")


def load_media_datablock(local_path: str):
    if bpy is None:
        raise RuntimeError("Blender bpy module is not available.")
    if not local_path or not os.path.isfile(local_path):
        raise FileNotFoundError(f"Media file not found: {local_path}")

    img = bpy.data.images.load(local_path, check_existing=True)
    if is_video_file(local_path):
        img.source = "MOVIE"
    return img


def _ensure_active_camera(context):
    scene = context.scene
    if scene.camera and scene.camera.type == "CAMERA":
        return scene.camera

    for obj in scene.objects:
        if obj.type == "CAMERA":
            scene.camera = obj
            return obj

    cam_data = bpy.data.cameras.new("AnimRef_Camera")
    cam_obj = bpy.data.objects.new("AnimRef_Camera", cam_data)
    scene.collection.objects.link(cam_obj)
    cam_obj.location = (0.0, -8.0, 1.6)
    cam_obj.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    scene.camera = cam_obj
    return cam_obj


def import_to_camera_background(
    context,
    local_path: str,
    title: str = "Reference",
    opacity: float = 0.75,
    pip_preset: str = "TOP_RIGHT",
    start_at_current_frame: bool = True,
    fps: int = 24,
    duration_sec: float = 0.0,
):
    if bpy is None:
        raise RuntimeError("Blender bpy module is not available.")

    cam_obj = _ensure_active_camera(context)
    cam_data = cam_obj.data
    cam_data.show_background_images = True

    img = load_media_datablock(local_path)
    bg = cam_data.background_images.new()
    bg.source = "IMAGE"
    bg.image = img
    bg.frame_method = "FIT"
    bg.alpha = max(0.05, min(1.0, float(opacity)))
    bg.display_depth = "FRONT" if pip_preset != "FULL" else "BACK"

    ox, oy, scale = PIP_PRESETS.get(pip_preset, PIP_PRESETS["TOP_RIGHT"])
    bg.offset = (ox, oy)
    bg.scale = scale

    if hasattr(bg, "image_user") and bg.image_user is not None:
        iu = bg.image_user
        iu.use_auto_refresh = True
        iu.use_cyclic = True
        frame_count = getattr(img, "frame_duration", 0) or (int(round(duration_sec * fps)) if duration_sec > 0 else 250)
        iu.frame_duration = max(1, int(frame_count))
        iu.frame_start = int(context.scene.frame_current) if start_at_current_frame else int(context.scene.frame_start)
        iu.frame_offset = 0

    return cam_obj, bg


def import_to_3d_empty(
    context,
    local_path: str,
    title: str = "Reference",
    opacity: float = 0.9,
    face_camera: bool = False,
    start_at_current_frame: bool = True,
    fps: int = 24,
    duration_sec: float = 0.0,
):
    if bpy is None:
        raise RuntimeError("Blender bpy module is not available.")

    img = load_media_datablock(local_path)
    obj_name = f"AnimRef_{clean_name(title)}"
    empty = bpy.data.objects.new(obj_name, None)
    empty.empty_display_type = "IMAGE"
    empty.empty_display_size = 4.0
    empty.data = img
    empty.location = (0.0, 3.0, 2.0)
    empty.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    empty.use_empty_image_alpha = True
    empty.color = (1.0, 1.0, 1.0, max(0.05, min(1.0, float(opacity))))
    empty["animref_managed"] = True
    empty["animref_title"] = title

    context.scene.collection.objects.link(empty)

    if hasattr(empty, "image_user") and empty.image_user is not None:
        iu = empty.image_user
        iu.use_auto_refresh = True
        iu.use_cyclic = True
        frame_count = getattr(img, "frame_duration", 0) or (int(round(duration_sec * fps)) if duration_sec > 0 else 250)
        iu.frame_duration = max(1, int(frame_count))
        iu.frame_start = int(context.scene.frame_current) if start_at_current_frame else int(context.scene.frame_start)
        iu.frame_offset = 0

    if face_camera and context.scene.camera:
        c = empty.constraints.new(type="TRACK_TO")
        c.name = "AnimRef_FaceCamera"
        c.target = context.scene.camera
        c.track_axis = "TRACK_Z"
        c.up_axis = "UP_Y"

    return empty


def import_to_vse(context, local_path: str, title: str = "Reference"):
    if bpy is None:
        raise RuntimeError("Blender bpy module is not available.")

    scene = context.scene
    if not scene.sequence_editor:
        scene.sequence_editor_create()
    seq = scene.sequence_editor
    strips = getattr(seq, "strips", None) or getattr(seq, "sequences", None)
    if strips is None:
        raise RuntimeError("Blender sequence editor strips API unavailable.")

    frame_start = int(scene.frame_current)
    name = f"AnimRef_{clean_name(title)}"
    if is_video_file(local_path):
        return strips.new_movie(name=name, filepath=local_path, channel=1, frame_start=frame_start)
    return strips.new_image(name=name, filepath=local_path, channel=1, frame_start=frame_start)


def list_scene_references(context) -> list[dict]:
    """Return all AnimRef-managed 3D empties and camera background images."""
    if bpy is None:
        return []
    refs = []
    for obj in context.scene.objects:
        if obj.type == "EMPTY" and (obj.get("animref_managed") or obj.name.startswith("AnimRef_")):
            offset = obj.image_user.frame_offset if getattr(obj, "image_user", None) else 0
            refs.append({
                "kind": "EMPTY",
                "name": obj.name,
                "label": obj.get("animref_title") or obj.name,
                "opacity": float(obj.color[3]) if hasattr(obj, "color") else 1.0,
                "offset": int(offset),
                "hidden": bool(obj.hide_viewport),
            })
    cam = context.scene.camera
    if cam and cam.type == "CAMERA" and cam.data:
        for idx, bg in enumerate(cam.data.background_images):
            if bg.image:
                offset = bg.image_user.frame_offset if getattr(bg, "image_user", None) else 0
                refs.append({
                    "kind": "CAMERA_BG",
                    "name": f"{cam.name}::bg::{idx}",
                    "label": f"[Cam] {bg.image.name}",
                    "opacity": float(bg.alpha),
                    "offset": int(offset),
                    "hidden": not bool(bg.show_background_image),
                })
    return refs


def _resolve_reference(context, ref_key: str):
    if "::bg::" in ref_key:
        cam_name, _, idx_str = ref_key.partition("::bg::")
        cam = bpy.data.objects.get(cam_name)
        idx = int(idx_str)
        if cam and cam.data and 0 <= idx < len(cam.data.background_images):
            return ("CAMERA_BG", cam, cam.data.background_images[idx])
        return (None, None, None)
    obj = bpy.data.objects.get(ref_key)
    if obj:
        return ("EMPTY", obj, obj)
    return (None, None, None)


def nudge_reference_offset(context, ref_key: str, delta: int) -> int:
    kind, _, target = _resolve_reference(context, ref_key)
    if not target or not getattr(target, "image_user", None):
        raise RuntimeError("Reference not found in scene.")
    target.image_user.frame_offset = int(target.image_user.frame_offset) + int(delta)
    return int(target.image_user.frame_offset)


def magic_align_reference(context, ref_key: str, target_ref_frame: int = 1) -> int:
    """Align target_ref_frame of the clip to Blender's current timeline frame."""
    kind, _, target = _resolve_reference(context, ref_key)
    if not target or not getattr(target, "image_user", None):
        raise RuntimeError("Reference not found in scene.")
    iu = target.image_user
    iu.frame_start = int(context.scene.frame_current)
    iu.frame_offset = max(0, int(target_ref_frame) - 1)
    return int(iu.frame_start)


def set_reference_opacity(context, ref_key: str, opacity: float) -> float:
    val = max(0.05, min(1.0, float(opacity)))
    kind, _, target = _resolve_reference(context, ref_key)
    if kind == "EMPTY" and target:
        c = list(target.color)
        c[3] = val
        target.color = tuple(c)
    elif kind == "CAMERA_BG" and target:
        target.alpha = val
    return val


def toggle_reference_mirror(context, ref_key: str) -> bool:
    kind, _, target = _resolve_reference(context, ref_key)
    if kind == "EMPTY" and target:
        target.scale.x = -target.scale.x
        return target.scale.x < 0
    if kind == "CAMERA_BG" and target:
        target.use_flip_x = not bool(target.use_flip_x)
        return bool(target.use_flip_x)
    return False


def toggle_reference_visibility(context, ref_key: str) -> bool:
    kind, _, target = _resolve_reference(context, ref_key)
    if kind == "EMPTY" and target:
        target.hide_viewport = not bool(target.hide_viewport)
        return bool(target.hide_viewport)
    if kind == "CAMERA_BG" and target:
        target.show_background_image = not bool(target.show_background_image)
        return not bool(target.show_background_image)
    return False


def delete_reference(context, ref_key: str) -> bool:
    kind, owner, target = _resolve_reference(context, ref_key)
    if kind == "EMPTY" and target:
        bpy.data.objects.remove(target, do_unlink=True)
        return True
    if kind == "CAMERA_BG" and owner and target:
        owner.data.background_images.remove(target)
        return True
    return False


def conform_scene_fps(context, fps: int = 24) -> int:
    clean_fps = max(1, min(120, int(fps)))
    context.scene.render.fps = clean_fps
    context.scene.render.fps_base = 1.0
    return clean_fps


def add_pose_marker(context, label: str, frame: int | None = None):
    scene = context.scene
    target_frame = int(scene.frame_current if frame is None else frame)
    marker = scene.timeline_markers.new(name=f"{label} (f{target_frame})", frame=target_frame)
    return marker
