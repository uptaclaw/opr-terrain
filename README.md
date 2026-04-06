# OPR Terrain

A Vite + React + TypeScript battlefield layout planner for One Page Rules style terrain setup.

## Features

- Drag-and-drop terrain layout editor on a gridded tabletop canvas
- Named layout save/load with rename and delete via `localStorage`
- Auto-saved working draft restored after refresh
- Shareable URLs that encode the full layout in the hash
- Clean PNG export for posting layouts elsewhere
- Print-friendly sheet with visual map plus terrain legend and active traits

## Scripts

- `npm install` — install dependencies
- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and create a production build in `dist/`
- `npm run test` — run the Vitest suite

## Deployment

Automated deployment lives in `.github/workflows/deploy.yml` and follows the same SSH-based pattern as `uptaclaw/todo-app`.

### Current production path

To avoid clobbering the existing todo app and to keep deployments fully non-interactive, the workflow builds the SPA for `/opr-terrain/` and publishes it to:

- `/var/www/todo-app/opr-terrain/`

That makes the live app available at:

- `http://20.69.110.195/opr-terrain/index.html`

Once `nginx/opr-terrain-location.conf` is applied, the cleaner `http://20.69.110.195/opr-terrain/` route works too.

### GitHub Actions flow

On every push to `main`, the workflow:

1. installs dependencies with `npm ci`
2. builds the production bundle with `VITE_BASE_PATH=/opr-terrain/`
3. ensures the remote deploy directory exists over SSH
4. rsyncs `dist/` to `/var/www/todo-app/opr-terrain/`
5. verifies the live page responds with the OPR Terrain HTML title at `/opr-terrain/index.html`

The same workflow also supports `workflow_dispatch` so the deploy path can be smoke-tested before merge.

### Required GitHub secrets

Use the same secret names as `todo-app`:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

### nginx configs

Two nginx configs are included:

- `nginx/default.conf` — dedicated static-only site rooted at `/var/www/opr-terrain` with SPA fallback and no `/api/` proxy block
- `nginx/opr-terrain-location.conf` — location block for serving OPR Terrain alongside the existing todo app at `/opr-terrain/`

The alongside config is what matches the current GitHub Actions deploy path. The dedicated config is ready if you later want OPR Terrain to replace the default site entirely.
