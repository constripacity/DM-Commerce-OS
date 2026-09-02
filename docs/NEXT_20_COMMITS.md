# Next 18 commits

This roadmap starts from the revived `0.2.0` state. It deliberately deepens the local, inspectable commerce loop before adding optional external integrations. Each unit is intended to be reviewable and releasable on its own; later commits name their prerequisites.

## 01 — `feat(flows): persist revisioned flow graphs`

**Commit #:** 01  
**Proposed commit message:** `feat(flows): persist revisioned flow graphs`

**Goal:** Add `Flow`, `FlowRevision`, `FlowNode`, and `FlowEdge` models capable of representing triggers, messages, conditions, objections, checkout and delivery handoffs.

**Why it matters:** The current flow pack is portable, but scripts remain global and the runtime shape is implicit. A normalized, immutable revision creates the foundation for campaign-specific editing, replay and safe publishing.

**Main files/modules affected:** `prisma/schema.prisma`, new Prisma migration, `src/lib/flows/schema.ts`, `src/lib/demo-reset.ts`, `src/lib/flow-packs.ts`.

**Implementation outline:** Define constrained node/edge kinds; store editable drafts separately from immutable published revisions; relate campaigns to one published revision; migrate the seeded GUIDE/CHECKLIST flows; add conversion between revision rows and flow-pack v2 while retaining v1 import compatibility.

**Tests required:** Migration from `0.2.0`; graph validation unit tests (unique IDs, reachable handoffs, no dangling edges); seed idempotency; v1→v2 import fixtures.

**Dependencies/blockers:** None; this is the base for commits 02–05. Decide SQLite-safe ordering/uniqueness constraints before UI work.

**Risk level:** High — foundational schema and backward compatibility.

**Acceptance criteria:**

- A fresh and upgraded database both migrate without data loss.
- Every seeded campaign points to a published, immutable flow revision.
- Invalid/dangling graphs cannot be published.
- Existing v1 flow packs still import with a documented conversion.

**Estimated scope:** L

## 02 — `feat(engine): execute graphs with typed decisions`

**Commit #:** 02  
**Proposed commit message:** `feat(engine): execute graphs with typed decisions`

**Goal:** Replace hard-coded stage branching with a pure executor over a published flow revision and explicit conversation context.

**Why it matters:** A reusable executor is the project's core differentiator: every response and handoff should be deterministic, explainable and testable without React or a database.

**Main files/modules affected:** `src/lib/stateMachines/dmFlow.ts`, new `src/lib/flows/executor.ts`, `src/lib/flows/types.ts`, `tests/unit/flow-executor.test.ts`.

**Implementation outline:** Compile revision nodes/edges into a validated in-memory plan; evaluate keyword/intent/stage/variable conditions in declared priority order; return a decision containing node, edge, reason, rendered template and next actions; preserve a compatibility adapter for existing callers.

**Tests required:** Table-driven paths for happy, objection, fallback, loop-limit and no-match cases; deterministic replay; property test that execution never returns an unknown node.

**Dependencies/blockers:** Requires commit 01's graph contract. Do not start the visual editor first.

**Risk level:** High — changes conversation behavior.

**Acceptance criteria:**

- The current GUIDE golden path produces the same visible stages.
- Every decision includes a machine-readable reason and selected edge.
- A configured maximum step count prevents graph loops.
- Executor tests run with no Prisma/Next imports.

**Estimated scope:** L

## 03 — `feat(campaigns): bind campaigns to published flow revisions`

**Commit #:** 03  
**Proposed commit message:** `feat(campaigns): bind campaigns to published flow revisions`

**Goal:** Make each campaign select a published flow revision and ensure DM Studio/export use only that revision's scripts and transitions.

**Why it matters:** Global scripts make exported flows ambiguous and allow one campaign's edits to alter another. Revision pinning makes attribution and historical replay credible.

**Main files/modules affected:** campaign APIs/UI, DM Studio loader, flow-pack API, Prisma relations introduced in commit 01.

**Implementation outline:** Add campaign flow selector and publish action; resolve campaign→revision server-side; reject deleted/unpublished references; include flow revision ID in conversation events and flow exports; keep existing campaigns pinned during new draft edits.

**Tests required:** API authorization/validation; campaign pinning integration tests; export isolation; regression that publishing a new revision does not mutate past events.

**Dependencies/blockers:** Requires commits 01–02.

**Risk level:** Medium.

**Acceptance criteria:**

- Two campaigns can use different flow revisions without script leakage.
- Editing a draft does not change an active conversation.
- Exported JSON exactly reflects the selected published revision.
- Events identify the revision that made the decision.

**Estimated scope:** M

## 04 — `feat(editor): add accessible node-and-edge flow workspace`

**Commit #:** 04  
**Proposed commit message:** `feat(editor): add accessible node-and-edge flow workspace`

**Goal:** Add a structured visual editor for draft nodes, conditions, transitions and handoffs, with a fully usable keyboard/list fallback.

**Why it matters:** Portable JSON is valuable to developers; a safe editor makes the same engine understandable and shareable for creators without hiding graph validity.

**Main files/modules affected:** new dashboard flow route/components, draft flow APIs, `src/lib/flows/schema.ts`, navigation and command palette.

**Implementation outline:** Implement list-first node editing and an optional canvas projection; autosave draft revisions with optimistic version checks; show validation errors on exact nodes/edges; require an explicit publish preview; never edit a published revision in place.

**Tests required:** Component tests for node/edge editing and conflict recovery; keyboard navigation/accessibility checks; Playwright draft→validate→publish→DM path.

**Dependencies/blockers:** Requires commits 01–03; select a graph UI dependency only after accessibility/bundle evaluation.

**Risk level:** High — complex UI and concurrent edits.

**Acceptance criteria:**

- A user can build the golden flow without editing JSON.
- The full editor works by keyboard and exposes labels/errors to assistive technology.
- Publish is disabled until graph validation passes.
- Concurrent stale saves return a recoverable conflict rather than overwriting work.

**Estimated scope:** L

## 05 — `feat(traces): record and replay flow decisions`

**Commit #:** 05  
**Proposed commit message:** `feat(traces): record and replay flow decisions`

**Goal:** Persist compact decision traces and provide a conversation inspector that explains why each edge/node was selected.

**Why it matters:** Explainability distinguishes DM Commerce OS from opaque automation demos and makes graph debugging practical.

**Main files/modules affected:** event vocabulary/schema, flow executor, messages API, DM Studio inspector, analytics drill-down.

**Implementation outline:** Emit versioned `flow.decision_made` properties with revision/node/edge/intent/reason; add trace decoder; render chronological decisions beside messages; add replay mode that re-executes a recorded input sequence against its pinned revision and reports divergence.

**Tests required:** Trace serialization/version tests; deterministic replay fixture; corrupt/unknown metadata fallback; UI inspector E2E.

**Dependencies/blockers:** Requires commits 02–03 so decisions and revision IDs are stable.

**Risk level:** Medium.

**Acceptance criteria:**

- Every automated reply in a new session has a corresponding decision event.
- An inspector shows the chosen edge and human-readable reason.
- Golden fixture replay has zero divergence.
- Unknown future trace properties do not break analytics.

**Estimated scope:** M

## 06 — `feat(delivery): serve expiring authenticated download grants`

**Commit #:** 06  
**Proposed commit message:** `feat(delivery): serve expiring authenticated download grants`

**Goal:** Stop exposing purchased assets as permanent public URLs and issue short-lived, order-bound download grants through an authenticated route.

**Why it matters:** Public filenames are the largest remaining hosted-demo trust gap. Even a local-first reference should model delivery authorization honestly.

**Main files/modules affected:** Prisma delivery grant model/migration, checkout/delivery provider, new download route, Orders UI, seed PDFs/config.

**Implementation outline:** Move deliverables outside direct `public/` serving; create opaque hashed grants with expiry/use count; stream only regular allow-listed files; bind grants to order/customer session; emit grant-issued/downloaded events; keep a development-only fixture reset.

**Tests required:** Route integration tests for valid, expired, reused, guessed and cross-order grants; traversal/symlink tests; E2E download assertion.

**Dependencies/blockers:** Independent of visual editor, but should land after stable order/event IDs. Requires a migration plan for existing product paths.

**Risk level:** High — changes delivery storage and URLs.

**Acceptance criteria:**

- Static requests to old `/files/*` purchase assets no longer succeed.
- A valid order receives a time-limited grant and downloads the correct bytes.
- Expired/consumed/foreign grants return a generic denial.
- Download events retain campaign/order attribution.

**Estimated scope:** L

## 07 — `feat(orders): model pending failed refunded and abandoned states`

**Commit #:** 07  
**Proposed commit message:** `feat(orders): model pending failed refunded and abandoned states`

**Goal:** Replace the free-form delivered status with validated lifecycle transitions and explicit checkout attempts.

**Why it matters:** Synchronous success hides the behavior a real adapter must handle. A trustworthy reference needs explainable failure and recovery states before external payments.

**Main files/modules affected:** Prisma order/checkout-attempt schema, checkout service, event types, Orders UI, analytics.

**Implementation outline:** Introduce typed states and a transition function; create checkout attempts before authorization; transition `pending→paid→delivering→delivered` or failure/refund/abandonment branches; record timestamps/reasons and immutable transition events; add a demo failure toggle.

**Tests required:** Transition table unit tests; prohibited transition tests; transaction rollback/integration cases; Playwright success/failure/abandon demo paths.

**Dependencies/blockers:** Commit 06's delivery grants should inform `delivering/delivered` semantics.

**Risk level:** High.

**Acceptance criteria:**

- Invalid transitions are impossible through the domain API.
- Failed authorization creates no completed order or download grant.
- Abandoned attempts are visible in analytics without inflating revenue.
- Seed data covers at least three lifecycle branches.

**Estimated scope:** L

## 08 — `feat(providers): add idempotency and transactional outbox contracts`

**Commit #:** 08  
**Proposed commit message:** `feat(providers): add idempotency and transactional outbox contracts`

**Goal:** Make provider calls retry-safe and schedule side effects through a local transactional outbox.

**Why it matters:** The current providers are intentionally side-effect-free. Real adapters must not double-charge or lose delivery work when a database write or process fails.

**Main files/modules affected:** provider interfaces, checkout service, new outbox model/worker, doctor command, provider test doubles.

**Implementation outline:** Add checkout idempotency keys; persist provider commands in the order transaction; implement lease/retry/dead-letter semantics; extend receipts with stable external references; expose worker status and a manual local drain command; keep the default in-process worker opt-in.

**Tests required:** Duplicate request, crash-before/after-provider, lease expiry, retry/backoff and poison-message integration tests with deterministic fake clocks.

**Dependencies/blockers:** Requires commit 07's attempt/state model. No real provider should merge before this contract.

**Risk level:** High — concurrency and exactly-once expectations.

**Acceptance criteria:**

- Repeating one idempotency key yields one attempt/order/provider authorization.
- A simulated process crash resumes pending work without duplication.
- Exhausted jobs surface clearly without blocking unrelated work.
- Default no-key demo remains one command.

**Estimated scope:** L

## 09 — `test(db): add isolated checkout and migration integration harness`

**Commit #:** 09  
**Proposed commit message:** `test(db): add isolated checkout and migration integration harness`

**Goal:** Add per-test temporary SQLite databases for real Prisma integration coverage across migrations, checkout, events and concurrency.

**Why it matters:** Domain unit tests cannot prove foreign keys, unique constraints, transaction behavior or upgrade migrations—the highest-risk parts added in commits 01–08.

**Main files/modules affected:** Vitest workspace/config, Prisma test helpers, migration fixtures, checkout/flow integration suites, CI.

**Implementation outline:** Allocate a temporary database URL per suite; apply migrations through the local Prisma binary; seed minimal fixtures; provide cleanup and query assertions; add an upgrade fixture captured from `0.2.0`; shard tests safely in CI.

**Tests required:** The harness is the test work; include self-tests for isolation and failed-test cleanup.

**Dependencies/blockers:** Best after commits 01–08 settle schema/transactions; can be developed alongside commit 07 but must land before external adapters.

**Risk level:** Medium.

**Acceptance criteria:**

- Integration tests never touch the developer's `prisma/dev.db`.
- Two suites can run concurrently without row leakage.
- The `0.2.0` upgrade fixture reaches the latest schema and preserves order totals.
- CI reports unit and database integration results separately.

**Estimated scope:** M

## 10 — `feat(coupons): add management preview and redemption audit UI`

**Commit #:** 10  
**Proposed commit message:** `feat(coupons): add management preview and redemption audit UI`

**Goal:** Expose the already-enforced coupon engine through authenticated create/edit/deactivate, price preview and redemption-history screens.

**Why it matters:** Coupon behavior is currently hidden in seed data, limiting discoverability and safe experimentation.

**Main files/modules affected:** coupon APIs/validators, new dashboard coupon route, checkout preview endpoint, event/order queries, navigation.

**Implementation outline:** Add constrained percent/fixed forms, active windows and caps; return a non-mutating price explanation; prevent destructive edits that reinterpret past orders; show redemption orders and remaining capacity; support deactivation rather than deletion.

**Tests required:** API authorization/input tests; timezone/window cases; preview-versus-checkout parity; UI E2E for create/use/deactivate.

**Dependencies/blockers:** Uses commit 09's integration harness; no dependency on external providers.

**Risk level:** Medium.

**Acceptance criteria:**

- An admin can create and preview both coupon kinds.
- Preview and checkout produce identical integer-cent totals.
- Past order snapshots never change after coupon edits.
- Redemption capacity remains correct under concurrent checkouts.

**Estimated scope:** M

## 11 — `feat(analytics): add selectable funnels and abandonment cohorts`

**Commit #:** 11  
**Proposed commit message:** `feat(analytics): add selectable funnels and abandonment cohorts`

**Goal:** Add date/campaign/product/flow-revision filters plus explicit abandonment and lifecycle metrics.

**Why it matters:** A fixed seven-day view proves the ledger works; cohorts make it genuinely useful for comparing flows without inventing impressions.

**Main files/modules affected:** analytics query/service/API, Analytics UI/chart URL state, event indexes/migration if justified.

**Implementation outline:** Define a validated filter object; calculate session funnels from first/terminal events; segment checkout attempts by lifecycle; report p50/p90 time-to-checkout and abandonment node; encode filters in the URL; cap query windows.

**Tests required:** Integration fixtures across date boundaries/time zones, multiple campaigns/revisions, direct orders and abandoned attempts; API limit tests; chart UI E2E.

**Dependencies/blockers:** Requires commits 05 and 07 for decision traces and attempt states; use commit 09's harness.

**Risk level:** Medium.

**Acceptance criteria:**

- Filters return reconciled totals and never count direct orders as DM conversion.
- Abandonment identifies the last reached flow node.
- Large/invalid windows receive bounded validation errors.
- Filtered state is shareable by local URL.

**Estimated scope:** L

## 12 — `feat(events): version payload schemas and add ledger diagnostics`

**Commit #:** 12  
**Proposed commit message:** `feat(events): version payload schemas and add ledger diagnostics`

**Goal:** Formalize per-event property schemas and provide a read-only command that reports malformed, orphaned or sequence-inconsistent events.

**Why it matters:** JSON properties enabled fast iteration, but long-lived analytics need explicit evolution and observable corruption handling.

**Main files/modules affected:** `src/lib/events.ts`, new schema registry/diagnostic command, write sites, analytics decoders, docs.

**Implementation outline:** Add envelope version and typed Zod schemas; centralize event creation; keep tolerant readers/migrations; implement `events:doctor --json` with no automatic deletion; document extension rules.

**Tests required:** Every event schema, old-version decoding, unknown future event tolerance, orphan/sequence fixtures and CLI snapshots.

**Dependencies/blockers:** Land after commits 05, 07 and 11 establish the fuller vocabulary.

**Risk level:** Medium.

**Acceptance criteria:**

- New writes cannot emit an unregistered event or invalid properties.
- Existing `0.2.0` events still decode.
- Diagnostics explain issues without mutating the ledger.
- Analytics skips and counts malformed optional metadata rather than crashing.

**Estimated scope:** M

## 13 — `feat(portability): export and restore a complete local workspace`

**Commit #:** 13  
**Proposed commit message:** `feat(portability): export and restore a complete local workspace`

**Goal:** Export products, campaigns, flow revisions, coupons and optional synthetic history into a checksummed archive that can be validated and restored locally.

**Why it matters:** A portable workspace turns the project into a forkable operating system rather than a single seeded database and makes compelling examples shareable.

**Main files/modules affected:** new backup service/CLI/API, versioned manifest schema, import preview UI, docs and fixtures.

**Implementation outline:** Stream a deterministic archive with manifest/hashes; exclude users, secrets, unmanaged paths and real buyer data by default; validate all entries and sizes before a transaction; show an import plan/conflicts; support rename/skip, never silent overwrite.

**Tests required:** Round trip, corrupt hash, traversal, oversize, duplicate ID, unsupported version, rollback and privacy-redaction tests.

**Dependencies/blockers:** Requires the revision/event schemas from commits 01 and 12 and secure asset rules from commit 06.

**Risk level:** High — archive parsing and data replacement.

**Acceptance criteria:**

- Export→fresh import reproduces the golden configuration deterministically.
- Traversal/symlink/oversize entries are rejected before writes.
- Default exports contain no account secret or buyer PII.
- Conflicts are previewed and require an explicit choice.

**Estimated scope:** L

## 14 — `feat(providers): ship a contract-tested webhook example adapter`

**Commit #:** 14  
**Proposed commit message:** `feat(providers): ship a contract-tested webhook example adapter`

**Goal:** Demonstrate one optional outbound generic webhook provider without claiming a vendor-specific production integration.

**Why it matters:** Maintainers need a concrete extension example, but the no-key local loop and honest boundary should remain primary.

**Main files/modules affected:** provider SDK/contracts, generic webhook adapter, settings/env validation, outbox worker, example receiver fixture, docs.

**Implementation outline:** Add an opt-in signed webhook with strict destination allowlist, timeouts, body cap and redacted logs; drive it through the outbox; include a local fixture receiver; document threat model and explicitly label it an example.

**Tests required:** Provider contract suite; signature verification; timeout/retry; SSRF/redirect/oversize rejection; idempotent delivery.

**Dependencies/blockers:** Requires commits 08–09. Do not accept arbitrary model/user-generated URLs.

**Risk level:** High — outbound network/SSRF surface.

**Acceptance criteria:**

- Disabled/default configuration makes no network requests.
- The local fixture receives one signed, idempotent event.
- Private/link-local/redirected destinations are denied.
- Failures use the shared retry/dead-letter behavior.

**Estimated scope:** M

## 15 — `fix(a11y): complete dashboard keyboard and screen-reader audit`

**Commit #:** 15  
**Proposed commit message:** `fix(a11y): complete dashboard keyboard and screen-reader audit`

**Goal:** Bring the full golden path, including the graph editor, tables, drawers, charts and command palette, to a documented accessibility baseline.

**Why it matters:** Creator tooling should not require a pointer or rely on color-only funnel information; accessibility also improves testability and UI quality.

**Main files/modules affected:** dashboard/chat/editor components, charts/tables/dialogs, global CSS, Playwright accessibility helpers.

**Implementation outline:** Establish focus order/return, accessible names and live regions; add text equivalents for charts; expose table sorting/selection; audit contrast/reduced motion; remove keyboard traps; document supported behavior.

**Tests required:** Automated axe scans for every dashboard route; Playwright keyboard-only golden path; reduced-motion and focus regression checks; manual screen-reader checklist.

**Dependencies/blockers:** Schedule after commit 04 so the largest new interaction surface is included.

**Risk level:** Medium.

**Acceptance criteria:**

- Automated scans have no serious/critical findings on seeded routes.
- The complete DM→checkout→download path works without a pointer.
- Charts expose equivalent names/values.
- Dialogs/drawers restore focus and announce validation/errors.

**Estimated scope:** L

## 16 — `test(e2e): add browser matrix visual baselines and demo capture`

**Commit #:** 16  
**Proposed commit message:** `test(e2e): add browser matrix visual baselines and demo capture`

**Goal:** Expand browser verification to Chromium, Firefox and WebKit and produce deterministic current screenshots/GIF capture inputs from the golden seed.

**Why it matters:** The README images predate the revival, and one Chromium-only path cannot catch cross-browser or layout regressions.

**Main files/modules affected:** Playwright config/specs, CI matrix/artifacts, seed clock helpers, `docs/demo-capture.md`, README assets.

**Implementation outline:** Freeze seed/time/viewport; split smoke versus visual suites; add targeted screenshots for the golden path, trace retention on retry and a documented GIF assembly workflow; set sensible per-browser CI timeouts.

**Tests required:** The new browser matrix; a baseline-update guard requiring an explicit environment flag; validation that screenshots contain no external/personal data.

**Dependencies/blockers:** Best after commits 04, 06, 10, 11 and 15 stabilize primary UI. Requires CI access to browser downloads.

**Risk level:** Medium — visual baseline maintenance and CI cost.

**Acceptance criteria:**

- Golden functional tests pass on all three engines in CI.
- Visual diffs are deterministic across two consecutive runs.
- Failed runs upload traces/screenshots for seven days.
- README uses freshly captured `0.x` product views.

**Estimated scope:** M

## 17 — `ci(release): publish checksums SBOM and verified source archives`

**Commit #:** 17  
**Proposed commit message:** `ci(release): publish checksums SBOM and verified source archives`

**Goal:** Add tag-driven releases with changelog validation, provenance, dependency SBOM, checksums and a smoke-tested source archive.

**Why it matters:** The repository has no releases. A trustworthy release surface makes adoption and vulnerability reporting materially easier without pretending to ship a hosted service.

**Main files/modules affected:** GitHub Actions release workflow, package scripts, changelog/release docs, artifact verification script, security policy.

**Implementation outline:** Trigger on signed semantic tags; rerun all gates; create an archive excluding local/generated files; generate CycloneDX/SPDX SBOM and SHA-256 checksums; verify extraction→setup→smoke in a clean job; attach artifacts and generated notes with least-privilege permissions.

**Tests required:** Workflow dry run on a release-candidate tag/fork; archive allow/deny list tests; checksum/SBOM validation; clean extraction smoke.

**Dependencies/blockers:** Requires stable integration/E2E gates from commits 09 and 16. Repository owner must configure release permissions/signing policy.

**Risk level:** Medium.

**Acceptance criteria:**

- A release job cannot publish unless quality, integration and browser gates pass.
- The archive contains no `.env`, database, upload, dependency or build output.
- Checksums and SBOM validate in a separate job.
- Release notes link migrations, security changes and upgrade steps.

**Estimated scope:** M

## 18 — `docs(examples): launch versioned flow gallery and maintainer playbook`

**Commit #:** 18  
**Proposed commit message:** `docs(examples): launch versioned flow gallery and maintainer playbook`

**Goal:** Publish several tested synthetic workspace/flow examples and document issue triage, compatibility, deprecation and release cadence.

**Why it matters:** The next adoption step is not more random features; it is making the engine immediately understandable, extensible and safe for contributors to evolve.

**Main files/modules affected:** `examples/`, README, contributor/maintainer guides, compatibility matrix, issue/PR templates, CODEOWNERS if desired.

**Implementation outline:** Add creator guide, launch checklist, objection-heavy and abandoned-checkout examples using commit 13's portable format; validate examples in CI; document schema support windows, decision records, labels, review expectations and a realistic milestone cadence.

**Tests required:** Import and replay every example; link/command checks; secret/PII scan; compatibility tests against the oldest supported manifest/flow version.

**Dependencies/blockers:** Requires commits 12–13 for stable schemas/archives and commit 17 for release policy.

**Risk level:** Low.

**Acceptance criteria:**

- Every example imports into a fresh workspace and completes its documented replay.
- Examples contain only synthetic identities/assets and pass the sensitive-data scan.
- Compatibility and deprecation policies name concrete supported versions.
- A first-time contributor can find setup, architecture, issue scope and release expectations from the README.

**Estimated scope:** M
