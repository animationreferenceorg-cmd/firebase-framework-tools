bl_info = {
    "name": "AnimationReference.org Studio Bridge",
    "author": "AnimationReference.org",
    "version": (1, 0, 0),
    "blender": (3, 6, 0),
    "location": "View3D > Sidebar (N) > AnimRef",
    "description": "Stream animation references from AnimationReference.org directly into your Blender Camera or 3D scene.",
    "warning": "",
    "doc_url": "https://animationreference.org/plugins",
    "category": "Animation",
}

import bpy
from . import bridge_server
from . import operators
from . import panel

class AnimRefSettings(bpy.types.PropertyGroup):
    active_title: bpy.props.StringProperty(name="Title", default="")
    active_url: bpy.props.StringProperty(name="Active URL", default="")
    custom_url: bpy.props.StringProperty(name="Custom URL", default="")
    fps: bpy.props.IntProperty(name="FPS", default=24)
    search_query: bpy.props.StringProperty(name="Search", default="")
    opacity: bpy.props.FloatProperty(name="Opacity", default=0.7, min=0.0, max=1.0)
    frame_offset: bpy.props.IntProperty(name="Frame Offset", default=0)
    display_mode: bpy.props.EnumProperty(
        name="Display Mode",
        items=[
            ('CAMERA', "Camera Background", "Attach movie clip to active camera background"),
            ('PLANE', "3D Reference Plane", "Spawn a textured 3D reference plane in viewport"),
        ],
        default='CAMERA'
    )

classes = (
    AnimRefSettings,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

    bpy.types.Scene.animref_settings = bpy.props.PointerProperty(type=AnimRefSettings)
    
    operators.register()
    panel.register()
    bridge_server.start_server()

def unregister():
    bridge_server.stop_server()
    panel.unregister()
    operators.unregister()

    del bpy.types.Scene.animref_settings

    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
