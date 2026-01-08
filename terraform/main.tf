provider "aws" {
  region = var.aws_region
}

# Lightsail Container Service
resource "aws_lightsail_container_service" "deadpartymedia" {
  name        = "deadpartymedia-api"
  power       = var.container_power
  scale       = var.container_scale
  is_disabled = false

  public_endpoint_config {
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

  tags = {
    Name        = "DeadPartyMedia-API"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Container Service Deployment
resource "aws_lightsail_container_service_deployment_version" "deadpartymedia" {
  container_service_name = aws_lightsail_container_service.deadpartymedia.name

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
      # DB_PASSWORD will be set via AWS Secrets Manager or environment variables
      GUNICORN_BIND = "0.0.0.0:8000"
    }
    ports = {
      "8000" = "HTTP"
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

