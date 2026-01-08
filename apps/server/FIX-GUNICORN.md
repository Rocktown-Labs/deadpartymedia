# Fixing Gunicorn Service Startup

The error `status=203/EXEC` means the ExecStart command failed. This is usually because `uv` is not found.

## Step 1: Check if uv is installed and where

```bash
which uv
uv --version
```

If `uv` is not found, install it:
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
export PATH="$HOME/.cargo/bin:$PATH"
```

## Step 2: Test Gunicorn manually

```bash
cd /home/bitnami/deadpartymedia/apps/server
export PATH="$HOME/.cargo/bin:$PATH"
source .env.production
uv run gunicorn --config gunicorn.conf.py config.wsgi:application
```

If this works, the issue is with the systemd service path.

## Step 3: Fix the service file

If `uv` is in a different location, update the service file:

```bash
sudo nano /etc/systemd/system/gunicorn.service
```

Update the ExecStart line to use the correct path. If `uv` is at `/home/bitnami/.cargo/bin/uv`, make sure that path exists.

Alternatively, you can use a wrapper script or change the ExecStart to use a full path that works.

## Step 4: Reload and restart

```bash
sudo systemctl daemon-reload
sudo systemctl start gunicorn
sudo systemctl status gunicorn
```

