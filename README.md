# OPR Terrain

A Vite + React + TypeScript battlefield layout planner for One Page Rules style terrain setup.

## Features

- Drag-and-drop terrain layout editor on a gridded tabletop canvas
- **OPR setup validation** — Real-time insights and recommendations based on official OPR Age of Fantasy guidelines
- Named layout save/load with rename and delete via `localStorage`
- Auto-saved working draft restored after refresh
- Shareable URLs that encode the full layout in the hash
- Clean PNG export for posting layouts elsewhere
- Print-friendly sheet with visual map plus terrain legend and active traits

## OPR Setup Insights

The app now includes real-time validation against official OPR terrain recommendations:

- **Terrain Density** — Percentage of table coverage (20-40% recommended)
- **LoS Blockers** — Number of line-of-sight blocking pieces (4-6 recommended)
- **Cover Balance** — Mix of Light vs Heavy Cover (aim for 50/50)
- **Deployment Clarity** — Keep deployment zones clear (max 2 pieces)
- **Center Balance** — Contested center terrain for objective play (1-3 pieces)

Each metric provides:
- ✓ Good / ⚠ Warning / ✗ Poor status indicators
- Actionable suggestions when improvements are needed
- Overall setup quality score (0-100)

See [OPR Guidelines Documentation](docs/OPR_GUIDELINES.md) for detailed information.

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and create a production build in `dist/`
- `npm run test` — run the Vitest suite

## Deployment

Automated deployment lives in `.github/workflows/deploy.yml` and follows the same SSH-based pattern as `uptaclaw/todo-app`.

### Production target

The workflow builds the app with the default root base path and publishes `dist/` into a dedicated static directory:

- `/var/www/opr-terrain/`

With `nginx/default.conf` applied, the live site is served directly from the VM root URL:

- `http://20.69.110.195/`

### GitHub Actions flow

On every push to `main`, the workflow:

1. installs dependencies with `npm ci`
2. builds the production bundle with `npm run build`
3. ensures `/var/www/opr-terrain` exists over SSH
4. rsyncs `dist/` to `/var/www/opr-terrain/`
5. installs the static-only nginx config for that directory and reloads nginx
6. verifies both the root page title and `/health` response

The same workflow also supports `workflow_dispatch` for manual re-runs after the workflow exists on `main`.

### Required GitHub secrets

Use the same secret names as `todo-app`:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

### nginx configs

Two nginx configs are included:

- `nginx/default.conf` — dedicated static-only site rooted at `/var/www/opr-terrain` with SPA fallback and no `/api/` proxy block. The GitHub Actions workflow writes this config to the VM and reloads nginx on deploy.
- `nginx/opr-terrain-location.conf` — optional location block for serving the same `/var/www/opr-terrain` build alongside another site at `/opr-terrain/`

If you ever switch to the alongside route, rebuild with `VITE_BASE_PATH=/opr-terrain/ npm run build` before syncing files so asset URLs stay rooted under `/opr-terrain/`.
