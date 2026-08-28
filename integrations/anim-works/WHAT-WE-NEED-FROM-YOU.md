# What we need back from Anim.works

This folder is our half: a working client, a spec, and everything your side needs
to read the Animation Reference library and receive clips our users send you.

To build the other direction — Animation Reference talking to Anim.works — we
need the equivalent from you. This is the checklist. Anything you can't answer
yet is fine; mark it TBD and send the rest.

---

## 1. Needed now — this unblocks the button

Two answers, and we can ship the "send to Anim.works" button on our video pages.

- **Your import URL.** Where should we send a user's browser when they click the
  button? e.g. `https://anim.works/import`. It gets stored against your API key
  on our side and is never read from a request, so it can't be abused as an open
  redirect — which also means you can't change it by changing a link. Tell us and
  we'll set it.
- **Do you need the media file, or just the metadata?** Your review tool almost
  certainly needs the file, which means we grant your key the `media:stream`
  scope. Confirm, and we'll enable it.

Nothing else in this document blocks that button. Everything below is for the
reverse direction.

---

## 2. Your API

If you're sending us an integration folder, this is what makes it usable without
a follow-up call.

**Access**

- Base URL for production, and for a sandbox/staging environment if you have one.
- How we authenticate: API key, OAuth client credentials, signed JWT — whatever
  it is, name it and give us a credential for each environment.
- Rate limits, and which headers report them.

**Contract**

- An OpenAPI/Swagger file if you have one. If not, a list of endpoints with a
  real example request and response for each — actual JSON, not a description of
  the JSON.
- Your error format: the envelope, and the list of codes with their meanings.
- Whether fields can disappear between versions, and how you signal a breaking
  change.

**Events, if any**

- Do you emit webhooks? If so: the event list, the payload shape, and how they're
  signed so we can verify they came from you.
- If there are no webhooks, say so — we'll poll or skip the feature rather than
  guess.

**Media**

- What your player accepts. Our clips are mostly `.mp4` over HTTPS from
  `assets.reflix.dev`. Can you stream those directly, or do you need to copy the
  file into your own storage first? (If you need a copy, say so explicitly —
  it changes the licensing conversation, it isn't a technical detail.)

---

## 3. The identity question

This is the one that needs a decision rather than a document.

When a user sends a clip from our site to yours, you receive a stable pseudonym
(`user.id`) — the same string every time that person sends you something, and
meaningless outside the pairing of that user and your key. It's enough to give a
returning user their own workspace without any shared login.

It is **not** enough to answer "is this the same person as Anim.works account
X?" If any feature needs that — sending review notes back to their board on our
site, showing their Anim.works projects on their profile — we need real account
linking, which means an OAuth flow one way or the other, and a decision about who
hosts it.

Tell us whether you want that. If yes, whose login is the anchor?

---

## 4. What we'd build with it

So the asks above have a reason attached:

- **Round trip.** A user sends a reference to your tool, marks it up, and the
  annotated version comes back to their board on animationreference.org. Needs
  §3 (identity) and probably webhooks.
- **Presence.** Showing on a reference page that a user already has this clip
  open in Anim.works. Needs a read endpoint and §3.
- **Deep links.** Linking from our site into a specific review session. Needs
  only a documented URL format — cheapest of the three, and worth doing first.

We don't need all of this. If the folder only covers one, that's the one we build.

---

## 5. Sending credentials

Don't email us an API key or paste one in chat. Use a one-time secret link
(1Password, Bitwarden Send, or similar), or send us a public key and we'll do the
same in reverse. If a credential does end up somewhere it shouldn't, tell us and
we'll rotate rather than hope.

Our key for you follows the same rule: it's issued once, we never see it again,
and we can revoke it in seconds if it leaks.

---

Questions: michaelfred124@gmail.com
