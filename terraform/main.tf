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
# Note: These secrets will be stored in Terraform state. Consider using external data source
# or null_resource with local-exec for production if state encryption is a concern.
data "aws_secretsmanager_secret" "db_password" {
  name = "deadpartymedia/db-password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

data "aws_secretsmanager_secret" "secret_key" {
  name = "deadpartymedia/secret-key"
}

data "aws_secretsmanager_secret_version" "secret_key" {
  secret_id = data.aws_secretsmanager_secret.secret_key.id
}

data "aws_secretsmanager_secret" "aws_access_key_id" {
  name = "deadpartymedia/aws-access-key-id"
}

data "aws_secretsmanager_secret_version" "aws_access_key_id" {
  secret_id = data.aws_secretsmanager_secret.aws_access_key_id.id
}

data "aws_secretsmanager_secret" "aws_secret_access_key" {
  name = "deadpartymedia/aws-secret-access-key"
}

data "aws_secretsmanager_secret_version" "aws_secret_access_key" {
  secret_id = data.aws_secretsmanager_secret.aws_secret_access_key.id
}

data "aws_secretsmanager_secret" "aws_storage_bucket_name" {
  name = "deadpartymedia/aws-storage-bucket-name"
}

data "aws_secretsmanager_secret_version" "aws_storage_bucket_name" {
  secret_id = data.aws_secretsmanager_secret.aws_storage_bucket_name.id
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
      PRINCIPAL_ARN=$(aws lightsail get-container-services \
        --service-name ${aws_lightsail_container_service.deadpartymedia.name} \
        --region ${var.aws_region} \
        --query 'containerServices[0].privateRegistryAccess.ecrImagePullerRole.principalArn' \
        --output text)
      
      if [ -n "$PRINCIPAL_ARN" ] && [ "$PRINCIPAL_ARN" != "None" ] && [ "$PRINCIPAL_ARN" != "null" ]; then
        aws ecr set-repository-policy \
          --repository-name ${aws_ecr_repository.deadpartymedia.name} \
          --region ${var.aws_region} \
          --policy-text "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":\"$PRINCIPAL_ARN\"},\"Action\":[\"ecr:BatchGetImage\",\"ecr:GetDownloadUrlForLayer\"]}]}"
      else
        echo "Warning: Could not retrieve principal ARN. ECR policy not set."
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

# Container Service Deployment
# Note: This creates an initial deployment only if container_image is provided.
# If container_image is empty, skip this and let GitHub Actions create the first deployment.
# Ongoing deployments are handled by GitHub Actions.
# To manage deployments via Terraform, update container_image and apply.
resource "aws_lightsail_container_service_deployment_version" "deadpartymedia" {
  count       = var.container_image != "" ? 1 : 0
  service_name = aws_lightsail_container_service.deadpartymedia.name

  container {
    container_name = "api"
    image          = var.container_image
    command        = []
    environment = {
      DJANGO_SETTINGS_MODULE = "config.settings.production"
      DB_HOST                = aws_lightsail_database.deadpartymedia.master_endpoint_address
      DB_PORT                = tostring(aws_lightsail_database.deadpartymedia.master_endpoint_port)
      DB_NAME                = aws_lightsail_database.deadpartymedia.master_database_name
      DB_USER                = aws_lightsail_database.deadpartymedia.master_username
      DB_PASSWORD            = data.aws_secretsmanager_secret_version.db_password.secret_string
      SECRET_KEY             = data.aws_secretsmanager_secret_version.secret_key.secret_string
      AWS_ACCESS_KEY_ID      = data.aws_secretsmanager_secret_version.aws_access_key_id.secret_string
      AWS_SECRET_ACCESS_KEY  = data.aws_secretsmanager_secret_version.aws_secret_access_key.secret_string
      AWS_STORAGE_BUCKET_NAME = data.aws_secretsmanager_secret_version.aws_storage_bucket_name.secret_string
      AWS_S3_REGION_NAME     = "us-east-1"
      USE_S3                = "True"
      # ALLOWED_HOSTS should include container service URL and custom domains
      # Format: "api.deadpartymedia.com,deadpartymedia.com,www.deadpartymedia.com,<container-service-url>"
      ALLOWED_HOSTS          = "api.deadpartymedia.com,deadpartymedia.com,www.deadpartymedia.com,${trimsuffix(trimprefix(aws_lightsail_container_service.deadpartymedia.url, "https://"), "/")}"
      GUNICORN_BIND          = "0.0.0.0:8000"
    }
    ports = {
      "8000" = "HTTP"
    }
  }

  public_endpoint {
    container_name = "api"
    container_port = 8000

    health_check {
      healthy_threshold   = 2
      unhealthy_threshold = 2
      timeout_seconds     = 5
      interval_seconds    = 30
      path                = "/v1/"
      success_codes       = "200"
    }
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

