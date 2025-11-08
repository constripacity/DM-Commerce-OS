# DM-Commerce-OS Beginner Install Kit

## Quick 3-Step Setup (Recommended)
1. **Get the code:** Clone with Git or download the ZIP and extract it.
2. **From the project folder:**

    ```bash
    pnpm run setup
    # or
    npm run setup
    ```
3. **Start the app:**

    ```bash
    pnpm dev
    # or
    npm run dev
    ```

Then open http://localhost:3000/login and sign in with demo@local.test / demo123.

## What you're installing
DM-Commerce-OS is a local playground that shows the full "DM to checkout" funnel. You get a seeded SQLite database, demo auth powered by cookies, and a polished Next.js dashboard so you can explore without touching any production services.

## Before you start
- **Supported systems:** Windows 10/11, macOS 13+, Ubuntu 22.04+.
- **Requirements:** Node.js 18 or newer, internet access, and room for Node dependencies.
- **Optional:** Git. Downloading and extracting the ZIP works exactly the same.

> 💡 On Windows use **PowerShell**. On macOS/Linux use **Terminal**.

## Option A — Guided Setup (Recommended)
### Windows (PowerShell)
```powershell
# Inside the DM-Commerce-OS folder
pnpm run setup
# or, if you only have npm installed
npm run setup
```

### macOS / Linux (Terminal)
```bash
# Inside the DM-Commerce-OS folder
pnpm run setup
# or
npm run setup
```

**What the setup script does**
1. Checks your Node.js version (requires 18+, warns if >22).
2. Ensures `.env.local` exists by copying `.env.example`, generating a secure `APP_SECRET`, and making sure `DATABASE_URL="file:./prisma/dev.db"` is present.
3. Detects `pnpm` (falls back to `npm`) and installs dependencies.
4. Generates the Prisma client, creates the initial migration if it’s missing, applies migrations, and runs the seed.
5. Prints the exact command to start the dev server and where to log in.

## Option B — Manual Install
1. **Get the code:** Clone (`git clone https://github.com/constripacity/DM-Commerce-OS.git`) or download the ZIP and extract it.
2. **Install dependencies:** `pnpm install` (or `npm install`).
3. **Create your env file:**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` so that it contains:
   ```env
   APP_SECRET=<any long random string>
   DATABASE_URL="file:./prisma/dev.db"
   ```
4. **Generate Prisma client:** `pnpm prisma generate` (or `npm run prisma:generate`).
5. **Run migrations:** `pnpm prisma migrate dev --name init` (or `npm run prisma:migrate -- --name init`). If the migration already exists, run `pnpm prisma migrate deploy` instead.
6. **Seed demo data:** `pnpm db:seed` (or `npm run db:seed`).
7. **Start the dev server:** `pnpm dev` (or `npm run dev`) and open http://localhost:3000/login.
8. **Log in:** Email `demo@local.test` / password `demo123`.

## Verify it works
- Visit http://localhost:3000/login.
- Sign in with `demo@local.test` / `demo123`.
- Explore the dashboard tabs (Products, Orders, DM Studio, Campaigns, Analytics, Settings) to confirm seeded data appears.

## Common errors & quick fixes
| Symptom | Quick fix |
| --- | --- |
| **Node version is too old** | Install Node.js 18+ from [nodejs.org](https://nodejs.org/), reopen your terminal, then rerun the setup command. |
| **PowerShell blocked the script** | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force` in the same PowerShell window and retry. |
| **pnpm not installed** | The script falls back to npm automatically. If you prefer pnpm, install it via `corepack enable pnpm` or `npm install -g pnpm`. |
| **.env.local missing or blank** | Re-run `pnpm run setup` (or copy `.env.example` manually) to regenerate `.env.local` with `APP_SECRET` and `DATABASE_URL`. |
| **Port 3000 already in use** | Stop other dev servers or run `PORT=3001 pnpm dev` (or `npm run dev -- --port 3001`) and use the printed URL. |
| **Prisma migrate errors** | Delete `prisma/dev.db`, rerun `pnpm run setup`, or run `pnpm prisma migrate reset --force` followed by `pnpm db:seed`. |
| **Playwright dependency errors** | These relate to optional end-to-end tests. Skip for now or run `pnpm run test:install` later if you need them. |

## Reset / Uninstall
- **Reset demo data:** `pnpm prisma migrate reset --force` then `pnpm db:seed` (use `npm exec prisma migrate reset -- --force` / `npm run db:seed` if you’re on npm).
- **Full cleanup:** Delete `node_modules/` and `prisma/dev.db`, then rerun Option A to reinstall.

## Where files live
- **Database:** `prisma/dev.db` (SQLite file generated locally).
- **Downloads served to users:** `public/files`.
- **Environment secrets:** `.env.local` (keep this file private).

## FAQ
**Do I need Git?**
No. Downloading the ZIP and extracting it works perfectly.

**Can I use the ZIP download instead of cloning?**
Yes. Extract the ZIP, open the folder in PowerShell/Terminal, and run the same commands listed above.

**Where do the downloaded files go?**
They live in the `public/files` folder so the fake checkout can deliver them instantly.

**Can I rerun the setup command?**
Absolutely. The script is idempotent—it will reuse existing installs and only fix what’s missing.

**How do I stop the dev server?**
Press `Ctrl+C` in the terminal that’s running `pnpm dev` / `npm run dev`.
