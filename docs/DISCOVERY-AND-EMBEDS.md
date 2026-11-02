# Reference discovery and public video embeds

## Browsing and search

The home feed now requests the providers relevant to the active tab, query, 2D/3D filter, quick filter and media type. Each provider has an independent cursor and request. New pages append to the loaded references, with duplicates removed by ID and original source URL.

Sketchfab forwards its opaque search cursor; ArtStation and Sakugabooru advance page numbers; Wikimedia forwards its continuation offset; Archive advances its search page. The server binds cursors to their original query and filters, validates them, and never accepts an upstream URL from the client.

The bottom of the feed loads another local batch or requests another provider page before the reader reaches the end. A Load more button supports keyboard navigation and manual continuation. Failed sources can retry without removing loaded cards. Three consecutive pages with no new matching references pause automatic requests; manual loading can continue. A provider that exhausts its results stops paging.

Photos and model thumbnails in the visual tabs use a masonry grid. Artwork keeps its native aspect ratio; a shared ResizeObserver updates row spans as images load or the viewport changes. Video cards retain their existing aspect ratio. ArtStation uses uncropped 800-pixel thumbnails rather than square covers or full-size artwork.

The previously decorative media dropdown now filters videos, images and interactive models. Local and external results pass through the same filters. Browse order remains stable when a source finishes loading.

### Pinterest

The checked local configuration has no Pinterest API token. Without one, discovery walks the five existing public RSS feeds in finite batches, filters matching pins, and stops when those feeds end.

For continuous keyword discovery, the adapter supports Pinterest's partner search API using server-only `PINTEREST_ACCESS_TOKEN` and optional `PINTEREST_COUNTRY_CODE` (default US). Add the token through the deployment's secret configuration, never a `NEXT_PUBLIC_` variable. A normal own-pin token is not global-search access; Pinterest's [partner search documentation](https://github.com/pinterest/pinterest-python-generated-api-client/blob/main/docs/SearchApi.md) describes the required access. This token was not available for a live partner-API check; its bookmark behavior is covered by integration tests.

Live checks through the local endpoint returned two pages of 24 Sketchfab models and two pages of 48 ArtStation projects. ArtStation had overlapping projects across query expansions; the client removes those duplicates. Pinterest's first two RSS batches returned 47 and 23 pins.

## Unbranded embeds

Open a public video and select **Embed**. The dialog previews the player and provides responsive iframe HTML, with optional muted autoplay and looping. The button is available in the library player, public uploaded-clip details, and portfolio video details for supported native video files.

The share URL is `/embed/{kind}/{id}`, where kind is `video`, `clip`, or `portfolio`. The page renders only the video player: no logo, watermark, site navigation, pricing, authentication prompts, quota counter or site analytics. Native controls provide playback, volume, fullscreen and picture-in-picture where the browser supports them. MP4 and HLS playback are covered by browser tests.

`GET /api/embed/{kind}/{id}` resolves the current record on the server. Private, non-public, unlisted, draft, removed, missing and embedding-disabled records are rejected. Public clip Storage URLs are signed only for the public upload path belonging to that clip. Metadata is not cached, and the iframe URL contains a stable record ID rather than an expiring media URL. External YouTube/Vimeo page URLs, images and 3D models are not treated as native video files.

Only the `/embed/` namespace permits cross-origin framing with `frame-ancestors *`. Other site pages keep `X-Frame-Options: SAMEORIGIN`.

The full-screen player's quota callback also now depends on the stable unlock action, and unchanged quota refreshes retain their state. This fixes a repeated-update loop exposed by the playback/copy-code browser test.

## Validation and scope

- Production build succeeds with `NEXT_BUILD_DIR=.next.release-check` and `npx next build`.
- TypeScript and ESLint on changed files pass.
- 212 unit/integration tests pass, including cursor handling, provider failures, media filters, iframe escaping and embed privacy.
- Browser tests use a generated one-second MP4/HLS fixture for real playback, a separate local HTTP origin for cross-origin framing, and deterministic provider fixtures for multi-page scrolling and retries.
- All 29 desktop/mobile browser tests pass against the production build, including actual clipboard copying, embed options, nested-dialog dismissal, and a bounded-storage-read check while the full-screen player runs.
- Embed privacy tests use a mocked Admin SDK. A real existing public library video also returned its media URL successfully through the new metadata endpoint using the local runtime credentials.

These changes are local until committed, pushed and deployed. They do not resolve the separate reported Pro download failure.
