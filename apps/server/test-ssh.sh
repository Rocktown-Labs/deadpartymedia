#!/bin/bash
# Test SSH connection to Lightsail instance

SSH_KEY="${HOME}/Downloads/deadparty-server-2.pem"
INSTANCE_IP="18.224.61.135"
SSH_USER="bitnami"

echo "Testing SSH connection..."
echo "Key: $SSH_KEY"
echo "IP: $INSTANCE_IP"
echo "User: $SSH_USER"
echo ""

# Check key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at: $SSH_KEY"
    exit 1
fi

# Check key permissions
if [ "$(stat -f %A "$SSH_KEY" 2>/dev/null || stat -c %a "$SSH_KEY" 2>/dev/null)" != "600" ]; then
    echo "⚠️  Key permissions should be 600. Attempting to fix..."
    chmod 600 "$SSH_KEY" 2>/dev/null || {
        echo "❌ Could not set permissions. Try: chmod 600 $SSH_KEY"
    }
fi

# Test connection with verbose output
echo "Attempting connection (this may take a few seconds)..."
echo ""

ssh -v -i "$SSH_KEY" \
    -o ConnectTimeout=10 \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    "$SSH_USER@$INSTANCE_IP" \
    "echo '✅ Connection successful!' && hostname && whoami" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ SSH connection works!"
else
    echo ""
    echo "❌ SSH connection failed (exit code: $EXIT_CODE)"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check if instance is running in Lightsail console"
    echo "2. Verify IP address: $INSTANCE_IP"
    echo "3. Check Lightsail security groups allow SSH (port 22)"
    echo "4. Try connecting manually:"
    echo "   ssh -i $SSH_KEY $SSH_USER@$INSTANCE_IP"
    echo ""
    echo "Common issues:"
    echo "- Instance might be stopped (start it in Lightsail console)"
    echo "- IP address might have changed (check Lightsail console)"
    echo "- Security group might not allow SSH from your IP"
fi

