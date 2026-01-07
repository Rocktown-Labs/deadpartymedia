#!/bin/bash
# Setup nginx for api.deadpartymedia.com

set -euo pipefail

log() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }
warning() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
fi

log "Setting up nginx for api.deadpartymedia.com..."

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    log "Installing nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Navigate to app directory to find nginx config
APP_DIR="/home/bitnami/deadpartymedia"
if [ ! -d "$APP_DIR" ]; then
    error "Application directory not found: $APP_DIR"
fi

NGINX_CONFIG="${APP_DIR}/apps/server/nginx/api.deadpartymedia.com.conf"
if [ ! -f "$NGINX_CONFIG" ]; then
    error "Nginx configuration file not found: $NGINX_CONFIG"
fi

# Copy nginx config
log "Copying nginx configuration..."
cp "$NGINX_CONFIG" /etc/nginx/sites-available/api.deadpartymedia.com

# Enable site
log "Enabling nginx site..."
ln -sf /etc/nginx/sites-available/api.deadpartymedia.com /etc/nginx/sites-enabled/

# Remove default nginx site if it exists
if [ -f /etc/nginx/sites-enabled/default ]; then
    log "Removing default nginx site..."
    rm /etc/nginx/sites-enabled/default
fi

# Test configuration
log "Testing nginx configuration..."
nginx -t || error "Nginx configuration test failed"

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    log "Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Get SSL certificate (non-interactive, but will prompt for email)
log "Obtaining SSL certificate..."
log "Note: You may need to run this manually if DNS is not yet configured:"
echo "  sudo certbot --nginx -d api.deadpartymedia.com"

# Try to get certificate (will fail if DNS not configured, that's OK)
certbot --nginx -d api.deadpartymedia.com --non-interactive --agree-tos --email admin@deadpartymedia.com 2>&1 || {
    warning "SSL certificate setup failed. This is normal if DNS is not yet configured."
    warning "After DNS is configured, run: sudo certbot --nginx -d api.deadpartymedia.com"
}

# Reload nginx
log "Reloading nginx..."
systemctl reload nginx || systemctl start nginx

log "Nginx setup complete!"
log "API will be available at: https://api.deadpartymedia.com/v1/"
log "Admin will be available at: https://api.deadpartymedia.com/deadpartyrocks/"
log ""
log "If SSL certificate setup failed, configure DNS first, then run:"
log "  sudo certbot --nginx -d api.deadpartymedia.com"

