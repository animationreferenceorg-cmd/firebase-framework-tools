"""
Custom Visual Studio Browser Window for Blender (modeled after the Maya AnimRef Studio UI).

Features:
- Spacious floating Studio Window (`width=780`) with visual thumbnail card grid
- Explore / Saved / Boards tabs, Search bar, Category filter, and pagination
- 1-click "+ Blender" import right on every visual card
- Integrated Import Mode (Camera PiP / 3D Plane / VSE), Opacity, and Playblast controls
"""

from __future__ import annotations

import webbrowser

import bpy

from . import animref_api, animref_auth, animref_companion, animref_importer, animref_thumbs

CARDS_PER_PAGE = 9


class ANIMREF_OT_ImportByIndex(bpy.types.Operator):
    bl_idname = "animref.import_by_index"
    bl_label = "+ Blender"
    bl_description = "Download and import this reference clip into your Blender viewport"
    bl_options = {"REGISTER", "UNDO"}

    clip_index: bpy.props.IntProperty(default=0)

    def execute(self, context):
        settings = context.scene.animref_settings
        idx = int(self.clip_index)
        if idx < 0 or idx >= len(settings.results):
            self.report({"WARNING"}, "Reference clip not found.")
            return {"CANCELLED"}

        settings.active_result_index = idx
        return bpy.ops.animref.import_selected("EXEC_DEFAULT")


class ANIMREF_OT_OpenClipWeb(bpy.types.Operator):
    bl_idname = "animref.open_clip_web"
    bl_label = "Open on Web"
    bl_description = "Open this clip on AnimationReference.org in your browser"

    clip_id: bpy.props.StringProperty(default="")

    def execute(self, context):
        if self.clip_id:
            webbrowser.open(f"{animref_auth.SITE_BASE_URL}/video/{self.clip_id}")
        else:
            webbrowser.open(animref_auth.SITE_BASE_URL)
        return {"FINISHED"}


class ANIMREF_OT_StudioPageNav(bpy.types.Operator):
    bl_idname = "animref.studio_page_nav"
    bl_label = "Change Page"
    bl_description = "Navigate between pages of reference cards"

    delta: bpy.props.IntProperty(default=1)

    def execute(self, context):
        settings = context.scene.animref_settings
        total_pages = max(1, (len(settings.results) + CARDS_PER_PAGE - 1) // CARDS_PER_PAGE)
        next_page = max(0, min(total_pages - 1, settings.studio_page + self.delta))
        settings.studio_page = next_page
        return {"FINISHED"}


class ANIMREF_OT_OpenStudioWindow(bpy.types.Operator):
    bl_idname = "animref.open_studio_window"
    bl_label = "Open AnimRef Studio"
    bl_description = "Launch the modern AnimationReference.org Studio window (masonry grid, hover-to-play, studio player & live Blender sync)"

    def execute(self, context):
        url = animref_companion.launch_studio_app_window()
        self.report({"INFO"}, f"Opened AnimRef Studio Window ({url})")
        return {"FINISHED"}

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings
        acct = animref_auth.get_account_summary()

        # --- Top Studio Header Bar ---
        hdr = layout.box()
        top_row = hdr.row(align=True)
        top_row.label(text="ANIMATIONREFERENCE.ORG STUDIO", icon="RENDER_ANIMATION")

        right = top_row.row(align=True)
        right.alignment = "RIGHT"
        if acct["signed_in"]:
            right.label(text=acct["display_name"] or "Signed In", icon="USER")
            if acct["is_pro"]:
                right.label(text="PRO", icon="SOLO_ON")
            else:
                right.operator("animref.open_upgrade", text="Go Pro ($1)", icon="SOLO_ON")
            right.operator("animref.sign_out", text="", icon="PANEL_CLOSE")
        else:
            right.operator("animref.browser_sign_in", text="Sign In via Browser", icon="URL")

        # --- Navigation Tabs + Search + Category Filter ---
        nav_row = hdr.row(align=True)
        nav_row.prop(settings, "library_tab", expand=True)
        nav_row.separator()
        nav_row.prop(settings, "search_query", text="", icon="VIEWZOOM")
        if settings.library_tab == "EXPLORE":
            nav_row.prop(settings, "tag_filter", text="")
        op_ref = nav_row.operator("animref.search_library", text="Refresh", icon="FILE_REFRESH")
        op_ref.force_refresh = True

        # --- Visual Thumbnail Card Grid (3 Columns) ---
        total = len(settings.results)
        total_pages = max(1, (total + CARDS_PER_PAGE - 1) // CARDS_PER_PAGE)
        page = max(0, min(total_pages - 1, settings.studio_page))
        start = page * CARDS_PER_PAGE
        end = min(total, start + CARDS_PER_PAGE)

        if total == 0:
            empty_box = layout.box()
            empty_box.label(text="No references loaded yet for this tab.", icon="INFO")
            op_load = empty_box.operator("animref.search_library", text="Load References Now", icon="FILE_REFRESH")
            op_load.force_refresh = True
        else:
            # Prefetch visible page thumbnails
            animref_thumbs.prefetch_thumbnails(
                [settings.results[i].thumbnail_url for i in range(start, end)],
                limit=CARDS_PER_PAGE,
            )

            grid = layout.grid_flow(row_major=True, columns=3, even_columns=True, even_rows=True, align=False)
            for idx in range(start, end):
                item = settings.results[idx]
                card = grid.box()

                icon_id = animref_thumbs.get_icon_id(item.thumbnail_url)
                if icon_id:
                    card.template_icon(icon_value=icon_id, scale=6.2)
                else:
                    ph = card.box()
                    ph.scale_y = 2.6
                    ph.alignment = "CENTER"
                    ph.label(
                        text=item.category or "Loading preview...",
                        icon="FILE_MOVIE" if item.media_type != "image" else "IMAGE_DATA",
                    )

                title_row = card.row()
                title_row.label(text=item.title[:34] + ("…" if len(item.title) > 34 else ""))

                meta_row = card.row(align=True)
                meta_row.scale_y = 0.85
                meta_txt = f"{item.category or 'Ref'} · {item.fps}fps"
                meta_row.label(text=meta_txt)

                act_row = card.row(align=True)
                op_imp = act_row.operator("animref.import_by_index", text="+ Blender", icon="IMPORT")
                op_imp.clip_index = idx
                op_web = act_row.operator("animref.open_clip_web", text="", icon="URL")
                op_web.clip_id = item.clip_id

            # Pagination Bar
            pag = layout.row(align=True)
            prev_col = pag.row()
            prev_col.enabled = page > 0
            op_prev = prev_col.operator("animref.studio_page_nav", text="Prev", icon="TRIA_LEFT")
            op_prev.delta = -1

            mid = pag.row()
            mid.alignment = "CENTER"
            mid.label(text=f"Page {page + 1} / {total_pages}   ({total} references)")

            next_col = pag.row()
            next_col.alignment = "RIGHT"
            next_col.enabled = page + 1 < total_pages
            op_next = next_col.operator("animref.studio_page_nav", text="Next", icon="TRIA_RIGHT")
            op_next.delta = 1

        # --- Bottom Studio Import & Playblast Bar ---
        foot = layout.box()
        f_row = foot.row(align=True)
        f_row.prop(settings, "import_mode", text="Mode")
        if settings.import_mode == "CAMERA_BG":
            f_row.prop(settings, "pip_preset", text="PiP")
        elif settings.import_mode == "EMPTY_3D":
            f_row.prop(settings, "face_camera")
        f_row.prop(settings, "import_opacity", slider=True)
        f_row.prop(settings, "auto_conform_fps")

        pb_row = foot.row(align=True)
        pb_row.operator("animref.record_playblast", text="Record Playblast (MP4/AVI)", icon="REC")
        pb_row.prop(settings, "playblast_auto_upload", text="Auto-Post to Site")


CLASSES = (
    ANIMREF_OT_ImportByIndex,
    ANIMREF_OT_OpenClipWeb,
    ANIMREF_OT_StudioPageNav,
    ANIMREF_OT_OpenStudioWindow,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    animref_companion.stop_companion_server()
    for cls in reversed(CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            pass
    animref_thumbs.clear_previews()
