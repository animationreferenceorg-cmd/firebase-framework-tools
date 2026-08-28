# Animation Reference Clip & Save

## Chrome development install

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this `extension` folder.
3. Pin **Animation Reference — Clip & Save**.
4. Reload the extension after changes, then open a supported post. Click the purple AR bubble in the top-left (or the pinned toolbar icon) to open Clip & Save.
5. Paste a public Instagram, YouTube, TikTok, Vimeo, X, Facebook, or Sakugabooru post URL.
6. Confirm the captured creator, profile image, description, thumbnail, and board, then save.

The unpacked development build connects to `http://localhost:3000`. Public references are added to community discovery; private references require Pro and stay out of discovery. The saved record retains the original source URL and creator attribution.

The production extension talks only to `https://animationreference.org`. For Firefox packaging, copy `manifest.firefox.json` over `manifest.json` in the build artifact before loading it temporarily.
