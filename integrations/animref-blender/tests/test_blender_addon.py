import base64
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

BLENDER_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BLENDER_ROOT not in sys.path:
    sys.path.insert(0, BLENDER_ROOT)

from animref_blender_addon import animref_api, animref_auth, animref_importer, animref_playblast


class FakeImageUser:
    def __init__(self):
        self.use_auto_refresh = False
        self.use_cyclic = False
        self.frame_duration = 1
        self.frame_start = 1
        self.frame_offset = 0


class FakeImage:
    def __init__(self, filepath):
        self.filepath = filepath
        self.name = os.path.basename(filepath)
        self.source = "FILE"
        self.frame_duration = 96


class FakeBgImage:
    def __init__(self):
        self.source = "IMAGE"
        self.image = None
        self.frame_method = "FIT"
        self.alpha = 0.5
        self.display_depth = "BACK"
        self.offset = (0.0, 0.0)
        self.scale = 1.0
        self.use_flip_x = False
        self.show_background_image = True
        self.image_user = FakeImageUser()


class FakeBgList(list):
    def new(self):
        item = FakeBgImage()
        self.append(item)
        return item


class FakeVec3:
    def __init__(self, x=1.0, y=1.0, z=1.0):
        self.x, self.y, self.z = x, y, z


class FakeConstraint:
    def __init__(self, ctype):
        self.type = ctype
        self.name = ""
        self.target = None
        self.track_axis = ""
        self.up_axis = ""


class FakeConstraints(list):
    def new(self, type=""):
        c = FakeConstraint(type)
        self.append(c)
        return c


class FakeObject:
    def __init__(self, name, data=None, obj_type="EMPTY"):
        self.name = name
        self.data = data
        self.type = obj_type
        self.empty_display_type = "PLAIN_AXES"
        self.empty_display_size = 1.0
        self.location = (0.0, 0.0, 0.0)
        self.rotation_euler = (0.0, 0.0, 0.0)
        self.scale = FakeVec3(1.0, 1.0, 1.0)
        self.use_empty_image_alpha = False
        self.color = (1.0, 1.0, 1.0, 1.0)
        self.hide_viewport = False
        self.image_user = FakeImageUser()
        self.constraints = FakeConstraints()
        self._props = {}

    def __setitem__(self, k, v):
        self._props[k] = v

    def get(self, k, default=None):
        return self._props.get(k, default)


class FakeCameraData:
    def __init__(self, name):
        self.name = name
        self.show_background_images = False
        self.background_images = FakeBgList()


class FakeBpy:
    def __init__(self):
        self._images = []
        self._objects = {}
        self._markers = []
        self._vse_strips = []
        self.opengl_called = False

        class _Images:
            def __init__(self, outer):
                self._outer = outer

            def load(self, path, check_existing=True):
                img = FakeImage(path)
                self._outer._images.append(img)
                return img

        class _Cameras:
            def new(self, name):
                return FakeCameraData(name)

        class _Objects:
            def __init__(self, outer):
                self._outer = outer

            def new(self, name, data):
                obj_type = "CAMERA" if isinstance(data, FakeCameraData) else "EMPTY"
                obj = FakeObject(name, data, obj_type=obj_type)
                self._outer._objects[name] = obj
                return obj

            def get(self, name):
                return self._outer._objects.get(name)

            def remove(self, obj, do_unlink=True):
                self._outer._objects.pop(obj.name, None)

        class _Data:
            def __init__(self, outer):
                self.images = _Images(outer)
                self.cameras = _Cameras()
                self.objects = _Objects(outer)

        class _RenderOps:
            def __init__(self, outer):
                self._outer = outer

            def opengl(self, animation=True, write_still=False):
                self._outer.opengl_called = True

        class _Ops:
            def __init__(self, outer):
                self.render = _RenderOps(outer)

        self.data = _Data(self)
        self.ops = _Ops(self)


def make_fake_context(fake_bpy: FakeBpy):
    class _CollectionObjects:
        def __init__(self):
            self.items = []

        def link(self, obj):
            self.items.append(obj)

    class _Collection:
        def __init__(self):
            self.objects = _CollectionObjects()

    class _Markers:
        def new(self, name, frame):
            m = mock.Mock(name=name, frame=frame)
            m.name = name
            m.frame = frame
            fake_bpy._markers.append(m)
            return m

    class _Strips:
        def new_movie(self, name, filepath, channel, frame_start):
            s = {"type": "MOVIE", "name": name, "filepath": filepath, "channel": channel, "frame_start": frame_start}
            fake_bpy._vse_strips.append(s)
            return s

        def new_image(self, name, filepath, channel, frame_start):
            s = {"type": "IMAGE", "name": name, "filepath": filepath, "channel": channel, "frame_start": frame_start}
            fake_bpy._vse_strips.append(s)
            return s

    class _SeqEditor:
        def __init__(self):
            self.strips = _Strips()

    class _FFmpeg:
        def __init__(self):
            self.format = "MKV"
            self.codec = "NONE"
            self.constant_rate_factor = "MEDIUM"

    class _ImageSettings:
        def __init__(self):
            self.file_format = "PNG"

    class _Render:
        def __init__(self):
            self.filepath = "/tmp/orig_"
            self.resolution_x = 1920
            self.resolution_y = 1080
            self.resolution_percentage = 50
            self.fps = 24
            self.fps_base = 1.0
            self.image_settings = _ImageSettings()
            self.ffmpeg = _FFmpeg()

    class _Scene:
        def __init__(self):
            self.camera = None
            self.collection = _Collection()
            self.frame_current = 12
            self.frame_start = 1
            self.timeline_markers = _Markers()
            self.sequence_editor = None
            self.render = _Render()

        @property
        def objects(self):
            return list(fake_bpy._objects.values())

        def sequence_editor_create(self):
            self.sequence_editor = _SeqEditor()

    return mock.Mock(scene=_Scene())


class BlenderAddonTests(unittest.TestCase):
    def setUp(self):
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.env_patch = mock.patch.dict(os.environ, {"ANIMREF_BLENDER_DIR": self.tmp_dir.name})
        self.env_patch.start()
        animref_api._catalog_cache = []

    def tearDown(self):
        self.env_patch.stop()
        self.tmp_dir.cleanup()

    def test_token_sign_in_and_obfuscated_storage(self):
        bundle = {
            "token": "id_tok_secret_123",
            "refreshToken": "ref_tok_secret_456",
            "firebaseApiKey": "api_key_789",
            "email": "artist@studio.com",
            "displayName": "Lead Animator",
            "isPro": True,
        }
        b64 = base64.urlsafe_b64encode(json.dumps(bundle).encode("utf-8")).decode("ascii")
        self.assertTrue(animref_auth.is_probable_connect_token(b64))
        self.assertFalse(animref_auth.is_probable_connect_token("not a token"))

        state = animref_auth.sign_in_with_connect_token(b64)
        self.assertEqual(state["email"], "artist@studio.com")
        self.assertTrue(animref_auth.is_signed_in())

        # Verify raw file on disk does NOT contain plaintext secrets
        raw_disk = open(animref_auth.get_auth_file_path(), "r", encoding="utf-8").read()
        self.assertNotIn("id_tok_secret_123", raw_disk)
        self.assertIn("obf1:", raw_disk)

        loaded = animref_auth.load_auth_state()
        self.assertEqual(loaded["idToken"], "id_tok_secret_123")
        self.assertTrue(loaded["isPro"])

        animref_auth.sign_out()
        self.assertFalse(animref_auth.is_signed_in())

    def test_browser_auth_flow_url(self):
        with mock.patch.object(animref_auth.webbrowser, "open") as mock_open:
            url = animref_auth.start_browser_auth_flow(open_browser=True)
            self.assertIn("extension_id=animref_blender", url)
            self.assertIn("client=blender", url)
            self.assertIn("port=", url)
            self.assertTrue(mock_open.called)

    def test_catalog_search_and_tag_filter(self):
        videos = [
            {"id": "1", "title": "Heavy Sword Swing", "category": "Combat", "tags": ["combat", "sword"]},
            {"id": "2", "title": "Casual Walk Cycle", "category": "Locomotion", "tags": ["walk"]},
        ]
        res = animref_api.search_catalog(query="sword", tag="combat", videos=videos)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["id"], "1")

    def test_camera_background_and_3d_empty_and_scene_manager(self):
        fake_bpy = FakeBpy()
        ctx = make_fake_context(fake_bpy)
        sample_mp4 = os.path.join(self.tmp_dir.name, "walk_cycle.mp4")
        with open(sample_mp4, "wb") as f:
            f.write(b"fake-mp4-bytes" * 200)

        with mock.patch.object(animref_importer, "bpy", fake_bpy):
            cam, bg = animref_importer.import_to_camera_background(
                ctx, sample_mp4, title="Walk Cycle", opacity=0.8, pip_preset="TOP_RIGHT"
            )
            self.assertTrue(cam.data.show_background_images)
            self.assertEqual(bg.image.source, "MOVIE")
            self.assertEqual(bg.scale, 0.35)
            self.assertEqual(bg.image_user.frame_start, 12)

            empty = animref_importer.import_to_3d_empty(
                ctx, sample_mp4, title="Walk 3D", opacity=0.9, face_camera=True
            )
            self.assertEqual(empty.empty_display_type, "IMAGE")
            self.assertEqual(len(empty.constraints), 1)

            refs = animref_importer.list_scene_references(ctx)
            self.assertEqual(len(refs), 2)

            # Nudge + Magic Align + Flip + Delete
            new_off = animref_importer.nudge_reference_offset(ctx, empty.name, 5)
            self.assertEqual(new_off, 5)
            animref_importer.magic_align_reference(ctx, empty.name, target_ref_frame=4)
            self.assertEqual(empty.image_user.frame_offset, 3)

            flipped = animref_importer.toggle_reference_mirror(ctx, empty.name)
            self.assertTrue(flipped)

            animref_importer.add_pose_marker(ctx, "Contact")
            self.assertEqual(len(fake_bpy._markers), 1)
            self.assertIn("Contact", fake_bpy._markers[0].name)

            animref_importer.import_to_vse(ctx, sample_mp4, title="VSE Clip")
            self.assertEqual(len(fake_bpy._vse_strips), 1)

            self.assertTrue(animref_importer.delete_reference(ctx, empty.name))
            self.assertEqual(len(animref_importer.list_scene_references(ctx)), 1)

    def test_playblast_restores_scene_render_settings(self):
        fake_bpy = FakeBpy()
        ctx = make_fake_context(fake_bpy)
        with mock.patch.object(animref_playblast, "bpy", fake_bpy):
            out = animref_playblast.record_viewport_playblast(ctx, file_format="MP4", resolution_x=1280, resolution_y=720)
            self.assertTrue(fake_bpy.opengl_called)
            self.assertTrue(out.endswith(".mp4"))
            # Original render settings must be restored
            self.assertEqual(ctx.scene.render.filepath, "/tmp/orig_")
            self.assertEqual(ctx.scene.render.resolution_x, 1920)
            self.assertEqual(ctx.scene.render.resolution_y, 1080)
            self.assertEqual(ctx.scene.render.image_settings.file_format, "PNG")
            self.assertEqual(ctx.scene.render.ffmpeg.format, "MKV")


if __name__ == "__main__":
    unittest.main()
