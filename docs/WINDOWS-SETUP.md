# Windows Setup Guide for DM Commerce OS

This guide is specifically designed for Windows users to navigate common setup issues like dependency conflicts and database configuration.

## Prerequisites

- **Node.js**: Version 18 or 20. Run `node -v` to check.
- **Git**: Installed and available in PowerShell/CMD.
- **PowerShell**: Recommended shell for running these commands.

## Step-by-Step Installation

### 1. Install Dependencies

Windows environments often encounter peer dependency conflicts with ESLint. Use the `--legacy-peer-deps` flag to bypass this.

```powershell
npm install --legacy-peer-deps
```

### 2. Configure Environment

Create a `.env` file in the root directory of the project. We will use SQLite for the simplest local setup.

```env
# .env
APP_SECRET="any_long_random_string_at_least_32_chars"
DATABASE_URL="file:./dev.db"
SEED_ON_DEPLOY=true
```

> **Note:** The `DATABASE_URL` uses `file:./dev.db` to create a local SQLite database file, avoiding the need for a separate PostgreSQL server.

### 3. Initialize Database

We need to generate the Prisma client, create the database tables, and seed it with demo data.

```powershell
# 1. Generate the Prisma Client (fixes "Product is not defined" errors)
npm run prisma:generate

# 2. Create the database tables (creates dev.db)
npx prisma migrate dev --name init

# 3. Seed the database with the demo user and products
npm run db:seed
```

### 4. Start the Application

```powershell
npm run dev
```

The app should now be running at **http://localhost:3000**.

## Login Credentials

- **Email:** `demo@local.test`
- **Password:** `demo123`

## Troubleshooting Common Issues

### "Login temporarily unavailable"
**Cause:** The application cannot connect to the database.
**Fix:** Ensure your `.env` has `DATABASE_URL="file:./dev.db"` and that you ran `npm run db:seed`.

### "Product is not defined"
**Cause:** The Prisma Client types haven't been generated.
**Fix:** Run `npm run prisma:generate` and restart your VS Code / dev server.

### "FormLabel or FormMessage must be used within a FormItem"
**Cause:** A UI component structure issue in the Settings tab.
**Fix:** This has been patched in the latest codebase. If you see it, ensure your `src/components/dashboard/settings-tab.tsx` wraps the Logo input in a `<FormField>`.

### Icons missing or "Module not found"
**Cause:** Library version mismatches (e.g., `lucide-react` renaming icons).
**Fix:** We have updated the code to use `BarChart3` instead of `ChartLine` and `PieChart` instead of `ChartPie`. Ensure you have run `npm install --legacy-peer-deps`.
