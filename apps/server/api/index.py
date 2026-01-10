"""
Vercel WSGI entry point for Dead Party Media Django API.

This file exposes the Django WSGI application to Vercel Functions.
According to Vercel docs, Django requires exposing the WSGI `application` variable.
"""
import os
import sys
from pathlib import Path

# Add the server app directory to Python path
# Since this file is in apps/server/api/, we need to go up one level to apps/server/
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set Django settings module (can be overridden by environment variable)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.vercel")

# Import Django WSGI application
from config.wsgi import application
