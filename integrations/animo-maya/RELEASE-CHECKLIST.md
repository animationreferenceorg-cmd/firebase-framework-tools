# Animo partner evaluation and release checklist

## Verified in this workspace

- Maya 2025 and 2027 Python environments import the toolbar UI on Windows. A
  Maya 2027 offscreen Qt smoke test constructs the window without a live Maya
  scene. This is not an interactive Maya test.
- Mocked tests exercise catalog refresh and offline fallback, Pro download
  authorization before cache reuse, disabled cloud upload, and FFmpeg's start
  frame for a timeline beginning at frame 1001.
- The plugin asks `POST /api/videos/{id}/download` with the user's Firebase ID
  token and uses the returned URL. The server is responsible for checking Pro
  access and whether a source can be downloaded. Test against the intended
  deployed site: code in this repository does not prove the endpoint is live.

## Required before public release

1. **Protect account credentials and data.** The current `auth.json` stores a
   renewable Firebase token in plaintext, and account caches can contain saved
   references or private board metadata. Replace token storage with an
   appropriate OS credential store, define account cache privacy and retention,
   and test sign-out, revocation, shared workstations, and account switching.
   Add browser-based sign-in for accounts without a password if needed.
2. **Test the real user journey.** In supported Maya versions and operating
   systems, use test accounts for free and Pro, expired sessions, saved and
   liked clips, private moodboards, a permitted download, unavailable sources,
   and expired access. Verify the API is deployed and the error messages match.
3. **Test Maya scene behavior.** Import to a free card, existing camera, and
   new camera; scrub at frame 1 and 1001, fractional FPS, non-default timeline
   ranges, reopening scenes, deleting cache, and projects with spaces or Unicode
   paths. Confirm no unexpected camera, timeline, or scene changes. Verify
   frame sequence behavior and media formats on each supported platform.
4. **Finish playblast workflow.** Validate camera selection, capture, FFmpeg
   and failure cleanup in a real Maya session. Cloud upload is disabled because
   the previous implementation used publicly readable storage and the proposed
   comparison URL is not consumed by the website. A future implementation
   needs private storage, authorized access, a real compare handoff, retention,
   and a user's explicit action. Local file selection in the website's compare
   tool is the current workflow.
5. **Finalize packaging with Animo.** Confirm their supported Maya and Animo
   versions, target operating systems, installation location, toolbar hook,
   icon placement, FFmpeg distribution and license, update/uninstall behavior,
   and ownership of support. The two plugin directories in this repository are
   divergent; use `Animo_Data/Animo_AnimRef` as the evaluation source and avoid
   replacing their entire launcher or toolbar. Consolidate the old copy before
   long-term maintenance.
6. **Review catalog and media policy.** Confirm supported media providers,
   attribution, permissions, download rules, storage/cache quotas and cleanup,
   and what happens when a clip is removed or a subscription expires. The
   catalog is a downloadable snapshot, so confirm that this distribution is
   approved and design paginated access if it is not.

Saved-reference responses are currently limited by the site API (50 saved and
50 liked); moodboard APIs and display also need pagination/completeness checks.
The UI's current status and error handling must be reviewed with actual accounts
and network failures. The existing prototype should not be advertised as fully
tested or shipped as a production Animo integration until these checks pass.
