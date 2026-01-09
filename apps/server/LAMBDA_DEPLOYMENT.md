# Lambda Deployment Guide

## Overview

The Django API is deployed to **AWS Lambda** using a **Function URL**. The Function URL provides a direct HTTPS endpoint without needing API Gateway.

**Important**: Lambda Function URLs are auto-generated AWS URLs (e.g., `https://<random-id>.lambda-url.us-east-2.on.aws/`). To use `api.deadpartymedia.com`, you'll need to set up a custom domain with Route53 + CloudFront (see "Custom Domain Setup" section below).

## Deployment Steps

### Step 1: Authenticate AWS

You've already logged in via SSO. Verify your credentials:

```bash
aws sts get-caller-identity
```

### Step 2: Apply Terraform (Creates Infrastructure)

```bash
cd terraform

# Initialize (if not done already)
terraform init

# Plan (review what will be created)
terraform plan

# Apply (creates ECR, VPC config, IAM roles, Lambda function, Function URL)
terraform apply
```

**Note**: 
- Secrets are now optional in Terraform (will be set via GitHub Actions)
- Lambda creation may fail if image doesn't exist yet - that's OK, continue to Step 3

### Step 3: Build and Push Docker Image

```bash
# Get your AWS account ID and ECR URL
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-2"
ECR_REPO="deadpartymedia-api"
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | \
  docker login --username AWS --password-stdin ${ECR_URL}

# Build the image
cd apps/server
docker build -t ${ECR_REPO}:latest .

# Tag for ECR
docker tag ${ECR_REPO}:latest ${ECR_URL}:latest

# Push to ECR
docker push ${ECR_URL}:latest
```

### Step 4: Create/Update Lambda Function

If Lambda creation failed in Step 2, create it now:

```bash
# Get the ECR repository URL
ECR_REPO_URL=$(cd terraform && terraform output -raw ecr_repository_url)
IMAGE_URI="${ECR_REPO_URL}:latest"

# Get the IAM role ARN
ROLE_ARN=$(cd terraform && terraform output -raw lambda_function_arn | sed 's|:function:.*|:role/deadpartymedia-lambda-exec-role|')

# Create Lambda function
aws lambda create-function \
  --function-name deadpartymedia-api \
  --package-type Image \
  --code ImageUri=${IMAGE_URI} \
  --role ${ROLE_ARN} \
  --timeout 30 \
  --memory-size 512 \
  --region us-east-2
```

Or if Lambda already exists, just update it:

```bash
aws lambda update-function-code \
  --function-name deadpartymedia-api \
  --image-uri ${IMAGE_URI} \
  --region us-east-2
```

### Step 5: Create Function URL (if not created by Terraform)

```bash
aws lambda create-function-url-config \
  --function-name deadpartymedia-api \
  --authorization-type NONE \
  --cors '{"AllowCredentials":true,"AllowOrigins":["*"],"AllowMethods":["*"],"AllowHeaders":["*"],"ExposeHeaders":["*"],"MaxAge":86400}' \
  --region us-east-2
```

### Step 6: Get Function URL and Test

```bash
# Get Function URL
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name deadpartymedia-api \
  --region us-east-2 \
  --query 'FunctionUrl' --output text)

echo "Function URL: ${FUNCTION_URL}"

# Test it
curl ${FUNCTION_URL}/v1/
```

### Step 7: Update Lambda Environment Variables

The GitHub Actions workflow will handle this automatically, but you can do it manually:

```bash
# Get database details
DB_HOST=$(aws lightsail get-relational-database \
  --relational-database-name deadpartymediaDB \
  --region us-east-2 \
  --query 'relationalDatabase.masterEndpoint.address' --output text)

DB_PORT=$(aws lightsail get-relational-database \
  --relational-database-name deadpartymediaDB \
  --region us-east-2 \
  --query 'relationalDatabase.masterEndpoint.port' --output text)

# Get Function URL hostname
FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name deadpartymedia-api \
  --region us-east-2 \
  --query 'FunctionUrl' --output text)

FUNCTION_URL_HOST=$(echo ${FUNCTION_URL} | sed 's|https://||' | sed 's|/.*||')

# Get secrets (you'll need to set these in Secrets Manager first)
DB_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id deadpartymedia/db-password \
  --region us-east-2 \
  --query 'SecretString' --output text)

SECRET_KEY=$(aws secretsmanager get-secret-value \
  --secret-id deadpartymedia/secret-key \
  --region us-east-2 \
  --query 'SecretString' --output text)

# Update Lambda environment
aws lambda update-function-configuration \
  --function-name deadpartymedia-api \
  --region us-east-2 \
  --environment "Variables={
    DJANGO_SETTINGS_MODULE=config.settings.production,
    DB_NAME=dbmaster,
    DB_USER=dbmasteruser,
    DB_HOST=${DB_HOST},
    DB_PORT=${DB_PORT},
    DB_PASSWORD=${DB_PASSWORD},
    DB_SSLMODE=require,
    SECRET_KEY=${SECRET_KEY},
    USE_S3=True,
    ALLOWED_HOSTS=api.deadpartymedia.com,${FUNCTION_URL_HOST}
  }"
```

## Custom Domain Setup (api.deadpartymedia.com)

Lambda Function URLs don't support custom domains directly. To use `api.deadpartymedia.com`, you have two options:

### Option 1: CloudFront Distribution (Recommended)

1. **Create CloudFront distribution** pointing to the Function URL
2. **Create Route53 record** pointing `api.deadpartymedia.com` to CloudFront
3. **Update ALLOWED_HOSTS** to include `api.deadpartymedia.com`

### Option 2: API Gateway (More Complex)

1. **Create API Gateway** HTTP API
2. **Integrate with Lambda** function
3. **Create custom domain** in API Gateway
4. **Create Route53 record** pointing to API Gateway

**For now**: Use the Function URL directly. We can add the custom domain setup later.

## Quick Start (After Initial Setup)

Once everything is set up, future deployments are automated:

1. **Push to `main`/`master` branch**
2. **GitHub Actions** will:
   - Build Docker image
   - Push to ECR
   - Update Lambda function
   - Update environment variables

## Troubleshooting

### Lambda can't reach database

- Check VPC configuration: `aws lambda get-function-configuration --function-name deadpartymedia-api --query 'VpcConfig'`
- Verify security group allows outbound to port 5432
- Check Lambda is in correct subnets

### Function URL returns 502/503

- Check Lambda logs: `aws lambda get-function --function-name deadpartymedia-api --query 'Configuration.LastUpdateStatus'`
- View CloudWatch logs for errors
- Verify environment variables are set correctly

### collectstatic fails during build

- Check Django settings can load without database connection
- Verify `DJANGO_SETTINGS_MODULE` is set correctly
- Check for missing dependencies
