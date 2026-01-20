# Security Operations Guide

DM Commerce OS ships with repeatable tooling to surface and clean sensitive data before publishing portfolio builds. This document explains how to run the scan, interpret reports, sanitize findings, and (optionally) sweep Git history.

## 1. Run the Sensitive Data Scan

```bash
pnpm scan:sensitive
# or
npm run scan:sensitive
```

The scan inspects the working tree (excluding `.git`, `.next`, `node_modules`, `public/screenshots`, and `prisma/dev.db`) for:

- Private keys
- JWT or opaque bearer tokens
- Generic API keys / secrets / passwords
- Environment variables accidentally committed (except `.env.example`)
- Personal-looking emails (excluding `demo@local.test`)
- Large or binary files needing manual review
- CSV/JSON files with ≥100 rows containing PII columns

### Output

- Console table of the top 50 hits (path, line, type, snippet)
- `scan-report.json` with the full finding list (`matchText` contains the raw match)

Use `--json` for machine-readable output, or `--pattern "<regex>"` to add a custom detector on demand.

## 2. Sanitize Findings

Review `scan-report.json` first. When ready:

```bash
pnpm sanitize -- --redact          # replace inline secrets with REDACTED
pnpm sanitize -- --delete --redact # delete non-essential files & redact code
pnpm sanitize -- --interactive ... # prompt before each change
```

Sanitization rules:

- Always creates backups under `.sanitized-backup/<timestamp>/...`
- Keeps required demo assets (e.g., `/public/files/*.pdf`, `.env.example`, source files)
- For code, only the secret value is replaced by `REDACTED`

## 3. Optional Git History Sweep

If a leaked secret ever landed in history, follow [`scripts/history-sweep.md`](scripts/history-sweep.md) to:

1. Create a safety branch
2. Run gitleaks or truffleHog across history
3. Rewrite commits with `git filter-repo`
4. Force-push once validated

## 4. Best Practices

- Re-run `pnpm scan:sensitive` before every push (hooked to `prepush`)
- Store real secrets outside the repository
- Rotate any secret discovered in history, even after removal
- Document incidents and mitigation steps for future reference

## 5. Reporting

For security concerns or findings needing escalation, add notes to `scan-report.json`, commit the sanitized state, and highlight risks in the PR description.
