# Animation Reference for Animo / Maya

**Status: partner evaluation build, not a production release.** The Animo toolbar
version is `Animo_Data/Animo_AnimRef`. See [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md)
for verified behavior, outstanding work, and the handoff questions for Animo.

## What is available

- Search and browse the Animation Reference catalog, with thumbnails and a
  one-hour refresh interval. The last cached catalog can be used when offline.
- Email/password sign-in, saved references, and moodboards use existing site
  services. These flows still require an end-to-end test with a real account.
- Import an eligible reference into Maya as an image plane or frame sequence.
  The server checks a signed-in Pro account before every download, including
  reuse of a cached clip. Some sources do not offer downloadable files.
- Record a local viewport playblast with FFmpeg. On Animation Reference, open a
  reference and load that local file in the compare tool. Cloud upload and an
  automatic synchronized comparison link are **not available** in this build.

## Evaluation installation

1. Back up the recipient's Animo installation. Copy only
   `Animo_Data/Animo_AnimRef` into their existing `Animo_Data` directory. Do not
   overwrite their Animo launcher or toolbar files with the reference copies in
   this repository; those files are from a particular Animo installation.
2. In Maya's Python Script Editor, add the parent `Animo_Data` directory to
   `sys.path` using its actual path, then launch:

   ```python
   import sys
   sys.path.insert(0, r"C:/path/to/Animo_Data")
   from Animo_AnimRef import animref_launcher
   animref_launcher.launch()
   ```

3. Configure FFmpeg using `ANIMO_FFMPEG_PATH`, Animo's existing FFmpeg, or the
   system PATH. Importing frame sequences and recording playblasts need it.
4. Animo should integrate the button into their own toolbar using the launcher
   entry point after checking their actual installed version and icon paths.

The package is designed for Python 3 Maya builds. Maya 2025 and 2027 Python/Qt
imports were checked on Windows; full interactive Maya, macOS, Linux, and other
Maya versions remain to be tested. Do not ship credentials, cached files, or
personal Maya scenes to the partner.

## Privacy and accounts

The prototype currently stores Firebase ID and refresh tokens, and cached
account data, as local files. Use only a dedicated test account on a trusted
machine until credential storage and deletion are improved. Google-only sign-in
is not supported by this email/password form. Download access is determined by
the site's server, not by a badge in the plugin.

## Automated tests

From the main repository root:

```text
mayapy -m unittest discover -s integrations/animo-maya/tests -v
```

These tests use mocked responses and filesystem data. They do not authenticate
with Firebase, contact production endpoints, create Maya scene objects, or prove
an end-to-end download or playblast capture.
