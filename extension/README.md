# Animation Reference Clip & Save

## Chrome development install

1. Open `chrome://extensions` and enable Developer mode.
2. Choose **Load unpacked** and select this `extension` folder.
3. Pin **Animation Reference — Clip & Save**.
4. Reload the extension after changes, then open a supported post. Click the purple AR bubble in the top-left (or the pinned toolbar icon) to open Clip & Save.
5. Paste a public Instagram, YouTube, TikTok, Vimeo, X, Facebook, or Sakugabooru post URL.
6. Confirm the captured creator, profile image, description, thumbnail, and board, then save.

The unpacked development build connects to `http://localhost:3000`. Public references are added to community discovery; private references require Pro and stay out of discovery. The saved record retains the original source URL and creator attribution.

## Save from any site (hover and right-click)

- Hover any video or image at least 200×112px on screen (images also need a file at least that size) and a purple **Save** button appears in its top-left corner. Click it to pick a board and save in one step; the last board you used is preselected.
- Right-click an image, video, or link to a supported video post and choose **Save to Animation Reference**.
- The extension downloads the file in your browser and uploads it to `/api/clips/upload`, credited to the page it came from. Streamed videos (YouTube, Instagram and other supported posts) are saved by their post link through `/api/clips` instead.
- No buttons appear on Animation Reference itself, on webmail, on pages with `<meta name="pinterest" content="nopin">` or `<meta name="animationreference" content="nosave">`, or on media marked `nopin`, `data-pin-nopin` or `data-animref-nosave` (on the element or a wrapper up to six levels up).
- Rules live in `save-rules.js` (unit-tested in `tests/unit/extension-save-rules.test.ts`); the UI is `save-button.js`. End-to-end check: `node tests/extension/save-button.e2e.mjs` (needs `npx playwright install chromium`).

The production extension talks only to `https://animationreference.org`. For Firefox packaging, copy `manifest.firefox.json` over `manifest.json` in the build artifact before loading it temporarily.
