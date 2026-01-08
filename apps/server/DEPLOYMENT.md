# Deployment Guide - Dead Party Media API

This guide covers deploying the Django API to AWS Lightsail Container Service using Terraform and GitHub Actions.

## Architecture

- **Container Service**: AWS Lightsail Container Service (managed)
- **Database**: AWS Lightsail Managed PostgreSQL (existing)
- **Infrastructure**: Managed by Terraform
- **CI/CD**: GitHub Actions
- **Container Registry**: Lightsail built-in registry

## Prerequisites

1. AWS account with Lightsail access
2. Terraform installed locally
3. GitHub repository with Actions enabled
4. AWS credentials configured (for Terraform and GitHub Actions)

## Initial Setup

### 1. Configure Terraform

```bash
cd terraform

# Copy example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
# - database_password: Your database password
# - container_power: micro, small, medium, etc.
# - container_scale: Number of nodes (1-20)
```

### 2. Create Container Service with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Review plan
terraform plan

# Apply configuration
terraform apply
```

This will create:
- Lightsail Container Service
- Initial deployment (you'll need to push an image first)

### 3. Configure AWS Secrets Manager

The deployment workflow requires the following secrets in AWS Secrets Manager. **The workflow supports both old and new naming conventions**, so if you already have secrets from the previous setup, they will work automatically.

**Required Secrets (either naming convention works):**
- Database password: `deadpartymedia/db-password` OR `deadpartymedia/database/password`
- Django SECRET_KEY: `deadpartymedia/secret-key` OR `deadpartymedia/django/secret-key`

**Required for S3 Storage (either naming convention works):**
- AWS Access Key ID: `deadpartymedia/aws-access-key-id` OR `deadpartymedia/aws/access-key-id`
- AWS Secret Access Key: `deadpartymedia/aws-secret-access-key` OR `deadpartymedia/aws/secret-access-key`
- S3 Bucket Name: `deadpartymedia/aws-storage-bucket-name` OR `deadpartymedia/aws/storage-bucket-name` (optional, defaults to `deadpartymedia-bucket`)

**Check what secrets you already have:**
```bash
aws secretsmanager list-secrets --region us-east-2 \
  --query "SecretList[?contains(Name, 'deadpartymedia')].{Name:Name, LastChangedDate:LastChangedDate}" \
  --output table
```

**Create secrets via AWS CLI:**
```bash
# Database password
aws secretsmanager create-secret \
  --name deadpartymedia/db-password \
  --secret-string "your-database-password" \
  --region us-east-2

# Django SECRET_KEY
aws secretsmanager create-secret \
  --name deadpartymedia/secret-key \
  --secret-string "your-django-secret-key" \
  --region us-east-2

# AWS S3 credentials
aws secretsmanager create-secret \
  --name deadpartymedia/aws-access-key-id \
  --secret-string "your-aws-access-key-id" \
  --region us-east-2

aws secretsmanager create-secret \
  --name deadpartymedia/aws-secret-access-key \
  --secret-string "your-aws-secret-access-key" \
  --region us-east-2
```

### 4. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

- `AWS_ACCESS_KEY_ID`: AWS access key with Lightsail and Secrets Manager permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key

**⚠️ Important**: Both secrets are required. The workflow will fail early if either is missing.

#### Required IAM Permissions

The IAM user/role needs the following permissions:

**Lightsail Container Service:**
- `lightsail:GetContainerServices`
- `lightsail:CreateContainerServiceDeployment`
- `lightsail:GetContainerServiceRegistryLogin`
- `lightsail:WaitContainerServiceDeploymentReady`

**Lightsail Database:**
- `lightsail:GetRelationalDatabase`

**Secrets Manager:**
- `secretsmanager:GetSecretValue`
- `secretsmanager:DescribeSecret`

**If using ECR (optional):**
- `ecr:GetAuthorizationToken`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`
- `ecr:PutImage`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`

For complete IAM policy examples, see [IAM_POLICIES.md](./IAM_POLICIES.md).

### 4. First Deployment

The first deployment requires manually pushing an image to Lightsail registry:

```bash
# Get registry login credentials
aws lightsail get-container-service-registry-login --region us-east-2

# Login to registry (use credentials from above)
docker login <registry-url> -u <username> -p <password>

# Build image
cd apps/server
docker build -t deadpartymedia-api:latest .

# Tag for Lightsail registry
docker tag deadpartymedia-api:latest <registry-url>/deadpartymedia-api:latest

# Push image
docker push <registry-url>/deadpartymedia-api:latest
```

### 5. Update Terraform with Image

After pushing the image, update `terraform/terraform.tfvars`:

```hcl
container_image = "<registry-url>/deadpartymedia-api:latest"
```

Then apply Terraform:

```bash
terraform apply
```

## Automated Deployment

After initial setup, deployments are automated via GitHub Actions:

1. Push to `main` or `master` branch
2. GitHub Actions runs tests
3. If tests pass, builds Docker image
4. Pushes to Lightsail container registry
5. Creates new deployment
6. Waits for deployment to be active

## Environment Variables

Environment variables are set in two places:

### 1. Terraform (Infrastructure)

In `terraform/main.tf`, the container deployment includes:

```hcl
environment = {
  DJANGO_SETTINGS_MODULE = "config.settings.production"
  DB_HOST                = aws_lightsail_database.deadpartymedia.master_endpoint_address
  # ... other variables
}
```

### 2. AWS Secrets Manager (Sensitive Values)

For sensitive values like `DB_PASSWORD`, `SECRET_KEY`, etc., use AWS Secrets Manager:

1. Create secrets in AWS Secrets Manager
2. Update GitHub Actions workflow to retrieve secrets
3. Pass as environment variables in deployment

Example GitHub Actions step:

```yaml
- name: Get secrets from AWS Secrets Manager
  run: |
    DB_PASSWORD=$(aws secretsmanager get-secret-value \
      --secret-id deadpartymedia/db-password \
      --query SecretString --output text)
    # Add to deployment JSON
```

## Scaling

### Manual Scaling

Update `terraform/terraform.tfvars`:

```hcl
container_power = "small"  # Increase power
container_scale = 2         # Increase number of nodes
```

Then apply:

```bash
terraform apply
```

### Auto-scaling

Lightsail Container Service supports auto-scaling. Configure in Terraform or via AWS Console.

## Monitoring

### View Logs

```bash
# Get container service logs
aws lightsail get-container-log \
  --service-name deadpartymedia-api \
  --container-name api \
  --region us-east-2
```

### Check Service Status

```bash
aws lightsail get-container-services \
  --service-names deadpartymedia-api \
  --region us-east-2
```

### View in AWS Console

1. Go to AWS Lightsail Console
2. Navigate to Container services
3. Select `deadpartymedia-api`
4. View metrics, logs, and deployment history

## Rollback

If a deployment fails:

1. **Via GitHub Actions**: The workflow will show the error
2. **Via AWS Console**: 
   - Go to Container service
   - View deployment history
   - Rollback to previous deployment
3. **Via Terraform**: Revert to previous image tag

## Custom Domain

To use a custom domain (e.g., `api.deadpartymedia.com`):

1. Create SSL certificate in Lightsail
2. Update Terraform with `aws_lightsail_container_service_public_domain_names`
3. Update DNS to point to container service URL

Example Terraform:

```hcl
resource "aws_lightsail_container_service_public_domain_names" "deadpartymedia" {
  container_service_name = aws_lightsail_container_service.deadpartymedia.name

  public_domain_names {
    certificate_name = "api-deadpartymedia-com"
    domain_names     = ["api.deadpartymedia.com"]
  }
}
```

## Troubleshooting

### Deployment fails

1. Check GitHub Actions logs
2. Verify AWS credentials are correct
3. Ensure container service exists: `terraform output container_service_name`
4. Check image was pushed successfully

### Missing GitHub Secrets Error

**Error**: `❌ Error: Missing required GitHub Secrets: AWS_SECRET_ACCESS_KEY`

**Solution**:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
4. Re-run the workflow

### AWS Permission Errors

**Error**: `denied: User: arn:aws:sts::... is not authorized to perform: ecr:InitiateLayerUpload`

**Cause**: The IAM user/role is missing required permissions.

**Solutions**:
1. **If using Lightsail registry** (current workflow): Ensure IAM policy includes Lightsail permissions (see [IAM_POLICIES.md](./IAM_POLICIES.md))
2. **If using ECR**: Add ECR permissions to IAM policy:
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "ecr:GetAuthorizationToken",
       "ecr:InitiateLayerUpload",
       "ecr:UploadLayerPart",
       "ecr:CompleteLayerUpload",
       "ecr:PutImage"
     ],
     "Resource": "arn:aws:ecr:us-east-2:615763501337:repository/deadpartymedia-api"
   }
   ```
3. Verify the IAM user has the correct policy attached:
   ```bash
   aws iam list-attached-user-policies --user-name <your-iam-user>
   ```

**Note**: The current workflow uses Lightsail Container Registry, not ECR. If you see ECR errors, check if the workflow was modified or if there's a configuration issue.

### Container won't start

1. Check container logs via AWS Console or CLI
2. Verify environment variables are set correctly
3. Check database connectivity
4. Verify health check endpoint is accessible

### Database connection errors

1. Verify database endpoint in Terraform outputs
2. Check database security groups allow container service
3. Verify database credentials in environment variables
4. Test connection manually: `psql -h <endpoint> -U <user> -d <db>`

### Registry Authentication Errors

**Error**: `denied: User is not authorized to perform: lightsail:GetContainerServiceRegistryLogin`

**Solution**: Ensure the IAM policy includes `lightsail:GetContainerServiceRegistryLogin` permission. See [IAM_POLICIES.md](./IAM_POLICIES.md) for complete policy examples.

## Cost Optimization

- Start with `micro` power and scale 1 (lowest cost)
- Monitor usage and scale up as needed
- Use auto-scaling to handle traffic spikes
- Review and optimize container image size

## Security

- Use AWS Secrets Manager for sensitive values
- Enable SSL/TLS for custom domains
- Regularly update base images and dependencies
- Review IAM permissions (principle of least privilege)
- Enable container service logging for audit trails

