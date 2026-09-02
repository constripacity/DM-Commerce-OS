# Contributing

Thank you for improving DM Commerce OS. The project welcomes focused bug fixes, tests, documentation corrections, and product changes that preserve its local-first, inspectable DM-commerce loop.

## Ground rules

- Keep the default demo usable without API keys, Docker, or hosted services.
- Make simulated boundaries explicit; do not imply mock payments or local delivery are production integrations.
- Put business rules in `src/lib` and keep route handlers thin.
- Validate untrusted input at the server boundary.
- Preserve append-only commerce events when adding funnel behavior.
- Avoid unrelated formatting or generated files in a change.

## Local workflow

```bash
npm run setup
npm run dev
```

Before opening a pull request:

```bash
npm run lint
npm run typecheck
npm run validate:fixtures
npm test
npm run build
```

For browser behavior, also run:

```bash
npm run test:install
npm run test:e2e
```

## Pull requests

A useful pull request includes:

- the user-visible problem and intended outcome;
- the smallest coherent implementation;
- unit or browser regression coverage;
- migration and seed changes when the data model changes;
- updated README/docs for altered commands or claims; and
- screenshots only when visual behavior materially changes.

Do not commit `.env`, `prisma/dev.db`, `prisma/e2e.db`, `var/`, `.next`, `node_modules`, Playwright output, scan reports, or personal data.

## Security issues

Do not open a public issue containing vulnerability details. Follow [SECURITY.md](SECURITY.md).
