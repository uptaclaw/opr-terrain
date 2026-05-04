# Project Context

- **Owner:** Brian
- **Project:** OPR Terrain — A battlefield layout planner for One Page Rules style terrain setup
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Vitest (unit tests), Playwright (e2e tests)
- **Features:** Drag-and-drop terrain editor on a gridded canvas, selection/rotation handles, named layout save/load via localStorage, auto-saved working draft, shareable URLs via hash encoding, PNG export, print-friendly sheet with terrain legend
- **Deployment:** GitHub Actions → GitHub Pages (subpath: `/opr-terrain/`)
- **Created:** 2026-05-04

## Learnings

- **2026-05-04:** Deployment switched from VM (SSH/rsync/nginx) to GitHub Pages. E2E tests in CI now run against preview server at `/opr-terrain/` subpath. Build sets `VITE_BASE_PATH=/opr-terrain/`. Architect deleted `nginx/` directory. Private repo requires paid Pages plan. Owner must enable Pages source as "GitHub Actions" in repo settings.
