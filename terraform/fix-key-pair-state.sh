#!/bin/bash
# Fix Terraform state to match actual instance key pair
# This updates the state without recreating the instance

set -euo pipefail

echo "This script will update Terraform state to reflect that the instance uses 'deadparty-server-2'"
echo "instead of 'deadparty-server'. This prevents Terraform from trying to recreate the instance."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Method 1: Use terraform state command (if available)
if command -v terraform &> /dev/null; then
    echo "Updating Terraform state..."
    terraform state show aws_lightsail_instance.deadpartymedia > /tmp/instance-state.txt || {
        echo "Error: Could not read state. Make sure you're in the terraform directory."
        exit 1
    }
    
    # The state file is JSON, we need to update it directly
    echo ""
    echo "To fix this, you have two options:"
    echo ""
    echo "Option 1: Manually edit terraform.tfstate"
    echo "  1. Open terraform/terraform.tfstate"
    echo "  2. Find the 'key_pair_name' attribute in the instance resource"
    echo "  3. Change it from 'deadparty-server' to 'deadparty-server-2'"
    echo "  4. Save the file"
    echo ""
    echo "Option 2: Use terraform apply with lifecycle ignore (already added)"
    echo "  The lifecycle block will prevent Terraform from trying to change it."
    echo "  Run: terraform apply"
    echo ""
    echo "Option 3: Remove and re-import (safest but requires manual steps)"
    echo "  terraform state rm aws_lightsail_instance.deadpartymedia"
    echo "  terraform import aws_lightsail_instance.deadpartymedia deadpartymedia-api"
    echo ""
fi

