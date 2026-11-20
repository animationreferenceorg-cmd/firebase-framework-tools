import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1] / 'Animo_Data' / 'Animo_AnimRef'
sys.path.insert(0, str(ROOT.parent))
from Animo_AnimRef import animref_api, animref_auth, animref_importer, animref_playblast


class Response:
    def __init__(self, data):
        self.data = data
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self, *args):
        return self.data


class FakeMayaCmds:
    """In-memory mock of maya.cmds for testing imagePlane, timeSliderBookmark, and timeline sync."""
    def __init__(self):
        self.attrs = {
            "animref_Jump.scaleX": 16.0,
            "animref_Jump.visibility": True,
            "animref_Jump.animref_id": "clip_jump",
            "animref_Jump.animref_title": "Parkour Jump",
            "animref_JumpShape.frameOffset": 0,
            "animref_JumpShape.alphaGain": 1.0,
            "animref_JumpShape.depth": 100.0,
            "animref_JumpShape.sizeX": 1.0,
            "animref_JumpShape.sizeY": 0.5625,
        }
        self.cur_time = 40
        self.min_time = 1
        self.max_time = 120
        self.created_nodes = []

    def objExists(self, node):
        return True

    def nodeType(self, node):
        if str(node).endswith("Shape"):
            return "imagePlane"
        return "transform"

    def listRelatives(self, node, parent=False, shapes=False, type=None, children=False):
        if parent and str(node).endswith("Shape"):
            return [str(node)[:-5]]
        if shapes:
            return [str(node) + "Shape"]
        return []

    def ls(self, type=None):
        if type == "imagePlane":
            return ["animref_JumpShape"]
        return []

    def attributeQuery(self, attr, node=None, exists=True):
        return (f"{node}.{attr}") in self.attrs

    def addAttr(self, node, ln=None, dt=None, at=None):
        self.attrs[f"{node}.{ln}"] = None

    def setAttr(self, attr_path, *values, **kwargs):
        self.attrs[attr_path] = values[0] if len(values) == 1 else values

    def getAttr(self, attr_path):
        return self.attrs.get(attr_path)

    def currentTime(self, *args, **kwargs):
        if kwargs.get("query"):
            return self.cur_time
        if args:
            self.cur_time = args[0]
        return self.cur_time

    def playbackOptions(self, **kwargs):
        if kwargs.get("query"):
            if kwargs.get("minTime"):
                return self.min_time
            if kwargs.get("maxTime"):
                return self.max_time
        if "minTime" in kwargs:
            self.min_time = kwargs["minTime"]
        if "maxTime" in kwargs:
            self.max_time = kwargs["maxTime"]

    def loadPlugin(self, *args, **kwargs):
        pass

    def createNode(self, node_type):
        name = f"{node_type}1"
        self.created_nodes.append(name)
        return name

    def imagePlane(self, **kwargs):
        return ["animref_StaticCard", "animref_StaticCardShape"]

    def rename(self, node, new_name):
        return new_name

    def currentUnit(self, **kwargs):
        return "film"

    def select(self, *args, **kwargs):
        pass

    def inViewMessage(self, **kwargs):
        pass

    def refresh(self, *args, **kwargs):
        pass

    def getPanel(self, **kwargs):
        return []

    def modelEditor(self, *args, **kwargs):
        if kwargs.get("query") and kwargs.get("camera"):
            return "persp"
        return None

    def viewFit(self, *args, **kwargs):
        pass

    def xform(self, node, **kwargs):
        if kwargs.get("query"):
            if kwargs.get("matrix"):
                return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 10, 1]
            return [0.0, 0.0, 0.0]
        if "translation" in kwargs:
            self.attrs[f"{node}.translation"] = kwargs["translation"]
        if "rotation" in kwargs:
            self.attrs[f"{node}.rotation"] = kwargs["rotation"]
        return None


class PluginTests(unittest.TestCase):
    def setUp(self):
        animref_api._cached_catalog = None
        animref_api._cached_catalog_at = 0
        animref_api._cached_tags = None
        animref_importer._PREV_TIMELINE_RANGE = None

    def test_refresh_preserves_offline_catalog_and_accepts_new_results(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory) / 'videos-snapshot.json'
            cache.write_text('[{"id":"old"}]', encoding='utf-8')
            with mock.patch.object(animref_api, 'get_cached_snapshot_path', return_value=str(cache)), \
                 mock.patch.object(animref_api.urllib_request, 'urlopen', side_effect=OSError('offline')):
                self.assertEqual(animref_api.load_catalog(force_refresh=True)[0]['id'], 'old')
            with mock.patch.object(animref_api, 'get_cached_snapshot_path', return_value=str(cache)), \
                 mock.patch.object(animref_api.urllib_request, 'urlopen', return_value=Response(b'[{"id":"new"}]')):
                self.assertEqual(animref_api.load_catalog(force_refresh=True)[0]['id'], 'new')
                self.assertEqual(json.loads(cache.read_text(encoding='utf-8'))[0]['id'], 'new')

    def test_download_requires_sign_in_even_if_file_is_cached(self):
        with mock.patch.object(animref_auth, 'get_valid_token', return_value=None):
            with self.assertRaisesRegex(RuntimeError, 'Sign in'):
                animref_api.download_video_file({'id': 'clip', 'videoUrl': 'https://example.org/file.mp4'})

    def test_download_uses_server_authorization_before_cached_file(self):
        with tempfile.TemporaryDirectory() as directory:
            videos = Path(directory) / 'videos'
            videos.mkdir()
            (videos / 'clip.mp4').write_bytes(b'x' * 1025)
            with mock.patch.object(animref_auth, 'get_valid_token', return_value='test-token'), \
                 mock.patch.object(animref_api, 'get_cache_dir', return_value=directory), \
                 mock.patch.object(animref_api.urllib_request, 'urlopen', return_value=Response(b'{"url":"https://example.org/clip.mp4"}')) as fetch:
                self.assertTrue(animref_api.download_video_file({'id': 'clip'}).endswith('clip.mp4'))
                self.assertTrue(fetch.call_args.args[0].full_url.endswith('/api/videos/clip/download'))

    def test_server_denial_is_shown_and_does_not_use_cached_media(self):
        from io import BytesIO
        error = animref_api.urllib_error.HTTPError('https://animationreference.org', 402, 'Payment required', {}, BytesIO(b'{"message":"Downloading reference MP4s is a Pro feature."}'))
        with mock.patch.object(animref_auth, 'get_valid_token', return_value='test-token'), \
             mock.patch.object(animref_api.urllib_request, 'urlopen', side_effect=error):
            with self.assertRaisesRegex(RuntimeError, 'Pro feature'):
                animref_api.download_video_file({'id': 'clip'})

    def test_cloud_playblast_upload_requires_auth_and_posts_multipart(self):
        with tempfile.TemporaryDirectory() as directory:
            shot_path = Path(directory) / 'shot.mp4'
            shot_path.write_bytes(b'FAKE_MP4_BYTES')
            with mock.patch.object(animref_auth, 'get_valid_token', return_value=None):
                with self.assertRaisesRegex(RuntimeError, 'sign in'):
                    animref_auth.upload_playblast_to_animref(str(shot_path))

            fake_resp = mock.MagicMock()
            fake_resp.read.return_value = b'{"id":"clip_99","url":"/clip/clip_99","uploadedMediaUrl":"https://cdn/clip_99.m3u8"}'
            fake_cm = mock.MagicMock()
            fake_cm.__enter__.return_value = fake_resp
            with mock.patch.object(animref_auth, 'get_valid_token', return_value='tok_abc'), \
                 mock.patch.object(animref_auth.urllib_request, 'urlopen', return_value=fake_cm) as urlopen_mock:
                res = animref_auth.upload_playblast_to_animref(str(shot_path), title='Run Cycle Test', board_id='b1')
                self.assertEqual(res['id'], 'clip_99')
                self.assertEqual(res['url'], 'https://animationreference.org/clip/clip_99')
                req = urlopen_mock.call_args.args[0]
                self.assertIn('/clips/upload', req.full_url)
                self.assertEqual(req.headers.get('Authorization'), 'Bearer tok_abc')
                self.assertIn(b'Run Cycle Test', req.data)
                self.assertIn(b'FAKE_MP4_BYTES', req.data)

    def test_playblast_avi_format_native_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            fake_cmds = mock.Mock()
            output = str(Path(directory) / 'playblast_123.avi')
            with mock.patch.object(animref_playblast, 'cmds', fake_cmds), \
                 mock.patch.object(animref_playblast, 'get_playblast_info', return_value={'start': 1, 'end': 24, 'fps': 24, 'camera': 'persp'}), \
                 mock.patch.object(animref_playblast, 'get_playblast_cache_dir', return_value=directory), \
                 mock.patch.object(animref_playblast.time, 'time', return_value=123), \
                 mock.patch.object(animref_playblast.animref_importer, 'locate_ffmpeg', return_value=None):
                self.assertEqual(animref_playblast.record_playblast(file_format='avi'), output)
                self.assertEqual(fake_cmds.playblast.call_args.kwargs['format'], 'avi')

    def test_playblast_ffmpeg_uses_timeline_start(self):
        with tempfile.TemporaryDirectory() as directory:
            fake_cmds = mock.Mock()
            fake_cmds.playblast.return_value = 'frames'
            process = mock.Mock(returncode=0)
            process.communicate.return_value = ('', '')
            output = str(Path(directory) / 'playblast_123.mp4')
            with mock.patch.object(animref_playblast, 'cmds', fake_cmds), \
                 mock.patch.object(animref_playblast, 'get_playblast_info', return_value={'start': 1001, 'end': 1005, 'fps': 24, 'camera': 'persp'}), \
                 mock.patch.object(animref_playblast, 'get_playblast_cache_dir', return_value=directory), \
                 mock.patch.object(animref_playblast.time, 'time', return_value=123), \
                 mock.patch.object(animref_playblast.animref_importer, 'locate_ffmpeg', return_value='ffmpeg'), \
                 mock.patch.object(animref_playblast.subprocess, 'Popen', return_value=process) as launch, \
                 mock.patch.object(animref_playblast.os.path, 'isfile', return_value=True):
                self.assertEqual(animref_playblast.record_playblast(), output)
                args = launch.call_args.args[0]
                self.assertEqual(args[args.index('-start_number') + 1], '1001')

    def test_pip_preset_and_opacity_application(self):
        fake_cmds = FakeMayaCmds()
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            self.assertTrue(animref_importer.apply_pip_preset('animref_Jump', 'PiP: Top-Right'))
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.offsetX'), 0.42)
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.offsetY'), 0.26)
            self.assertEqual(fake_cmds.getAttr('animref_Jump.animref_pip_preset'), 'top_right')

            self.assertTrue(animref_importer.set_plane_opacity('animref_Jump', 0.65))
            self.assertAlmostEqual(fake_cmds.getAttr('animref_JumpShape.alphaGain'), 0.65)

    def test_magic_align_and_frame_nudge(self):
        fake_cmds = FakeMayaCmds()
        fake_cmds.cur_time = 40
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            # Align reference frame 15 to Maya frame 40 -> offset should be 25
            offset = animref_importer.sync_plane_to_current_frame('animref_Jump', ref_frame=15)
            self.assertEqual(offset, 25)
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.frameOffset'), 25)

            # Nudge -5 frames -> offset becomes 20
            nudged = animref_importer.nudge_plane_offset('animref_Jump', -5)
            self.assertEqual(nudged, 20)
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.frameOffset'), 20)

    def test_pose_bookmark_creation(self):
        fake_cmds = FakeMayaCmds()
        fake_cmds.cur_time = 24
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            bm = animref_importer.create_pose_bookmark(preset='Contact', ref_frame=10)
            self.assertEqual(bm, 'timeSliderBookmark1')
            self.assertEqual(fake_cmds.getAttr('timeSliderBookmark1.name'), 'Contact (Ref f10)')
            self.assertEqual(fake_cmds.getAttr('timeSliderBookmark1.timeRangeStart'), 24)
            self.assertEqual(fake_cmds.getAttr('timeSliderBookmark1.color'), (0.0, 0.9, 1.0))

    def test_ab_loop_sync_and_restore(self):
        fake_cmds = FakeMayaCmds()
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            mn, mx = animref_importer.sync_ab_loop_to_maya(12, 48)
            self.assertEqual((mn, mx), (12, 48))
            self.assertEqual((fake_cmds.min_time, fake_cmds.max_time), (12, 48))
            self.assertEqual(fake_cmds.cur_time, 12)

            restored = animref_importer.restore_maya_timeline_range()
            self.assertEqual(restored, (1, 120))
            self.assertEqual((fake_cmds.min_time, fake_cmds.max_time), (1, 120))

    def test_list_scene_animref_planes_and_mirror(self):
        fake_cmds = FakeMayaCmds()
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            planes = animref_importer.list_scene_animref_planes()
            self.assertEqual(len(planes), 1)
            self.assertEqual(planes[0]['node'], 'animref_Jump')
            self.assertEqual(planes[0]['title'], 'Parkour Jump')

            mirrored = animref_importer.toggle_plane_mirror('animref_Jump')
            self.assertTrue(mirrored)
            self.assertEqual(fake_cmds.getAttr('animref_Jump.scaleX'), -16.0)
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.sizeX'), -1.0)

    def test_token_sign_in_and_credential_obfuscation(self):
        with tempfile.TemporaryDirectory() as directory:
            auth_path = str(Path(directory) / 'auth.json')
            lookup_resp = b'{"users":[{"localId":"uid_123","email":"pro@animref.org","displayName":"Animator Pro"}]}'
            with mock.patch.object(animref_auth, 'get_auth_file', return_value=auth_path), \
                 mock.patch.object(animref_auth.urllib_request, 'urlopen', return_value=Response(lookup_resp)):
                bundle = json.dumps({"idToken": "secret_jwt_token", "refreshToken": "secret_refresh_token"})
                res = animref_auth.sign_in_with_token(bundle)
                self.assertTrue(res['success'])
                self.assertEqual(res['user']['uid'], 'uid_123')

                # Verify raw disk file obfuscates the token
                raw_disk = json.loads(Path(auth_path).read_text(encoding='utf-8'))
                self.assertTrue(raw_disk['idToken'].startswith('obf1:'))
                self.assertNotIn('secret_jwt_token', Path(auth_path).read_text(encoding='utf-8'))

                # Verify load_cached_auth transparently de-obfuscates
                loaded = animref_auth.load_cached_auth()
                self.assertEqual(loaded['idToken'], 'secret_jwt_token')
                self.assertEqual(loaded['refreshToken'], 'secret_refresh_token')
                self.assertEqual(animref_auth.get_cached_user_fast()['uid'], 'uid_123')

    def test_peek_cached_catalog_never_makes_network_calls(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = Path(directory) / 'videos-snapshot.json'
            cache.write_text('[{"id":"fast_cached_clip","title":"Fast Clip"}]', encoding='utf-8')
            with mock.patch.object(animref_api, 'get_cached_snapshot_path', return_value=str(cache)), \
                 mock.patch.object(animref_api.urllib_request, 'urlopen', side_effect=AssertionError('Should not make HTTP calls')):
                items = animref_api.peek_cached_catalog()
                self.assertEqual(len(items), 1)
                self.assertEqual(items[0]['id'], 'fast_cached_clip')

    def test_static_image_import_to_maya_without_ffmpeg(self):
        fake_cmds = FakeMayaCmds()
        with tempfile.TemporaryDirectory() as directory:
            img_file = Path(directory) / 'turnaround_sheet.jpg'
            img_file.write_bytes(b'\xff\xd8\xff\xe0fakejpeg')
            with mock.patch.object(animref_importer, 'cmds', fake_cmds), \
                 mock.patch.object(animref_importer, 'convert_video_to_sequence', side_effect=AssertionError('Should not call FFmpeg for static images')):
                plane = animref_importer.import_animref_to_maya(
                    video_dict={'id': 'as_turnaround', 'title': 'Character Turnaround', 'mediaType': 'artstation'},
                    local_video_path=str(img_file),
                    mode='sequence',
                    target_camera='free',
                )
                self.assertTrue(plane.startswith('animref_'))
                self.assertFalse(fake_cmds.getAttr('animref_StaticCardShape.useFrameExtension'))

    def test_thumbnail_memory_cache_and_static_image_download(self):
        with tempfile.TemporaryDirectory() as directory:
            thumbs = Path(directory) / 'thumbnails'
            thumbs.mkdir()
            thumb_file = thumbs / 'sf_dragon.jpg'
            thumb_file.write_bytes(b'jpeg_bytes_123')
            animref_api._THUMB_VERIFIED_PATHS.clear()
            with mock.patch.object(animref_api, 'get_cache_dir', return_value=directory), \
                 mock.patch.object(animref_auth, 'get_valid_token', return_value='test-token'):
                card_item = {
                    'id': 'sf_dragon',
                    'title': 'Dragon Rig Turnaround',
                    'mediaType': 'sketchfab',
                    'thumbnailUrl': 'https://example.org/dragon.jpg',
                    'videoUrl': '',
                }
                path = animref_api.download_video_file(card_item)
                self.assertEqual(path, str(thumb_file))
                self.assertIn('sf_dragon', animref_api._THUMB_VERIFIED_PATHS)

    def test_browser_auth_flow_url_and_token_detection(self):
        with mock.patch.object(animref_auth.webbrowser, 'open') as mock_open:
            url = animref_auth.start_browser_auth_flow(open_browser=True)
            self.assertTrue(url.startswith('https://animationreference.org/extension/connect'))
            self.assertIn('extension_id=animo_maya', url)
            self.assertIn('client=maya', url)
            self.assertIn('port=', url)
            self.assertTrue(mock_open.called)

        bundle = json.dumps({"token": "xyz_123", "refreshToken": "ref_123", "firebaseApiKey": "key_123"}).encode('utf-8')
        b64 = animref_auth.base64.urlsafe_b64encode(bundle).decode('ascii')
        self.assertTrue(animref_auth.is_probable_connect_token(b64))
        self.assertFalse(animref_auth.is_probable_connect_token("plain string"))

    def test_launcher_does_not_open_duplicate_window(self):
        try:
            from Animo_AnimRef import animref_launcher
        except ImportError:
            import animref_launcher

        fake_window_mod = mock.MagicMock()
        fake_window_mod.show_window = mock.Mock(return_value=mock.Mock())
        fake_window_mod._window_instance = None
        with mock.patch.dict(sys.modules, {
                'Animo_AnimRef.animref_window': fake_window_mod,
                'animref_window': fake_window_mod,
             }), \
             mock.patch.object(animref_launcher.importlib, 'reload', side_effect=lambda m: m):
            animref_launcher._last_launch_time = 0.0
            animref_launcher.launch()
            self.assertEqual(fake_window_mod.show_window.call_count, 1)

    def test_direct_movie_mode_sets_movie_type_and_dimensions(self):
        fake_cmds = FakeMayaCmds()
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            video_item = {
                'id': 'clip_run',
                'title': 'Run Cycle',
                'duration': 3.5,
            }
            plane = animref_importer.import_animref_to_maya(
                video_dict=video_item,
                local_video_path='/path/to/run.mp4',
                mode='movie',
                target_camera='free',
                start_at_current_frame=True,
                fit_timeline=True,
            )
            # Plane shape should have movie type (2) and frameExtension enabled
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.type'), 2)
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.useFrameExtension'), True)
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.width'), 16.0)
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.height'), 9.0)
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.frameOut'), 84)

    def test_pinterest_card_overlay_click_propagates(self):
        try:
            from PySide6 import QtWidgets, QtCore, QtGui
        except ImportError:
            try:
                from PySide2 import QtWidgets, QtCore, QtGui
            except ImportError:
                return

        app = QtWidgets.QApplication.instance() or QtWidgets.QApplication([])
        from Animo_AnimRef.animref_window import PinterestClipCardWidget

        video_item = {'id': 'walk_123', 'title': 'Hero Walk'}
        card = PinterestClipCardWidget(video_item, card_w=160)

        received_events = []
        card.clicked.connect(lambda v: received_events.append(v))

        # Clicking on hover overlay should propagate directly to card clicked signal
        ev = QtGui.QMouseEvent(
            QtCore.QEvent.MouseButtonPress,
            QtCore.QPointF(20, 20),
            QtCore.Qt.LeftButton,
            QtCore.Qt.LeftButton,
            QtCore.Qt.NoModifier
        )
        QtWidgets.QApplication.sendEvent(card.hover_overlay, ev)
        self.assertEqual(len(received_events), 1)
        self.assertEqual(received_events[0]['id'], 'walk_123')

    def test_window_import_buttons_invoke_importer_without_errors(self):
        import time as pytime
        try:
            from PySide6 import QtWidgets
        except ImportError:
            try:
                from PySide2 import QtWidgets
            except ImportError:
                return

        app = QtWidgets.QApplication.instance() or QtWidgets.QApplication([])
        from Animo_AnimRef import animref_window
        fake_cmds = FakeMayaCmds()
        video_item = {
            'id': 'clip_walk',
            'title': 'Hero Walk',
            'videoUrl': 'https://storage.googleapis.com/example/walk.mp4',
            'duration': 2.0,
        }

        with mock.patch.object(animref_window, 'cmds', fake_cmds), \
             mock.patch.object(animref_importer, 'cmds', fake_cmds), \
             mock.patch.object(animref_api, 'load_catalog', return_value=[video_item]), \
             mock.patch.object(animref_api, 'get_thumbnail', return_value=None), \
             mock.patch.object(animref_api, 'download_video_file', return_value='/tmp/walk.mp4'), \
             mock.patch.object(animref_importer, 'convert_video_to_sequence', return_value=('/tmp/seq', 'walk', ['/tmp/seq/walk.0001.jpg'])):
            win = animref_window.AnimRefBrowserWindow()
            win.select_video(video_item)
            self.assertTrue(win.import_btn.isEnabled())
            win.import_btn.click()

            deadline = pytime.time() + 3.0
            while getattr(win, '_is_importing_busy', False) and pytime.time() < deadline:
                app.processEvents()
                pytime.sleep(0.02)

            self.assertFalse(win._is_importing_busy)
            self.assertTrue(win.import_btn.isEnabled())
            self.assertEqual(fake_cmds.getAttr('animref_StaticCardShape.useFrameExtension'), True)
            win.close()

    def test_scene_viewport_utilities_lock_snap_and_reset_zero(self):
        fake_cmds = FakeMayaCmds()
        with mock.patch.object(animref_importer, 'cmds', fake_cmds):
            locked_state = animref_importer.toggle_plane_lock('animref_Jump')
            self.assertTrue(locked_state)
            self.assertEqual(fake_cmds.getAttr('animref_Jump.overrideEnabled'), 1)
            self.assertEqual(fake_cmds.getAttr('animref_Jump.overrideDisplayType'), 2)

            unlocked_state = animref_importer.toggle_plane_lock('animref_Jump')
            self.assertFalse(unlocked_state)
            self.assertEqual(fake_cmds.getAttr('animref_Jump.overrideEnabled'), 0)

            planes = animref_importer.list_scene_animref_planes()
            self.assertEqual(len(planes), 1)
            self.assertIn('locked', planes[0])
            self.assertFalse(planes[0]['locked'])

            fake_cmds.setAttr('animref_JumpShape.frameOffset', 25)
            new_off = animref_importer.reset_plane_to_zero('animref_Jump')
            self.assertEqual(new_off, 1)
            self.assertEqual(fake_cmds.getAttr('animref_JumpShape.frameOffset'), 1)

            with mock.patch.object(fake_cmds, 'getPanel', return_value=['modelPanel4']):
                snapped = animref_importer.snap_plane_to_active_camera('animref_Jump', distance=20.0)
                self.assertTrue(snapped)
                self.assertIn('animref_Jump.translateX', fake_cmds.attrs)
                self.assertIn('animref_Jump.translateZ', fake_cmds.attrs)

    def test_cache_stats_and_clear_preserves_auth(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            videos_dir = tmp_path / 'videos'
            thumbs_dir = tmp_path / 'thumbnails'
            videos_dir.mkdir(parents=True)
            thumbs_dir.mkdir(parents=True)
            auth_file = tmp_path / 'auth.json'
            auth_file.write_text('{"uid": "user1"}', encoding='utf-8')
            (videos_dir / 'clip1.mp4').write_bytes(b'0' * 1024)
            (thumbs_dir / 'clip1.jpg').write_bytes(b'1' * 256)

            with mock.patch.object(animref_api, 'get_cache_dir', return_value=str(tmp_path)):
                stats = animref_api.get_cache_stats()
                self.assertEqual(stats['video_count'], 1)
                self.assertEqual(stats['thumb_count'], 1)
                self.assertGreaterEqual(stats['total_bytes'], 1280)

                freed = animref_api.clear_media_cache(clear_thumbs=False)
                self.assertGreaterEqual(freed, 1024)
                self.assertTrue(auth_file.exists())
                self.assertTrue((thumbs_dir / 'clip1.jpg').exists())
                self.assertFalse((videos_dir / 'clip1.mp4').exists())

    def test_explore_tab_search_and_tag_filtering(self):
        try:
            from PySide6 import QtWidgets
        except ImportError:
            try:
                from PySide2 import QtWidgets
            except ImportError:
                return

        app = QtWidgets.QApplication.instance() or QtWidgets.QApplication([])
        from Animo_AnimRef import animref_window
        fake_cmds = FakeMayaCmds()
        sample_items = [
            {'id': 'v1', 'title': 'Parkour Vault', 'tags': ['parkour', 'action'], 'duration': 3.0},
            {'id': 'v2', 'title': 'Walk Cycle', 'tags': ['walk'], 'duration': 2.0},
        ]

        def fake_search(query=None, tag=None, sort='newest', limit=60, offset=0):
            res = sample_items
            if tag:
                res = [x for x in res if tag in x.get('tags', [])]
            if query:
                res = [x for x in res if query.lower() in x.get('title', '').lower()]
            return {'items': res, 'total': len(res)}

        with mock.patch.object(animref_window, 'cmds', fake_cmds), \
             mock.patch.object(animref_importer, 'cmds', fake_cmds), \
             mock.patch.object(animref_api, 'load_catalog', return_value=sample_items), \
             mock.patch.object(animref_api, 'get_popular_tags', return_value=['parkour', 'walk']), \
             mock.patch.object(animref_api, 'get_thumbnail', return_value=None), \
             mock.patch.object(animref_api, 'search_videos', side_effect=fake_search):
            win = animref_window.AnimRefBrowserWindow()
            win.on_catalog_ready(sample_items, ['parkour', 'walk'])
            win.sidebar.set_active_index(4)
            app.processEvents()

            self.assertEqual(len(win.card_widgets), 2)
            win.set_active_tag('parkour')
            app.processEvents()
            self.assertEqual(len(win.card_widgets), 1)
            self.assertIn('v1', win.card_widgets)
            win.close()

    def test_launcher_reload_if_updated_detects_mtime_change(self):
        import importlib
        from Animo_AnimRef import animref_launcher
        animref_launcher._LOADED_MTIMES.clear()
        animref_launcher._reload_if_updated()
        api_py = animref_api.__file__[:-1] if animref_api.__file__.endswith('.pyc') else animref_api.__file__
        self.assertIn(api_py, animref_launcher._LOADED_MTIMES)

        orig_mtime = animref_launcher._LOADED_MTIMES[api_py]
        with mock.patch.object(os.path, 'getmtime', side_effect=lambda p: orig_mtime + 10.0 if p == api_py else orig_mtime), \
             mock.patch.object(importlib, 'reload', wraps=importlib.reload) as reload_spy:
            animref_launcher._reload_if_updated()
            self.assertGreaterEqual(reload_spy.call_count, 1)
            self.assertEqual(animref_launcher._LOADED_MTIMES[api_py], orig_mtime + 10.0)


if __name__ == '__main__':
    unittest.main()
