"""
AnimationReference.org - Blender Add-on Operators
"""

import bpy
import json
import urllib.request
import re

def clean_name(title):
    return re.sub(r'[^a-zA-Z0-9_]', '_', title)[:20]

class ANIMREF_OT_LoadReference(bpy.types.Operator):
    bl_idname = "animref.load_reference"
    bl_label = "Load Animation Reference"
    bl_description = "Load reference clip into active camera or 3D scene"
    bl_options = {'REGISTER', 'UNDO'}

    video_url: bpy.props.StringProperty(name="Video URL", default="")
    title: bpy.props.StringProperty(name="Title", default="Reference")
    fps: bpy.props.IntProperty(name="FPS", default=24)

    def execute(self, context):
        settings = context.scene.animref_settings
        url = self.video_url or settings.custom_url
        title = self.title or settings.active_title or "Reference"
        fps = self.fps or settings.fps

        if not url:
            self.report({'WARNING'}, "No video URL specified.")
            return {'CANCELLED'}

        settings.active_title = title
        settings.active_url = url
        settings.fps = fps

        if settings.display_mode == 'CAMERA':
            self._setup_camera_background(context, url, title, settings.opacity)
        else:
            self._setup_3d_plane(context, url, title)

        self.report({'INFO'}, f"[AnimRef] Loaded reference: '{title}'")
        return {'FINISHED'}

    def _setup_camera_background(self, context, url, title, opacity):
        scene = context.scene
        cam_obj = scene.camera
        if not cam_obj:
            bpy.ops.object.camera_add(location=(0, -8, 2), rotation=(1.5708, 0, 0))
            cam_obj = context.active_object
            scene.camera = cam_obj

        cam_data = cam_obj.data
        cam_data.show_background_images = True

        bg = None
        for b in cam_data.background_images:
            if b.source in ['MOVIE_CLIP', 'IMAGE']:
                bg = b
                break
        if not bg:
            bg = cam_data.background_images.new()

        bg.source = 'IMAGE'
        bg.frame_method = 'FIT'
        bg.alpha = opacity
        bg.display_depth = 'BACK'

    def _setup_3d_plane(self, context, url, title):
        safe_name = f"RefPlane_{clean_name(title)}"
        # Create reference plane in front of origin
        bpy.ops.mesh.primitive_plane_add(size=4.0, location=(0, 2, 2), rotation=(1.5708, 0, 0))
        plane = context.active_object
        plane.name = safe_name

class ANIMREF_OT_ConformFPS(bpy.types.Operator):
    bl_idname = "animref.conform_fps"
    bl_label = "Conform Scene FPS"
    bl_description = "Match Blender scene framerate to reference clip"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        fps = context.scene.animref_settings.fps
        context.scene.render.fps = fps
        self.report({'INFO'}, f"[AnimRef] Set Scene FPS to {fps}")
        return {'FINISHED'}

class ANIMREF_OT_SearchLibrary(bpy.types.Operator):
    bl_idname = "animref.search_library"
    bl_label = "Search Reference Library"
    bl_description = "Search references on AnimationReference.org"

    def execute(self, context):
        settings = context.scene.animref_settings
        query = settings.search_query.lower().strip()
        try:
            url = "https://animationreference.org/data/videos-snapshot.json"
            req = urllib.request.Request(url, headers={'User-Agent': 'AnimRefBlender/1.0'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                videos = data.get('videos', [])
                found = []
                for v in videos:
                    if query in v.get('title', '').lower() or query in v.get('category', '').lower():
                        found.append(v)
                        if len(found) >= 1:
                            # Load first match
                            settings.active_title = v.get('title', '')
                            settings.custom_url = v.get('videoUrl', '')
                            settings.fps = v.get('fps', 24)
                            self.report({'INFO'}, f"Found: {settings.active_title}")
                            return {'FINISHED'}
        except Exception as e:
            self.report({'WARNING'}, f"Search error: {e}")
        return {'FINISHED'}

classes = (
    ANIMREF_OT_LoadReference,
    ANIMREF_OT_ConformFPS,
    ANIMREF_OT_SearchLibrary,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
