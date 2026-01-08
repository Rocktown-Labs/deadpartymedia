from .base import *
import os

DEBUG = False

# ALLOWED_HOSTS from environment variable (comma-separated)
# Should include: api.deadpartymedia.com, deadpartymedia.com, www.deadpartymedia.com
# and the container service URL (e.g., deadpartymedia-api.xxxxx.us-east-2.cs.amazonlightsail.com)
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
    if host.strip()
] if os.environ.get("ALLOWED_HOSTS") else []

# Use S3 for production (should be True)
USE_S3 = os.environ.get("USE_S3", "True") == "True"

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
