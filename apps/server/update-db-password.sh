#!/bin/bash
# Script to update database password in .env.production
# Run this on the instance after changing password in Lightsail console

set -euo pipefail

ENV_FILE="${1:-.env.production}"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

echo "Updating database password in $ENV_FILE..."
echo ""
read -sp "Enter the new database password: " NEW_PASSWORD
echo ""

# Escape special characters for sed
ESCAPED_PASSWORD=$(printf '%s\n' "$NEW_PASSWORD" | sed 's/[[\.*^$()+?{|]/\\&/g')

# Update the password
sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$ESCAPED_PASSWORD/" "$ENV_FILE"

echo "✅ Password updated in $ENV_FILE"
echo ""
echo "Verifying..."
grep "^DB_PASSWORD=" "$ENV_FILE"
echo ""
echo "⚠️  Note: You may need to restart the Gunicorn service for changes to take effect:"
echo "   sudo systemctl restart gunicorn"

