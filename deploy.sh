#!/bin/bash
set -e

echo "🚀 Deploying OPR Terrain to production..."

# Check if dist/ exists
if [ ! -d "dist" ]; then
    echo "❌ dist/ directory not found. Run 'npm run build' first."
    exit 1
fi

# Deploy static files
echo "📦 Deploying static files to /var/www/todo-app/..."
sudo rm -rf /var/www/todo-app/*
sudo cp -r dist/* /var/www/todo-app/

# Update nginx config
echo "⚙️  Updating nginx configuration..."
sudo cp nginx-config-updated.conf /etc/nginx/sites-available/default

# Test nginx config
echo "✅ Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "🔄 Reloading nginx..."
sudo systemctl reload nginx

echo "✨ Deployment complete!"
echo "🌐 App should now be accessible at your VM's public IP"
