# Multi-stage Dockerfile for Dead Party Media Django API (Lambda-compatible)
FROM public.ecr.aws/lambda/python:3.11 as builder

# Install system dependencies for building Python packages
# Lambda Python 3.11 base image uses Amazon Linux 2 (yum)
RUN yum install -y gcc postgresql-devel && \
    yum clean all

# Install uv
RUN pip install --no-cache-dir uv

# Set working directory
WORKDIR /app

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install dependencies using uv with lock file enforcement
# uv sync creates a .venv directory with all dependencies
# We'll copy packages from .venv to system Python in the production stage
# Note: We don't install the project package here since source code isn't copied yet
# The project will be available via copied source code in the production stage
RUN uv sync --frozen --no-dev --no-install-project

# Production stage - use Lambda base image
FROM public.ecr.aws/lambda/python:3.11

# Install runtime dependencies
# Lambda Python 3.11 base image uses Amazon Linux 2 (yum)
RUN yum install -y postgresql-libs && \
    yum clean all

# Install uv in production image
RUN pip install --no-cache-dir uv

# Copy Lambda Web Adapter extension
COPY --from=public.ecr.aws/aws-lambda-adapter:latest /opt/extensions/ /opt/extensions/

# Set working directory
# Use literal path since LAMBDA_TASK_ROOT is a runtime variable, not available during build
WORKDIR /var/task

# Copy the entire .venv directory structure so uv run can work properly
# This preserves the virtual environment structure that uv expects
COPY --from=builder /app/.venv /var/task/.venv

# Copy application code
COPY . .

# Collect static files (for WhiteNoise)
# Set DJANGO_SETTINGS_MODULE to ensure Django can load settings
# Override USE_S3=False during build since AWS credentials aren't available at build time
# Static files will be served via WhiteNoise in Lambda
# Use uv run to execute commands with the copied .venv
ENV DJANGO_SETTINGS_MODULE=config.settings.production
ENV USE_S3=False
RUN uv run python manage.py collectstatic --noinput

# Configure Gunicorn for Lambda (single worker, port 8080 for Lambda Web Adapter)
# Lambda Web Adapter expects the app to listen on port 8080
CMD ["gunicorn", "config.wsgi:application", "-w=1", "-b=0.0.0.0:8080", "--timeout=30", "--access-logfile=-", "--error-logfile=-"]

