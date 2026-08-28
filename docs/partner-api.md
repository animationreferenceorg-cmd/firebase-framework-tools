# Animation Reference — Partner API v1

A read-only HTTP API that lets a partner site display the Animation Reference
library — videos, categories and tags — inside their own product.

- **Base URL:** `https://animationreference.org/api/v1`
- **Format:** JSON, UTF-8
- **Methods:** `GET` only. Nothing in this API modifies Animation Reference data.

---

## 1. Authentication

Every endpoint except the discovery document requires an API key, sent in the
`X-API-Key` header:

```bash
curl -H "X-API-Key: arefk_live_xxxxxxxxxxxxxxxxxxxx" \
  https://animationreference.org/api/v1/status
```

`Authorization: Bearer <key>` is accepted as an alternative.

**Keep the key server-side.** It identifies your organisation and is not safe in
browser code. If you need to call the API directly from a browser, tell us the
exact origins (e.g. `https://anim.works`) and we will allowlist them for your
key; requests from any other origin will be blocked by CORS.

Start by calling `/status` — it confirms the key works and reports the scopes
and rate limit attached to it.

---

## 2. Rate limits

Each key has a per-minute request limit (default **120 requests/minute**). Every
response carries:

| Header | Meaning |
| --- | --- |
| `X-RateLimit-Limit` | Requests allowed per minute |
| `X-RateLimit-Remaining` | Requests left in the current window |
| `X-RateLimit-Reset` | ISO timestamp when the window resets |

Exceeding the limit returns `429` with a `Retry-After` header. Responses are
cacheable (`Cache-Control: public, max-age=60, s-maxage=300`) — honouring those
headers is the easiest way to stay well inside the limit.

---

## 3. Errors

All errors use the same envelope:

```json
{ "error": { "code": "INVALID_API_KEY", "message": "That API key is not recognised." } }
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_CURSOR` | The `cursor` value was not one we issued |
| 401 | `MISSING_API_KEY` | No `X-API-Key` header |
| 401 | `INVALID_API_KEY` | Key not recognised |
| 401 | `REVOKED_API_KEY` / `EXPIRED_API_KEY` | Key no longer valid — contact us |
| 403 | `SCOPE_REQUIRED` | Your key lacks a scope the endpoint needs |
| 404 | `VIDEO_NOT_FOUND` / `CATEGORY_NOT_FOUND` | No such published item |
| 429 | `RATE_LIMITED` | Slow down; see `Retry-After` |
| 500 | `INTERNAL_ERROR` | Our side — safe to retry with backoff |

---

## 4. Endpoints

### `GET /api/v1` — discovery

Unauthenticated. Returns the API version, auth scheme and endpoint list. Useful
as a health check.

### `GET /api/v1/status`

Confirms your key and reports what it can do.

```json
{
  "data": {
    "apiVersion": "v1",
    "partner": "Anim.works",
    "keyId": "pk_anim_works",
    "scopes": ["catalog:read"],
    "rateLimit": { "limit": 120, "remaining": 119, "resetAt": "2026-08-26T12:01:00.000Z" },
    "library": { "videoCount": 7851 }
  }
}
```

### `GET /api/v1/videos`

Lists published reference videos, newest first.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Matches title, description and tags |
| `tag` | string | — | Tag name or slug, e.g. `body-mechanics` |
| `category` | string | — | Category id or slug |
| `minDuration` | number | — | Seconds |
| `maxDuration` | number | — | Seconds |
| `sort` | `newest` \| `oldest` \| `relevance` | `newest` | `relevance` requires `q` |
| `limit` | number | 24 | Max 100 |
| `cursor` | string | — | From `pagination.nextCursor` |

```bash
curl -H "X-API-Key: $AREF_KEY" \
  "https://animationreference.org/api/v1/videos?tag=combat&limit=2"
```

```json
{
  "data": [
    {
      "id": "sakugabooru-311093",
      "title": "Sword clash, wide framing",
      "description": "…",
      "url": "https://animationreference.org/video/sakugabooru-311093",
      "thumbnailUrl": "https://…/preview.jpg",
      "posterUrl": "https://…/preview.jpg",
      "tags": [
        { "name": "combat", "slug": "combat", "url": "https://animationreference.org/tags/combat" }
      ],
      "categoryIds": ["8fJ2…"],
      "durationSeconds": 6,
      "fps": 24,
      "width": 854,
      "height": 480,
      "credit": { "name": "Ayaka Tsuji", "sourceUrl": "https://www.sakugabooru.com/post/show/311093" },
      "publishedAt": "2026-07-19T08:05:48.000Z"
    }
  ],
  "pagination": { "limit": 2, "total": 412, "nextCursor": "Mg" }
}
```

Paginate by passing `pagination.nextCursor` back as `cursor` until it is `null`.
Cursors are opaque — do not construct or parse them.

### `GET /api/v1/videos/{id}`

One video plus similar ones.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `related` | number | 6 | 0–24 similar videos, matched on shared tags |

```json
{ "data": { "id": "…", "…": "…" }, "related": [ { "id": "…" } ] }
```

### `GET /api/v1/categories`

Every published category with its video count. Use `id` or `slug` as the
`category` filter on `/videos`.

```json
{
  "data": [
    {
      "id": "8fJ2…",
      "slug": "body-mechanics",
      "title": "Body Mechanics",
      "description": "…",
      "url": "https://animationreference.org/category/body-mechanics",
      "imageUrl": "https://…",
      "videoCount": 640
    }
  ],
  "pagination": { "total": 24 }
}
```

### `GET /api/v1/tags`

Tags ordered by video count.

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `q` | string | — | Substring filter on the tag name |
| `limit` | number | 100 | Max 200 |
| `cursor` | string | — | From `pagination.nextCursor` |

---

## 5. Video media and attribution

By default the API returns metadata plus thumbnail/poster images and a `url`
pointing at the video's page on Animation Reference. It does **not** return a
direct media file URL — playback happens on animationreference.org.

Keys granted the `media:stream` scope additionally receive a `streamUrl` field.
That scope is issued case by case, because much of the library is sourced from
third-party creators whose licences do not permit rehosting.

**Attribution is required** wherever you display our content:

- Show `credit.name` when present.
- Link the item back to its `url` on animationreference.org.
- Where `credit.sourceUrl` is present, it points at the original creator's post
  — link it too if your layout allows.

Do not re-host thumbnails or media on your own CDN, and do not use the API to
build a bulk copy of the library. Usage is subject to
<https://animationreference.org/terms>.

---

## 6. Integration notes

- **Caching:** cache responses for at least 60 seconds. Category and tag lists
  change rarely and can be cached for an hour.
- **Freshness:** the catalogue is refreshed on each deploy of
  animationreference.org, typically daily.
- **Stability:** we only add fields within `v1`; we will not remove or rename
  existing ones. Ignore unknown fields rather than validating strictly.
- **Deprecation:** any breaking change ships as `/api/v2`, with at least 90 days
  of notice before `v1` is retired.
- **Support:** michaelfred124@gmail.com — include your `keyId` (never the key).

### Minimal Node example

```js
const AREF_BASE = 'https://animationreference.org/api/v1';

async function aref(path, params = {}) {
  const url = new URL(AREF_BASE + path);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));

  const res = await fetch(url, { headers: { 'X-API-Key': process.env.AREF_KEY } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${res.status} ${body.error?.code || 'REQUEST_FAILED'}: ${body.error?.message || ''}`);
  }
  return res.json();
}

// Every combat reference, one page at a time.
let cursor = null;
do {
  const { data, pagination } = await aref('/videos', { tag: 'combat', limit: 50, cursor });
  data.forEach((video) => console.log(video.title, video.url));
  cursor = pagination.nextCursor;
} while (cursor);
```
