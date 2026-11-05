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
from Animo_AnimRef import animref_api, animref_auth, animref_playblast


class Response:
    def __init__(self, data):
        self.data = data
    def __enter__(self):
        return self
    def __exit__(self, *args):
        pass
    def read(self, *args):
        return self.data


class PluginTests(unittest.TestCase):
    def setUp(self):
        animref_api._cached_catalog = None
        animref_api._cached_catalog_at = 0
        animref_api._cached_tags = None

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

    def test_cloud_playblast_upload_is_not_exposed(self):
        with self.assertRaisesRegex(RuntimeError, 'not available'):
            animref_auth.upload_playblast_to_animref('shot.mp4')

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


if __name__ == '__main__':
    unittest.main()
