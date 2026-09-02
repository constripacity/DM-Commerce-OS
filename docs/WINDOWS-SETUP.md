# Windows setup

Use PowerShell with an active Node.js LTS line (20.19+, 22.13+, or 24+). The repository uses npm and a committed lockfile; `--legacy-peer-deps` is not required.

## Guided setup

From the repository root:

```powershell
npm run setup
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and use `demo@local.test` / `demo123`.

## Manual setup

```powershell
Copy-Item .env.example .env
```

Edit `.env` so it contains a unique secret:

```env
APP_SECRET=replace-with-at-least-32-random-characters
DATABASE_URL="file:./dev.db"
```

Then run:

```powershell
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm run db:seed
npm run dev
```

Although the environment URL says `file:./dev.db`, Prisma resolves it from `prisma/schema.prisma`; the generated file is `prisma/dev.db`.

## Optional one-click launcher

The platform script also installs, migrates, seeds, starts the app, and offers to open the browser:

```powershell
npm run setup:win
```

If local execution policy blocks scripts for this PowerShell session:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
npm run setup:win
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `DATABASE_URL` is missing | Use root `.env`, not `.env.local`; rerun `npm run setup`. |
| Prisma client types are missing | Run `npm run prisma:generate`, then restart the editor and dev server. |
| Tables do not exist | Run `npm run prisma:migrate:deploy` and `npm run db:seed`. |
| Port 3000 is busy | Run `npm run dev -- --port 3001`. |
| Playwright Chromium is missing | Run `npm run test:install`, then `npm run test:e2e`. |

Do not configure a PostgreSQL URL without first changing the Prisma provider and migrations. The supported default is local SQLite.
