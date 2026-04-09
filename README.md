# OPR Terrain

A Vite + React + TypeScript battlefield layout planner for One Page Rules style terrain setup.

## Features

- Drag-and-drop terrain layout editor on a gridded tabletop canvas
- On-canvas selection and rotation handles for non-round terrain pieces
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
- `npm run test:e2e:setup` — install the Playwright Chromium browser locally
- `npm run test:e2e:setup:linux` — install Chromium plus the Linux shared-library dependencies Playwright needs on fresh Ubuntu/Debian-style hosts
- `npm run test:e2e` — run the Playwright end-to-end suite
- `npm run test:e2e:headed` — run e2e tests with a visible browser window
- `npm run test:e2e:ui` — open Playwright UI mode for interactive debugging

## E2E testing

Playwright lives under `e2e/` and focuses on the highest-risk user flows that unit tests can miss:

- dragging terrain from the library onto the board
- selecting and rotating pieces on the actual rendered canvas
- terrain regeneration
- layout persistence across reloads
- share URL reconstruction in a fresh browser context
- line-of-sight overlays rendering and clearing

### Run locally

Install Playwright once before your first local run:

```bash
# macOS / Windows
npm run test:e2e:setup

# Linux (installs Chromium plus native browser libraries)
npm run test:e2e:setup:linux
```

Then run the suite:

```bash
npm run test:e2e
```

If you hit a Linux error like `error while loading shared libraries`, rerun the Linux setup command on a machine where Playwright can prompt for sudo or install those shared libraries separately.

By default, local e2e runs start the Vite dev server automatically. If you already have a server running, Playwright reuses it.

### Debug a failure

Use either of these when you need to watch the browser or inspect traces step-by-step:

```bash
npm run test:e2e:headed
npm run test:e2e:ui
```

On failures, Playwright keeps screenshots, traces, and videos in `test-results/`, and the HTML report is written to `playwright-report/`.

## Deployment

Automated deployment lives in `.github/workflows/deploy.yml` and follows the same SSH-based pattern as `uptaclaw/todo-app`.

### Production target

The workflow builds the app with the default root base path and publishes `dist/` into a dedicated static directory:

- `/var/www/opr-terrain/`

With `nginx/default.conf` applied, the live site is served directly from the VM root URL:

- `http://20.69.110.195/`

### GitHub Actions flow

The workflow now validates pull requests before deploy and only publishes after the same checks pass on `main`.

On every pull request to `main`, the CI job:

1. installs dependencies with `npm ci`
2. installs the Playwright Chromium browser and Linux runtime dependencies with `npm run test:e2e:setup:linux`
3. builds the production bundle with `npm run build`
4. starts a local preview server from the built `dist/`
5. runs `npm run test:e2e`
6. fails the PR if any e2e test fails

On every push to `main`, the workflow runs the same validation first and then:

1. ensures `/var/www/opr-terrain` exists over SSH
2. rsyncs `dist/` to `/var/www/opr-terrain/`
3. installs the static-only nginx config for that directory and reloads nginx
4. verifies both the root page title and `/health` response

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
