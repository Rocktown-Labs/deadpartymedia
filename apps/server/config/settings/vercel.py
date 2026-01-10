"""
Django settings for Dead Party Media project on Vercel.

This settings module is specifically configured for Vercel Functions deployment
with Neon PostgreSQL database and WhiteNoise for static file serving.
"""
from .base import *
import os
from urllib.parse import urlparse

DEBUG = False

# ALLOWED_HOSTS from environment variable (comma-separated)
# Should include Vercel domains and custom domain if configured
allowed_hosts_env = os.environ.get("ALLOWED_HOSTS", "")
if allowed_hosts_env:
    ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(",") if host.strip()]
else:
    # Default Vercel domains
    ALLOWED_HOSTS = [
        ".vercel.app",
        ".now.sh",
        "api.deadpartymedia.com",
        "deadpartymedia.com",
        "www.deadpartymedia.com",
    ]

# Disable S3 for Vercel (use WhiteNoise instead)
USE_S3 = False

# Security settings
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True") == "True"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# CORS Configuration for production domains
CORS_ALLOWED_ORIGINS = [
    "https://deadpartymedia.com",
    "https://www.deadpartymedia.com",
    "https://api.deadpartymedia.com",
    "http://localhost:3000",  # Keep for local dev
    "http://localhost:3001",
]

# CSRF Configuration for production domains
CSRF_TRUSTED_ORIGINS = [
    "https://deadpartymedia.com",
    "https://www.deadpartymedia.com",
    "https://api.deadpartymedia.com",
    "http://localhost:3000",  # Keep for local dev
    "http://localhost:3001",
]

# Database Configuration from Neon DATABASE_URL
# Parse DATABASE_URL: postgresql://user:password@host:port/database?sslmode=require
database_url = os.environ.get("DATABASE_URL")
if database_url:
    # Parse the DATABASE_URL
    parsed = urlparse(database_url)
    
    # Extract connection parameters
    db_name = parsed.path.lstrip("/") if parsed.path else os.environ.get("POSTGRES_DATABASE", "neondb")
    db_user = parsed.username or os.environ.get("POSTGRES_USER", "neondb_owner")
    db_password = parsed.password or os.environ.get("POSTGRES_PASSWORD", "")
    db_host = parsed.hostname or os.environ.get("POSTGRES_HOST", "")
    db_port = parsed.port or os.environ.get("PGPORT", "5432")
    
    # Parse query string for sslmode
    sslmode = "require"
    if parsed.query:
        from urllib.parse import parse_qs
        query_params = parse_qs(parsed.query)
        if "sslmode" in query_params:
            sslmode = query_params["sslmode"][0]
    
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": db_name,
            "USER": db_user,
            "PASSWORD": db_password,
            "HOST": db_host,
            "PORT": db_port,
            "OPTIONS": {
                "sslmode": sslmode,
            },
        }
    }
else:
    # Fallback to individual environment variables if DATABASE_URL is not set
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("POSTGRES_DATABASE", os.environ.get("PGDATABASE", "neondb")),
            "USER": os.environ.get("POSTGRES_USER", os.environ.get("PGUSER", "neondb_owner")),
            "PASSWORD": os.environ.get("POSTGRES_PASSWORD", os.environ.get("PGPASSWORD", "")),
            "HOST": os.environ.get("POSTGRES_HOST", os.environ.get("PGHOST", "")),
            "PORT": os.environ.get("PGPORT", "5432"),
            "OPTIONS": {
                "sslmode": os.environ.get("DB_SSLMODE", "require"),
            },
        }
    }

# Static files configuration for Vercel
# Use WhiteNoise for serving static files (already in MIDDLEWARE from base.py)
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# WhiteNoise configuration (when not using S3)
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False  # Disable in production for performance

# Media files (if needed, consider using a CDN or object storage)
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
