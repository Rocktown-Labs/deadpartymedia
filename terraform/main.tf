provider "aws" {
  region = var.aws_region
}

# ECR Repository for container images
resource "aws_ecr_repository" "deadpartymedia" {
  name                 = "deadpartymedia-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "DeadPartyMedia-API"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Lightsail Certificate for custom domain
resource "aws_lightsail_certificate" "deadpartymedia" {
  name        = "deadpartymedia-api-cert"
  domain_name = "api.deadpartymedia.com"

  tags = {
    Name        = "DeadPartyMedia-API-Cert"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Fetch secrets from AWS Secrets Manager
# Uses external data source to try both new and old naming conventions
# This matches the fallback logic in GitHub Actions workflow
data "external" "db_password" {
  program = ["sh", "-c", <<-EOT
    if aws secretsmanager describe-secret --secret-id deadpartymedia/db-password --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/db-password"
    elif aws secretsmanager describe-secret --secret-id deadpartymedia/database/password --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/database/password"
    else
      echo '{"error":"Secret not found"}' >&2
      exit 1
    fi
    VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    echo "$VALUE" | jq -R -s '{value: .}'
  EOT
  ]
}

data "external" "secret_key" {
  program = ["sh", "-c", <<-EOT
    if aws secretsmanager describe-secret --secret-id deadpartymedia/secret-key --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/secret-key"
    elif aws secretsmanager describe-secret --secret-id deadpartymedia/django/secret-key --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/django/secret-key"
    else
      echo '{"error":"Secret not found"}' >&2
      exit 1
    fi
    VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    echo "$VALUE" | jq -R -s '{value: .}'
  EOT
  ]
}

data "external" "aws_access_key_id" {
  program = ["sh", "-c", <<-EOT
    if aws secretsmanager describe-secret --secret-id deadpartymedia/aws-access-key-id --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws-access-key-id"
    elif aws secretsmanager describe-secret --secret-id deadpartymedia/aws/access-key-id --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws/access-key-id"
    else
      echo '{"error":"Secret not found"}' >&2
      exit 1
    fi
    VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    echo "$VALUE" | jq -R -s '{value: .}'
  EOT
  ]
}

data "external" "aws_secret_access_key" {
  program = ["sh", "-c", <<-EOT
    if aws secretsmanager describe-secret --secret-id deadpartymedia/aws-secret-access-key --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws-secret-access-key"
    elif aws secretsmanager describe-secret --secret-id deadpartymedia/aws/secret-access-key --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws/secret-access-key"
    else
      echo '{"error":"Secret not found"}' >&2
      exit 1
    fi
    VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    echo "$VALUE" | jq -R -s '{value: .}'
  EOT
  ]
}

data "external" "aws_storage_bucket_name" {
  program = ["sh", "-c", <<-EOT
    if aws secretsmanager describe-secret --secret-id deadpartymedia/aws-storage-bucket-name --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws-storage-bucket-name"
      VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    elif aws secretsmanager describe-secret --secret-id deadpartymedia/aws/storage-bucket-name --region ${var.aws_region} &>/dev/null; then
      SECRET_NAME="deadpartymedia/aws/storage-bucket-name"
      VALUE=$(aws secretsmanager get-secret-value --secret-id "$SECRET_NAME" --region ${var.aws_region} --query SecretString --output text)
    else
      # Use default if secret doesn't exist
      VALUE="deadpartymedia-bucket"
    fi
    echo "$VALUE" | jq -R -s '{value: .}'
  EOT
  ]
}

# ECR Repository Policy to allow Lightsail to pull images
# Note: This must be created AFTER the container service exists (principal_arn is computed)
# Use a null_resource to create the policy after the container service is created
resource "null_resource" "ecr_policy" {
  depends_on = [aws_lightsail_container_service.deadpartymedia]

  triggers = {
    service_name = aws_lightsail_container_service.deadpartymedia.name
    repository   = aws_ecr_repository.deadpartymedia.name
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -euo pipefail
      
      echo "Retrieving principal ARN for Lightsail container service..."
      PRINCIPAL_ARN=$(aws lightsail get-container-services \
        --service-name ${aws_lightsail_container_service.deadpartymedia.name} \
        --region ${var.aws_region} \
        --query 'containerServices[0].privateRegistryAccess.ecrImagePullerRole.principalArn' \
        --output text)
      
      if [ -z "$PRINCIPAL_ARN" ] || [ "$PRINCIPAL_ARN" = "None" ] || [ "$PRINCIPAL_ARN" = "null" ]; then
        echo "Error: Could not retrieve principal ARN. ECR policy cannot be set." >&2
        exit 1
      fi
      
      echo "Principal ARN: $PRINCIPAL_ARN"
      echo "Setting ECR repository policy..."
      
      POLICY_JSON=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "$PRINCIPAL_ARN"
      },
      "Action": [
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ]
    }
  ]
}
EOF
)
      
      aws ecr set-repository-policy \
        --repository-name ${aws_ecr_repository.deadpartymedia.name} \
        --region ${var.aws_region} \
        --policy-text "$POLICY_JSON"
      
      if [ $? -eq 0 ]; then
        echo "✅ ECR repository policy set successfully"
        
        # Verify the policy was set
        echo "Verifying ECR repository policy..."
        CURRENT_POLICY=$(aws ecr get-repository-policy \
          --repository-name ${aws_ecr_repository.deadpartymedia.name} \
          --region ${var.aws_region} \
          --query 'policyText' \
          --output text 2>/dev/null || echo "")
        
        if [ -n "$CURRENT_POLICY" ]; then
          echo "✅ ECR repository policy verified"
        else
          echo "⚠️  Warning: Could not verify ECR repository policy"
        fi
      else
        echo "Error: Failed to set ECR repository policy" >&2
        exit 1
      fi
    EOT
  }
}

# Lightsail Container Service
resource "aws_lightsail_container_service" "deadpartymedia" {
  name        = "deadpartymedia-api"
  power       = var.container_power
  scale       = var.container_scale
  is_disabled = false

  # Enable ECR private registry access
  private_registry_access {
    ecr_image_puller_role {
      is_active = true
    }
  }

  # Custom domain configuration
  # Only attach certificate if enable_custom_domain is true AND certificate is validated
  dynamic "public_domain_names" {
    for_each = var.enable_custom_domain ? [1] : []
    content {
      certificate {
        certificate_name = aws_lightsail_certificate.deadpartymedia.name
        domain_names = [
          "api.deadpartymedia.com",
        ]
      }
    }
  }

  tags = {
    Name        = "DeadPartyMedia-API"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Managed Database
resource "aws_lightsail_database" "deadpartymedia" {
  relational_database_name = "deadpartymediaDB"  # Match existing database name
  availability_zone        = "${var.aws_region}a"
  blueprint_id             = "postgres_17"  # Match existing blueprint (not postgres_17_7)
  bundle_id                = var.database_bundle_id
  master_database_name     = "dbmaster"  # Match existing master database name
  master_username          = "dbmasteruser"
  master_password          = var.database_password
  skip_final_snapshot      = true  # Match existing setting

  tags = {
    Name        = "DeadPartyMedia-DB"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  # Prevent Terraform from changing the password after initial setup
  lifecycle {
    ignore_changes = [master_password]
  }
}

# Outputs are in outputs.tf
