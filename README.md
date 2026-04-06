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

The production build is a static SPA. The target nginx root for this project is:

- `/var/www/todo-app/`

Recommended deploy flow:

```bash
npm run build
sudo rm -rf /var/www/todo-app/*
sudo cp -r dist/. /var/www/todo-app/
```

A ready-to-copy nginx server block lives at `nginx/default.conf`. It removes the stale `/api/` proxy, keeps SPA fallback in place, and serves a static `/health` response.

nginx should serve the SPA with:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

The old `/api/` proxy block is no longer needed for this app.
