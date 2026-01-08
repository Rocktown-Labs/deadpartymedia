#!/bin/bash
# Script to fix uv cache directory issue on the Lightsail instance
# Run this on the server via SSH

set -euo pipefail

log() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }

log "Stopping Gunicorn service..."
sudo systemctl stop gunicorn || true

log "Creating writable uv cache directory..."
sudo mkdir -p /tmp/uv-cache
sudo chown bitnami:bitnami /tmp/uv-cache
sudo chmod 755 /tmp/uv-cache

log "Updating systemd service file..."
cd ~/deadpartymedia/apps/server || error "Failed to change to server directory"
sudo cp systemd/gunicorn.service /etc/systemd/system/gunicorn.service

log "Reloading systemd daemon..."
sudo systemctl daemon-reload

log "Starting Gunicorn service..."
sudo systemctl start gunicorn

sleep 2

log "Checking Gunicorn service status..."
sudo systemctl status gunicorn --no-pager -l

log "Done! Check the status above to see if Gunicorn started successfully."

