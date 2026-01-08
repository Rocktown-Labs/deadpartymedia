#!/bin/bash
# Diagnostic script to check Gunicorn service status and errors
# Run this on the server via SSH

set -euo pipefail

log() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }

echo "=========================================="
log "Checking Gunicorn service status..."
echo "=========================================="
sudo systemctl status gunicorn --no-pager -l || true

echo ""
echo "=========================================="
log "Latest Gunicorn error logs (last 30 lines)..."
echo "=========================================="
sudo journalctl -u gunicorn -n 30 --no-pager || true

echo ""
echo "=========================================="
log "Checking if UV_CACHE_DIR is set in service file..."
echo "=========================================="
sudo grep -i "UV_CACHE_DIR" /etc/systemd/system/gunicorn.service || echo "UV_CACHE_DIR not found in service file!"

echo ""
echo "=========================================="
log "Checking if /tmp/uv-cache exists and is writable..."
echo "=========================================="
ls -ld /tmp/uv-cache || echo "/tmp/uv-cache does not exist!"
test -w /tmp/uv-cache && echo "✅ /tmp/uv-cache is writable" || echo "❌ /tmp/uv-cache is NOT writable"

echo ""
echo "=========================================="
log "Testing uv with UV_CACHE_DIR manually..."
echo "=========================================="
cd ~/deadpartymedia/apps/server || error "Failed to change to server directory"
export DJANGO_SETTINGS_MODULE='config.settings.production'
export UV_CACHE_DIR=/tmp/uv-cache
timeout 3 uv run python --version 2>&1 || echo "⚠️  uv test failed or timed out"

echo ""
echo "=========================================="
log "Checking if gunicorn is installed in the venv..."
echo "=========================================="
export UV_CACHE_DIR=/tmp/uv-cache
uv run python -c "import gunicorn; print(f'✅ gunicorn version: {gunicorn.__version__}')" 2>&1 || echo "❌ gunicorn not found in venv"

echo ""
log "Diagnostics complete!"

