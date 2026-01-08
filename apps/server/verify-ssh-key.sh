#!/bin/bash
# Verify SSH key file is valid

KEY_FILE="${1:-$HOME/Downloads/deadparty-server.pem}"

echo "Verifying SSH key: $KEY_FILE"
echo ""

# Check if file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file not found: $KEY_FILE"
    exit 1
fi

# Check permissions
PERMS=$(stat -f %A "$KEY_FILE" 2>/dev/null || stat -c %a "$KEY_FILE" 2>/dev/null)
if [ "$PERMS" != "600" ]; then
    echo "⚠️  Key permissions are $PERMS (should be 600)"
    echo "   Fix with: chmod 600 $KEY_FILE"
else
    echo "✅ Key permissions are correct (600)"
fi

# Check file type
echo ""
echo "File type:"
file "$KEY_FILE"

# Try to extract public key (this will fail if key is invalid)
echo ""
echo "Attempting to extract public key..."
if ssh-keygen -y -f "$KEY_FILE" > /tmp/test_public_key.pub 2>&1; then
    echo "✅ Key file is valid!"
    echo ""
    echo "Public key fingerprint:"
    ssh-keygen -l -f "$KEY_FILE"
    echo ""
    echo "Public key (first line):"
    head -1 /tmp/test_public_key.pub
    rm -f /tmp/test_public_key.pub
else
    echo "❌ Key file appears to be invalid or corrupted"
    echo ""
    echo "Error details:"
    ssh-keygen -y -f "$KEY_FILE" 2>&1
    exit 1
fi

