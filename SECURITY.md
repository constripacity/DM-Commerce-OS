# Security policy

## Supported scope

Security fixes are applied to the current `main` branch. DM Commerce OS is a local development sandbox: it uses public demo credentials, SQLite, local files, and an explicit mock payment provider. Do not expose the demo unchanged to the public internet or use it to handle real payments, secrets, or customer data.

## Report a vulnerability

Please use GitHub's **Security → Report a vulnerability** private reporting flow for this repository. If private vulnerability reporting is unavailable, open a minimal issue asking the maintainer for a private contact channel; do not include exploit details, tokens, personal data, or a proof of concept in a public issue.

Include, when possible:

- affected revision and component;
- impact and realistic attack conditions;
- concise reproduction steps using synthetic data;
- suggested mitigation; and
- whether the issue is already public.

Please allow a reasonable period for triage and remediation before disclosure. Never test against systems or data you do not own or have permission to assess.

## Current trust boundaries

- Dashboard pages and API reads require a valid signed, expiring session cookie.
- State-changing routes also reject cross-site browser requests using Origin/Fetch Metadata checks.
- The published demo password is not a production identity system.
- Logo uploads require a bounded request length, are limited to 2 MB, use canonical generated names, validate PNG/JPEG/WebP structure, live outside `public`, and are served only through the authenticated current-logo route.
- Product delivery is limited to regular PDF files under `public/files`.
- Flow imports are limited to 100 KB and parsed through a versioned Zod schema.
- Payment and delivery providers are local implementations; no external transaction occurs.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the detailed data and request boundaries.

## Repository hygiene

Run the local scanner before publishing changes:

```bash
npm run scan:sensitive
```

The scanner asks Git for tracked files plus untracked, non-ignored files, then applies the narrow project ignore/allow rules. A normal Git-ignored `.env`, database, build, test, log, backup, or dependency artifact is therefore not inspected, while a mistakenly tracked `.env*` is still scanned. The command fails closed outside a Git working tree instead of traversing unknown local state.

On a completed scan it atomically writes Git-ignored `scan-report.json`, with owner-only `0600` permissions on POSIX, and prints the finding count. Text matches are represented by redacted labels and digest-bound locations; raw secret/email/token values are never written to the console or report. Exit `0` means no candidates, exit `2` means candidates were found, and exit `1` means the scan could not complete; `--no-fail` is available only for intentional report-only review. Do not commit the report even though its values are redacted.

To sanitize an intentional export, first review the report, then use the narrowest appropriate mode:

```bash
npm run sanitize -- --redact
```

Sanitization writes a timestamped local backup. If a real secret entered Git history, rotate it first; history rewriting alone does not invalidate a credential. The optional procedure is documented in [scripts/history-sweep.md](scripts/history-sweep.md).

## Baseline checks

Before submitting a security-related change, run:

```bash
npm run lint
npm run typecheck
npm run validate:fixtures
npm test
npm run build
```

Add a regression test that fails without the fix and uses only synthetic inputs.
