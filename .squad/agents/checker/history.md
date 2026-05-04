# Project Context

- **Owner:** Brian
- **Project:** OPR Terrain — A battlefield layout planner for One Page Rules style terrain setup
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Vitest (unit tests), Playwright (e2e tests)
- **Features:** Drag-and-drop terrain editor on a gridded canvas, selection/rotation handles, named layout save/load via localStorage, auto-saved working draft, shareable URLs via hash encoding, PNG export, print-friendly sheet with terrain legend
- **Deployment:** GitHub Actions → GitHub Pages (subpath: `/opr-terrain/`)
- **Created:** 2026-05-04

## Learnings

- **2026-05-04:** Deployment switched from VM (SSH/rsync/nginx) to GitHub Pages. E2E tests in CI now run against preview server at `/opr-terrain/` subpath. Build sets `VITE_BASE_PATH=/opr-terrain/`. Architect deleted `nginx/` directory. Private repo requires paid Pages plan. Owner must enable Pages source as "GitHub Actions" in repo settings.
- **2026-05-05:** Created unit tests for table coverage calculation (`src/lib/tableCoverage.test.ts`). 14 comprehensive tests covering all three shapes (rect, ellipse, diamond), edge cases (empty board, zero-dimension table, >100% coverage clamping), and realistic scenarios. Test helper factories follow existing patterns from `terrainSummary.test.ts` and `pieceBounds.test.ts`. Uses `toBeCloseTo()` for floating-point comparisons. Area formulas: rect = w×h, ellipse = π×(w/2)×(h/2), diamond = (w×h)/2. Table coverage = sum of piece areas / table area × 100, clamped 0-100. All tests passing. Builder created corresponding utilities and React component. ✅
