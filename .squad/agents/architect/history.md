# Project Context

- **Owner:** Brian
- **Project:** OPR Terrain — A battlefield layout planner for One Page Rules style terrain setup
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Vitest (unit tests), Playwright (e2e tests)
- **Features:** Drag-and-drop terrain editor on a gridded canvas, selection/rotation handles, named layout save/load via localStorage, auto-saved working draft, shareable URLs via hash encoding, PNG export, print-friendly sheet with terrain legend
- **Deployment:** GitHub Actions → SSH to VM, static files served by nginx
- **Created:** 2026-05-04

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- **2026-05-04:** Switched deployment from VM (SSH/rsync/nginx) to GitHub Pages. Workflow uses `actions/deploy-pages@v4`. Build sets `VITE_BASE_PATH=/opr-terrain/` for the GitHub Pages subpath. The existing `vite.config.ts` already supported this via `loadEnv` — no config changes needed. Deleted `nginx/` directory. The repo is private, so GitHub Pages requires a paid plan. E2E tests in CI run against the preview server at the subpath (`/opr-terrain/`). Brian must enable Pages source as "GitHub Actions" in repo settings.
