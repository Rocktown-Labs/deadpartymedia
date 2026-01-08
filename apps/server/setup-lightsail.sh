#!/bin/bash
# Master setup script for Dead Party Media Lightsail deployment
# This script automates the entire setup process
#
# Usage:
#   ./setup-lightsail.sh
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - SSH access to Lightsail instance
#   - Git repository cloned locally

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
prompt() { echo -e "${BLUE}[?]${NC} $1"; }

# Configuration
AWS_REGION="${AWS_REGION:-us-east-2}"
INSTANCE_IP="${INSTANCE_IP:-18.189.190.211}"
SSH_USER="${SSH_USER:-bitnami}"
APP_DIR="/home/bitnami/deadpartymedia"
SECRET_PREFIX="deadpartymedia"

log "Dead Party Media - Lightsail Setup Script"
log "=========================================="
echo ""

# Step 1: Check prerequisites
log "Step 1: Checking prerequisites..."
command -v aws >/dev/null 2>&1 || error "AWS CLI not installed. Install it first: https://aws.amazon.com/cli/"
command -v ssh >/dev/null 2>&1 || error "SSH not found"
command -v git >/dev/null 2>&1 || error "Git not found"

if ! aws sts get-caller-identity >/dev/null 2>&1; then
    error "AWS credentials not configured. Run 'aws configure' first."
fi
log "✓ Prerequisites check passed"
echo ""

# Step 2: Get SSH key path
prompt "Enter path to your SSH private key (deadparty-server key):"
read -r SSH_KEY_PATH
if [ ! -f "$SSH_KEY_PATH" ]; then
    error "SSH key file not found: $SSH_KEY_PATH"
fi
chmod 600 "$SSH_KEY_PATH"
log "✓ SSH key configured"
echo ""

# Step 3: Test SSH connection
log "Step 2: Testing SSH connection to instance..."
if ssh -i "$SSH_KEY_PATH" -o ConnectTimeout=5 -o StrictHostKeyChecking=no "$SSH_USER@$INSTANCE_IP" "echo 'Connection successful'" >/dev/null 2>&1; then
    log "✓ SSH connection successful"
else
    error "Cannot connect to instance. Check IP, SSH key, and security groups."
fi
echo ""

# Step 4: Set up secrets in AWS Secrets Manager
log "Step 3: Setting up AWS Secrets Manager..."
prompt "Do you want to set up secrets in AWS Secrets Manager? (y/n, default: y):"
read -r setup_secrets
setup_secrets="${setup_secrets:-y}"

if [ "$setup_secrets" = "y" ] || [ "$setup_secrets" = "Y" ]; then
    if [ -f "setup-secrets.sh" ]; then
        log "Running secrets setup script..."
        bash setup-secrets.sh
    else
        warning "setup-secrets.sh not found. You'll need to set up secrets manually."
    fi
else
    log "Skipping secrets setup. Make sure secrets are already configured."
fi
echo ""

# Step 5: Clone repository on instance
log "Step 4: Setting up repository on instance..."
prompt "Enter your Git repository URL (e.g., https://github.com/username/repo.git):"
read -r GIT_REPO_URL

log "Cloning repository on instance..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$INSTANCE_IP" << EOF
    set -e
    # Create app directory
    mkdir -p $APP_DIR
    cd $APP_DIR/..
    
    # Clone or update repository
    if [ -d "$(basename $APP_DIR)" ]; then
        echo "Repository exists, updating..."
        cd $(basename $APP_DIR)
        git fetch origin
        git reset --hard origin/main
    else
        echo "Cloning repository..."
        git clone $GIT_REPO_URL $(basename $APP_DIR)
    fi
EOF
log "✓ Repository set up"
echo ""

# Step 6: Install uv on instance
log "Step 5: Installing uv on instance..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$INSTANCE_IP" << 'EOF'
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

# Step 7: Install system dependencies
log "Step 6: Installing system dependencies..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$INSTANCE_IP" << 'EOF'
    # Install PostgreSQL client libraries if needed
    if ! command -v psql &> /dev/null; then
        echo "Installing PostgreSQL client..."
        sudo apt-get update -qq
        sudo apt-get install -y libpq-dev postgresql-client
    fi
    
    # Install gunicorn system-wide or ensure it's available
    echo "✓ System dependencies ready"
EOF
echo ""

# Step 8: Set up systemd service
log "Step 7: Setting up systemd service..."
ssh -i "$SSH_KEY_PATH" "$SSH_USER@$INSTANCE_IP" << EOF
    # Copy systemd service file
    sudo cp $APP_DIR/apps/server/systemd/gunicorn.service /etc/systemd/system/gunicorn.service
    
    # Reload systemd
    sudo systemctl daemon-reload
    
    # Enable service (but don't start yet - need to configure first)
    sudo systemctl enable gunicorn
    
    echo "✓ Systemd service configured"
EOF
echo ""

# Step 9: Create database (if needed)
log "Step 8: Database setup..."
prompt "Do you want to create the database now? (y/n, default: y):"
read -r create_db
create_db="${create_db:-y}"

if [ "$create_db" = "y" ] || [ "$create_db" = "Y" ]; then
    prompt "Enter database endpoint:"
    read -r DB_ENDPOINT
    prompt "Enter database username:"
    read -r DB_USER
    prompt "Enter database password:"
    read -rs DB_PASSWORD
    echo ""
    prompt "Enter database name to create (default: deadpartymedia):"
    read -r DB_NAME
    DB_NAME="${DB_NAME:-deadpartymedia}"
    
    log "Creating database..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_ENDPOINT" -U "$DB_USER" -d postgres << EOF
        CREATE DATABASE $DB_NAME;
        \q
EOF
    log "✓ Database created"
else
    log "Skipping database creation"
fi
echo ""

# Step 10: Initial deployment
log "Step 9: Running initial deployment..."
prompt "Do you want to run the initial deployment now? (y/n, default: y):"
read -r run_deploy
run_deploy="${run_deploy:-y}"

if [ "$run_deploy" = "y" ] || [ "$run_deploy" = "Y" ]; then
    log "Running deployment script on instance..."
    ssh -i "$SSH_KEY_PATH" "$SSH_USER@$INSTANCE_IP" << EOF
        cd $APP_DIR/apps/server
        chmod +x deploy-lightsail.sh
        
        # Set environment variables (you'll need to get these from Secrets Manager)
        export DJANGO_SETTINGS_MODULE=config.settings.production
        
        # Run deployment
        bash deploy-lightsail.sh
EOF
    log "✓ Initial deployment completed"
else
    log "Skipping initial deployment"
fi
echo ""

# Step 11: GitHub Secrets setup
log "Step 10: GitHub Secrets setup"
echo ""
log "You need to add these secrets to GitHub:"
echo "  1. Go to: https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions"
echo "  2. Add the following secrets:"
echo ""
echo "     AWS_ACCESS_KEY_ID - Your IAM user access key"
echo "     AWS_SECRET_ACCESS_KEY - Your IAM user secret key"
echo ""
prompt "Press Enter when you've added the GitHub secrets..."
read -r
echo ""

# Summary
log "=========================================="
log "Setup Summary"
log "=========================================="
echo ""
log "✓ Repository cloned on instance"
log "✓ uv installed"
log "✓ Systemd service configured"
log "✓ Deployment scripts ready"
echo ""
log "Next steps:"
echo "  1. Ensure all secrets are in AWS Secrets Manager"
echo "  2. Add AWS credentials to GitHub Secrets"
echo "  3. Push to main branch to trigger deployment"
echo ""
log "To manually deploy, SSH into the instance and run:"
echo "  cd $APP_DIR/apps/server"
echo "  bash deploy-lightsail.sh"
echo ""
log "To check service status:"
echo "  sudo systemctl status gunicorn"
echo ""
log "Setup complete! 🎉"

