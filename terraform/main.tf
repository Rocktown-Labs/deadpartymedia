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
      # Return empty value if secret doesn't exist (will be set via GitHub Actions)
      echo '{"value":""}'
      exit 0
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
      # Return empty value if secret doesn't exist (will be set via GitHub Actions)
      echo '{"value":""}'
      exit 0
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
      # Return empty value if secret doesn't exist (will be set via GitHub Actions)
      echo '{"value":""}'
      exit 0
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
      # Return empty value if secret doesn't exist (will be set via GitHub Actions)
      echo '{"value":""}'
      exit 0
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

# Get default VPC for Lambda to access Lightsail database
data "aws_vpc" "default" {
  default = true
}

# Get default subnets for Lambda VPC configuration
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Security group for Lambda function
resource "aws_security_group" "lambda" {
  name        = "deadpartymedia-lambda-sg"
  description = "Security group for Lambda function to access Lightsail database"
  vpc_id      = data.aws_vpc.default.id

  # Outbound to Lightsail database (PostgreSQL)
  egress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Lightsail database is in a different network
    description = "Allow outbound to Lightsail PostgreSQL database"
  }

  # Outbound HTTPS for Secrets Manager and other AWS services
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow outbound HTTPS for AWS services"
  }

  tags = {
    Name        = "DeadPartyMedia-Lambda-SG"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM role for Lambda function
resource "aws_iam_role" "lambda_exec" {
  name = "deadpartymedia-lambda-exec-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "DeadPartyMedia-Lambda-Exec-Role"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM policy for Lambda VPC access
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# IAM policy for Lambda to access Secrets Manager
resource "aws_iam_role_policy" "lambda_secrets" {
  name = "deadpartymedia-lambda-secrets-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:*:secret:deadpartymedia/*"
        ]
      }
    ]
  })
}

# IAM policy for Lambda to access S3 (if using S3 for static files)
resource "aws_iam_role_policy" "lambda_s3" {
  name = "deadpartymedia-lambda-s3-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${data.external.aws_storage_bucket_name.result.value}",
          "arn:aws:s3:::${data.external.aws_storage_bucket_name.result.value}/*"
        ]
      }
    ]
  })
}

# IAM policy for Lambda to pull container images from ECR
resource "aws_iam_role_policy" "lambda_ecr" {
  name = "deadpartymedia-lambda-ecr-policy"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:DescribeImages"
        ]
        Resource = [
          "${aws_ecr_repository.deadpartymedia.arn}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda function
# Note: image_uri will be updated by GitHub Actions on each deployment
# Initial image_uri is a placeholder - first deployment must push an image first
resource "aws_lambda_function" "deadpartymedia_api" {
  function_name = "deadpartymedia-api"
  package_type  = "Image"
  # Use latest tag - GitHub Actions will push :latest on each deployment
  image_uri     = "${aws_ecr_repository.deadpartymedia.repository_url}:latest"
  role          = aws_iam_role.lambda_exec.arn
  timeout       = 30
  memory_size   = 512

  # VPC configuration to access Lightsail database
  vpc_config {
    subnet_ids         = data.aws_subnets.default.ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DJANGO_SETTINGS_MODULE = "config.settings.production"
      DB_NAME                 = aws_lightsail_database.deadpartymedia.master_database_name
      DB_USER                 = aws_lightsail_database.deadpartymedia.master_username
      DB_HOST                 = aws_lightsail_database.deadpartymedia.master_endpoint_address
      DB_PORT                 = tostring(aws_lightsail_database.deadpartymedia.master_endpoint_port)
      DB_SSLMODE              = "require"
      USE_S3                  = "True"
      # ALLOWED_HOSTS will be set dynamically after Function URL is created
    }
  }

  # Get account ID for image URI
  image_config {
    command = []
  }

  tags = {
    Name        = "DeadPartyMedia-API"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  # Note: First deployment requires an image to be pushed to ECR first
  # GitHub Actions will handle image updates via update-function-code
  depends_on = [aws_ecr_repository.deadpartymedia]
  
  lifecycle {
    # Don't update image_uri on every terraform apply - GitHub Actions handles this
    ignore_changes = [image_uri]
  }
}

# Lambda Function URL
resource "aws_lambda_function_url" "deadpartymedia_api" {
  function_name      = aws_lambda_function.deadpartymedia_api.function_name
  authorization_type = "NONE"  # Public access - can change to AWS_IAM later

  cors {
    allow_credentials = true
    allow_origins      = ["*"]  # Configure based on your frontend domains
    allow_methods      = ["*"]
    allow_headers      = ["*"]
    expose_headers     = ["*"]
    max_age            = 86400
  }
}

# Update Lambda environment to include Function URL in ALLOWED_HOSTS after Function URL is created
locals {
  function_url_host = replace(replace(aws_lambda_function_url.deadpartymedia_api.function_url, "https://", ""), "/", "")
}

resource "null_resource" "update_lambda_allowed_hosts" {
  depends_on = [aws_lambda_function_url.deadpartymedia_api]

  triggers = {
    function_url = aws_lambda_function_url.deadpartymedia_api.function_url
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Extract current environment variables
      CURRENT_ENV=$(aws lambda get-function-configuration \
        --function-name ${aws_lambda_function.deadpartymedia_api.function_name} \
        --region ${var.aws_region} \
        --query 'Environment.Variables' \
        --output json)
      
      # Update ALLOWED_HOSTS to include Function URL
      UPDATED_ENV=$(echo "$CURRENT_ENV" | jq --arg hosts "api.deadpartymedia.com,${local.function_url_host}" '. + {ALLOWED_HOSTS: $hosts}')
      
      # Update Lambda function environment
      aws lambda update-function-configuration \
        --function-name ${aws_lambda_function.deadpartymedia_api.function_name} \
        --region ${var.aws_region} \
        --environment "Variables=$UPDATED_ENV" \
        --output json > /dev/null
      
      echo "✅ Updated Lambda ALLOWED_HOSTS to include Function URL"
    EOT
  }
}

# Lightsail Container Service - COMMENTED OUT (replaced by Lambda)
# resource "aws_lightsail_container_service" "deadpartymedia" {
#   name        = "deadpartymedia-api"
#   power       = var.container_power
#   scale       = var.container_scale
#   is_disabled = false
#   ...
# }

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
