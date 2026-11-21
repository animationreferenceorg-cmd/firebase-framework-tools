"""
Blender View3D Sidebar (N-Panel) UI & Operators for AnimationReference.org Studio.
"""

from __future__ import annotations

import os
import webbrowser

import bpy

from . import animref_api, animref_auth, animref_importer, animref_playblast


def _populate_results(settings, items: list[dict]) -> None:
    settings.results.clear()
    for item in items:
        row = settings.results.add()
        row.clip_id = str(item.get("id") or "")
        row.title = str(item.get("title") or "Untitled Reference")
        row.category = str(item.get("category") or "")
        row.video_url = str(item.get("videoUrl") or item.get("mediaUrl") or "")
        row.thumbnail_url = str(item.get("thumbnailUrl") or item.get("posterUrl") or item.get("previewUrl") or "")
        row.media_type = str(item.get("mediaType") or "video")
        row.fps = int(item.get("fps") or 24)
        row.duration = float(item.get("duration") or 0.0)
    settings.active_result_index = 0
    if hasattr(settings, "studio_page"):
        settings.studio_page = 0


def _refresh_scene_list(context) -> None:
    settings = context.scene.animref_settings
    refs = animref_importer.list_scene_references(context)
    settings.scene_refs.clear()
    for ref in refs:
        row = settings.scene_refs.add()
        row.ref_key = ref["name"]
        row.label = ref["label"]
        row.kind = ref["kind"]
        row.opacity = ref["opacity"]
        row.offset = ref["offset"]
        row.hidden = ref["hidden"]
    if settings.active_scene_ref_index >= len(settings.scene_refs):
        settings.active_scene_ref_index = max(0, len(settings.scene_refs) - 1)


# ---------------------------------------------------------------------------
# UILists
# ---------------------------------------------------------------------------

class ANIMREF_UL_ClipResults(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        row = layout.row(align=True)
        row.label(text=item.title, icon="FILE_MOVIE" if item.media_type != "image" else "IMAGE_DATA")
        if item.category:
            sub = row.row()
            sub.alignment = "RIGHT"
            sub.label(text=item.category)


class ANIMREF_UL_SceneRefs(bpy.types.UIList):
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        row = layout.row(align=True)
        ic = "CAMERA_DATA" if item.kind == "CAMERA_BG" else "EMPTY_DATA"
        row.label(text=item.label, icon=ic)
        sub = row.row()
        sub.alignment = "RIGHT"
        sub.label(text=f"{item.offset:+d}f")


# ---------------------------------------------------------------------------
# Auth Operators
# ---------------------------------------------------------------------------

class ANIMREF_OT_BrowserSignIn(bpy.types.Operator):
    bl_idname = "animref.browser_sign_in"
    bl_label = "Sign In via Browser"
    bl_description = "Open AnimationReference.org to connect your account (supports Google & Email)"

    def execute(self, context):
        def _on_connected(_state):
            def _redraw():
                try:
                    bpy.ops.animref.search_library("INVOKE_DEFAULT", force_refresh=True)
                except Exception:
                    pass
                for win in bpy.context.window_manager.windows:
                    for area in win.screen.areas:
                        area.tag_redraw()
                return None
            bpy.app.timers.register(_redraw, first_interval=0.2)

        url = animref_auth.start_browser_auth_flow(on_success=_on_connected, open_browser=True)
        self.report({"INFO"}, f"Opened browser sign-in: {url}")
        return {"FINISHED"}


class ANIMREF_OT_PasteConnectToken(bpy.types.Operator):
    bl_idname = "animref.paste_connect_token"
    bl_label = "Connect with Token"
    bl_description = "Sign in using a Connect Token copied from animationreference.org/extension/connect"

    def execute(self, context):
        token = context.scene.animref_settings.connect_token
        try:
            state = animref_auth.sign_in_with_connect_token(token)
            context.scene.animref_settings.connect_token = ""
            self.report({"INFO"}, f"Signed in as {state.get('displayName') or state.get('email') or 'Animator'}")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


class ANIMREF_OT_SignOut(bpy.types.Operator):
    bl_idname = "animref.sign_out"
    bl_label = "Sign Out"
    bl_description = "Sign out of AnimationReference.org in Blender"

    def execute(self, context):
        animref_auth.sign_out()
        self.report({"INFO"}, "Signed out of AnimationReference.org.")
        return {"FINISHED"}


class ANIMREF_OT_OpenUpgrade(bpy.types.Operator):
    bl_idname = "animref.open_upgrade"
    bl_label = "Upgrade to Pro ($1 First Month)"
    bl_description = "Open AnimationReference.org Pro pricing in your browser"

    def execute(self, context):
        webbrowser.open(f"{animref_auth.SITE_BASE_URL}/pricing")
        return {"FINISHED"}


# ---------------------------------------------------------------------------
# Library Search & Import Operators
# ---------------------------------------------------------------------------

class ANIMREF_OT_SearchLibrary(bpy.types.Operator):
    bl_idname = "animref.search_library"
    bl_label = "Search Library"
    bl_description = "Search the AnimationReference.org catalog"

    force_refresh: bpy.props.BoolProperty(default=False)

    def execute(self, context):
        settings = context.scene.animref_settings
        try:
            if settings.library_tab == "SAVED":
                videos = animref_api.fetch_saved_references()
                if not videos:
                    videos = animref_api.fetch_moodboard_items()
            elif settings.library_tab == "BOARDS":
                videos = animref_api.fetch_moodboard_items()
            else:
                videos = animref_api.fetch_catalog(force_refresh=self.force_refresh)
            matches = animref_api.search_catalog(
                query=settings.search_query,
                tag=settings.tag_filter if settings.library_tab == "EXPLORE" else "all",
                videos=videos,
                limit=80,
            )
            _populate_results(settings, matches)
            self.report({"INFO"}, f"Loaded {len(matches)} references.")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


class ANIMREF_OT_ImportSelected(bpy.types.Operator):
    bl_idname = "animref.import_selected"
    bl_label = "Import to Blender"
    bl_description = "Download and import the selected reference into your Blender scene"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.results or settings.active_result_index >= len(settings.results):
            self.report({"WARNING"}, "Select a reference from the list first.")
            return {"CANCELLED"}

        item = settings.results[settings.active_result_index]
        video_dict = {
            "id": item.clip_id,
            "title": item.title,
            "videoUrl": item.video_url,
            "mediaType": item.media_type,
            "fps": item.fps,
            "duration": item.duration,
        }

        try:
            local_path = animref_api.authorize_and_download_media(video_dict)
            mode = settings.import_mode
            if mode == "CAMERA_BG":
                animref_importer.import_to_camera_background(
                    context,
                    local_path=local_path,
                    title=item.title,
                    opacity=settings.import_opacity,
                    pip_preset=settings.pip_preset,
                    start_at_current_frame=settings.start_at_current_frame,
                    fps=item.fps or 24,
                    duration_sec=item.duration,
                )
            elif mode == "EMPTY_3D":
                animref_importer.import_to_3d_empty(
                    context,
                    local_path=local_path,
                    title=item.title,
                    opacity=settings.import_opacity,
                    face_camera=settings.face_camera,
                    start_at_current_frame=settings.start_at_current_frame,
                    fps=item.fps or 24,
                    duration_sec=item.duration,
                )
            else:
                animref_importer.import_to_vse(context, local_path=local_path, title=item.title)

            if settings.auto_conform_fps and item.fps > 0:
                animref_importer.conform_scene_fps(context, item.fps)

            _refresh_scene_list(context)
            self.report({"INFO"}, f"Imported '{item.title}' ({mode}).")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


# ---------------------------------------------------------------------------
# Scene Reference Manager Operators
# ---------------------------------------------------------------------------

class ANIMREF_OT_RefreshSceneRefs(bpy.types.Operator):
    bl_idname = "animref.refresh_scene_refs"
    bl_label = "Refresh Scene References"

    def execute(self, context):
        _refresh_scene_list(context)
        return {"FINISHED"}


class ANIMREF_OT_MagicAlign(bpy.types.Operator):
    bl_idname = "animref.magic_align"
    bl_label = "Magic Align"
    bl_description = "Align reference start to the current timeline frame"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.scene_refs or settings.active_scene_ref_index >= len(settings.scene_refs):
            return {"CANCELLED"}
        ref_key = settings.scene_refs[settings.active_scene_ref_index].ref_key
        try:
            frame = animref_importer.magic_align_reference(context, ref_key)
            _refresh_scene_list(context)
            self.report({"INFO"}, f"Aligned reference to frame {frame}.")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


class ANIMREF_OT_NudgeRef(bpy.types.Operator):
    bl_idname = "animref.nudge_ref"
    bl_label = "Nudge Reference"
    bl_description = "Shift reference frame offset"
    bl_options = {"REGISTER", "UNDO"}

    delta: bpy.props.IntProperty(default=1)

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.scene_refs or settings.active_scene_ref_index >= len(settings.scene_refs):
            return {"CANCELLED"}
        ref_key = settings.scene_refs[settings.active_scene_ref_index].ref_key
        try:
            new_off = animref_importer.nudge_reference_offset(context, ref_key, self.delta)
            _refresh_scene_list(context)
            self.report({"INFO"}, f"Reference offset: {new_off:+d}f")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


class ANIMREF_OT_MirrorRef(bpy.types.Operator):
    bl_idname = "animref.mirror_ref"
    bl_label = "Flip Horizontal"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.scene_refs or settings.active_scene_ref_index >= len(settings.scene_refs):
            return {"CANCELLED"}
        ref_key = settings.scene_refs[settings.active_scene_ref_index].ref_key
        animref_importer.toggle_reference_mirror(context, ref_key)
        return {"FINISHED"}


class ANIMREF_OT_ToggleVisRef(bpy.types.Operator):
    bl_idname = "animref.toggle_vis_ref"
    bl_label = "Show / Hide"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.scene_refs or settings.active_scene_ref_index >= len(settings.scene_refs):
            return {"CANCELLED"}
        ref_key = settings.scene_refs[settings.active_scene_ref_index].ref_key
        animref_importer.toggle_reference_visibility(context, ref_key)
        _refresh_scene_list(context)
        return {"FINISHED"}


class ANIMREF_OT_DeleteRef(bpy.types.Operator):
    bl_idname = "animref.delete_ref"
    bl_label = "Remove Reference"
    bl_options = {"REGISTER", "UNDO"}

    def execute(self, context):
        settings = context.scene.animref_settings
        if not settings.scene_refs or settings.active_scene_ref_index >= len(settings.scene_refs):
            return {"CANCELLED"}
        ref_key = settings.scene_refs[settings.active_scene_ref_index].ref_key
        animref_importer.delete_reference(context, ref_key)
        _refresh_scene_list(context)
        return {"FINISHED"}


class ANIMREF_OT_AddPoseMarker(bpy.types.Operator):
    bl_idname = "animref.add_pose_marker"
    bl_label = "Add Pose Marker"
    bl_description = "Drop a named animation pose marker at the current timeline frame"
    bl_options = {"REGISTER", "UNDO"}

    label: bpy.props.StringProperty(default="Key")

    def execute(self, context):
        marker = animref_importer.add_pose_marker(context, self.label)
        self.report({"INFO"}, f"Added timeline marker: {marker.name}")
        return {"FINISHED"}


# ---------------------------------------------------------------------------
# Playblast & Upload Operators
# ---------------------------------------------------------------------------

class ANIMREF_OT_RecordPlayblast(bpy.types.Operator):
    bl_idname = "animref.record_playblast"
    bl_label = "Record Playblast"
    bl_description = "Render active 3D Viewport animation range to MP4 or AVI"

    def execute(self, context):
        settings = context.scene.animref_settings
        try:
            out_path = animref_playblast.record_viewport_playblast(
                context,
                file_format=settings.playblast_format,
                resolution_x=settings.playblast_width,
                resolution_y=settings.playblast_height,
            )
            settings.last_playblast_path = out_path
            self.report({"INFO"}, f"Playblast saved: {out_path}")

            if settings.playblast_auto_upload:
                title = settings.playblast_title or os.path.splitext(os.path.basename(out_path))[0]
                animref_playblast.upload_playblast(out_path, title=title)
                self.report({"INFO"}, f"Uploaded playblast '{title}' to AnimationReference.org!")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


class ANIMREF_OT_UploadLastPlayblast(bpy.types.Operator):
    bl_idname = "animref.upload_last_playblast"
    bl_label = "Upload to AnimationReference.org"
    bl_description = "Upload the last recorded playblast to your AnimationReference.org account"

    def execute(self, context):
        settings = context.scene.animref_settings
        path = settings.last_playblast_path
        if not path or not os.path.isfile(path):
            self.report({"WARNING"}, "Record a playblast first.")
            return {"CANCELLED"}
        try:
            title = settings.playblast_title or os.path.splitext(os.path.basename(path))[0]
            animref_playblast.upload_playblast(path, title=title)
            self.report({"INFO"}, f"Uploaded '{title}' to AnimationReference.org!")
            return {"FINISHED"}
        except Exception as exc:
            self.report({"ERROR"}, str(exc))
            return {"CANCELLED"}


# ---------------------------------------------------------------------------
# Sidebar Panels (View3D > N > AnimRef)
# ---------------------------------------------------------------------------

class ANIMREF_PT_AccountPanel(bpy.types.Panel):
    bl_label = "AnimRef Account"
    bl_idname = "ANIMREF_PT_account"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "AnimRef"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings
        acct = animref_auth.get_account_summary()

        # Hero CTA: Launch Custom Visual Studio Window (Maya-style)
        hero = layout.row()
        hero.scale_y = 1.5
        hero.operator("animref.open_studio_window", text="Open AnimRef Studio Window", icon="WINDOW")

        box = layout.box()
        if acct["signed_in"]:
            row = box.row(align=True)
            row.label(text=acct["display_name"] or "Signed In", icon="USER")
            if acct["is_pro"]:
                row.label(text="PRO", icon="SOLO_ON")
            row = box.row(align=True)
            if not acct["is_pro"]:
                row.operator("animref.open_upgrade", text="Go Pro ($1)", icon="SOLO_ON")
            row.operator("animref.sign_out", text="Sign Out", icon="PANEL_CLOSE")
        else:
            box.operator("animref.browser_sign_in", text="Sign In via Browser", icon="URL")
            row = box.row(align=True)
            row.prop(settings, "connect_token", text="")
            row.operator("animref.paste_connect_token", text="Connect", icon="KEYINGSET")


class ANIMREF_PT_LibraryPanel(bpy.types.Panel):
    bl_label = "Reference Library"
    bl_idname = "ANIMREF_PT_library"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "AnimRef"

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings

        row = layout.row(align=True)
        row.prop(settings, "library_tab", expand=True)

        row = layout.row(align=True)
        row.prop(settings, "search_query", text="", icon="VIEWZOOM")
        op = row.operator("animref.search_library", text="", icon="FILE_REFRESH")
        op.force_refresh = True

        if settings.library_tab == "EXPLORE":
            layout.prop(settings, "tag_filter", text="Category")

        if not settings.results:
            load_row = layout.row()
            load_row.scale_y = 1.25
            op_load = load_row.operator("animref.search_library", text="Load References", icon="FILE_REFRESH")
            op_load.force_refresh = True

        layout.template_list(
            "ANIMREF_UL_ClipResults",
            "",
            settings,
            "results",
            settings,
            "active_result_index",
            rows=5,
        )

        box = layout.box()
        box.prop(settings, "import_mode", text="Mode")
        if settings.import_mode == "CAMERA_BG":
            box.prop(settings, "pip_preset", text="Placement")
        elif settings.import_mode == "EMPTY_3D":
            box.prop(settings, "face_camera")

        row = box.row(align=True)
        row.prop(settings, "import_opacity", slider=True)
        row = box.row(align=True)
        row.prop(settings, "start_at_current_frame")
        row.prop(settings, "auto_conform_fps")

        cta = layout.row()
        cta.scale_y = 1.4
        cta.operator("animref.import_selected", text="Import Selected Reference", icon="IMPORT")


class ANIMREF_PT_SceneManagerPanel(bpy.types.Panel):
    bl_label = "Scene References"
    bl_idname = "ANIMREF_PT_scene_manager"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "AnimRef"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings

        row = layout.row(align=True)
        row.operator("animref.refresh_scene_refs", text="Refresh Scene", icon="FILE_REFRESH")

        layout.template_list(
            "ANIMREF_UL_SceneRefs",
            "",
            settings,
            "scene_refs",
            settings,
            "active_scene_ref_index",
            rows=3,
        )

        if settings.scene_refs:
            row = layout.row(align=True)
            row.operator("animref.magic_align", text="Magic Align", icon="PLAY")
            row.operator("animref.mirror_ref", text="Flip", icon="MOD_MIRROR")

            row = layout.row(align=True)
            for delta in (-5, -1, 1, 5):
                op = row.operator("animref.nudge_ref", text=f"{delta:+d}f")
                op.delta = delta

            row = layout.row(align=True)
            row.operator("animref.toggle_vis_ref", text="Hide/Show", icon="HIDE_OFF")
            row.operator("animref.delete_ref", text="Remove", icon="TRASH")


class ANIMREF_PT_ToolsPanel(bpy.types.Panel):
    bl_label = "Pose Markers & Playblast"
    bl_idname = "ANIMREF_PT_tools"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "AnimRef"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        settings = context.scene.animref_settings

        box = layout.box()
        box.label(text="Drop Timeline Pose Marker", icon="MARKER_HLT")
        grid = box.grid_flow(row_major=True, columns=2, even_columns=True, align=True)
        for _key, label in animref_importer.POSE_MARKERS:
            op = grid.operator("animref.add_pose_marker", text=label)
            op.label = label

        pbox = layout.box()
        pbox.label(text="Viewport Playblast", icon="RENDER_ANIMATION")
        pbox.prop(settings, "playblast_format", text="Format")
        row = pbox.row(align=True)
        row.prop(settings, "playblast_width")
        row.prop(settings, "playblast_height")
        pbox.prop(settings, "playblast_title", text="Title")
        pbox.prop(settings, "playblast_auto_upload")

        row = pbox.row()
        row.scale_y = 1.3
        row.operator("animref.record_playblast", text="Record Playblast", icon="REC")
        if settings.last_playblast_path:
            pbox.operator("animref.upload_last_playblast", text="Upload Last Playblast", icon="EXPORT")


CLASSES = (
    ANIMREF_UL_ClipResults,
    ANIMREF_UL_SceneRefs,
    ANIMREF_OT_BrowserSignIn,
    ANIMREF_OT_PasteConnectToken,
    ANIMREF_OT_SignOut,
    ANIMREF_OT_OpenUpgrade,
    ANIMREF_OT_SearchLibrary,
    ANIMREF_OT_ImportSelected,
    ANIMREF_OT_RefreshSceneRefs,
    ANIMREF_OT_MagicAlign,
    ANIMREF_OT_NudgeRef,
    ANIMREF_OT_MirrorRef,
    ANIMREF_OT_ToggleVisRef,
    ANIMREF_OT_DeleteRef,
    ANIMREF_OT_AddPoseMarker,
    ANIMREF_OT_RecordPlayblast,
    ANIMREF_OT_UploadLastPlayblast,
    ANIMREF_PT_AccountPanel,
    ANIMREF_PT_LibraryPanel,
    ANIMREF_PT_SceneManagerPanel,
    ANIMREF_PT_ToolsPanel,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)


def unregister():
    for cls in reversed(CLASSES):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            pass
