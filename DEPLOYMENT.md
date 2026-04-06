# OPR Terrain Builder - Deployment Guide

## Features

### Layout Persistence
- **Save layouts**: Click "Save" to store the current layout with a custom name
- **Load layouts**: Use the saved layouts picker to restore any saved layout
- **Rename/Delete**: Manage your saved layouts directly from the picker
- Layouts persist in browser localStorage across sessions

### Export & Sharing
- **PNG Export**: Click "Export PNG" to download the current layout as a high-resolution image
- **Shareable URLs**: Click "Share URL" to copy a URL that reconstructs the exact layout
- **Print View**: Click "Print" for a print-optimized view with complete terrain legend

### Layout Features
- Automatically balanced quarter coverage
- Deployment zone awareness
- Non-overlapping terrain placement
- 15-20 pieces per layout
- Mix of terrain types with traits (Cover, Difficult, LoS Blocking, etc.)

## Development

### Prerequisites
- Node.js 18+ and npm
- Git

### Setup
```bash
git clone https://github.com/uptaclaw/opr-terrain.git
cd opr-terrain
npm install
```

### Development Server
```bash
npm run dev
```
Open http://localhost:5173

### Build for Production
```bash
npm run build
```
Output: `dist/` directory with static files

### Run Tests
```bash
npm test
```

## Deployment

### Production Deployment (VM/VPS)

**Requirements:**
- nginx web server
- sudo/elevated permissions

**Steps:**

1. **Build the production assets:**
   ```bash
   npm run build
   ```

2. **Deploy using the provided script:**
   ```bash
   ./deploy.sh
   ```
   
   Or manually:
   ```bash
   # Deploy static files
   sudo rm -rf /var/www/todo-app/*
   sudo cp -r dist/* /var/www/todo-app/
   
   # Update nginx config
   sudo cp nginx-config-updated.conf /etc/nginx/sites-available/default
   
   # Test and reload nginx
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Verify deployment:**
   - Open your VM's public IP in a browser
   - The OPR Terrain Builder should load
   - Test generating, saving, and exporting layouts

### nginx Configuration

The app requires only static file serving with SPA fallback:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    client_max_body_size 100M;
    
    root /var/www/todo-app;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

No backend/API proxy needed - this is a pure frontend app.

## Project Structure

```
opr-terrain/
├── src/
│   ├── components/
│   │   ├── TableCanvas.tsx        # SVG canvas renderer
│   │   ├── TerrainLibrary.tsx     # Terrain presets browser
│   │   ├── LayoutPicker.tsx       # Save/load UI
│   │   └── PrintView.tsx          # Print-optimized view
│   ├── terrain/
│   │   ├── types.ts               # Type definitions
│   │   ├── catalog.ts             # Terrain template catalog
│   │   └── generateTerrainLayout.ts # Layout generation engine
│   ├── utils/
│   │   ├── layoutStorage.ts       # localStorage persistence
│   │   ├── urlSerializer.ts       # URL hash serialization
│   │   └── exportPNG.ts           # PNG export utility
│   ├── data/
│   │   └── terrainPresets.ts      # Preset definitions
│   └── App.tsx                    # Main app component
├── deploy.sh                      # Deployment script
└── nginx-config-updated.conf      # nginx configuration
```

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS 4** for styling
- **Vitest** for testing
- Pure frontend - no backend required

## Browser Support

- Modern browsers with ES2020+ support
- localStorage API required for persistence
- Canvas/SVG for rendering and export

## License

MIT
