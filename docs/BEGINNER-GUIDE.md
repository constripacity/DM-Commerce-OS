# Beginner install guide

DM Commerce OS runs locally with Node.js, npm, and SQLite. It does not require Docker, a cloud database, or API keys.

## Recommended setup

1. Install an active Node.js LTS line: 20.19+, 22.13+, or 24+.
2. Clone or download the repository and open a terminal in its root.
3. Run:

   ```bash
   npm run setup
   npm run dev
   ```

4. Open [http://localhost:3000/login](http://localhost:3000/login).
5. Sign in with `demo@local.test` / `demo123`.

The setup command:

1. checks Node.js;
2. installs dependencies from the committed npm lockfile before loading the setup helper;
3. creates `.env` from `.env.example` and generates a random `APP_SECRET`;
4. generates Prisma Client and applies committed migrations; and
5. seeds the complete demo loop.

The repository uses `package-lock.json`, so setup chooses npm even if pnpm happens to be installed globally.

## Manual setup

```bash
cp .env.example .env
```

Edit `.env`:

```env
APP_SECRET=replace-with-at-least-32-random-characters
DATABASE_URL="file:./dev.db"
```

Then run:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

Prisma resolves its relative SQLite URL from the schema directory. `file:./dev.db` therefore creates `prisma/dev.db`.

## Confirm the install

After login, the dashboard should show two products, two campaigns, six historical orders, and campaign-attributed analytics. The fastest end-to-end check is:

1. Open DM Studio.
2. Send `GUIDE`, `yes`, and `how much?`.
3. Follow the checkout button and complete a local order with `LAUNCH20`.
4. Confirm the order and download in Orders.
5. Confirm the campaign changes in Analytics.

For an automated probe, start the app and run this in a second terminal:

```bash
npm run smoke
```

## Common fixes

| Symptom | Fix |
| --- | --- |
| Node is unsupported | Install an active Node.js LTS line (20.19+, 22.13+, or 24+) and reopen the terminal. |
| `.env` is missing | Rerun `npm run setup`, or copy `.env.example` to `.env`. |
| Prisma cannot find `DATABASE_URL` | Ensure the root `.env` contains `DATABASE_URL="file:./dev.db"`. Do not use `.env.local` for Prisma CLI setup. |
| Database schema is missing | Run `npm run prisma:generate` and `npm run prisma:migrate:deploy`. |
| Login fails after setup | Run `npm run db:seed`, then retry the published demo credentials. |
| Port 3000 is busy | Run `npm run dev -- --port 3001` and use the printed URL. |
| Browser tests cannot launch | Run `npm run test:install`; Playwright downloads Chromium separately from npm packages. |

## Reset and cleanup

Reset all local demo data:

```bash
npm run reset:demo
```

To rebuild from a completely clean local state, remove `node_modules`, `.next`, and `prisma/dev.db`, then rerun `npm run setup`. These paths are ignored by Git.

## Local file map

- Environment: `.env` (private and Git-ignored)
- Database: `prisma/dev.db` (generated and Git-ignored)
- Browser-test database: `prisma/e2e.db` (generated, isolated, and Git-ignored)
- Deliverable PDFs: `public/files/`
- Managed logos: `var/uploads/logos/` (private runtime files served through `/api/uploads/...`)
- Migrations: `prisma/migrations/`

## Next steps

- Use Settings → Reset demo data whenever you want the golden fixtures back.
- Run `npm test`, `npm run lint`, and `npm run typecheck` before changing code.
- Read [ARCHITECTURE.md](ARCHITECTURE.md) before replacing a provider or extending the event vocabulary.
