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

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
