# Dead Party Media - Lightsail Deployment Guide

## Quick Start (Easiest Way)

Run the automated setup script:

```bash
cd apps/server
./setup-lightsail.sh
```

This script will:
1. ✅ Check prerequisites
2. ✅ Test SSH connection
3. ✅ Set up AWS Secrets Manager
4. ✅ Clone repository on instance
5. ✅ Install uv and dependencies
6. ✅ Configure systemd service
7. ✅ Create database
8. ✅ Run initial deployment

## Manual Setup (If Needed)

### 1. One-Time Setup

#### A. Set up AWS Secrets Manager
```bash
./setup-secrets.sh
```

This will prompt you for all required secrets and store them in AWS Secrets Manager.

#### B. Set up the instance
```bash
./setup-lightsail.sh
```

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `AWS_ACCESS_KEY_ID` - IAM user access key
- `AWS_SECRET_ACCESS_KEY` - IAM user secret key

### 3. Create IAM User

Create an IAM user with these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lightsail:GetInstance",
        "lightsail:GetInstances",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "*"
    }
  ]
}
```

## How It Works

### Automated Deployment Flow

1. **Push to main branch** → GitHub Actions triggers
2. **Tests run** → pytest with uv
3. **If tests pass** → Deployment starts
4. **Fetch secrets** → From AWS Secrets Manager
5. **SSH to instance** → Using stored SSH key
6. **Deploy** → Pull code, install deps, migrate, restart

### Files Overview

- `.github/workflows/backend-test-and-deploy.yml` - CI/CD pipeline
- `deploy-lightsail.sh` - Deployment script (runs on instance)
- `deploy-helper.py` - Python helper for local deployments
- `gunicorn.conf.py` - Gunicorn configuration
- `systemd/gunicorn.service` - Systemd service file
- `setup-secrets.sh` - Interactive secrets setup
- `setup-lightsail.sh` - **Master setup script (use this!)**

## Troubleshooting

### SSH Connection Issues
```bash
# Test connection
ssh -i /path/to/key.pem bitnami@18.224.61.135

# Check security groups in Lightsail console
```

### Service Not Starting
```bash
# SSH into instance
ssh -i /path/to/key.pem bitnami@18.224.61.135

# Check service status
sudo systemctl status gunicorn

# Check logs
sudo journalctl -u gunicorn -f
```

### Deployment Fails
```bash
# Check GitHub Actions logs
# Verify secrets in AWS Secrets Manager
# Test deployment manually:
cd /home/bitnami/deadpartymedia/apps/server
bash deploy-lightsail.sh
```

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into instance
ssh -i /path/to/key.pem bitnami@18.224.61.135

# Navigate to app directory
cd /home/bitnami/deadpartymedia/apps/server

# Run deployment script
bash deploy-lightsail.sh
```

Or use the Python helper:

```bash
# From your local machine
python3 deploy-helper.py
```

## Environment Variables

All secrets are stored in AWS Secrets Manager. The deployment script automatically fetches them.

See `.env.example` for a list of all required variables.

## Support

If you run into issues:
1. Check the logs: `sudo journalctl -u gunicorn -f`
2. Verify secrets in AWS Secrets Manager
3. Check GitHub Actions logs
4. Test SSH connection manually

