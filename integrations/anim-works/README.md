# Animation Reference — Anim.works integration kit

A drop-in TypeScript client for the [Animation Reference](https://animationreference.org)
Partner API, plus everything needed to wire up the two integration points.

**Zero dependencies.** Node 18+, Bun, Deno, or any edge runtime with global `fetch`.

---

## What this enables

**1. Browse the library inside Anim.works.** ~7,800 animation reference clips,
searchable by text, tag and category, with thumbnails and creator credits.

**2. Receive a reference from animationreference.org.** A user watching a clip
clicks the Anim.works button; the clip opens in your review tool, ready to draw
on. No account linking, no file transfer, no copy-paste.

---

## Quickstart

```bash
# 1. Copy the client into your project
cp -r src /path/to/anim-works/lib/animation-reference

# 2. Add your key
echo 'AREF_API_KEY=arefk_live_…' >> .env

# 3. Check it works
AREF_API_KEY=arefk_live_… npx tsx examples/browse.ts
```

```ts
import { ArefClient } from './lib/animation-reference';

const client = new ArefClient({ apiKey: process.env.AREF_API_KEY! });

const { data, pagination } = await client.listVideos({ tag: 'combat', limit: 24 });
```

> **Server-side only.** The key identifies your organisation. Never ship it to a
> browser — proxy through your own backend instead.

---

## Receiving a handoff

Tell Animation Reference which URL to send users to (e.g.
`https://anim.works/import`). They store it against your key — it is never taken
from a request, so it cannot be abused as an open redirect.

When a user clicks the button, their browser arrives at:

```
https://anim.works/import?token=<one-time token>&source=animationreference
```

Your handler exchanges the token, server side:

```ts
const { video, user } = await client.redeemHandoff(token);

video.streamUrl   // playable media URL — feed to your player, never store
video.url         // link back to animationreference.org (required)
video.credit.name // creator, when known — display it
user.id           // stable pseudonym, same person every time
```

Tokens are **single use** and live **five minutes**. Redeem once, in the server
handler — not in a component that might re-run.

Full example: [`examples/import-route.ts`](examples/import-route.ts).

---

## API surface

| Method | Returns |
| --- | --- |
| `status()` | Key details, scopes, rate limit, library size |
| `listVideos(query)` | One page of clips |
| `listAllVideos(query)` | Async iterator over every matching clip |
| `getVideo(id, { related })` | One clip plus similar ones |
| `listCategories()` | All published categories |
| `listTags({ q, limit })` | Tags by popularity |
| `redeemHandoff(token)` | The clip a user sent you |

`query` accepts `q`, `tag`, `category`, `minDuration`, `maxDuration`,
`sort` (`newest` \| `oldest` \| `relevance`), `limit` (1–100), `cursor`.

Types in [`src/types.ts`](src/types.ts); full spec in [`openapi.yaml`](openapi.yaml).

---

## Errors

Everything throws `ArefApiError` with `.status`, `.code` and `.isTransient`.

```ts
try {
  await client.redeemHandoff(token);
} catch (error) {
  if (error instanceof ArefApiError && error.code === 'TOKEN_EXPIRED') {
    // ask the user to click the button again
  }
}
```

The client already retries transient failures (429, 5xx, network) with backoff
and honours `Retry-After`. Anything that reaches you is final — don't retry it.

---

## Rate limits and caching

120 requests/minute per key by default. Every response carries
`X-RateLimit-Limit`, `-Remaining` and `-Reset`.

Responses are cacheable — 60s for videos, 15min for categories and tags — and the
catalogue only changes when Animation Reference deploys, roughly daily. Honour
the cache headers and you will not come close to the limit.

---

## Terms

- Display `credit.name` wherever a clip appears, and link back to `video.url`.
- Don't re-host media or thumbnails on your own CDN.
- Don't bulk-copy the catalogue.
- Full terms: <https://animationreference.org/terms>

---

Building this with an AI coding assistant? Point it at
[`AGENTS.md`](AGENTS.md) — it's written for that.

Building the other direction — Animation Reference calling Anim.works? See
[`WHAT-WE-NEED-FROM-YOU.md`](WHAT-WE-NEED-FROM-YOU.md) for what to send back.

Support: michaelfred124@gmail.com — quote your `keyId`, never the key.
