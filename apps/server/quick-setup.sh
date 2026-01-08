#!/bin/bash
# Quick setup script for empty Bitnami instance
# Run this from your local machine

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Configuration
INSTANCE_IP="18.189.190.211"
SSH_USER="bitnami"
SSH_KEY="${HOME}/Downloads/deadparty-server.pem"
APP_DIR="/home/bitnami/deadpartymedia"
GIT_REPO="https://github.com/cgRGM/deadpartymedia.git"

log "Dead Party Media - Quick Setup for Empty Bitnami Instance"
log "=========================================================="
echo ""

# Check SSH key
if [ ! -f "$SSH_KEY" ]; then
    error "SSH key not found at: $SSH_KEY"
fi

chmod 600 "$SSH_KEY" 2>/dev/null || warning "Could not set key permissions (may need sudo)"
log "✓ Using SSH key: $SSH_KEY"
echo ""

# Test connection
log "Testing SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$INSTANCE_IP" "echo 'Connected'" >/dev/null 2>&1; then
    log "✓ SSH connection successful"
else
    error "Cannot connect to instance. Check IP, key, and security groups."
fi
echo ""

# Step 1: Install uv
log "Step 1: Installing uv..."
ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" << 'EOF'
    if ! command -v uv &> /dev/null; then
        echo "Installing uv..."
        curl -LsSf https://astral.sh/uv/install.sh | sh
        echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.cargo/bin:$PATH"
        echo "✓ uv installed"
    else
        echo "✓ uv already installed"
    fi
EOF
echo ""

# Step 2: Install system dependencies
log "Step 2: Installing system dependencies..."
ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" << 'EOF'
    sudo apt-get update -qq
    sudo apt-get install -y libpq-dev postgresql-client python3-dev build-essential
    echo "✓ System dependencies installed"
EOF
echo ""

# Step 3: Clone repository
log "Step 3: Cloning repository..."
ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" << EOF
    mkdir -p $APP_DIR
    cd $APP_DIR/..
    
    if [ -d "deadpartymedia" ]; then
        echo "Repository exists, removing old version..."
        rm -rf deadpartymedia
    fi
    
    echo "Cloning repository..."
    git clone $GIT_REPO deadpartymedia
    echo "✓ Repository cloned"
EOF
echo ""

# Step 4: Set up systemd service
log "Step 4: Setting up systemd service..."
ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" << EOF
    if [ -f "$APP_DIR/apps/server/systemd/gunicorn.service" ]; then
        sudo cp $APP_DIR/apps/server/systemd/gunicorn.service /etc/systemd/system/gunicorn.service
        sudo systemctl daemon-reload
        sudo systemctl enable gunicorn
        echo "✓ Systemd service configured"
    else
        echo "⚠ Service file not found, skipping systemd setup"
    fi
EOF
echo ""

# Step 5: Create .env.production template
log "Step 5: Creating .env.production template..."
ssh -i "$SSH_KEY" "$SSH_USER@$INSTANCE_IP" << 'EOF'
    cd /home/bitnami/deadpartymedia/apps/server
    cat > .env.production.template << 'ENVEOF'
# Production environment variables for Dead Party Media
# Copy this file to .env.production and fill in the values
# Values will come from AWS Secrets Manager during deployment

# Database Configuration
DB_HOST=
DB_PORT=5432
DB_NAME=deadpartymedia
DB_USER=
DB_PASSWORD=

# Django Configuration
SECRET_KEY=
ALLOWED_HOSTS=api.deadpartymedia.com,deadpartymedia.com,www.deadpartymedia.com,18.189.190.211,localhost,127.0.0.1
DJANGO_SETTINGS_MODULE=config.settings.production

# AWS S3 Configuration
USE_S3=True
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=deadpartymedia-bucket
AWS_S3_REGION_NAME=us-east-1

# Email Configuration (Resend)
RESEND_API_KEY=

# Sentry Configuration
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILE_SESSION_SAMPLE_RATE=0.1

# Spotify API Configuration
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
ENVEOF
    echo "✓ .env.production.template created"
EOF
echo ""

log "=========================================================="
log "Setup Complete!"
log "=========================================================="
echo ""
log "Next steps:"
echo ""
echo "1. Set up AWS Secrets Manager:"
echo "   cd apps/server"
echo "   ./setup-secrets.sh"
echo ""
echo "2. The deployment script will automatically fetch secrets"
echo "   from AWS Secrets Manager when you deploy."
echo ""
echo "3. To manually deploy (after secrets are set up):"
echo "   ssh -i $SSH_KEY $SSH_USER@$INSTANCE_IP"
echo "   cd $APP_DIR/apps/server"
echo "   bash deploy-lightsail.sh"
echo ""
echo "4. Or push to main branch to trigger GitHub Actions deployment"
echo ""
log "Instance is ready! 🎉"

