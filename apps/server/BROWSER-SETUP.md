# Setup Instructions for Lightsail Browser Terminal

Run these commands in order in the Lightsail browser terminal:

## Step 1: Install uv (Python package manager)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"
```

Verify installation:
```bash
uv --version
```

## Step 2: Install System Dependencies

```bash
sudo apt-get update
sudo apt-get install -y libpq-dev postgresql-client python3-dev build-essential git
```

## Step 3: Clone the Repository

```bash
mkdir -p /home/bitnami/deadpartymedia
cd /home/bitnami
git clone https://github.com/cgRGM/deadpartymedia.git
```

## Step 4: Set Up Systemd Service

```bash
cd /home/bitnami/deadpartymedia/apps/server
sudo cp systemd/gunicorn.service /etc/systemd/system/gunicorn.service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
```

## Step 5: Verify Setup

```bash
cd /home/bitnami/deadpartymedia/apps/server
ls -la
```

You should see the project files.

## Next Steps

After this, you'll need to:
1. Set up AWS Secrets Manager (from your local machine: `./setup-secrets.sh`)
2. Deploy the application (either via GitHub Actions or manually)

For manual deployment, you'll need to create a `.env.production` file with all the environment variables, then run `bash deploy-lightsail.sh`.

