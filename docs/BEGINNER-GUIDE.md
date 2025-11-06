DM-Commerce-OS Beginner Install Kit
Quick 3-Step Setup (Recommended)

Get the code: Clone with Git or download the ZIP and extract it.

From the project folder:

pnpm run setup
# or
npm run setup


Start the app:

pnpm dev
# or
npm run dev


Then open http://localhost:3000/login
 and sign in with demo@local.test
 / demo123.

What you're installing

DM-Commerce-OS is a local sandbox that shows the full "DM to checkout" funnel. You get a seeded SQLite database, demo auth, and a polished Next.js dashboard so you can practice without touching production services.

Before you start

Supported systems: Windows 10/11, macOS 13+, or Ubuntu 22.04+.

Requirements: Node.js 18 or newer, an internet connection, and enough disk space for Node packages.

Optional: Git for cloning. Downloading the ZIP works the same.

💡 Tip: On Windows, run all commands in PowerShell. On macOS/Linux, use Terminal.

Option A — One-Click Setup (Recommended)
Windows (PowerShell)
# Inside the DM-Commerce-OS folder
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
pnpm run oneclick
# or, if you only have npm installed
npm run oneclick

macOS / Linux (Terminal)
# Inside the DM-Commerce-OS folder
pnpm run oneclick
# or
npm run oneclick


What the setup script does

Checks your Node.js version (requires 18+, warns if >22).

Ensures .env.local exists by copying .env.example, generating a secure APP_SECRET, and making sure DATABASE_URL="file:./prisma/dev.db" is present.

Detects pnpm (falls back to npm) and installs dependencies.

Generates the Prisma client, creates the initial migration if it’s missing, applies migrations, and runs the seed.

Prints the exact command to start the dev server and where to log in.

Option B — Manual Install

Get the code: Clone (git clone https://github.com/constripacity/DM-Commerce-OS.git) or download the ZIP and extract it.

Install Node packages: pnpm install (or npm install).

Create your env file: Copy .env.example to .env.local and set APP_SECRET=<any-long-random-string>.

Generate Prisma client & run migrations: pnpm prisma generate && pnpm prisma migrate dev -n init (or npm run prisma:generate then npm run prisma:migrate -- --name init).

Seed demo data: pnpm db:seed (or npm run db:seed).

Start the dev server: pnpm dev (or npm run dev) and open http://localhost:3000/login.

Log in: Email demo@local.test / password demo123.

Verify it works

Visit http://localhost:3000/login.

Log in with demo@local.test / demo123.

Explore the dashboard tabs (Products, Orders, DM Studio, Campaigns, Analytics, Settings) to confirm seeded data is visible.

Common errors & quick fixes
Symptom	Quick fix
Node version is too old	Install Node.js 18+ (use nodejs.org
 or a version manager), restart your terminal, then rerun the command.
PowerShell blocked the script	Run Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force in the same PowerShell window and try again.
Port 3000 already in use	Stop other dev servers or let the bootstrap script rerun and it will switch to PORT=3001. You can also start manually with PORT=3001 pnpm dev.
pnpm not installed	The scripts try corepack enable pnpm automatically. If it fails, install pnpm (npm install -g pnpm) or rerun using npm (npm run oneclick).
Playwright dependency errors	These are for end-to-end tests. Skip for now or run pnpm run test:install later if you need Playwright.
OpenSSL missing	The setup falls back to Node’s crypto.randomBytes, but install OpenSSL if you want command-line secret generation.
Reset / Uninstall

Reset demo data: pnpm run reset:demo (or npm run reset:demo) wipes the SQLite DB, regenerates Prisma client, and reseeds demo content.

Full cleanup: Delete node_modules/ and prisma/dev.db, then rerun Option A to reinstall everything.

Where files live

Database: prisma/dev.db (SQLite file created on install).

Downloads served to users: public/files.

Environment secrets: .env.local (keep this out of version control).

FAQ

Do I need Git?
No. The scripts detect ZIP installs just fine. Git only helps if you want to pull updates later.

Can I use the ZIP download instead of cloning?
Yes. Extract the ZIP, open the folder in PowerShell/Terminal, and follow Option A or B.

Where do the downloaded files go?
They live in the public/files folder so the fake checkout can serve them immediately after purchase.

Can I rerun the one-click command?
Absolutely. All scripts are idempotent and will reuse existing installs, only fixing what’s missing.

How do I stop the dev server?
Press Ctrl+C in the terminal window that’s running pnpm dev/npm run dev.