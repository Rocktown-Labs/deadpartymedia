#!/bin/bash
# Script to fix Gunicorn service on the Lightsail instance
# Run this on the server via SSH

set -euo pipefail

log() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }
warning() { echo -e "\033[1;33m[WARNING]\033[0m $1"; }

log "Checking Gunicorn service status..."
sudo systemctl status gunicorn || true

echo ""
log "Checking recent Gunicorn logs..."
sudo journalctl -u gunicorn -n 50 --no-pager || true

echo ""
log "Checking if uv is accessible..."
which uv || error "uv not found in PATH"
uv --version

echo ""
log "Testing Gunicorn manually..."
# Use $HOME instead of ~ to ensure correct expansion
SERVER_DIR="${HOME}/deadpartymedia/apps/server"
cd "$SERVER_DIR" || error "Failed to change to server directory: $SERVER_DIR"
export DJANGO_SETTINGS_MODULE='config.settings.production'

# Test if Gunicorn can start (will timeout after 5 seconds)
timeout 5 uv run gunicorn --config gunicorn.conf.py config.wsgi:application || {
    warning "Manual Gunicorn test failed or timed out (this is expected if it starts)"
}

echo ""
log "Updating systemd service file..."
sudo cp "$SERVER_DIR/systemd/gunicorn.service" /etc/systemd/system/gunicorn.service

log "Reloading systemd daemon..."
sudo systemctl daemon-reload

log "Starting Gunicorn service..."
sudo systemctl start gunicorn

sleep 2

log "Checking Gunicorn service status..."
sudo systemctl status gunicorn

log "Done! Check the status above to see if Gunicorn started successfully."

