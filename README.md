# DM Commerce OS — Offline DM-to-Checkout Simulator

DM Commerce OS is a self-contained Next.js application that demos how a creator can sell a digital download without touching any external API. It ships with demo auth, a DM simulator, fake checkout that creates orders, analytics, and brand settings — all backed by SQLite and Prisma seed data.

## Overview

- **End-to-end funnel** – Campaign posts drive a DM keyword that activates scripted auto-replies, leading to checkout and delivery.
- **DM Studio** – Chat simulator powered by a state machine that stitches together pitch, qualify, checkout, objection, and delivery scripts.
- **Products & orders** – CRUD interface with validation and instant fake checkout that unlocks the downloadable PDF.
- **Campaign tooling** – Manage campaigns and export CSV content (10 posts + 10 stories) with hooks and CTA "DM {keyword}".
- **Analytics & settings** – Seeded funnel metrics blended with live order data plus branded dashboard theming with logo upload.
- **Offline & educational** – SQLite database with Prisma seed script, no third-party APIs, and Playwright coverage for the primary happy path.

## Tech Stack

- **Web**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react
- **Server**: Next.js route handlers, Zod validation, bcryptjs for the demo password
- **Data**: Prisma ORM + SQLite (`prisma/dev.db`)
- **Testing**: Playwright end-to-end suite

## Quickstart

🚀 **First stop:** the [Beginner Install Kit](docs/BEGINNER-GUIDE.md) walks through the guided setup script, troubleshooting, and screenshots.

### Quick 3-step launch

1. **Provision everything:**

   ```bash
   pnpm run setup
   # or
   npm run setup
   ```

2. **Start the dev server:**

   ```bash
   pnpm dev
   # or
   npm run dev
   ```

3. **Explore the sandbox:** Visit `http://localhost:3000/login` and sign in with the demo credentials below.

> 🔐 Prefer to wire things up manually? Copy `.env.example` to `.env.local`, set `APP_SECRET` to any long random string, and make sure `DATABASE_URL="file:./prisma/dev.db"` is present before running Prisma commands.

### Manual install (if you prefer step-by-step)

```bash
# Install dependencies
pnpm install
# or
npm install

# Prepare environment
cp .env.example .env.local

# Generate client & apply migrations
pnpm prisma generate
pnpm prisma migrate dev --name init

# Seed demo data
pnpm db:seed

# Run the app
pnpm dev
```

Replace `pnpm` with `npm run`/`npm exec` equivalents if you do not have pnpm installed.

### Demo Credentials

- Email: `demo@local.test`
- Password: `demo123`

## Key Features

| Area | Highlights |
| --- | --- |
| **Products** | CRUD with Zod validation, price helper, toast feedback, and simulated checkout modal |
| **Orders** | Filterable table with date bounds and instant download link pointing to `/public/files/*.pdf` |
| **DM Studio** | Campaign/product selectors, script previews with variables, state-machine auto replies, checkout modal, and delivery follow-up |
| **Campaigns** | CRUD + CSV export (10 posts & 10 stories) covering transformation, quick tips, myths, and checklists |
| **Scripts Library** | Categorised templates with variable chips (`{{product}}`, `{{price}}`, `{{keyword}}`) and live preview |
| **Analytics** | Seeded funnel metrics plus live order totals, sparkline SVG chart, and pipeline summary |
| **Settings** | Brand name + color editor and local logo upload saved to `/public/uploads` |

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run setup` / `pnpm run setup` | Guided install (env, deps, migrations, seed) |
| `npm run dev` / `pnpm dev` | Start Next.js in development mode |
| `npm run build` / `npm start` | Production build & start |
| `npm run lint` | Run Next.js linting |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run prisma:generate` | Generate the Prisma client |
| `npm run prisma:migrate` | Run `prisma migrate dev` |
| `npm run db:seed` | Execute `prisma/seed.ts` via `tsx` |
| `npm run test:install` | Install Playwright browser dependencies |
| `npm run test:e2e` | Run the Playwright flow (spins up dev server automatically) |
| `npm run test:e2e:ui` | Launch the Playwright test runner UI |
| `npm run scan:sensitive` | Scan the repo for secrets before pushing |
| `npm run sanitize` | Strip sensitive data from exported conversations |

## Testing

Playwright global setup resets the database with `prisma migrate reset --force --skip-generate` and then reruns `db:seed` to guarantee a clean SQLite file. The main scenario covers:

1. Logging in with the demo account
2. Creating a product
3. Running the DM Studio flow (keyword → qualify → checkout → delivery)
4. Simulating checkout and verifying the order download link

View or edit the test at [`tests/e2e.spec.ts`](tests/e2e.spec.ts).

## Data & Seeds

`prisma/seed.ts` provisions:

- Demo user with bcryptjs-hashed password (`demo123`)
- Two products with local PDFs (`/public/files/creator-guide.pdf`, `/public/files/checklist.pdf`)
- Six DM scripts spanning pitch, qualify, objections, checkout, and delivery
- One campaign with keyword `GUIDE`
- Settings row for brand defaults (`DM Commerce OS`, `#6366F1`)
- Six historical orders to power analytics trend lines

Run `npx prisma migrate reset --force` followed by `npm run db:seed` (or the `pnpm` equivalents) anytime you want to rebuild the SQLite database.

## Screenshots to Capture

Place exported images in `/public/screenshots/`:

- `login.png`
- `dashboard.png`
- `products.png`
- `dm-studio.png`
- `checkout.png`
- `orders.png`
- `analytics.png`

## Loom Script

A 90-second narration script lives in [`docs/loom-script.md`](docs/loom-script.md).

## What’s Simulated vs Real

| Real | Simulated |
| --- | --- |
| Authenticated session via signed HTTP-only cookie | Payments, email delivery, social DM APIs |
| File delivery via local `/public/files/*` | External storage or CDN |
| Prisma-backed persistence | Any third-party analytics or webhook integrations |

## What I Learned

- Designing a reusable DM state machine that plugs in campaign/product variables cleanly.
- Pairing seeded analytics with live data so demos feel dynamic while remaining offline.
- Using Playwright with Next.js App Router by spinning up the dev server through `webServer` config and seeding via global setup.

## License

MIT License — see the [LICENSE](LICENSE) file if present. This project is built for portfolio and educational purposes only; it is not intended for production commerce.
