# AnimationReference.org Finish Plan for Claude Code

## Mission

Finish AnimationReference.org as one coherent product that can credibly charge **$9/month**.

The product promise is:

> Find the right motion, turn it into a production-ready shot plan, and carry that plan into animation.

The core loop is:

> Discover -> Save -> Organize -> Compare -> Draw over -> Export -> Share

Do not add another disconnected destination. New work must strengthen this loop inside the existing reference library, boards, drawovers, exports, portfolio, and integrations.

## What exists today

- A large searchable reference library with categories, tags, video pages, and frame controls.
- Saved references, reference clips, public/private boards, board duplication, following, and a personal vault.
- A mature moodboard canvas with notes, shapes, connections, uploaded media, autosave, and pitch-deck export.
- A paint/drawover workspace with frames, layers, onion skinning, audio, storyboard mode, project files, and image/video export.
- Portfolio posts, comments, public profiles, progress sharing, and shot breakdowns.
- Stripe checkout, webhooks, customer portal, and user subscription fields.
- A Maya bridge and UI.
- Local prototypes for contact-sheet export, side-by-side playblast comparison, arc tracking, and export watermarking.

The problem is not a lack of features. The problem is that these features do not yet form one dependable paid workflow.

## Product and pricing decision

Ship one main paid plan:

### Free

- Browse the complete public library.
- Use frame-by-frame playback and basic speed controls.
- Save up to 5 references.
- Create 1 active project board.
- Use a limited drawover project.
- Generate one watermarked sample export.
- Publish up to 3 portfolio posts.

### Pro - $9/month or $79/year

- Unlimited saved references and project boards.
- Private boards and private uploads.
- Guided board templates.
- Side-by-side playblast comparison with synchronized controls.
- High-resolution contact sheets and board/PDF exports.
- Unlimited drawovers and animation projects.
- Watermark-free exports.
- Maya handoff and production exports.
- Unlimited portfolio posts and reference-to-final shot breakdowns.

Do not sell "unlimited likes." Sell a repeatable production workflow that saves time on every shot.

Keep legacy `tier1`, `tier2`, and `tier5` values only for backward compatibility. New UI and new purchases should expose only `free`, `pro_monthly`, `pro_annual`, `student_unlimited`, and `admin` as product concepts.

## Findings that must be fixed before launch

1. Pricing is inconsistent. The UI says $9/month, while code comments, admin labels, and profile copy still say $5. The annual toggle appears to reuse the monthly Stripe price instead of selecting a real annual price.
2. Stripe price IDs and tier mappings are duplicated across checkout, webhook, sync, UI, and Firestore helpers.
3. Entitlements are scattered between `isPremium`, `tier5`, VIP, student, admin, and client-side limit checks.
4. Several advertised Pro tools exist only as unintegrated components or partial workflows.
5. Private content is not currently trustworthy. Firestore allows public reads of all reference boards/clips, and Storage contains broad public write rules, including paths named `private-reference`.
6. There is no automated test command or end-to-end subscription test suite in `package.json`.
7. Upgrade prompts emphasize limits, while the strongest value is the finished shot package.

## Execution rules

- Work phase by phase. Do not begin a later phase until the earlier phase meets its acceptance criteria.
- Preserve existing user work and unrelated untracked files.
- Use small commits named `phase-N: concise outcome`.
- Centralize product rules instead of adding more one-off checks.
- Enforce paid and ownership rules on the server or in Firebase rules, not only in React.
- Never advertise a feature in pricing until its happy path is tested.
- Keep the removed fullscreen study/notes experience removed. Integrate tools into the existing video, board, and paint workflows.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` before closing a phase. Add and run tests as soon as the test harness exists.

---

## Phase 0 - Establish a safe baseline

### Tasks

1. Inventory all current modified and untracked files. Do not overwrite unrelated work.
2. Add a testing foundation:
   - Vitest or Jest for unit/integration tests.
   - Playwright for critical browser workflows.
   - Firebase Emulator tests for Firestore and Storage rules.
3. Add a lightweight analytics abstraction with a no-op local provider. Define events now even if the production provider is selected later.
4. Document required environment variables without committing secrets.
5. Fix current lint/type/build failures before feature work.

### Acceptance criteria

- `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` are documented and runnable.
- The repository has a clear `.env.example` with variable names only.
- Existing product behavior is covered by at least smoke tests for home, login, references, vault, moodboard, paint, profile, checkout redirect, and billing portal redirect.

## Phase 1 - Make billing and entitlements truthful

### Tasks

1. Create a canonical server-safe module such as `src/lib/plans.ts` containing:
   - Plan names.
   - Monthly and annual Stripe price IDs from environment variables.
   - Feature entitlements.
   - Numeric limits.
   - Legacy tier migration rules.
2. Replace duplicated price maps and string comparisons in:
   - `PricingDialog.tsx`
   - checkout route
   - Stripe webhook
   - subscription check/sync routes
   - profile and admin subscription UI
   - `limits.ts`, `api-auth.ts`, and `reference-utils.ts`
3. Make the annual selector use a real annual Stripe price.
4. Treat Stripe webhook state as the source of truth. Correctly handle `active`, `trialing`, `past_due`, `unpaid`, `canceled`, and `incomplete_expired`.
5. Add an entitlement API/helper that returns booleans such as:
   - `canCreateUnlimitedBoards`
   - `canUsePrivateWorkspace`
   - `canComparePlayblast`
   - `canExportHighResolution`
   - `canRemoveWatermark`
   - `canUseMayaBridge`
6. Update every pricing surface to the same $9/$79 offer and remove claims that are not yet integrated.
7. Preserve access for valid legacy and SJSU accounts.

### Acceptance criteria

- Monthly checkout uses the monthly Stripe price and annual checkout uses the annual Stripe price.
- Webhook tests prove that upgrades, renewals, cancellations, payment failures, and reactivation update access correctly.
- UI state cannot grant Pro access by editing client data.
- Pricing, profile, admin, email, and limit dialogs show the same plan and price.

## Phase 2 - Secure private paid workspaces

This is a launch blocker, not an optional cleanup.

### Tasks

1. Rewrite Firestore rules for reference boards, clips, board saves, follows, and shot breakdowns:
   - Public records are readable by everyone.
   - Private records are readable only by the owner and explicitly authorized collaborators.
   - Create/update/delete requires ownership.
   - Counter updates use `hasOnly`, bounded increments, and immutable ownership fields.
2. Replace public Storage writes with path-specific rules:
   - Public portfolio/reference media: authenticated owner write, public read.
   - Private reference media: owner/collaborator read and write only.
   - Avatars: authenticated owner write.
   - Admin video/thumbnail paths: admin write only.
3. Store owner IDs and visibility metadata in paths/Firestore in a way rules can validate.
4. Move operations that cannot be securely expressed in client rules to authenticated API routes.
5. Add Emulator tests for cross-user reads, writes, deletes, forged owner IDs, and free-user Pro attempts.

### Acceptance criteria

- User B cannot discover, read, update, or delete User A's private board or media.
- Anonymous users cannot upload files or mutate counters.
- A free user cannot bypass Pro-only privacy or export checks through direct API/Firebase calls.
- Existing public reference browsing continues to work.

## Phase 3 - Build the paid "Shot Workspace" workflow

The workspace is a project board plus its references and production tools. Do not create a separate fifth product.

### Primary flow

1. User finds a reference.
2. User selects **Save to project**.
3. User chooses an existing board or starts from a guided template.
4. The saved clip retains the relevant moment/range and source credit.
5. From the board, the user can compare a playblast, create a contact sheet, open a frame in Drawovers, export a package, or publish a breakdown.

### Tasks

1. Unify `Moodboard` and `ReferenceBoard` terminology in the UI under **Projects** or **Shot Boards**. Do not immediately merge storage models if a safe adapter can present one experience.
2. Add guided templates:
   - Shot Reference
   - Acting Beats
   - Walk/Run Cycle
   - Fight Choreography
   - Creature Locomotion
   - FX Timing
3. Add a global **Save to project** action on video cards and video/detail players.
4. Saving should support:
   - Board selection or creation.
   - Current timestamp or in/out range when available.
   - Optional short note.
   - Source author and source URL retention.
5. Create a project detail page/dashboard with clear next actions: Compare, Contact Sheet, Draw Over, Export, Share.
6. Add recent projects and resume-state to the home/workspace area.

### Free/Pro behavior

- Free: 1 project, 5 saved references, basic template.
- Pro: unlimited projects/references, all templates, private projects, production tools.
- Never discard work at a limit. Preserve the draft and show a contextual upgrade action.

### Acceptance criteria

- A new signed-in user can go from a library clip to a populated project in under 60 seconds.
- Every saved item retains correct attribution.
- Refreshing or signing in on another device restores the project.
- Limit prompts name the project and the blocked outcome, not just "upgrade for more."

## Phase 4 - Integrate the features that justify $9

### 4A. Playblast Compare

- Integrate the existing `SideBySideCompareModal` prototype into project and video actions.
- Support local MP4/MOV/WebM playblasts without uploading by default.
- Provide independent and synchronized play/pause, scrub, speed, frame stepping, offset, and loop range.
- Add side-by-side and wipe modes.
- Remember compare settings per project locally; upload only with explicit user action.
- Gate compare execution as Pro, but let free users see a real preview/demo state.

### 4B. Contact Sheet and Key Pose Export

- Integrate the existing `ContactSheetModal` prototype.
- Generate 6/9/12-frame sheets from selected ranges.
- Include FPS, frame numbers, source credit, project title, and optional notes.
- Free: one lower-resolution watermarked sample.
- Pro: high-resolution PNG/PDF, no product watermark, PureRef-ready output.
- Handle CORS and unsupported streams with an honest error and server-side fallback where legally and technically appropriate.

### 4C. Drawovers

- Add **Open frame in Drawovers** from a reference or project.
- Transfer source, timestamp, frame image, FPS, and project ID.
- Save the result back to the originating project.
- Integrate arc tracking and export watermark behavior if the local prototypes are sound.
- Free: one limited project and watermarked export. Pro: unlimited projects and clean exports.

### 4D. Maya handoff

- Keep the existing Maya bridge only if there is a distributable plugin, install instructions, connection diagnostics, and a verified round trip.
- Expose it from a project's production actions.
- Preserve source credit in imported metadata.
- Remove Blender claims until a working Blender integration exists.

### Acceptance criteria

- A Pro test account can complete all four workflows from the same project without navigating through unrelated product areas.
- A free account gets an understandable preview and contextual upgrade prompt.
- Exports are correct at 24, 25, 30, and 60 FPS where the source supports them.
- Media errors never produce a blank or black modal without explanation.

## Phase 5 - Complete the proof-of-work loop

### Tasks

1. Connect portfolio posts and shot breakdowns to project boards.
2. Build **Publish project breakdown**:
   - Final animation/playblast.
   - Selected reference clips.
   - Contact sheet or drawovers.
   - Process notes.
   - Automatic source attribution.
3. Add draft, private-link, and public states.
4. Give Pro users a clean share page and unlimited breakdowns.
5. Keep basic portfolio publishing useful on Free; do not paywall the community itself.

### Acceptance criteria

- A project can become a portfolio breakdown without re-entering its references and attribution.
- Private drafts are not publicly queryable.
- Public pages are responsive, indexable where appropriate, and include social metadata.

## Phase 6 - Activation, conversion, and retention

### Onboarding

- Ask one question: "What are you working on?" with Acting, Locomotion, Combat, Creature, FX, or Other.
- Create a matching starter project and show three relevant clips.
- Checklist: save first reference, open project, try one production tool, export or share.

### Contextual conversion

Show upgrade prompts only after users express intent:

- Creating project two.
- Saving reference six.
- Enabling private mode.
- Opening Compare.
- Requesting high-resolution or watermark-free export.
- Starting a second Drawovers project.

Example copy:

> Your Combat Study is ready. Upgrade to Pro to compare your playblast, export key poses, and keep unlimited private shot boards.

Do not interrupt passive viewing with a generic payment popup.

### Lifecycle

- Welcome email: complete the first project.
- Activation email: resume an unfinished project.
- Value email: show compare/contact-sheet workflow.
- Trial/checkout recovery email only with proper consent and Stripe state.
- In-product release notes linked to actual features.

### Analytics events

At minimum track:

- `search_completed`
- `reference_saved`
- `project_created`
- `template_selected`
- `compare_opened`
- `playblast_loaded`
- `contact_sheet_generated`
- `drawover_saved`
- `export_completed`
- `upgrade_prompt_viewed`
- `checkout_started`
- `checkout_completed`
- `subscription_canceled`

Include `source`, `project_id`, `plan`, and `trigger` where appropriate. Never send private media, notes, search contents, or personal data as analytics properties.

### Success metrics

- Activation: user saves a reference to a project within the first session.
- Core value: user completes any two of Compare, Contact Sheet, Drawovers, or Export in one project.
- Conversion: activated free user starts checkout from a contextual Pro action.
- Retention: Pro user returns to an existing project in a later week.

## Phase 7 - Product polish and launch quality

### Tasks

1. Consolidate navigation:
   - Discover: Browse, Categories, Collections, Community.
   - Workspace: Projects, Saved References, Drawovers.
   - Profile: Portfolio, Billing, Settings.
   - Learn: Guides.
2. Add reliable loading, empty, offline, upload-progress, and media-error states.
3. Audit keyboard access, focus management, contrast, reduced motion, and mobile layouts.
4. Lazy-load heavy editors and export tools.
5. Avoid autoplaying more videos than are visible; pause offscreen media.
6. Add error monitoring and structured server logs with secret/PII redaction.
7. Run Lighthouse and optimize home, references, project, paint, and profile routes.
8. Remove dead code, obsolete pricing copy, mock production data, and inaccessible routes.

### Launch acceptance criteria

- No broken navigation or advertised dead ends.
- No critical/high security rule failures.
- Checkout, webhook, portal, cancellation, and entitlement refresh work in Stripe test mode.
- The five primary workflows pass on desktop Chrome, Firefox, Safari, and a mobile viewport.
- Key routes meet reasonable Core Web Vitals and do not ship all editor code on initial browse pages.
- Every Pro claim on the pricing screen has a tested path accessible from the product.

## Recommended implementation order

1. Baseline tests and environment documentation.
2. Canonical plans, Stripe cleanup, and truthful pricing.
3. Firestore/Storage privacy and server-side entitlement enforcement.
4. Unified Project/Shot Board workflow and templates.
5. Compare integration.
6. Contact-sheet integration.
7. Drawovers round trip.
8. Maya handoff verification.
9. Project-to-portfolio breakdown publishing.
10. Onboarding, contextual upsells, analytics, performance, and accessibility.

## Definition of a $9/month product

The site is ready to charge $9 when a user can complete this scenario reliably:

> I found a useful motion reference, saved the exact moment into a private shot project, compared it with my playblast, marked the poses with a drawover, exported a clean contact sheet for Maya/PureRef, and published the finished result with attribution.

If any link in that sentence is broken, hidden, insecure, or only marketing copy, finish that link before adding another feature.

## First instruction to Claude Code

Use this exact prompt:

> Read `docs/CLAUDE_CODE_FINISH_PLAN.md` completely. Audit the repository against Phase 0 and Phase 1 only. Before editing, report the exact files you will change, existing uncommitted files you will preserve, and any Stripe/Firebase configuration that requires human input. Then implement the safest self-contained Phase 0/1 slice, add tests, run all relevant checks, and stop with a concise handoff. Do not start Phase 2 automatically.

