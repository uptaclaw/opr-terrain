# Squad Decisions

## Active Decisions

### 2026-05-04: Deploy to GitHub Pages
**Decided by:** Architect  
**Status:** ✓ Implemented  

**Decision:** Migrate from VM deployment (SSH/rsync/nginx) to GitHub Pages via GitHub Actions.

**Rationale:**
- Simplify infrastructure — no VM maintenance
- GitHub-native deployment — aligned with workflow
- Private repo → requires paid Pages plan

**Implementation:**
- Rewrote `.github/workflows/deploy.yml` to use `actions/deploy-pages@v4`
- Deleted `nginx/` directory
- Build sets `VITE_BASE_PATH=/opr-terrain/` for GitHub Pages subpath
- Existing `vite.config.ts` already supports this via `loadEnv`
- E2E tests in CI run against preview server at `/opr-terrain/` subpath
- Owner (Brian) must enable Pages source as "GitHub Actions" in repo settings

**Impact:**
- Builder: deploy target changed to GitHub Pages
- Checker: CI/E2E testing against Pages preview environment

### 2026-05-05: Table Coverage Indicator Implementation
**Decided by:** Builder (Frontend Dev)  
**Status:** ✓ Implemented  

**Decision:** Added a table coverage percentage indicator to the LayoutStudio sidebar to show users what percentage of the table is covered by terrain pieces.

**Implementation Details:**
- `src/lib/tableCoverage.ts`: Pure utility function for calculating coverage % (simple area sum, intentionally not overlap-aware)
- `src/components/TableCoverageIndicator.tsx`: React component with auto-calculation on mount/dependency changes, manual recalculate button, color-coded badge
- Coverage formula: sum of piece areas / table area × 100, clamped 0-100%
- Area calculations: rect = w×h, ellipse = π×(w/2)×(h/2), diamond = (w×h)/2
- Color thresholds: emerald ≥25%, amber <25%, slate 0%
- Integrated in LayoutStudio sidebar between OPRValidationDisplay and LoS check panel

**Rationale:**
- Simple area sum sufficient for this indicator, more performant than overlap detection
- Auto + manual calculation: auto ensures fresh data, manual button gives user control
- 25% threshold based on typical OPR terrain density

**Impact:**
- Users can now see table coverage percentage at a glance
- No impact on other components

### 2026-05-04: Switch Deployment from VM to GitHub Pages
**Decided by:** Architect  
**Status:** ✓ Implemented (requires manual action by Brian)  

**Decision:** Switch deployment to **GitHub Pages** using the `actions/deploy-pages` workflow instead of VM deployment.

**Implementation Details:**
- `.github/workflows/deploy.yml` — Rewrote to use `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`. Added required permissions (pages, id-token) and concurrency group. Validation job preserved.
- `vite.config.ts` — No changes needed. Existing `VITE_BASE_PATH` env var support handles the `/opr-terrain/` subpath.
- `nginx/` — Deleted. No longer needed.
- `README.md` — Updated deployment docs.
- Build sets `VITE_BASE_PATH=/opr-terrain/` for correct asset resolution.
- E2E tests: Preview server URL and Playwright base URL updated to include `/opr-terrain/` subpath.

**Required Manual Action:**
Brian must enable GitHub Pages source as "GitHub Actions" in repo Settings → Pages. (The code is correct — this is purely a settings issue for Pages source configuration.)

**Rationale:**
- Zero infrastructure to manage, no VM costs, no SSH key rotation
- GitHub provides CDN, HTTPS, and caching
- Private repo requires paid Pages plan (Brian is aware)
- SPA client-side routing: may need `404.html` workaround if routes are added later

**Impact:**
- Simplified deployment pipeline
- All team members: deployment target changed to GitHub Pages
- CI workflow: new permissions, new deploy steps

### 2026-05-04: GitHub Pages Configuration Issue
**Discovered by:** Builder  
**Status:** ⚠️ Requires manual action by Brian  

**Issue:** The site at `https://uptaclaw.github.io/opr-terrain/` rendered blank because GitHub Pages was configured to "Deploy from a branch" (legacy mode), serving raw source files instead of the built Vite bundle.

**Solution:** Brian must change the Pages source in **Settings → Pages → Build and deployment → Source** from "Deploy from branch" to **"GitHub Actions"**.

**Why This Matters:**
- The deploy workflow uses `actions/upload-pages-artifact` + `actions/deploy-pages` which requires Pages source = "GitHub Actions"
- With "Deploy from branch", GitHub serves raw repo files, not the Vite-built `dist/` output
- Built `index.html` (in `dist/`) correctly references `/opr-terrain/assets/index-xxx.js`
- Raw source `index.html` references `/src/main.tsx` (doesn't exist in deployed site)

**Related Fix:**
Also fixed `e2e/pages/layoutStudioPage.ts` — changed `page.goto('/')` to `page.goto('./')` so Playwright's baseURL applies correctly for the `/opr-terrain/` subpath in CI.

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
