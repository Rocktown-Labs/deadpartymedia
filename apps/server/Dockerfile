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
# First sync to validate lock file, then install to system Python
RUN uv sync --frozen --no-dev --no-install-project && \
    uv pip install --system --no-cache . && \
    rm -rf .venv

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
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy installed packages from builder
COPY --from=builder /var/lang/lib/python3.11/site-packages /var/lang/lib/python3.11/site-packages
COPY --from=builder /var/lang/bin /var/lang/bin

# Copy application code
COPY . .

# Collect static files (for WhiteNoise)
RUN uv run python manage.py collectstatic --noinput || true

# Configure Gunicorn for Lambda (single worker, port 8080 for Lambda Web Adapter)
# Lambda Web Adapter expects the app to listen on port 8080
CMD ["gunicorn", "config.wsgi:application", "-w=1", "-b=0.0.0.0:8080", "--timeout=30", "--access-logfile=-", "--error-logfile=-"]

