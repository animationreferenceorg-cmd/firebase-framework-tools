# StudioWatch portfolio connection: partner handoff

## Current status

There is a working **local prototype**, not a live integration. The Animation
Reference provider is in `src/app/connect/studiowatch`,
`src/app/api/studiowatch`, and `src/lib/studiowatch-connect.ts` in the main
repository. The freelance job project has the receiving implementation in
`src/app/api/animref` and `src/lib/animref-connect.ts`. These paths are relative
to their respective project roots. The job project also contains its own
`integrations/animref-provider/README.md` and a local `/test` rehearsal.

The job board currently stores the linked profile and job activity in browser
storage. Applications are examples and are not sent to studios. Linking is not
a shared login, a persistent multi-device account, or authorization to access
server-side jobs. Anim.works needs a real account and job backend before using
this as a production hiring service. Do not use editable browser data to
authorize an account, job, application, or private information.

## Connection contract

1. The job board generates a random state and PKCE S256 verifier, stores them
   in a short-lived HttpOnly cookie, and sends the user to Animation Reference's
   `/connect/studiowatch` page with its exact callback and challenge.
2. The user signs in on Animation Reference and explicitly approves sharing their
   public profile information. The provider verifies the Firebase ID token and
   creates a five-minute, single-use code. The raw code is not stored.
3. The board checks state and exchanges the code and original verifier from its
   server at `/api/studiowatch/exchange`. The provider consumes the grant in a
   Firestore transaction. Invalid, expired, reused, or mismatched codes fail.
4. The response includes a stable partnership pseudonym and a public profile
   URL, name, handle, headline, bio, and optional HTTPS banner. Passwords, email,
   Firebase tokens, saved references, and private boards are not passed over.
   Profile fields and the portfolio URL are a snapshot: reconnect after a
   username or profile change to refresh them.

The portfolio URL normally uses the public username; it falls back to the
public user-ID route when the username cannot resolve as a public profile.
This contract is separate from the clip handoff and its API key. It is not a
general-purpose OAuth provider; use only the documented flow.

## Before release

- Agree on the production and staging board origins and exact HTTPS callback
  URLs. Animation Reference's server-only `STUDIOWATCH_REDIRECT_URIS` accepts a
  comma-separated list of exact `/api/animref/callback` URLs; there is no
  production default or wildcard. Loopback HTTP is for local testing only.
- Set StudioWatch's server-only `STUDIOWATCH_APP_URL`, a random
  `ANIMREF_SESSION_SECRET` of at least 32 characters, and
  `ANIMREF_CONNECT_ENABLED=true` only when the provider is deployed. Never put
  signing secrets in browser code. Configure Firestore TTL on the provider's
  `studiowatch_connect_grants.expiresAt` and keep that collection inaccessible to
  client SDKs. Expiry and one-time use are enforced independently of TTL.
- Implement a persistent account association in the actual job-board backend,
  authenticate the board user, and bind the verified pseudonym to that user.
  Define unlinking, account recovery, duplicate-link handling, retention, and
  authorization for applications before accepting real submissions.
- Test with two real accounts, including sign-in, consent and cancellation,
  empty portfolios, callback mismatch, expiry, replay, reconnect and unlink.
  Verify job submissions reach the intended hiring team before calling them live.

For local rehearsal, open `http://127.0.0.1:3101/test` with the separately
configured local provider at `http://localhost:3103`. The user signs in and
approves personally; approving creates a short-lived grant in the configured
Firebase project. Nothing is deployed by that rehearsal.
