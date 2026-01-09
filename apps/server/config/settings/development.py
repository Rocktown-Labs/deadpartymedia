from .base import *
import os

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Override USE_S3 from base settings - use local storage for development
# Set USE_S3=True in .env if you want to use S3 in development
USE_S3 = os.environ.get("USE_S3", "False") == "True"

# Override database SSL settings for local development
# Local PostgreSQL typically doesn't have SSL configured
DATABASES["default"]["OPTIONS"]["sslmode"] = os.environ.get("DB_SSLMODE", "disable")
