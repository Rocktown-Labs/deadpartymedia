provider "aws" {
  region = var.aws_region
}

# Provider for us-east-1 (required for API Gateway custom domains and ACM certificates)
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
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

# OIDC Provider for GitHub Actions
# This must exist before the IAM role trust policy can reference it
# Note: Since July 2023, AWS validates GitHub's OIDC provider using trusted root CAs,
# so we use a placeholder thumbprint instead of hardcoded values to avoid maintenance burden
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com"
  ]

  thumbprint_list = [
    "ffffffffffffffffffffffffffffffffffffffff"  # Placeholder - AWS validates using trusted root CAs since July 2023
  ]

  tags = {
    Name        = "GitHub-Actions-OIDC-Provider"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# IAM role for GitHub Actions OIDC authentication
# IAM role trust policy for GitHub Actions OIDC
# This allows GitHub Actions to assume the role when:
# - Running in the "production" environment
# - From any branch/ref in the cgRGM/deadpartymedia repository
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [
        aws_iam_openid_connect_provider.github_actions.arn
      ]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:environment"
      values   = ["production"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:cgRGM/deadpartymedia:*"]
    }
  }
}

# IAM role for GitHub Actions OIDC authentication
# Note: If this role already exists, you may need to import it:
# terraform import aws_iam_role.github_actions github-actions
resource "aws_iam_role" "github_actions" {
  name               = "github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json

  tags = {
    Name        = "GitHub-Actions-Role"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# IAM policy for GitHub Actions to push to ECR
resource "aws_iam_role_policy" "github_actions_ecr" {
  name = "github-actions-ecr-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:DescribeRepositories"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = [
          "${aws_ecr_repository.deadpartymedia.arn}"
        ]
      }
    ]
  })
}

# IAM policy for GitHub Actions to update Lambda
resource "aws_iam_role_policy" "github_actions_lambda" {
  name = "github-actions-lambda-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:GetFunctionUrlConfig",
          "lambda:CreateFunctionUrlConfig",
          "lambda:UpdateFunctionUrlConfig"
        ]
        Resource = [
          "${aws_lambda_function.deadpartymedia_api.arn}",
          "${aws_lambda_function.deadpartymedia_api.arn}:*"
        ]
      }
    ]
  })
}

# IAM policy for GitHub Actions to read Secrets Manager
resource "aws_iam_role_policy" "github_actions_secrets" {
  name = "github-actions-secrets-policy"
  role = aws_iam_role.github_actions.id

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

# IAM policy for GitHub Actions to read Lightsail database info
resource "aws_iam_role_policy" "github_actions_lightsail" {
  name = "github-actions-lightsail-policy"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "lightsail:GetRelationalDatabase"
        ]
        Resource = [
          "${aws_lightsail_database.deadpartymedia.arn}"
        ]
      }
    ]
  })
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
      
      # Update ALLOWED_HOSTS to include Function URL and API Gateway domain
      UPDATED_ENV=$(echo "$CURRENT_ENV" | jq --arg hosts "api.deadpartymedia.com,${local.function_url_host}" '. + {ALLOWED_HOSTS: $hosts}')
      
      # Update Lambda function environment
      # Use --cli-input-json to properly handle JSON with special characters
      # This prevents shell word splitting on spaces, quotes, commas, etc.
      echo "$UPDATED_ENV" | jq '{Environment: {Variables: .}}' > /tmp/lambda_env.json
      
      aws lambda update-function-configuration \
        --function-name ${aws_lambda_function.deadpartymedia_api.function_name} \
        --region ${var.aws_region} \
        --cli-input-json file:///tmp/lambda_env.json \
        --output json > /dev/null
      
      # Clean up temporary file
      rm -f /tmp/lambda_env.json
      
      echo "✅ Updated Lambda ALLOWED_HOSTS to include Function URL"
    EOT
  }
}

# Get Route53 hosted zone for deadpartymedia.com
data "aws_route53_zone" "deadpartymedia" {
  name         = "deadpartymedia.com"
  private_zone = false
}

# ACM Certificate for api.deadpartymedia.com (must be in us-east-1 for API Gateway)
resource "aws_acm_certificate" "api_deadpartymedia" {
  provider          = aws.us_east_1  # API Gateway requires cert in us-east-1
  domain_name       = "api.deadpartymedia.com"
  validation_method = "DNS"

  tags = {
    Name        = "DeadPartyMedia-API-Cert"
    Environment = "production"
    ManagedBy   = "terraform"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Certificate validation
resource "aws_acm_certificate_validation" "api_deadpartymedia" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.api_deadpartymedia.arn
  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]
}

# Route53 record for certificate validation
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api_deadpartymedia.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.deadpartymedia.zone_id
}

# API Gateway HTTP API
# Must be in us-east-1 to match the custom domain region
resource "aws_apigatewayv2_api" "deadpartymedia_api" {
  provider      = aws.us_east_1  # Must match domain_name region
  name          = "deadpartymedia-api"
  protocol_type = "HTTP"
  description   = "API Gateway for Dead Party Media API"

  cors_configuration {
    # Note: allow_credentials cannot be true when allow_origins is ["*"]
    # Set to false for public API access, or specify specific origins if credentials are needed
    allow_credentials = false
    allow_origins     = ["*"]
    allow_methods     = ["*"]
    allow_headers     = ["*"]
    expose_headers    = ["*"]
    max_age           = 86400
  }

  tags = {
    Name        = "DeadPartyMedia-API"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# API Gateway Lambda integration
# Note: API Gateway in us-east-1 can integrate with Lambda in us-east-2
resource "aws_apigatewayv2_integration" "lambda" {
  provider = aws.us_east_1  # Must match API Gateway region
  api_id   = aws_apigatewayv2_api.deadpartymedia_api.id

  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.deadpartymedia_api.invoke_arn
  payload_format_version = "2.0"
}

# API Gateway default route (catches all paths)
resource "aws_apigatewayv2_route" "default" {
  provider = aws.us_east_1  # Must match API Gateway region
  api_id   = aws_apigatewayv2_api.deadpartymedia_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# API Gateway catch-all route for /v1/* and all other paths
resource "aws_apigatewayv2_route" "v1_catchall" {
  provider = aws.us_east_1  # Must match API Gateway region
  api_id   = aws_apigatewayv2_api.deadpartymedia_api.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

# API Gateway stage
resource "aws_apigatewayv2_stage" "default" {
  provider = aws.us_east_1  # Must match API Gateway region
  api_id   = aws_apigatewayv2_api.deadpartymedia_api.id
  name     = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = 100
    throttling_burst_limit = 200
  }

  tags = {
    Name        = "DeadPartyMedia-API-Stage"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.deadpartymedia_api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.deadpartymedia_api.execution_arn}/*/*"
}

# API Gateway custom domain
resource "aws_apigatewayv2_domain_name" "api_deadpartymedia" {
  provider    = aws.us_east_1  # Custom domains must be in us-east-1
  domain_name = "api.deadpartymedia.com"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.api_deadpartymedia.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy  = "TLS_1_2"
  }

  tags = {
    Name        = "DeadPartyMedia-API-Domain"
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# API Gateway domain mapping
# Note: api_mapping must use the same provider as the domain_name (us-east-1)
# The domain_name attribute should be the actual domain name string, not the resource ID
resource "aws_apigatewayv2_api_mapping" "api_deadpartymedia" {
  provider    = aws.us_east_1  # Must match domain_name provider
  api_id      = aws_apigatewayv2_api.deadpartymedia_api.id
  domain_name = aws_apigatewayv2_domain_name.api_deadpartymedia.domain_name
  stage       = aws_apigatewayv2_stage.default.id
}

# Route53 A record pointing to API Gateway custom domain
resource "aws_route53_record" "api_deadpartymedia" {
  name    = "api.deadpartymedia.com"
  type    = "A"
  zone_id = data.aws_route53_zone.deadpartymedia.zone_id

  alias {
    name                   = aws_apigatewayv2_domain_name.api_deadpartymedia.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.api_deadpartymedia.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
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
