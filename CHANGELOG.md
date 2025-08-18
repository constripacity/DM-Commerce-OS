# Changelog

## Unreleased

- Implemented theme toggle (Light / Dark / Pastel) using CSS variables and body theme classes.
- Added a visible ThemeToggle button with inline SVG icons (avoided external @heroicons/react import to prevent runtime crash).
- Introduced subtle page animations using Framer Motion for calm transitions.
- Updated Tailwind config to map CSS variables to utility names (bg, text, accent).
- Fixed a white-screen rendering issue caused by external icon imports and invalid JSX — app now loads correctly.
- Committed changes on branch `codex/add-frontend-only-sandbox-screen` (commit `bc2871c`) and pushed to remote.

### Notes
- Heroicons were replaced with inline SVGs to ensure stability. They can be reintroduced later with guarded/dynamic imports if desired.
- Manual verification performed: Vite dev server starts and application renders; theme switching works and transitions are smooth.

### Next steps (suggested)
- Create a Pull Request from `codex/add-frontend-only-sandbox-screen` into `main`.
- Add a short README / docs entry describing the theme tokens and how to extend themes.
- Optionally reintroduce heroicons via guarded/dynamic imports if runtime permits.
- Add automated tests for ThemeToggle behavior and visual regression checks.
