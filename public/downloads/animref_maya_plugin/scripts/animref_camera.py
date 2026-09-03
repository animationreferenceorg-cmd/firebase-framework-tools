"""
AnimationReference.org - Maya Camera & Image Plane Controller
Handles creation, updating, frame extension, opacity, slip/offset, and playback range conformity.
"""

import os
import re

try:
    import maya.cmds as cmds
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False

def clean_name(title):
    return re.sub(r'[^a-zA-Z0-9_]', '_', title)[:24]

def setup_reference_camera(video_url, title="AnimRef", fps=24, offset=0, opacity=0.85):
    """
    Creates or updates a dedicated Reference Camera in Maya.
    """
    if not MAYA_AVAILABLE:
        print(f"[AnimRef] Simulation: setup_reference_camera({video_url}, title={title})")
        return "RefCam_Simulated", "ImagePlane_Simulated"

    safe_title = clean_name(title)
    cam_name = f"RefCam_{safe_title}" if safe_title else "RefCam_AnimRef"

    if cmds.objExists(cam_name):
        cam = cam_name
        cam_shape = cmds.listRelatives(cam, shapes=True)[0]
    else:
        cam, cam_shape = cmds.camera(name=cam_name)
        cmds.setAttr(f"{cam}.translate", 0, 100, 300)
        cmds.setAttr(f"{cam}.rotate", 0, 0, 0)
        cmds.setAttr(f"{cam_shape}.renderable", 0)

    # Attach or create Image Plane
    existing_planes = cmds.imagePlane(camera=cam, query=True) or []
    if existing_planes:
        img_plane = existing_planes[0]
    else:
        created = cmds.imagePlane(camera=cam)
        img_plane = created[1] if len(created) > 1 else created[0]

    try:
        cmds.setAttr(f"{img_plane}.imageName", video_url, type="string")
        cmds.setAttr(f"{img_plane}.useFrameExtension", 1)
        cmds.setAttr(f"{img_plane}.frameOffset", offset)
        cmds.setAttr(f"{img_plane}.fit", 2)  # Fit to Resolution Gate
        cmds.setAttr(f"{img_plane}.depth", 1000)  # Behind character rigs
        cmds.setAttr(f"{img_plane}.lockedToCamera", 1)
        if cmds.attributeQuery("alphaGain", node=img_plane, exists=True):
            cmds.setAttr(f"{img_plane}.alphaGain", opacity)
    except Exception as err:
        print(f"[AnimRef] Warning while setting imagePlane attributes: {err}")

    cmds.select(cam)
    return cam, img_plane

def set_image_plane_opacity(img_plane, opacity):
    if not MAYA_AVAILABLE or not cmds.objExists(img_plane):
        return
    if cmds.attributeQuery("alphaGain", node=img_plane, exists=True):
        cmds.setAttr(f"{img_plane}.alphaGain", float(opacity))

def set_image_plane_offset(img_plane, offset):
    if not MAYA_AVAILABLE or not cmds.objExists(img_plane):
        return
    if cmds.attributeQuery("frameOffset", node=img_plane, exists=True):
        cmds.setAttr(f"{img_plane}.frameOffset", int(offset))

def conform_timeline_fps(fps=24):
    """
    Conforms Maya's playback options and time unit to match the reference clip.
    """
    if not MAYA_AVAILABLE:
        return
    fps_mapping = {
        12: "12fps",
        15: "game",
        24: "film",
        25: "pal",
        30: "ntsc",
        48: "show",
        50: "palf",
        60: "ntscf"
    }
    unit = fps_mapping.get(int(fps), "film")
    cmds.currentUnit(time=unit)
    cmds.playbackOptions(playbackSpeed=1)
    print(f"[AnimRef] Conformed Maya timeline time unit to: {unit} ({fps} FPS)")
