# Desktop performance pass

## Changes

- Share quota state once beneath the user provider. Cards no longer each parse localStorage, subscribe to quota events, or request the signed-in user's contribution bonus.
- Mount card save and limit dialogs on demand; load save and fullscreen player modules dynamically. Once pricing is opened, retain it so its checkout handoff remains functional.
- Memoize cards and grids so appending a catalog batch does not render every unchanged card again. Remove forced GPU layers from resting cards.
- Publish the local catalog independently of external discovery and portfolio queries. A slow external provider no longer delays the full library.
- Run local search classification in a Web Worker with a short debounce. Transfer the catalog only when it changes, reuse its cached profiles, and ignore superseded results. Retain a fallback for browsers that cannot run workers.
- Cancel superseded external searches. Keep expensive catalog results deferred from the search input.
- Pause decorative hero playback and rotation outside the viewport or in a hidden tab. Keep the full-screen ambient backdrop static to avoid continuous compositing underneath frosted UI.

## Measurements

Local Edge development-mode checks at 1440 × 900:

| Measurement | Before | After |
| --- | ---: | ---: |
| Active quota listeners on `/home` | 32 | 1 |
| Storage reads during initial check | 294 | 48 |
| Typing `walk cycle`, including 40 ms per character | 989 ms | 556 ms |

These are single local development runs, not production latency guarantees. Catalog contents and external network responses can vary. A separate cold scoring benchmark over the saved 8,144-reference snapshot took about 576 ms; that computation now runs outside the UI thread.

## Verification

- `npm test`: 186 unit/integration tests pass.
- `npm run typecheck`: passes.
- ESLint passes on the changed source and regression tests. The repository-wide lint baseline has existing errors outside this change.
- Production build succeeds using `NEXT_BUILD_DIR=.next.production-check` and `npx next build` (without regenerating the committed catalog snapshot).
- `tests/e2e/performance.spec.ts` checks that the full catalog renders while external discovery is pending, that quota has one listener, that worker searches return the correct results and clear properly, and that the player opens and closes.
- All 12 desktop browser regression/smoke tests pass against the production build, including the main routes and signed-out billing checks.

`NEXT_BUILD_DIR` optionally isolates local build output from stale OneDrive artifacts. Normal development and deployment still default to `.next`.

The live deployment and the reported Pro download issue remain separate follow-up work.
