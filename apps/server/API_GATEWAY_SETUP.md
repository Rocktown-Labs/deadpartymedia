# API Gateway Custom Domain Setup

## Overview

The API is now accessible via **`https://api.deadpartymedia.com/v1`** through API Gateway HTTP API with a custom domain.

## What Was Fixed

### Bug 1: Dockerfile collectstatic Issue ✅

**Problem**: The Dockerfile ran `collectstatic` with production settings that defaulted `USE_S3=True`, but AWS credentials weren't available during build time, causing failures.

**Solution**: Added `ENV USE_S3=False` before `collectstatic` so static files are collected locally using WhiteNoise (which is what Lambda uses anyway).

```dockerfile
ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV USE_S3=False
RUN uv run python manage.py collectstatic --noinput
```

### API Gateway Setup ✅

Added complete API Gateway infrastructure:

1. **ACM Certificate** (us-east-1) for `api.deadpartymedia.com`
2. **API Gateway HTTP API** with Lambda integration
3. **Custom Domain** mapping
4. **Route53 A record** pointing to API Gateway

## Prerequisites

Before applying Terraform, ensure:

1. **Route53 Hosted Zone exists** for `deadpartymedia.com`
   - Terraform will look it up automatically
   - If it doesn't exist, create it first or the apply will fail

2. **DNS Access** to create validation records
   - Terraform will create DNS validation records for the ACM certificate
   - These must be in the Route53 hosted zone

## Deployment Steps

### Step 1: Apply Terraform

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

**What gets created:**
- ACM certificate in us-east-1 (with DNS validation records)
- API Gateway HTTP API
- Lambda integration
- Custom domain
- Route53 A record

**Note**: Certificate validation may take 5-30 minutes. Terraform will wait for validation to complete.

### Step 2: Verify DNS Records

After Terraform applies, check that:

1. **Certificate validation records** are created in Route53
   - Terraform creates these automatically
   - They look like: `_<random>.api.deadpartymedia.com`

2. **A record** for `api.deadpartymedia.com` points to API Gateway
   - Created automatically by Terraform

### Step 3: Test the Endpoint

```bash
# Get the API Gateway URL
cd terraform
terraform output api_gateway_url

# Test it
curl https://api.deadpartymedia.com/v1/
```

## Architecture

```
Client Request
    ↓
api.deadpartymedia.com (Route53)
    ↓
API Gateway Custom Domain
    ↓
API Gateway HTTP API
    ↓
Lambda Function (via integration)
    ↓
Django Application
```

## Important Notes

1. **Certificate Region**: ACM certificate must be in `us-east-1` for API Gateway custom domains
2. **Route53 Zone**: Must exist before Terraform apply
3. **DNS Propagation**: After certificate validation, DNS changes may take a few minutes
4. **ALLOWED_HOSTS**: Already includes `api.deadpartymedia.com` in GitHub Actions workflow

## Troubleshooting

### Certificate validation fails

- Check Route53 hosted zone exists: `aws route53 list-hosted-zones`
- Verify DNS validation records were created
- Wait 5-30 minutes for validation to complete

### API Gateway returns 403/404

- Check Lambda permission for API Gateway is created
- Verify route configuration (`$default` and `ANY /{proxy+}`)
- Check Lambda function is deployed and working

### DNS not resolving

- Verify Route53 A record exists: `aws route53 list-resource-record-sets --hosted-zone-id <zone-id>`
- Check DNS propagation: `dig api.deadpartymedia.com`
- Wait a few minutes for DNS propagation

## Outputs

After successful deployment:

```bash
terraform output api_gateway_url
# Output: https://api.deadpartymedia.com
```

## Future Deployments

GitHub Actions workflow automatically:
- Builds and pushes Docker image
- Updates Lambda function
- Updates environment variables (including ALLOWED_HOSTS with api.deadpartymedia.com)

No manual steps needed for API Gateway - it's all managed by Terraform.
