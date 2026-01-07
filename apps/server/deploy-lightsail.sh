#!/bin/bash
# Deployment script for Dead Party Media Django backend on Lightsail
# This script is executed on the Lightsail instance via SSH from GitHub Actions

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/bitnami/deadpartymedia"
SERVER_DIR="${APP_DIR}/apps/server"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as bitnami user
if [ "$USER" != "bitnami" ]; then
    error "This script must be run as the bitnami user"
fi

log "Starting deployment..."

# Navigate to application directory
if [ ! -d "$SERVER_DIR" ]; then
    error "Application directory not found: $SERVER_DIR"
fi

cd "$SERVER_DIR" || error "Failed to change to $SERVER_DIR"

# Check if git repository exists
if [ ! -d ".git" ]; then
    error "Git repository not found in $SERVER_DIR"
fi

# Pull latest code
log "Pulling latest code from repository..."
git fetch origin || error "Failed to fetch from origin"
git reset --hard origin/main || error "Failed to reset to origin/main"
log "Code updated successfully"

# Install uv if not present
if ! command -v uv &> /dev/null; then
    log "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
    log "uv installed successfully"
else
    log "uv is already installed"
fi

# Install/update dependencies
log "Installing/updating dependencies with uv..."
uv sync || error "Failed to install dependencies"
log "Dependencies installed successfully"

# Set up environment variables
export DJANGO_SETTINGS_MODULE=config.settings.production

# Check if environment variables are set
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_USER:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
    warning "Database environment variables not set. Skipping database operations."
else
    export DB_HOST="${DB_HOST}"
    export DB_PORT="${DB_PORT:-5432}"
    export DB_NAME="${DB_NAME:-deadpartymedia}"
    export DB_USER="${DB_USER}"
    export DB_PASSWORD="${DB_PASSWORD}"
fi

if [ -z "${SECRET_KEY:-}" ]; then
    warning "SECRET_KEY not set. Using default (not recommended for production)"
fi
export SECRET_KEY="${SECRET_KEY:-django-insecure-change-me-in-production}"

export ALLOWED_HOSTS="${ALLOWED_HOSTS:-18.224.61.135,localhost,127.0.0.1}"

# Run migrations
if [ -n "${DB_HOST:-}" ]; then
    log "Running database migrations..."
    uv run python manage.py migrate --noinput || error "Failed to run migrations"
    log "Migrations completed successfully"
else
    warning "Skipping migrations (database not configured)"
fi

# Collect static files
log "Collecting static files..."
uv run python manage.py collectstatic --noinput || error "Failed to collect static files"
log "Static files collected successfully"

# Determine which service to restart
SERVICE_NAME=""
if systemctl list-units --type=service --all | grep -q "gunicorn.service"; then
    SERVICE_NAME="gunicorn"
elif systemctl list-units --type=service --all | grep -q "deadpartymedia.service"; then
    SERVICE_NAME="deadpartymedia"
elif systemctl list-units --type=service --all | grep -q "apache2.service"; then
    SERVICE_NAME="apache2"
else
    warning "No known service found. You may need to restart manually."
fi

# Restart service with zero-downtime
if [ -n "$SERVICE_NAME" ]; then
    log "Restarting $SERVICE_NAME service..."
    
    if [ "$SERVICE_NAME" = "gunicorn" ] || [ "$SERVICE_NAME" = "deadpartymedia" ]; then
        # Graceful reload for gunicorn
        if systemctl is-active --quiet "$SERVICE_NAME"; then
            sudo systemctl reload "$SERVICE_NAME" || error "Failed to reload $SERVICE_NAME"
            log "$SERVICE_NAME reloaded successfully"
        else
            warning "$SERVICE_NAME is not running. Starting it..."
            sudo systemctl start "$SERVICE_NAME" || error "Failed to start $SERVICE_NAME"
            log "$SERVICE_NAME started successfully"
        fi
    elif [ "$SERVICE_NAME" = "apache2" ]; then
        # Graceful reload for Apache
        if systemctl is-active --quiet apache2; then
            sudo systemctl reload apache2 || error "Failed to reload apache2"
            log "Apache2 reloaded successfully"
        else
            warning "Apache2 is not running. Starting it..."
            sudo systemctl start apache2 || error "Failed to start apache2"
            log "Apache2 started successfully"
        fi
    fi
fi

# Verify deployment
log "Verifying deployment..."
sleep 2

if [ -n "$SERVICE_NAME" ]; then
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "Deployment successful! $SERVICE_NAME is running."
    else
        error "$SERVICE_NAME is not running after deployment"
    fi
else
    log "Deployment completed. Please verify service status manually."
fi

# Check if application is responding (optional health check)
if command -v curl &> /dev/null; then
    log "Performing health check..."
    if curl -f -s http://localhost:8000/health/ > /dev/null 2>&1 || \
       curl -f -s http://localhost/api/ > /dev/null 2>&1; then
        log "Health check passed"
    else
        warning "Health check failed (this may be normal if health endpoint doesn't exist)"
    fi
fi

log "Deployment completed successfully!"
log "Log file: $LOG_FILE"

