# IAM Policies for Dead Party Media Deployment

This document provides the exact IAM policies needed for GitHub Actions to deploy the Dead Party Media API.

## Overview

The deployment workflow requires AWS credentials with permissions for:

- **Lightsail Container Service** (for deployment)
- **Lightsail Container Registry** (for pushing images - currently used)
- **ECR** (Elastic Container Registry - available but not currently used in workflow)
- **Secrets Manager** (for retrieving application secrets)
- **Lightsail Database** (for retrieving database connection details)

## Required GitHub Secrets

Before setting up IAM policies, ensure these secrets are configured in GitHub:

1. Go to your repository: **Settings → Secrets and variables → Actions**
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your AWS access key ID
   - `AWS_SECRET_ACCESS_KEY`: Your AWS secret access key

## IAM Policy Options

### Option 1: Minimal Policy (Recommended)

This policy grants only the permissions needed for the current workflow:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LightsailContainerService",
      "Effect": "Allow",
      "Action": [
        "lightsail:GetContainerServices",
        "lightsail:CreateContainerServiceDeployment",
        "lightsail:GetContainerServiceRegistryLogin",
        "lightsail:WaitContainerServiceDeploymentReady"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LightsailDatabase",
      "Effect": "Allow",
      "Action": ["lightsail:GetRelationalDatabase"],
      "Resource": "arn:aws:lightsail:us-east-2:615763501337:RelationalDatabase/deadpartymediaDB"
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-2:615763501337:secret:deadpartymedia/*"
      ]
    }
  ]
}
```

### Option 2: Complete Policy (If Using ECR)

If you plan to use ECR instead of Lightsail registry, add these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRGetAuthorizationToken",
      "Effect": "Allow",
      "Action": ["ecr:GetAuthorizationToken"],
      "Resource": "*"
    },
    {
      "Sid": "ECRRepositoryAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "arn:aws:ecr:us-east-2:615763501337:repository/deadpartymedia-api"
    },
    {
      "Sid": "LightsailContainerService",
      "Effect": "Allow",
      "Action": [
        "lightsail:GetContainerServices",
        "lightsail:CreateContainerServiceDeployment",
        "lightsail:GetContainerServiceRegistryLogin",
        "lightsail:WaitContainerServiceDeploymentReady"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LightsailDatabase",
      "Effect": "Allow",
      "Action": ["lightsail:GetRelationalDatabase"],
      "Resource": "arn:aws:lightsail:us-east-2:615763501337:RelationalDatabase/deadpartymediaDB"
    },
    {
      "Sid": "SecretsManager",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-2:615763501337:secret:deadpartymedia/*"
      ]
    }
  ]
}
```

### Option 3: Full Access (For Development/Testing Only)

⚠️ **Warning**: This grants broad access. Use only for development/testing:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lightsail:*",
        "ecr:*",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "*"
    }
  ]
}
```

## Applying the Policy

### Step 1: Create IAM User (if not exists)

```bash
aws iam create-user --user-name deadpartymedia-github-actions
```

### Step 2: Create Policy

Save one of the policies above to a file (e.g., `github-actions-policy.json`), then:

```bash
aws iam create-policy \
  --policy-name DeadPartyMediaGitHubActions \
  --policy-document file://github-actions-policy.json \
  --description "Policy for GitHub Actions deployment workflow"
```

### Step 3: Attach Policy to User

```bash
aws iam attach-user-policy \
  --user-name deadpartymedia-github-actions \
  --policy-arn arn:aws:iam::615763501337:policy/DeadPartyMediaGitHubActions
```

### Step 4: Create Access Keys

```bash
aws iam create-access-key --user-name deadpartymedia-github-actions
```

Save the `AccessKeyId` and `SecretAccessKey` - these are what you'll add to GitHub Secrets.

## Troubleshooting

### Error: "User is not authorized to perform: ecr:InitiateLayerUpload"

**Cause**: The workflow is trying to use ECR, but the IAM user doesn't have ECR permissions.

**Solutions**:

1. **If using Lightsail registry** (current workflow): Ensure you're using `lightsail:GetContainerServiceRegistryLogin` instead of ECR login
2. **If using ECR**: Add the ECR permissions from Option 2 above
3. **Check which registry is being used**: Review the workflow file at `.github/workflows/deploy-container.yml`

### Error: "Missing required GitHub Secrets"

**Cause**: `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY` is not set in GitHub Secrets.

**Solution**:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with values from Step 4 above

### Error: "denied: User is not authorized to perform: lightsail:GetContainerServiceRegistryLogin"

**Cause**: Missing Lightsail permissions.

**Solution**: Ensure the IAM policy includes all Lightsail actions listed in Option 1 or Option 2.

## Current Workflow Registry

The current workflow (`.github/workflows/deploy-container.yml`) uses **Lightsail Container Registry**, not ECR. If you see ECR errors, it might be because:

1. The workflow was modified to use ECR
2. There's a configuration mismatch
3. Docker is trying to authenticate with ECR instead of Lightsail registry

To verify which registry is being used, check the workflow step "Get Lightsail container registry login" - this confirms Lightsail registry is being used.

## Switching to ECR

If you want to switch from Lightsail registry to ECR:

1. Update the workflow to use ECR login instead of Lightsail registry login
2. Ensure the IAM policy includes ECR permissions (Option 2)
3. Update the image name format to use ECR repository URL

Example ECR login step:

```yaml
- name: Login to Amazon ECR
  uses: aws-actions/amazon-ecr-login@v2
```

## Security Best Practices

1. **Use least privilege**: Start with Option 1 (minimal policy)
2. **Rotate keys regularly**: Regenerate access keys every 90 days
3. **Use separate IAM users**: Don't reuse personal AWS credentials
4. **Monitor access**: Enable CloudTrail to audit IAM actions
5. **Scope resources**: Use specific ARNs instead of `*` where possible

## Account ID and Region

- **AWS Account ID**: `615763501337`
- **Region**: `us-east-2`
- **ECR Repository**: `deadpartymedia-api`
- **Lightsail Service**: `deadpartymedia-api`
- **Database**: `deadpartymediaDB`

Update these values in the policy ARNs if your setup differs.
