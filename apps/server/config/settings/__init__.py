# Import development settings by default
# Override with DJANGO_SETTINGS_MODULE environment variable for production
import os

if os.environ.get("DJANGO_SETTINGS_MODULE", "").endswith("production"):
    from .production import *
else:
    from .development import *
