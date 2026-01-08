#!/bin/bash
# Script to import existing Lightsail resources into Terraform
# Run this if you already have resources created manually

set -euo pipefail

echo "This script will import your existing Lightsail resources into Terraform"
echo "Make sure you have:"
echo "  1. Terraform initialized (terraform init)"
echo "  2. terraform.tfvars configured"
echo "  3. AWS credentials configured"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Get existing instance name/IP
read -p "Enter your existing Lightsail instance name (or press Enter to skip): " INSTANCE_NAME
read -p "Enter your existing database name (or press Enter to skip): " DB_NAME

if [ -n "$INSTANCE_NAME" ]; then
    echo "Importing instance: $INSTANCE_NAME"
    terraform import aws_lightsail_instance.deadpartymedia "$INSTANCE_NAME" || echo "Failed to import instance"
fi

if [ -n "$DB_NAME" ]; then
    echo "Importing database: $DB_NAME"
    terraform import aws_lightsail_database.deadpartymedia "$DB_NAME" || echo "Failed to import database"
fi

echo ""
echo "Import complete. Run 'terraform plan' to see what Terraform wants to change."
echo "Note: You may need to adjust the configuration to match your existing resources."

