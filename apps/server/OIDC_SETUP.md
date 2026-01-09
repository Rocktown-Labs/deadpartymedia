# OIDC Authentication Setup

## Overview

This project uses **OIDC (OpenID Connect)** for secure authentication between GitHub Actions and AWS, eliminating the need to store static AWS credentials in GitHub Secrets.

## What Changed

### Before (Static Credentials)
- Required `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as GitHub Secrets
- Credentials had to be rotated manually
- Higher security risk if credentials were exposed

### After (OIDC)
- Uses GitHub's OIDC provider to authenticate with AWS
- No static credentials stored in GitHub
- Automatic token-based authentication
- More secure and easier to manage

## IAM Role Configuration

The workflow uses the IAM role: `arn:aws:iam::992382618631:role/github-actions`

### Trust Policy

The role's trust policy allows GitHub Actions to assume it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::992382618631:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:cgRGM/deadpartymedia:ref:refs/heads/master"
        }
      }
    }
  ]
}
```

### Required Permissions

The role needs the following permissions (see `apps/server/IAM_POLICIES.md` for details):

- **ECR**: Push/pull container images
- **Lambda**: Update function code and configuration
- **Secrets Manager**: Read secrets (db-password, secret-key, etc.)
- **Lightsail**: Read database information
- **S3**: Read/write (if Lambda needs explicit S3 access)

## Workflow Changes

### Authentication Step

The workflow now uses OIDC instead of static credentials:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::992382618631:role/github-actions
    aws-region: ${{ env.AWS_REGION }}
    role-session-name: GitHubActions-DeadPartyMedia-${{ github.run_id }}
```

### Removed Steps

- ❌ "Validate AWS credentials" step (no longer needed)
- ❌ GitHub Secrets for `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (removed)

### What Still Uses Secrets Manager

The following secrets are still retrieved from **AWS Secrets Manager** (not GitHub Secrets) and passed to the Lambda function:

- `deadpartymedia/db-password` - Database password
- `deadpartymedia/secret-key` - Django SECRET_KEY
- `deadpartymedia/aws-access-key-id` - Optional S3 credentials (if Lambda needs explicit access)
- `deadpartymedia/aws-secret-access-key` - Optional S3 credentials (if Lambda needs explicit access)
- `deadpartymedia/aws-storage-bucket-name` - S3 bucket name

**Note**: If the Lambda execution role has S3 permissions, the AWS credentials may not be needed.

## Verification

After setting up OIDC, verify it works:

1. **Check the workflow run** - The "Verify AWS authentication" step should succeed
2. **Check CloudTrail** - You should see `AssumeRoleWithWebIdentity` calls from GitHub Actions
3. **Check IAM role usage** - The role should show recent activity

## Troubleshooting

### "Access Denied" errors

- Verify the IAM role trust policy matches your repository and branch
- Check the role has the required permissions
- Ensure the OIDC provider is configured correctly in AWS

### "Role cannot be assumed" errors

- Check the role ARN is correct: `arn:aws:iam::992382618631:role/github-actions`
- Verify the trust policy allows `sts:AssumeRoleWithWebIdentity`
- Check the condition matches your repository: `repo:cgRGM/deadpartymedia:ref:refs/heads/master`

### Workflow still fails

- Check CloudWatch Logs for the IAM role
- Verify the role session name is unique (uses `${{ github.run_id }}`)
- Ensure the workflow runs on the correct branch (master/main)

## Security Benefits

1. **No static credentials** - Tokens are generated per-run and expire automatically
2. **Audit trail** - All authentication attempts are logged in CloudTrail
3. **Least privilege** - Role permissions can be scoped to exactly what's needed
4. **Automatic rotation** - No manual credential rotation needed

## Next Steps

1. ✅ OIDC is configured and active
2. ✅ Workflow updated to use OIDC
3. ⚠️ **Remove old GitHub Secrets** (if they exist):
   - Go to: Settings → Secrets and variables → Actions
   - Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (if present)
   - These are no longer needed with OIDC

## References

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Provider Setup](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
