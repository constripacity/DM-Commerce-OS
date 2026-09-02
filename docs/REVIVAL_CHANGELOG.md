# Revival changelog

All changes below were made during the 2026-09-02 revival session and describe the delta from starting revision `82b25c5` to the delivered `0.2.0` working tree.

## Added

- Normalized customers and coupons, attributed/snapshotted orders, and an indexed append-only commerce event ledger.
- A committed SQLite migration that preserves existing buyers/orders while introducing the new commerce models.
- Integer-cent percentage/fixed coupon rules with activation windows, redemption caps and concurrency-aware increments.
- Typed payment and delivery provider contracts with honest mock-payment and verified local-file adapters.
- A checkout domain service connecting customer, campaign, session, coupon, payment, delivery, order and event behavior.
- Versioned portable flow packs with required-stage, unique-step, and unique-database-script validation, authenticated JSON import/export and dashboard controls.
- Event-backed seven-day analytics for conversations, qualification, checkouts, deliveries, conversion, revenue, objections, time-to-checkout, product mix and campaign attribution.
- A real seven-day revenue summary on the dashboard.
- A coherent no-key golden demo containing two products, two campaigns, six scripts, six customers/orders, objection paths, coupon usage and attributed events.
- Vitest configuration and 45 unit/regression tests across flow intent, coupon pricing, flow-pack atomicity, sessions, request origin, private uploads, deterministic reset, PDF fixtures, browser cache retirement, E2E database safety, scanner/privacy runtime, safe sanitization, setup permissions, and CRUD errors.
- Valid synthetic one-page Creator Guide and Launch Checklist PDF delivery fixtures with structural/`pdfinfo` validation.
- An authenticated current-logo route backed by private `var/uploads/logos` runtime storage.
- An authenticated HTTP smoke runner for primary APIs and negative security cases.
- GitHub Actions quality/build and Chromium E2E jobs.
- A current architecture guide and contributing guide.

## Changed

- Upgraded Next.js from the vulnerable 14.x line to 16.3.4 and adopted async cookies, async route parameters, typed routes and the `src/proxy.ts` convention.
- Kept React/ReactDOM 18.3.1 after verifying it is in Next 16.3.4's supported peer range.
- Upgraded Playwright, Vitest and the TypeScript-resolved toolchain; replaced `next lint` with flat-config ESLint.
- Raised supported Node runtimes to active lines compatible with Next/Vite: 20.19+, 22.13+, or 24+.
- Expanded Prisma schema indexes and order queries to use purchase-time totals rather than current product prices.
- Reworked DM intent detection to token-boundary signals, stage-aware configured-keyword entry, and ordinary objection/purchase/checkout priority after pitch.
- Persisted stage markers so a conversation can reconstruct deterministic progress.
- Carried campaign/product/session attribution through DM messages, checkout, orders and reporting.
- Updated order, product, script, DM Studio and analytics interfaces to surface coupons, attribution, snapshots and flow portability.
- Replaced remote Google Font loading with local/system font fallbacks for a reliable offline start.
- Bumped the package version to `0.2.0`.

## Fixed

- Corrected the merge-conflict checker so inline documentation examples and the checker's own source are not false positives.
- Resolved the clean-install ESLint peer conflict.
- Made `npm run setup` install dependencies before importing `tsx`.
- Standardized setup on root `.env` and `DATABASE_URL="file:./dev.db"`, which correctly creates `prisma/dev.db`.
- Made setup replace every documented placeholder, reject the public placeholder at runtime, and create/restrict `.env` to owner-only `0600` permissions on POSIX.
- Made package-manager detection honor the committed npm lockfile.
- Removed the seed-only-on-deploy gate and the reset command's contradictory prompt to delete the freshly seeded database.
- Made Settings reset delete mutable catalog/config/conversation/commerce rows and rebuild exact golden fixtures inside one transaction; repaired npm flag forwarding in the CLI reset wrapper.
- Rejected duplicate flow-pack script names before any writes so one stage cannot overwrite another or poison later export.
- Moved Playwright resets from the developer database to hard-guarded `prisma/e2e.db` and disabled unsafe existing-server reuse.
- Replaced the stale/private catch-all service-worker cache with a no-fetch cleanup tombstone and client unregister/cache removal.
- Mapped invalid campaign dates and common duplicate/missing/referenced Prisma mutations to stable client responses.
- Replaced malformed seeded PDFs with valid, render-verified delivery assets.
- Excluded tracked legacy UI/archive surfaces from active type/lint compilation.
- Fixed `/login` production rendering by placing `useSearchParams` below Suspense and constraining internal redirects.
- Fixed client DM persistence failures so loading indicators clear and unsaved optimistic replies roll back.
- Fixed attribution foreign-key failures to return a client validation error.
- Fixed conversion so it counts unique order sessions that originated in a DM rather than allowing direct orders to inflate the rate.
- Fixed setup/docs/README contradictions and removed the false PostgreSQL/Render recipe and screenshot placeholder list.

## Security

- Added expiring nonce-bearing HMAC sessions, timing-safe verification, malformed-cookie handling and production secret requirements.
- Applied auth to all API reads and consistent Origin/Fetch-Metadata checks to browser mutations.
- Restricted product paths and local delivery to non-hidden regular PDFs below `public/files`, without following filesystem links.
- Hardened logo handling with required request lengths, a 2 MB file cap, PNG/JPEG/WebP structural signatures, canonical UUID filenames, exclusive owner-only writes outside `public`, linked-root/file rejection, bounded descriptor reads, authenticated current-file delivery, reference-swap rejection and replacement/reset cleanup.
- Limited flow imports to 100 KB and validated their complete versioned structure.
- Upgraded/remediated production dependencies and refreshed vulnerable development-tool transitives within the existing lock constraints until both full `npm audit` and `npm audit --omit=dev` reported zero vulnerabilities.
- Replaced public vulnerability instructions with private GitHub reporting guidance and safe scan-report handling.
- Repaired the sensitive scanner's synchronous binary-detector adapter; switched its scope to Git-tracked plus untracked/non-ignored files; removed broad tracked-source exclusions; redacted value-bearing findings; made reports atomic/owner-only; and preserved digest-checked sanitization without storing matches.

## Testing

- Added unit regressions for substring intent false positives, objection priority, stage sequencing and unknown variables.
- Added coupon rounding, floor, expiry and redemption-limit cases.
- Added signed-session tamper/malformed-cookie, same/cross-origin and upload/path validation cases.
- Rewrote Playwright around the current routed UI and full DM → attributed discounted order → delivery → analytics loop.
- Added flow export, invalid import and cross-origin reset E2E assertions.
- Made Playwright global setup reset/seed a dedicated database deterministically without shell interpolation or touching developer data.
- Added a production smoke mode that uploads/fetches exact logo bytes after build, rejects anonymous/static access, validates PDF headers, creates temporary rows, and proves deterministic reset cleanup/counts.
- Added source regressions proving no service-worker fetch interception plus scanner completion, Git-ignore boundaries, report redaction, safe sanitization, and private local-file modes.

## Developer experience

- Added a one-command locked setup that installs, generates, migrates and seeds from a fresh clone.
- Corrected Unix and PowerShell bootstrap environment/database behavior.
- Added direct Prisma generate/deploy, Vitest, smoke and current lint scripts.
- Added a flat ESLint config with explicit generated/legacy exclusions; React-Compiler-only diagnostics are disabled because the project remains on React 18 without the compiler.
- Added supported Node engine metadata and consistent checks in setup, doctor and platform bootstraps.
- Added `CHECKPOINT_DISABLE=1` to local configuration so Prisma does not require its update-check endpoint during setup.
- Added `.tsbuildinfo` and all generated test/build/database paths to Git ignores.
- Removed obsolete tracked lint and TypeScript execution shims.

## Documentation

- Rewrote the README around the defensible local-first DM → decision → checkout → order → delivery → attribution loop.
- Added a truthful real-versus-simulated table, golden-demo walkthrough, architecture map, security posture, limits, commands and contribution path.
- Rewrote beginner and Windows setup instructions around npm, root `.env`, SQLite and committed migrations.
- Updated the 90-second walkthrough script to describe event-backed analytics and the current reset command.
- Added [REVIVAL_AUDIT.md](REVIVAL_AUDIT.md) with exact baseline/final evidence and remaining limits.
- Added [ARCHITECTURE.md](ARCHITECTURE.md) with module, data, provider and trust boundaries.
- Added [NEXT_20_COMMITS.md](NEXT_20_COMMITS.md) with 18 dependency-ordered future commits.
