# Revival audit

Audit date: 2026-09-02  
Starting revision: `82b25c5` (`main`)  
Delivered version: `0.2.0`

## Original state

The repository was a polished-looking Next.js 14 dashboard with demo-cookie auth, Prisma/SQLite models for users, products, orders, scripts, campaigns, messages and settings, a client-side DM state machine, product/campaign/script CRUD, a simulated checkout, local PDF links, seeded fixtures, a Playwright file, and several setup helpers. It also contained a tracked legacy UI snapshot and an archived page implementation.

The strongest real product idea was present but incomplete: the UI could demonstrate pieces of a creator DM funnel, yet checkout, campaign attribution, delivery and analytics did not share a durable event model. Payments were implicit rather than an adapter, orders read mutable product prices, analytics mixed hard-coded numbers with live rows, flows were not portable, and the seed path was gated by an undocumented deployment variable.

The Git history was shallow (five visible commits at the start) and there were no GitHub releases. The public README positioned the project mainly as a portfolio simulator and still contained screenshot-capture placeholders and a PostgreSQL deployment recipe that could not work with the hard-coded SQLite Prisma provider.

## Problems discovered

### Installation and tooling

- Clean `npm ci` failed because the semver range installed ESLint 9 while `eslint-config-next@14` only supported ESLint 7/8.
- The setup command itself required `tsx` before dependencies had been installed.
- Setup and most docs created `.env.local`; Prisma CLI and `dotenv/config` load root `.env` for this project.
- Examples disagreed between `file:./dev.db`, `file:./prisma/dev.db`, and a PostgreSQL URL. Prisma resolves `file:./dev.db` from the schema directory to `prisma/dev.db`.
- Package-manager detection preferred any globally installed pnpm even though the repository only committed `package-lock.json`.
- The old `next lint` wrapper and duplicate flat/legacy ESLint configuration did not provide a durable lint path.
- TypeScript included the tracked `DM Commerce Latest UI/` snapshot and reported dependencies that are not part of the active app.
- The original seed returned without doing work unless `SEED_ON_DEPLOY=true`, contradicting setup instructions.

### Product and data

- Orders had no customer, status, campaign/session attribution, coupon, money snapshot, or delivery timestamp.
- Checkout created an order directly, with no explicit payment/delivery boundary or durable funnel events.
- Analytics used synthetic impression/DM baselines, so visible conversion figures were decorative.
- Campaign context selected in DM Studio did not survive through checkout to orders and analytics.
- Intent matching used substring tests; words such as “yesterday” and “somewhere” could accidentally match `yes` and `where`.
- The dashboard revenue panel was a placeholder and recent rows displayed the product's current price instead of the purchased total.
- Flows could not be validated, versioned, imported, or exported.
- A schema-valid imported flow could reuse one unique database script name across stages; the later upsert silently replaced the earlier stage and made subsequent exports invalid.
- Configured trigger keywords such as `YES`, `BUY`, `PRICE`, and `LATER` were swallowed by generic intent vocabulary before an unstarted flow could pitch.
- Settings reset only upserted golden rows, so extra products/scripts and imported flow state survived the operation despite the UI promising a wipe-and-reseed.
- Client persistence errors could leave the DM composer stuck or show messages that were not saved.

### Security and trust

- Sessions had no expiry or nonce and signature comparison was not timing-safe.
- Write routes had no consistent same-origin browser mutation check.
- The login return path accepted an unsafe external redirect shape.
- Logo uploads trusted client MIME/extension data, retained user filenames, had no explicit size limit, and needed tighter managed-path cleanup.
- Product delivery paths allowed traversal-shaped strings at catalog validation; delivery followed filesystem links.
- Flow/request body sizes were not bounded, and invalid attribution identifiers became server errors.
- Runtime logos were written into `public/uploads`; post-build writes returned 404 under `next start`, while the public path also bypassed any authenticated delivery boundary in development.
- The registered service worker cached every GET, including private APIs, dashboard HTML, analytics, settings, orders, uploads, and downloads, allowing stale/authenticated responses after mutation or logout.
- Playwright reset the same `prisma/dev.db` used by a developer instead of an isolated test database.
- The sensitive scanner adapted a synchronous dependency as a callback, so Node exited successfully before scanning or writing a report.
- The security reporting guide instructed contributors to put notes into a raw-match scan report and a pull request instead of using a private vulnerability channel.
- The dependency audit later exposed four high-severity production findings, including the old Next.js line.

### Quality and public surface

- No unit-test runner or domain unit tests existed.
- Playwright's primary scenario targeted stale UI behavior.
- The production build initially failed on `/login` because `useSearchParams` was not below Suspense.
- Runtime use of Google Fonts made local development depend on an external network request.
- The documented `npm run reset:demo` forwarded Prisma flags through `npm exec` incorrectly and aborted in non-interactive mode.
- Both committed delivery PDFs had invalid object/xref/trailer structures and failed `pdfinfo`/`pdftotext`.
- There was no CI workflow, contributor guide, architecture guide, honest local-storage limit statement, or ordered engineering roadmap.

## Baseline verification

These results describe the repository before stabilization. A failure was not hidden by deleting tests or weakening TypeScript.

| Gate | Command | Result | Evidence |
| --- | --- | --- | --- |
| Git state | `git status --short` | PASS | Clean at `82b25c5`. |
| Install | `npm ci` | FAIL | `ERESOLVE`: ESLint 9.39.2 conflicted with `eslint-config-next@14.2.35`'s ESLint 7/8 peer range. |
| Configuration | setup/doc inspection | FAIL | `.env.local`/PostgreSQL instructions contradicted Prisma CLI and the SQLite schema. |
| Typecheck | `npm run typecheck` | FAIL | The active config traversed the tracked duplicate UI snapshot and script target/library mismatches. |
| Lint | `npm run lint` | FAIL | Approximately 20 actionable TypeScript/React lint errors were reported in the active surface. |
| Unit tests | `npm test` | NOT PRESENT | There was no unit-test script or unit suite. |
| E2E | `npm run test:e2e` | BLOCKED BY ENVIRONMENT | The required Playwright Chromium binary was not installed. |
| Build | `npm run build` | BLOCKED BY BASELINE | Dependency/tooling stabilization was required first; the first stabilized build then exposed the `/login` Suspense defect. |
| Launch/smoke | authenticated manual/API path | NOT PRESENT | No repeatable authenticated HTTP smoke script existed. |

## Development performed

### Coherent commerce loop

- Added normalized `Customer` and `Coupon` models, richer `Order` snapshots/lifecycle fields, and indexed append-only `CommerceEvent` rows with a committed migration.
- Added coupon rules for percent/fixed discounts, active windows, redemption limits, integer-cent rounding, and nonnegative totals.
- Added typed `PaymentProvider` and `DeliveryProvider` contracts with explicitly named `MockPaymentProvider` and `LocalFileDeliveryProvider` implementations.
- Moved checkout orchestration into a domain service that validates attribution, upserts customers, snapshots pricing, increments coupons with an optimistic concurrency check, records orders, verifies local delivery, and appends checkout/order/delivery events.
- Carried campaign/product/session context from DM Studio through checkout, orders, and analytics.

### Explainable automation and analytics

- Reworked DM intent classification around token boundaries and explicit priority, including stage-aware configured-keyword precedence before a flow starts and ordinary intent semantics afterward.
- Added stable stage markers so persisted assistant messages can rebuild flow progress.
- Added versioned Zod flow-pack validation plus authenticated import/export with a 100 KB limit, required stages, unique step IDs/script names, pre-write rejection, and UI actions.
- Replaced decorative analytics with a rolling seven-day calculation over persisted events and price-snapshotted orders: conversations, qualified sessions, checkouts, orders, deliveries, DM conversion, objections, median time-to-checkout, revenue, product mix, and campaign attribution.
- Replaced the dashboard revenue placeholder with real seven-day order totals and corrected recent rows to use order snapshots.

### Golden demo

- Rebuilt the seed around two products, two campaigns, six scripts, six customers/orders over seven days, two objection paths, a `LAUNCH20` coupon, coherent session/campaign/product attribution, and a complete event ledger.
- Made seeding unconditional and resettable through both CLI and Settings; the API reset now deletes mutable demo/config rows and rebuilds the full golden state inside one database transaction.
- Replaced both malformed seeded files with synthetic, valid one-page PDFs and added structural plus optional `pdfinfo` validation.
- Added a read-only authenticated smoke mode plus an explicit destructive production mode that byte-checks runtime logo delivery, denies static/anonymous access, creates extra data, and proves exact reset counts.

### Baseline and platform modernization

- Upgraded to patched Next.js 16.3.4, its supported async cookie/route-param conventions and the `src/proxy.ts` convention; React/ReactDOM remain on the supported 18.3.1 peer line.
- Replaced the removed `next lint` path with flat-config ESLint, using ESLint 9 because the React lint plugin bundled by the current Next config fails at runtime on ESLint 10 despite the broad peer declaration.
- Upgraded Playwright and Vitest, added Node-engine constraints, corrected TypeScript target/include/exclude settings, and removed obsolete script shims.
- Made `npm run setup` bootstrap with `npm ci` before loading `tsx`, use `.env`, honor the npm lockfile, apply committed migrations, and seed the demo.
- Added a two-job GitHub Actions workflow for quality/build and Chromium E2E.
- Isolated Playwright in a hard-guarded `prisma/e2e.db`, disabled reuse of an arbitrary existing dev server, repaired the CLI reset wrapper, and mapped common CRUD conflicts/missing rows to stable 400/404/409 responses.

## Architectural decisions

1. **Local-first remains the default.** SQLite, mock authorization and local PDFs are intentional so the core loop works with no keys. A remote database is not advertised as an environment-only swap because provider/migration/storage semantics would change.
2. **Events complement, rather than replace, transactional models.** Orders/customers/coupons keep queryable invariants; append-only events explain the funnel and power analytics. Demo reset is the explicit ledger-deletion exception.
3. **Money is snapshotted at purchase.** Historical totals no longer depend on a mutable catalog price.
4. **Adapters isolate external effects.** The current providers are honest mocks/local implementations. Real providers require idempotency, webhooks, retries and secret management before use.
5. **Flows use a portable schema before a visual graph rewrite.** A small, versioned, validated format creates immediate reuse without replacing the existing state machine.
6. **Session defense matches the sandbox threat model.** Signed expiring cookies, `SameSite=Lax`, route-level auth, and Origin/Fetch-Metadata checks protect the local app. Multi-user identity and rate limiting remain out of scope.
7. **The active app excludes, but does not erase, legacy snapshots.** This preserves project provenance while keeping build/type/lint gates deterministic.
8. **Runtime uploads are private application state.** Generated logos live outside `public`, and the authenticated route serves only the currently referenced canonical file after bounded descriptor/signature revalidation.
9. **No offline cache is safer than a misleading one.** The catch-all service worker was replaced by a self-unregistering cache-cleanup tombstone; client cleanup handles already registered workers without caching private/dynamic data.

## Security findings

### Fixed

- Expiring nonce-bearing HMAC sessions with timing-safe verification and production secret-length enforcement.
- Malformed cookie encoding returns unauthenticated instead of throwing.
- All API reads require auth; all mutations additionally apply a same-origin browser policy (login/logout use the origin policy without requiring an existing session).
- Dashboard return paths are restricted to internal dashboard routes.
- Logo requests require a valid bounded length, files are capped at 2 MB, PNG/JPEG/WebP structure is checked, SVG is excluded, names are canonical UUIDs, writes are exclusive/owner-only under a real non-linked private directory, JSON/multipart reference swaps are rejected, and replaced/reset managed files are cleaned up. The authenticated current-logo route uses no-follow descriptor reads, a second size/signature check, private immutable caching, and generic misses.
- Delivery paths are allow-listed local PDF names; traversal/hidden names and filesystem links are rejected.
- Flow imports and settings bodies have explicit limits and Zod schemas; duplicate script names are rejected before a transaction, and invalid campaign/product attribution returns a client error.
- The legacy service worker no longer intercepts requests; both the replacement worker and client provider remove its caches/registration.
- Browser E2E can reset only the dedicated ignored `prisma/e2e.db`, never the local developer database.
- The sensitive scanner now executes its dependency synchronously, asks Git for tracked and non-ignored candidates, redacts all matched values, writes completed reports atomically with private permissions, exits nonzero for candidates, and has regressions for the previous unresolved-promise, local-artifact and disclosure defects.
- Next.js and transitive production findings were upgraded/remediated, then the locked development-tool transitive graph was refreshed within existing semver ranges; the final full dependency audit reports zero vulnerabilities.
- Security reporting now directs researchers to private GitHub reporting and documents the scanner's redacted, Git-aware report boundary.

### Remaining

- Demo credentials are public and there is no rate limiting, account model, password reset, audit identity, or session revocation store. Do not expose the demo unchanged.
- Delivered assets live under `public/files`; anyone who knows a filename can request it from a hosted instance. A signed/authenticated download route is a future milestone.
- Settings upload clients/proxies must provide `Content-Length`; unknown-length requests are rejected with 411 rather than buffered.
- Event property JSON is validated at application write sites, not by SQLite.
- Provider calls are safe today because they are side-effect-free mock/local checks. A real payment provider needs idempotent authorization and compensating states before the transaction boundary can be reused.
- ESLint 9 is operational and within `eslint-config-next`'s peer range but is deprecated upstream; ESLint 10 must wait for the bundled React rule runtime incompatibility to be resolved or replaced.

## Tests and final verification

The final pass used Node 24.19.0. `CHECKPOINT_DISABLE=1` was set for Prisma commands in this restricted environment and is now part of generated local configuration.

| Gate | Exact command | Result |
| --- | --- | --- |
| Fresh-clone bootstrap | `npm run setup` | PASS; installed the lockfile, created `.env`, generated Prisma Client, applied both migrations, and seeded the golden demo. |
| Clean locked install | `npm run setup` from a dependency-free clean copy | PASS: `npm ci` installed 691 locked packages, then setup generated the client, applied both migrations, seeded the golden state, and created an owner-only `0600` `.env` with a fresh 64-character secret. |
| Prisma client | `npm run prisma:generate` | PASS, Prisma Client generated. |
| Schema | `./node_modules/.bin/prisma validate` | PASS. |
| Migrations | `./node_modules/.bin/prisma migrate reset --force --skip-generate` | PASS; both committed migrations applied to a fresh SQLite database. |
| Golden seed | `npm run db:seed` | PASS; “Demo data ready.” |
| Lint | `npm run lint` | PASS, zero ESLint warnings/errors. |
| Typecheck | `npm run typecheck` | PASS. |
| Unit/regression | `npm test` | PASS: 12 files, 45 tests. Coverage includes overlapping flow triggers, duplicate-name import atomicity/export health, deterministic reset counts, private upload storage/route rules, browser-cache retirement, E2E database isolation, PDF structure, scanner Git-ignore/redaction/runtime behavior, safe sanitization, private file modes, placeholder rejection, and CRUD status mapping. |
| Conflict-marker check | `npm run check:conflicts` | PASS; the checker itself was fixed to match complete marker lines instead of flagging documentation examples. |
| Sensitive-data scan | `npm run scan:sensitive` after normal setup | PASS: ignored local `.env` and generated artifacts stayed outside the Git-visible candidate set; tracked legacy source was scanned; the completed report was mode `0600`; and the scanner reported zero findings without printing or storing the generated secret. |
| Delivery fixtures | `npm run validate:fixtures` plus `pdfinfo`, `pdftotext`, Poppler rendering, and visual inspection | PASS: both one-page PDFs parse, extract, render, and have valid numeric xref targets. |
| CLI reset | `npm run reset:demo` | PASS: Prisma received `--force`, both migrations applied, client regenerated, and golden seed completed. |
| Production build | `npm run build` | PASS on Next.js 16.3.4/Turbopack; the application/API route manifest, managed-upload route, and Proxy were generated. |
| Production runtime smoke | `DM_COMMERCE_BASE_URL=http://127.0.0.1:3100 npm run smoke:production` against `npm run start -- --hostname 127.0.0.1 --port 3100` after `npm run build` | PASS: logo upload immediately returned identical bytes through authenticated `/api/uploads`, anonymous/static paths were denied, seeded PDFs had correct headers/magic, temporary product/script rows were removed, and exact 2-product/6-script golden counts returned. |
| Dependency audit | `npm audit` and `npm audit --omit=dev` | PASS: zero vulnerabilities in the full and production-only locked dependency graphs. |
| Browser E2E | `npm run test:e2e` | BLOCKED BY ENVIRONMENT after resetting/seeding only `prisma/e2e.db` and discovering exactly two tests: Playwright could not find its Chromium executable under `/root/.cache/ms-playwright/`. SHA-256 of `prisma/dev.db` was identical before/after the command. |
| Browser install | `npx playwright install chromium` | BLOCKED BY ENVIRONMENT: the primary CDN timed out after 30 seconds; the alternate Microsoft mirror returned HTTP 400 `GatewayException`, and a retry timed out. |

The Playwright source was still upgraded and rewritten. It covers product creation, deterministic DM stages, attributed `LAUNCH20` checkout, snapshotted order/download, analytics attribution, flow export, invalid import, and cross-origin rejection. GitHub Actions installs Chromium and runs this suite on Ubuntu, but that remote workflow was not executed in this local session.

## Remaining limitations

- The flow pack selects scripts globally; scripts are not yet related to a specific flow/campaign in the database.
- The state machine is deterministic and reusable but not yet represented as persisted nodes/conditions/transitions or a visual editor.
- Orders currently reach `delivered` synchronously because both adapters are local; abandoned/pending/refunded failure paths are not implemented.
- Coupons are seeded and enforced but do not yet have management UI.
- Analytics provide a fixed rolling seven-day window rather than selectable/cohort windows.
- SQLite/local uploads assume one trusted writable process and do not support horizontal deployment.
- Offline/PWA caching is intentionally disabled; the manifest remains useful for metadata/install surfaces, but dynamic/private application state is network/local-server only.
- There is no live Meta/WhatsApp/TikTok, Stripe/Lemon Squeezy, email, tax, refund, inventory, webhook, object-storage or background-job integration.
- The two README images predate this revival; refreshed capture infrastructure and current screenshots are still useful follow-up work.
- Local Playwright execution remains unverified until Chromium can be installed.

## Recommended next milestone

Build a persisted, revisioned flow graph with campaign-specific step ownership and an execution trace, then route delivery through an authenticated one-time download endpoint. Those two changes deepen the project's distinctive “inspectable local DM-to-delivery loop” while removing its most important data-model and hosted-demo trust limitations. Commits 01–06 in [NEXT_20_COMMITS.md](NEXT_20_COMMITS.md) sequence that work before any real external provider is attempted.
