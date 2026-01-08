#!/bin/bash
# Helper script to create secrets in AWS Secrets Manager
# This script helps set up all required secrets for the Dead Party Media deployment
#
# Usage:
#   ./setup-secrets.sh
#
# Prerequisites:
#   - AWS CLI installed and configured
#   - Appropriate IAM permissions (secretsmanager:CreateSecret, secretsmanager:PutSecretValue)
#   - jq installed (for JSON parsing)

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"
SECRET_PREFIX="deadpartymedia"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Check prerequisites
command -v aws >/dev/null 2>&1 || error "AWS CLI is not installed"
command -v jq >/dev/null 2>&1 || warning "jq is not installed (optional, for JSON parsing)"

# Verify AWS credentials
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    error "AWS credentials not configured. Run 'aws configure' first."
fi

log "Setting up secrets in AWS Secrets Manager (region: $AWS_REGION)"
log "Secret prefix: $SECRET_PREFIX"
echo ""

# Function to create or update a secret
create_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3

    # Check if secret already exists
    if aws secretsmanager describe-secret --secret-id "$secret_name" --region "$AWS_REGION" >/dev/null 2>&1; then
        warning "Secret $secret_name already exists. Updating..."
        aws secretsmanager update-secret \
            --secret-id "$secret_name" \
            --secret-string "$secret_value" \
            --region "$AWS_REGION" >/dev/null
        log "Updated secret: $secret_name"
    else
        log "Creating secret: $secret_name"
        aws secretsmanager create-secret \
            --name "$secret_name" \
            --secret-string "$secret_value" \
            --description "$description" \
            --region "$AWS_REGION" >/dev/null
        log "Created secret: $secret_name"
    fi
}

# 1. Lightsail Instance IP
prompt "Enter Lightsail instance IP address (default: 18.189.190.211):"
read -r instance_ip
instance_ip="${instance_ip:-18.189.190.211}"
create_secret \
    "${SECRET_PREFIX}/lightsail/instance-ip" \
    "$instance_ip" \
    "Lightsail instance public IP address"

# 2. SSH Private Key
prompt "Enter path to SSH private key file (deadparty-server key):"
read -r ssh_key_path
if [ -f "$ssh_key_path" ]; then
    ssh_key_content=$(cat "$ssh_key_path")
    create_secret \
        "${SECRET_PREFIX}/lightsail/ssh-private-key" \
        "$ssh_key_content" \
        "SSH private key for Lightsail instance access"
else
    warning "SSH key file not found. Skipping. You can add it later via AWS Console."
fi

# 3. Database Endpoint
prompt "Enter database endpoint (default: ls-2b118c054fab6ffee8588a8140b5e71ab5dfb4e6.cp6k6m4q25s5.us-east-2.rds.amazonaws.com):"
read -r db_endpoint
db_endpoint="${db_endpoint:-ls-2b118c054fab6ffee8588a8140b5e71ab5dfb4e6.cp6k6m4q25s5.us-east-2.rds.amazonaws.com}"
create_secret \
    "${SECRET_PREFIX}/database/endpoint" \
    "$db_endpoint" \
    "Lightsail managed database endpoint"

# 4. Database Port
prompt "Enter database port (default: 5432):"
read -r db_port
db_port="${db_port:-5432}"
create_secret \
    "${SECRET_PREFIX}/database/port" \
    "$db_port" \
    "Database port number"

# 5. Database Username
prompt "Enter database username (default: dbmasteruser):"
read -r db_username
db_username="${db_username:-dbmasteruser}"
create_secret \
    "${SECRET_PREFIX}/database/username" \
    "$db_username" \
    "Database username"

# 6. Database Password
prompt "Enter database password:"
read -rs db_password
echo ""
if [ -n "$db_password" ]; then
    create_secret \
        "${SECRET_PREFIX}/database/password" \
        "$db_password" \
        "Database password"
else
    warning "Database password not provided. Skipping."
fi

# 7. Database Name
prompt "Enter database name (default: deadpartymedia):"
read -r db_name
db_name="${db_name:-deadpartymedia}"
create_secret \
    "${SECRET_PREFIX}/database/name" \
    "$db_name" \
    "Database name"

# 8. Django Secret Key
prompt "Generate Django SECRET_KEY? (y/n, default: y):"
read -r generate_secret
generate_secret="${generate_secret:-y}"
if [ "$generate_secret" = "y" ] || [ "$generate_secret" = "Y" ]; then
    # Generate secret key using Python
    django_secret=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null || \
                    python3 -c "import secrets; print(secrets.token_urlsafe(50))")
    log "Generated Django SECRET_KEY"
else
    prompt "Enter Django SECRET_KEY:"
    read -rs django_secret
    echo ""
fi
if [ -n "$django_secret" ]; then
    create_secret \
        "${SECRET_PREFIX}/django/secret-key" \
        "$django_secret" \
        "Django SECRET_KEY for production"
else
    warning "Django SECRET_KEY not provided. Skipping."
fi

# 9. Django Allowed Hosts
prompt "Enter ALLOWED_HOSTS (comma-separated, default: 18.189.190.211,localhost,127.0.0.1):"
read -r allowed_hosts
allowed_hosts="${allowed_hosts:-18.189.190.211,localhost,127.0.0.1}"
create_secret \
    "${SECRET_PREFIX}/django/allowed-hosts" \
    "$allowed_hosts" \
    "Django ALLOWED_HOSTS setting"

# 10. AWS Access Key ID (optional, for GitHub Actions)
prompt "Enter AWS Access Key ID for GitHub Actions (optional, press Enter to skip):"
read -r aws_access_key
if [ -n "$aws_access_key" ]; then
    create_secret \
        "${SECRET_PREFIX}/aws/access-key-id" \
        "$aws_access_key" \
        "AWS Access Key ID for CI/CD"
    
    prompt "Enter AWS Secret Access Key:"
    read -rs aws_secret_key
    echo ""
    if [ -n "$aws_secret_key" ]; then
        create_secret \
            "${SECRET_PREFIX}/aws/secret-access-key" \
            "$aws_secret_key" \
            "AWS Secret Access Key for CI/CD"
    fi
else
    log "Skipping AWS credentials (can be added to GitHub Secrets directly)"
fi

# 11. Optional: AWS S3 Configuration
prompt "Do you want to configure AWS S3 for media/static files? (y/n, default: n):"
read -r configure_s3
configure_s3="${configure_s3:-n}"
if [ "$configure_s3" = "y" ] || [ "$configure_s3" = "Y" ]; then
    prompt "Enter AWS S3 Storage Bucket Name:"
    read -r s3_bucket
    if [ -n "$s3_bucket" ]; then
        create_secret \
            "${SECRET_PREFIX}/aws/storage-bucket-name" \
            "$s3_bucket" \
            "AWS S3 bucket name for media/static files"
        
        prompt "Enter AWS S3 Region (default: us-east-1):"
        read -r s3_region
        s3_region="${s3_region:-us-east-1}"
        create_secret \
            "${SECRET_PREFIX}/aws/s3-region" \
            "$s3_region" \
            "AWS S3 region"
    fi
fi

# 12. Optional: Resend API Key
prompt "Enter Resend API Key for email (optional, press Enter to skip):"
read -rs resend_key
echo ""
if [ -n "$resend_key" ]; then
    create_secret \
        "${SECRET_PREFIX}/email/resend-api-key" \
        "$resend_key" \
        "Resend API key for email sending"
fi

# 13. Optional: Sentry DSN
prompt "Enter Sentry DSN for error tracking (optional, press Enter to skip):"
read -r sentry_dsn
if [ -n "$sentry_dsn" ]; then
    create_secret \
        "${SECRET_PREFIX}/sentry/dsn" \
        "$sentry_dsn" \
        "Sentry DSN for error tracking"
fi

# 14. Optional: Spotify API Credentials
prompt "Enter Spotify Client ID (optional, press Enter to skip):"
read -r spotify_id
if [ -n "$spotify_id" ]; then
    create_secret \
        "${SECRET_PREFIX}/spotify/client-id" \
        "$spotify_id" \
        "Spotify API Client ID"
    
    prompt "Enter Spotify Client Secret:"
    read -rs spotify_secret
    echo ""
    if [ -n "$spotify_secret" ]; then
        create_secret \
            "${SECRET_PREFIX}/spotify/client-secret" \
            "$spotify_secret" \
            "Spotify API Client Secret"
    fi
fi

echo ""
log "Secret setup completed!"
echo ""
log "Next steps:"
echo "  1. Verify secrets in AWS Secrets Manager console"
echo "  2. Set up GitHub Secrets with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
echo "  3. Ensure IAM user has permissions to read secrets"
echo "  4. Test deployment with: python deploy-helper.py --secrets-only"
echo ""

