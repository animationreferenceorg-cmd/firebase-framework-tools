# Integrating the Animation Reference API — instructions for a coding agent

You are integrating **Animation Reference** (animationreference.org, an ~7,800
clip animation reference library) into **Anim.works**. This folder is a complete,
dependency-free TypeScript client plus a machine-readable spec. Read this file
before writing any code.

## What you are building

Two independent features. Confirm with the human which one is in scope before
starting — they are usually built in this order.

**Feature A — Browse the library inside Anim.works.**
Your app calls the API and renders Animation Reference clips: a search box, tag
and category filters, an infinite-scroll grid. Every item links back to its page
on animationreference.org.

**Feature B — Receive a reference a user sent from animationreference.org.**
A user browsing animationreference.org clicks the Anim.works button on a clip.
Their browser lands on your import URL carrying `?token=…&source=animationreference`.
You exchange that token, server side, for the clip — including a playable media
URL — and open it in the review tool. **This is the primary integration.**

## Setup

1. Copy `src/` into your codebase (suggested: `lib/animation-reference/`). It has
   no dependencies and needs no build step beyond your existing TypeScript setup.
   It targets Node 18+, Bun, Deno and edge runtimes via global `fetch`.
2. Copy `.env.example` into your env config and fill in `AREF_API_KEY` with the
   key Animation Reference issued you.
3. Verify the key before writing feature code:

```ts
import { ArefClient } from './lib/animation-reference';

const client = new ArefClient({ apiKey: process.env.AREF_API_KEY! });
console.log(await client.status());
// { partner: 'Anim.works', scopes: ['catalog:read', 'media:stream'], ... }
```

If `scopes` does not include `media:stream`, Feature B cannot play video — stop
and tell the human to request that scope. Do not attempt a workaround.

## Hard rules

These are not style preferences. Violating them breaks the integration or the
agreement behind it.

1. **The API key is server-side only.** Never put it in client bundles, `NEXT_PUBLIC_*`
   / `VITE_*` variables, or any code shipped to a browser. If the browser needs
   this data, proxy it through your own backend route.
2. **Redeem handoff tokens server-side, exactly once.** Tokens are single-use and
   expire in five minutes. Calling `redeemHandoff` twice for one token fails the
   second time with `TOKEN_ALREADY_USED` — so redeem in the server handler, not
   in a component that may re-render or re-run in React Strict Mode.
3. **Never store or re-serve `streamUrl`.** Resolve it when you need to play,
   then discard it. Do not copy media into your own storage or CDN.
4. **Always display attribution.** Wherever a clip appears, show `credit.name`
   when it is non-null and link to `video.url` on animationreference.org. If
   `credit.sourceUrl` is present, link that too where the layout allows.
5. **Treat `nextCursor` as opaque.** Pass it back unchanged. Never parse it,
   construct one, or assume it is a number or an offset.
6. **Do not bulk-download the library.** Fetch what you display. `listAllVideos()`
   exists for legitimate filtered walks, not for cloning the catalogue.

## Feature B: the handoff, step by step

The user's browser arrives at whatever URL Animation Reference has on file for
you (e.g. `https://anim.works/import?token=abc123&source=animationreference`).

```ts
// Server-side route handler. See examples/import-route.ts for a full version.
const token = new URL(request.url).searchParams.get('token');
if (!token) return redirect('/');

const { video, user } = await client.redeemHandoff(token);

// video.streamUrl  -> feed to your player
// video.url        -> link back to animationreference.org (required)
// video.credit     -> display the creator
// user.id          -> stable pseudonym; same person = same id, forever.
//                     NOT an email or a name. Use it to group repeat handoffs.
```

`user.id` is the only identity you receive. There is no shared login: an
arriving user may not have an Anim.works account. Handle both cases — either
create a guest session keyed on `user.id`, or prompt them to sign in and attach
the pending clip to whatever account they land on.

### Handoff failure modes, and what to show

| Code | Status | Meaning | Correct response |
| --- | --- | --- | --- |
| `TOKEN_EXPIRED` | 410 | Older than 5 minutes | "This link expired — click the button again on animationreference.org." |
| `TOKEN_ALREADY_USED` | 410 | Redeemed once already | Same message. Usually your own double-redeem bug — check rule 2. |
| `TOKEN_NOT_FOUND` | 404 | Never existed, or minted for a different partner | Generic "invalid link". |
| `VIDEO_UNAVAILABLE` | 410 | Clip removed since the handoff | "That reference is no longer available." |
| `SCOPE_REQUIRED` | 403 | Key lacks `media:stream` | Do not degrade silently. Surface it — it is a configuration problem. |

Never retry any of these. `ArefApiError.isTransient` is `false` for all of them;
the client already retries the ones worth retrying (429, 5xx, network) with
backoff.

## Feature A: browsing

```ts
const page = await client.listVideos({ tag: 'combat', sort: 'newest', limit: 24 });
// page.data -> ArefVideo[]     page.pagination.nextCursor -> pass back as `cursor`

for await (const video of client.listAllVideos({ category: 'body-mechanics' })) {
  // walks every page correctly
}
```

Cache aggressively. Responses carry `Cache-Control` (60s for videos, 15min for
categories and tags) and the catalogue only changes when Animation Reference
deploys, roughly daily. Honouring those headers is the whole rate-limit strategy
— the default budget is 120 requests/minute per key, and a normal integration
should never come close.

`ArefVideo.thumbnailUrl` and `posterUrl` are stable, hotlinkable image URLs and
are fine to use directly in `<img>`. Only `streamUrl` is restricted.

## Things that will trip you up

- **`streamUrl` is optional in the type.** It is absent unless the key has
  `media:stream`. Handle `undefined` rather than asserting with `!`.
- **`credit.name` is often `null`** and `description` is sometimes an empty
  string or a raw import dump. Design the UI for missing metadata.
- **`imageUrl` on a category can be an empty string.** Fall back to a placeholder.
- **Durations are seconds, not milliseconds**, and `durationSeconds` may be absent.
- **`publishedAt` is an ISO string or `null`.**
- **Some clips have no `categoryIds`.** Tags are the reliable taxonomy; categories
  are sparse.
- **Unknown fields will appear over time.** Ignore them; do not validate strictly
  with a schema that rejects extras. Fields are only ever added within `v1`.

## Reference

- `openapi.yaml` — machine-readable spec for every endpoint. Feed this to codegen
  or consult it for exact shapes.
- `src/types.ts` — the same contract as TypeScript types, with commentary.
- `examples/import-route.ts` — Feature B end to end.
- `examples/browse.ts` — Feature A, search and pagination.
- `README.md` — the human-facing quickstart.

## When you are stuck

Do not guess at endpoints that are not in `openapi.yaml` — there are no others,
and `/api/v1` is read-only apart from the handoff exchange. There is no write
API: you cannot create, update or delete anything on animationreference.org.
If the integration seems to need one, that is a conversation for the humans,
not something to work around.

Support: michaelfred124@gmail.com — quote your `keyId` (from `status()`), and
never the key itself.
