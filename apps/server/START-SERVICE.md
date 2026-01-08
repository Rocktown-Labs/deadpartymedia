# Starting the Gunicorn Service

If the service is inactive, follow these steps:

## 1. Check Service Logs

```bash
sudo journalctl -u gunicorn -n 50 --no-pager
```

This will show the last 50 log entries and any errors.

## 2. Check if .env.production exists

```bash
cd /home/bitnami/deadpartymedia/apps/server
ls -la .env.production
```

If it doesn't exist, the deployment script should have created it. You may need to run the deployment again or create it manually.

## 3. Try Starting the Service

```bash
sudo systemctl start gunicorn
sudo systemctl status gunicorn
```

## 4. If it fails, check the service file

```bash
cat /etc/systemd/system/gunicorn.service
```

Make sure the paths are correct and the EnvironmentFile points to the right location.

## 5. Test Gunicorn Manually

```bash
cd /home/bitnami/deadpartymedia/apps/server
source .env.production  # Load environment variables
export PATH="$HOME/.cargo/bin:$PATH"
uv run gunicorn --config gunicorn.conf.py config.wsgi:application
```

This will run Gunicorn in the foreground so you can see any errors directly.

