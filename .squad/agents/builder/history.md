# Project Context

- **Owner:** Brian
- **Project:** OPR Terrain — A battlefield layout planner for One Page Rules style terrain setup
- **Stack:** React 18, TypeScript, Vite, Tailwind CSS v4, Vitest (unit tests), Playwright (e2e tests)
- **Features:** Drag-and-drop terrain editor on a gridded canvas, selection/rotation handles, named layout save/load via localStorage, auto-saved working draft, shareable URLs via hash encoding, PNG export, print-friendly sheet with terrain legend
- **Deployment:** GitHub Actions → GitHub Pages (subpath: `/opr-terrain/`)
- **Created:** 2026-05-04

## Learnings

- **2026-05-04:** Deployment switched from VM (SSH/rsync/nginx) to GitHub Pages. Build sets `VITE_BASE_PATH=/opr-terrain/` for subpath. Existing `vite.config.ts` already supports this via `loadEnv`. Architect deleted `nginx/` directory. Private repo requires paid Pages plan. E2E tests in CI run against preview server at `/opr-terrain/`.
- **2026-05-04:** Fixed e2e tests for subpath deployment. Playwright's `baseURL` only applies to relative URLs — `page.goto('/')` is absolute and ignores baseURL. Changed to `page.goto('./')` which correctly resolves against baseURL. Pattern: always use relative paths (`./`, `./path`) in Playwright goto calls, never absolute (`/`, `/path`).
- **2026-05-04:** GitHub Pages blank page root cause: Pages source was set to "Deploy from branch" (legacy mode), serving raw source files instead of the built bundle. Must be set to "GitHub Actions" in repo Settings → Pages for the deploy workflow to work. The code (vite.config, deploy workflow) is correct — it was purely a settings issue.
- **2026-05-04:** Local dev environment has Node 20.17.0 but Vite 8/rolldown requires 20.19+. Can't build or run unit tests locally. CI uses setup-node@v4 with node-version 20 which gets a compatible version.
- **2026-05-05:** Added table coverage indicator feature. Created `src/lib/tableCoverage.ts` with pure utility function for calculating coverage % (simple area sum, not overlap-aware). Created `src/components/TableCoverageIndicator.tsx` following existing panel patterns (rounded-3xl, border-white/10, bg-slate-900/70). Wired into LayoutStudio sidebar between OPRValidationDisplay and LoS check panel. Coverage calculation: rect=w*h, ellipse=π*r1*r2, diamond=(w*h)/2. Uses useEffect for auto-calc on mount and dependency changes, plus manual recalculate button. Color coded: emerald ≥25%, amber <25%, slate for 0%. Checker created comprehensive 14-test suite in `src/lib/tableCoverage.test.ts` covering all shapes, edge cases, and realistic scenarios. All tests passing. ✅
