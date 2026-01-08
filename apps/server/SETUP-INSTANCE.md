# Setting Up Empty Bitnami Instance

If your Bitnami instance is empty and needs initial setup, follow these steps:

## Quick Setup (Automated)

Run the automated setup script from your local machine:

```bash
cd apps/server
./quick-setup.sh
```

This script will:
1. ✅ Test SSH connection
2. ✅ Install `uv` (Python package manager)
3. ✅ Install system dependencies (PostgreSQL client, build tools)
4. ✅ Clone the repository
5. ✅ Set up systemd service
6. ✅ Create `.env.production.template`

## Manual Setup (If Needed)

### 1. Test SSH Connection

```bash
ssh -i ~/Downloads/deadparty-server.pem bitnami@18.189.190.211
```

If connection fails, check:
- SSH key permissions: `chmod 600 ~/Downloads/deadparty-server.pem`
- Lightsail security groups allow SSH (port 22)
- Instance IP is correct

### 2. Install uv

```bash
ssh -i ~/Downloads/deadparty-server.pem bitnami@18.189.190.211
curl -LsSf https://astral.sh/uv/install.sh | sh
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"
```

### 3. Install System Dependencies

```bash
sudo apt-get update
sudo apt-get install -y libpq-dev postgresql-client python3-dev build-essential
```

### 4. Clone Repository

```bash
mkdir -p /home/bitnami/deadpartymedia
cd /home/bitnami
git clone https://github.com/cgRGM/deadpartymedia.git
```

### 5. Set Up Systemd Service

```bash
cd /home/bitnami/deadpartymedia/apps/server
sudo cp systemd/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
```

## After Setup

### 1. Set Up AWS Secrets Manager

From your local machine:

```bash
cd apps/server
./setup-secrets.sh
```

This will prompt you for all required secrets and store them in AWS Secrets Manager.

### 2. Deploy

You can deploy in two ways:

**Option A: Via GitHub Actions (Recommended)**
- Push to `main` branch
- GitHub Actions will automatically deploy

**Option B: Manual Deployment**
```bash
ssh -i ~/Downloads/deadparty-server.pem bitnami@18.189.190.211
cd /home/bitnami/deadpartymedia/apps/server

# Set environment variables (get from AWS Secrets Manager or .env.production)
export DB_HOST="your-db-endpoint"
export DB_USER="your-db-user"
export DB_PASSWORD="your-db-password"
# ... (all other env vars)

# Run deployment
bash deploy-lightsail.sh
```

### 3. Create Admin User

```bash
ssh -i ~/Downloads/deadparty-server.pem bitnami@18.189.190.211
cd /home/bitnami/deadpartymedia/apps/server
source .env.production  # If you created it
uv run python manage.py createsuperuser
```

## Troubleshooting

### SSH Connection Issues
- Check key permissions: `chmod 600 ~/Downloads/deadparty-server.pem`
- Verify security groups in Lightsail console allow SSH (port 22)
- Check instance status in Lightsail console

### uv Not Found
- Make sure you ran the install script
- Check PATH: `echo $PATH` should include `~/.cargo/bin`
- Try: `export PATH="$HOME/.cargo/bin:$PATH"`

### Git Clone Fails
- Check internet connectivity on instance
- Verify repository URL is correct
- Check if repository is private (may need SSH key setup)

### Service Won't Start
- Check logs: `sudo journalctl -u gunicorn -f`
- Verify `.env.production` exists and has all required variables
- Check database connectivity

