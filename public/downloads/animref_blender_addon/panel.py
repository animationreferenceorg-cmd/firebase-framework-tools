"""
AnimationReference.org - Blender 3D Viewport Sidebar Panel (N)
"""

import bpy

class ANIMREF_PT_MainPanel(bpy.types.Panel):
    bl_label = "Animation Reference"
    bl_idname = "ANIMREF_PT_main_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'AnimRef'

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings

        # 1. Bridge Status Box
        box = layout.box()
        row = box.row(align=True)
        row.label(text="Bridge: Listening on Port 9877", icon='RADIOBUT_ON')

        # 2. In-Blender Search
        layout.label(text="Search Library:", icon='VIEWZOOM')
        search_row = layout.row(align=True)
        search_row.prop(settings, "search_query", text="")
        search_row.operator("animref.search_library", text="Search", icon='FILE_REFRESH')

        # 3. Active Reference Information
        if settings.active_title:
            box = layout.box()
            box.label(text=f"Clip: {settings.active_title[:24]}", icon='FILE_MOVIE')
            box.label(text=f"FPS: {settings.fps}")

        # 4. Display Mode Toggle
        layout.label(text="Display Mode:")
        layout.prop(settings, "display_mode", expand=True)

        # 5. Opacity & Offset Controls
        col = layout.column(align=True)
        col.prop(settings, "opacity", slider=True)
        col.prop(settings, "frame_offset")

        # 6. Action Buttons
        layout.operator("animref.load_reference", text="Load / Update Reference", icon='IMPORT')
        layout.operator("animref.conform_fps", text=f"Conform FPS ({settings.fps} FPS)", icon='TIME')

        # Custom URL Input
        layout.separator()
        layout.prop(settings, "custom_url", text="Custom URL")

classes = (
    ANIMREF_PT_MainPanel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)

def unregister():
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
