# Architecture

DM Commerce OS is a single-process Next.js application with a local SQLite database, committed synthetic deliverables under `public/files`, and private runtime logo storage under `var/uploads/logos`. Its primary design goal is an inspectable, no-key path from an inbound DM decision to attributed digital fulfillment.

## Runtime map

| Layer | Main modules | Responsibility |
| --- | --- | --- |
| UI | `src/app/dashboard`, `src/components/dashboard` | Catalog, campaign, conversation, checkout, order, analytics, flow, and settings interactions |
| HTTP boundary | `src/app/api/**/route.ts` | Authentication, same-origin mutation policy, parsing, validation, status codes |
| Domain | `src/lib/stateMachines/dmFlow.ts`, `src/lib/commerce/*`, `src/lib/flow-packs.ts` | Deterministic decisions, price rules, checkout orchestration, provider contracts, portable schemas |
| Event ledger | `src/lib/events.ts` | Stable event names and compact property serialization |
| Reporting | `src/lib/analytics.ts` | Rolling funnel, time-to-checkout, revenue, product mix, and campaign attribution over real rows |
| Persistence | `prisma/schema.prisma`, `prisma/migrations` | SQLite models, constraints, indexes, and reproducible schema evolution |
| Fixtures | `src/lib/demo-reset.ts`, `prisma/seed.ts` | Coherent, resettable golden demo |

## Golden path and events

1. DM Studio selects a campaign and product, then persists user and assistant messages.
2. The deterministic flow classifies boundary-aware intent and chooses a stage/template.
3. Message handling records conversation, message, flow-stage, and objection events with session/campaign/product identifiers.
4. The checkout service resolves product/campaign/coupon, calls typed providers, snapshots money fields, upserts the customer, and writes the order.
5. Checkout, order, and delivery events share the order/session/campaign/product identifiers.
6. Analytics reads the seven-day window from the order and event ledger; no synthetic impression baseline is mixed in.

The event table is append-only by application convention. Demo reset is the explicit exception: it deletes fixture history before rebuilding a known scenario.

## Provider boundary

`PaymentProvider` accepts amount, currency, and customer email, and returns a provider name plus reference. `DeliveryProvider` accepts a delivery path/customer and returns a verified delivery result. The default implementations are deliberately named `MockPaymentProvider` and `LocalFileDeliveryProvider`.

Replacing a provider should not move pricing, coupon, customer, order, or event rules into the adapter. A production adapter would also require idempotency, asynchronous failure states, webhook verification, retry policy, and secret management; those are not present today.

## Data invariants

- Product prices are positive integer cents.
- Orders snapshot subtotal, discount, and total rather than calculating history from the current product price.
- Coupon codes are normalized; percentage/fixed discounts never produce a negative total.
- A customer email is unique and normalized at checkout.
- Campaign attribution is an optional foreign key on both orders and events.
- Delivery paths come from catalog products and must resolve to regular `.pdf` files under `public/files`.
- Flow packs declare `schemaVersion: 1`, unique step IDs and database script names, a constrained keyword, and the required pitch/qualify/checkout/delivery stages.

## Security boundary

`auth.ts` signs an identifier, expiry, and nonce with HMAC-SHA256; comparisons are timing-safe. Dashboard middleware and API route handlers verify the cookie. Every mutation route additionally calls the request-origin policy. The design intentionally permits metadata-free local CLI calls, while modern cross-site browser submissions are rejected and the cookie is `SameSite=Lax`.

Untrusted content is bounded and validated before persistence where feasible. Logo uploads require a known request length, use a 2 MB file limit, structural signatures, canonical UUID filenames, a real non-linked private directory, exclusive file creation, and managed-path cleanup. The authenticated logo route reopens without following links, bounds the descriptor read, revalidates the signature, and serves only the currently referenced file. Flow JSON is size- and schema-limited. Local file listing rejects directories and symbolic links by accepting regular directory entries and checking `lstat`.

The previous catch-all service worker cache is retired by both a no-fetch tombstone worker and client-side unregister/cache cleanup. API, dashboard, navigation, delivery, and upload responses are never intercepted for offline replay.

## Local storage consequences

SQLite and `var/uploads/logos` are excellent for a forkable demo but assume one trusted process and one writable filesystem. They do not provide shared storage, horizontal scaling, backup automation, or multi-tenant isolation. Adopting a remote database/object store is an architectural project, not an environment-variable-only deployment change.

## Tests

- Vitest covers flow intent boundaries, coupon math/eligibility, signed sessions/origin checks, private upload validation/serving, deterministic reset, fixture PDFs, E2E database isolation, browser-cache retirement, and flow-pack constraints/atomic rejection.
- Playwright covers the full attributed DM → discounted checkout → local delivery → analytics loop plus flow export and rejected unsafe imports.
- `scripts/smoke.ts` probes the running API with a real session and verifies anonymous/cross-origin rejection. Its explicit `--production` mode additionally uploads and byte-checks a runtime logo, proves no static bypass, creates temporary data, and restores exact golden counts.
