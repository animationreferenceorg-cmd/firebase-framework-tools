bl_info = {
    "name": "AnimationReference.org Studio",
    "author": "AnimationReference.org",
    "version": (2, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar (N) > AnimRef",
    "description": "Search, import, sync, and playblast animation references directly inside Blender.",
    "warning": "",
    "doc_url": "https://animationreference.org/plugins",
    "tracker_url": "https://animationreference.org/feedback",
    "category": "Animation",
}

try:
    import bpy
except ImportError:
    bpy = None

if bpy is not None:
    from . import animref_panel

    class AnimRefClipItem(bpy.types.PropertyGroup):
        clip_id: bpy.props.StringProperty(name="ID", default="")
        title: bpy.props.StringProperty(name="Title", default="")
        category: bpy.props.StringProperty(name="Category", default="")
        video_url: bpy.props.StringProperty(name="Video URL", default="")
        media_type: bpy.props.StringProperty(name="Media Type", default="video")
        fps: bpy.props.IntProperty(name="FPS", default=24)
        duration: bpy.props.FloatProperty(name="Duration", default=0.0)

    class AnimRefSceneRefItem(bpy.types.PropertyGroup):
        ref_key: bpy.props.StringProperty(name="Key", default="")
        label: bpy.props.StringProperty(name="Label", default="")
        kind: bpy.props.StringProperty(name="Kind", default="EMPTY")
        opacity: bpy.props.FloatProperty(name="Opacity", default=0.8)
        offset: bpy.props.IntProperty(name="Offset", default=0)
        hidden: bpy.props.BoolProperty(name="Hidden", default=False)

    def _trigger_auto_search(self, context):
        try:
            bpy.ops.animref.search_library("INVOKE_DEFAULT", force_refresh=False)
        except Exception:
            pass

    class AnimRefSettings(bpy.types.PropertyGroup):
        connect_token: bpy.props.StringProperty(
            name="Connect Token",
            description="Paste your Connect Token from animationreference.org/extension/connect",
            default="",
            subtype="PASSWORD",
        )
        library_tab: bpy.props.EnumProperty(
            name="Tab",
            items=[
                ("EXPLORE", "Explore", "Browse AnimationReference.org catalog"),
                ("SAVED", "Saved", "Your saved reference clips"),
                ("BOARDS", "Boards", "Clips from your AnimationReference.org moodboards"),
            ],
            default="EXPLORE",
            update=_trigger_auto_search,
        )
        search_query: bpy.props.StringProperty(name="Search", default="", update=_trigger_auto_search)
        tag_filter: bpy.props.EnumProperty(
            name="Category",
            items=[
                ("all", "All Categories", "Show all references"),
                ("walk", "Walk Cycle", "Walk cycle references"),
                ("run", "Run Cycle", "Run cycle references"),
                ("combat", "Combat", "Fighting & combat references"),
                ("acting", "Acting", "Character acting & facial references"),
                ("parkour", "Parkour / Acro", "Parkour and acrobatics"),
                ("creature", "Creature / Animal", "Animals and creature locomotion"),
                ("fx", "FX", "Visual effects references"),
            ],
            default="all",
            update=_trigger_auto_search,
        )
        import_mode: bpy.props.EnumProperty(
            name="Import Mode",
            items=[
                ("CAMERA_BG", "Camera Background", "Attach video directly to active camera background (with PiP)"),
                ("EMPTY_3D", "3D Reference Plane", "Spawn an Image Empty in the 3D Viewport"),
                ("VSE", "Video Sequencer", "Add movie strip to the Video Sequencer"),
            ],
            default="CAMERA_BG",
        )
        pip_preset: bpy.props.EnumProperty(
            name="PiP Placement",
            items=[
                ("TOP_RIGHT", "PiP: Top-Right", "Overlay in top-right corner of camera"),
                ("TOP_LEFT", "PiP: Top-Left", "Overlay in top-left corner of camera"),
                ("BOTTOM_RIGHT", "PiP: Bottom-Right", "Overlay in bottom-right corner of camera"),
                ("BOTTOM_LEFT", "PiP: Bottom-Left", "Overlay in bottom-left corner of camera"),
                ("FULL", "Full Frame", "Fill the camera background"),
            ],
            default="TOP_RIGHT",
        )
        import_opacity: bpy.props.FloatProperty(name="Opacity", default=0.75, min=0.05, max=1.0)
        face_camera: bpy.props.BoolProperty(name="Auto-Face Camera", default=False)
        start_at_current_frame: bpy.props.BoolProperty(name="Start @ Frame", default=True)
        auto_conform_fps: bpy.props.BoolProperty(name="Match FPS", default=True)

        results: bpy.props.CollectionProperty(type=AnimRefClipItem)
        active_result_index: bpy.props.IntProperty(name="Active Result", default=0)

        scene_refs: bpy.props.CollectionProperty(type=AnimRefSceneRefItem)
        active_scene_ref_index: bpy.props.IntProperty(name="Active Scene Ref", default=0)

        playblast_format: bpy.props.EnumProperty(
            name="Format",
            items=[
                ("MP4", "MP4 (H.264)", "High-quality H.264 MP4 via Blender FFmpeg"),
                ("AVI", "AVI (MJPEG)", "Fast AVI JPEG viewport capture"),
            ],
            default="MP4",
        )
        playblast_width: bpy.props.IntProperty(name="Width", default=1280, min=320, max=3840)
        playblast_height: bpy.props.IntProperty(name="Height", default=720, min=240, max=2160)
        playblast_title: bpy.props.StringProperty(name="Title", default="")
        playblast_auto_upload: bpy.props.BoolProperty(name="Auto-Upload to Site", default=False)
        last_playblast_path: bpy.props.StringProperty(name="Last Playblast", default="")

    CORE_CLASSES = (
        AnimRefClipItem,
        AnimRefSceneRefItem,
        AnimRefSettings,
    )

    def register():
        for cls in CORE_CLASSES:
            bpy.utils.register_class(cls)
        bpy.types.Scene.animref_settings = bpy.props.PointerProperty(type=AnimRefSettings)
        animref_panel.register()

    def unregister():
        animref_panel.unregister()
        if hasattr(bpy.types.Scene, "animref_settings"):
            del bpy.types.Scene.animref_settings
        for cls in reversed(CORE_CLASSES):
            try:
                bpy.utils.unregister_class(cls)
            except RuntimeError:
                pass
else:
    def register():
        pass

    def unregister():
        pass


if __name__ == "__main__":
    register()
