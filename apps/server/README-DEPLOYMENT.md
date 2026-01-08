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
ssh -i /path/to/key.pem bitnami@18.189.190.211

# Check security groups in Lightsail console
```

### Service Not Starting
```bash
# SSH into instance
ssh -i /path/to/key.pem bitnami@18.189.190.211

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
ssh -i /path/to/key.pem bitnami@18.189.190.211

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

## Domain Setup

### DNS Configuration

1. **Create Route53 A Record**:
   - Go to Route53 → Hosted Zones → deadpartymedia.com
   - Create A record: `api` → Your Lightsail IP (18.189.190.211 - get current IP with `terraform output instance_ip`)
   - TTL: 300 seconds

2. **Wait for DNS Propagation** (usually 5-15 minutes)

### Nginx Configuration

1. **SSH into your Lightsail instance**:
   ```bash
   ssh -i /path/to/key.pem bitnami@your-instance-ip
   ```

2. **Run the nginx setup script**:
   ```bash
   sudo bash /home/bitnami/deadpartymedia/apps/server/setup-nginx.sh
   ```

3. **If SSL certificate setup fails** (DNS not ready yet):
   ```bash
   # After DNS propagates, run:
   sudo certbot --nginx -d api.deadpartymedia.com
   ```

### Access Points

After setup:
- **API**: `https://api.deadpartymedia.com/v1/`
- **Admin**: `https://api.deadpartymedia.com/deadpartyrocks/`
- **Frontend Admin Route**: `https://deadpartymedia.com/deadpartyrocks/` (proxied via Vercel)

### Logo Setup

The Django admin logo is configured to use the logo from S3 at `s3://deadpartymedia-bucket/static/images/dead-party-logo.png`.

**Important**: If your S3 bucket has **Block Public Access enabled**, the logo URL won't be publicly accessible. You have a few options:

#### Option 1: Disable Block Public Access for Static Files (Recommended)
1. Go to S3 Console → `deadpartymedia-bucket` → Permissions → Block Public Access
2. Edit and uncheck "Block public access to buckets and objects granted through new access control lists (ACLs)"
3. Or create a bucket policy to allow public read access to `static/images/*`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::deadpartymedia-bucket/static/images/*"
    }
  ]
}
```

#### Option 2: Use CloudFront
Set up a CloudFront distribution pointing to your S3 bucket and update `STATIC_URL` to use the CloudFront domain.

#### Option 3: Serve from Nginx (Fallback)
If you prefer to serve the logo from nginx instead of S3, the logo is also included in Django's static files at `apps/server/config/static/images/dead-party-logo.png`. When `collectstatic` runs, it will be available in `staticfiles/` and served by nginx.

### Creating Admin Users in Production

SSH into the instance and run:

```bash
cd /home/bitnami/deadpartymedia/apps/server
source .env.production  # Load environment variables
uv run python manage.py createsuperuser
```

Or use Django shell:

```bash
uv run python manage.py shell
```

Then in Python:
```python
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.create_superuser('admin', 'admin@deadpartymedia.com', 'your-password')
```

## Support

If you run into issues:
1. Check the logs: `sudo journalctl -u gunicorn -f`
2. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify secrets in AWS Secrets Manager
4. Check GitHub Actions logs
5. Test SSH connection manually
6. Verify DNS: `dig api.deadpartymedia.com`

