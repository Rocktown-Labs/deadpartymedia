from .base import *
import os
import copy

DEBUG = True

ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Override USE_S3 from base settings - use local storage for development
# Set USE_S3=True in .env if you want to use S3 in development
USE_S3 = os.environ.get("USE_S3", "False") == "True"

# Override database SSL settings for local development
# Local PostgreSQL typically doesn't have SSL configured
# Create a deep copy to avoid mutating the shared DATABASES dict from base.py
# Validate DATABASES exists and has the expected structure before copying
if "DATABASES" not in globals() or not DATABASES:
    raise RuntimeError("DATABASES not properly initialized in base.py")

# Validate nested structure exists before deep copying and accessing
if "default" not in DATABASES:
    raise RuntimeError("DATABASES['default'] not found in base.py")
if "OPTIONS" not in DATABASES["default"]:
    raise RuntimeError("DATABASES['default']['OPTIONS'] not found in base.py")

DATABASES = copy.deepcopy(DATABASES)
DATABASES["default"]["OPTIONS"]["sslmode"] = os.environ.get("DB_SSLMODE", "disable")
