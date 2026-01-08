#!/bin/bash
# Update Terraform state to match actual instance key pair
# This re-imports the instance so Terraform reads the actual key_pair_name from AWS

set -euo pipefail

echo "This will re-import the instance to update Terraform state with the correct key pair name."
echo "The instance will NOT be recreated - this only updates Terraform's understanding of it."
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

cd "$(dirname "$0")" || exit 1

echo ""
echo "Step 1: Removing instance from Terraform state..."
terraform state rm aws_lightsail_instance.deadpartymedia || {
    echo "Error: Could not remove from state"
    exit 1
}

echo ""
echo "Step 2: Re-importing instance (this reads actual values from AWS)..."
terraform import aws_lightsail_instance.deadpartymedia deadpartymedia-api || {
    echo "Error: Could not re-import instance"
    echo "You may need to manually add it back:"
    echo "  terraform import aws_lightsail_instance.deadpartymedia deadpartymedia-api"
    exit 1
}

echo ""
echo "Step 3: Verifying state..."
terraform plan

echo ""
echo "✅ Done! The state should now reflect the actual key pair name."
echo "Run 'terraform plan' to verify there are no unwanted changes."

