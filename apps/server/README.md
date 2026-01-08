# Dead Party Media - Django API Server

Containerized Django REST API backend for Dead Party Media.

## Overview

This is a containerized Django application running on AWS Lightsail Container Service. The application is built using Docker, managed by Terraform, and deployed via GitHub Actions.

## Local Development

### Prerequisites

- Docker and Docker Compose
- Python 3.11+ (for running tests locally)
- `uv` package manager (optional, for local development)

### Running with Docker Compose

```bash
# Start all services (API + PostgreSQL)
docker-compose up

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

The API will be available at `http://localhost:8000`

### Running Tests Locally

```bash
cd apps/server

# Install uv if not already installed
pip install uv

# Install dependencies (respects uv.lock)
uv sync

# Run tests
uv run pytest
```

### Environment Variables

For local development, environment variables are set in `docker-compose.yml`. For production, they are managed via:

- AWS Secrets Manager (for sensitive values)
- Terraform (for infrastructure-related values)
- Container service environment variables

Key environment variables:

- `DJANGO_SETTINGS_MODULE`: Settings module to use (`config.settings.development` or `config.settings.production`)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`: Database connection
- `SECRET_KEY`: Django secret key
- `ALLOWED_HOSTS`: Comma-separated list of allowed hosts
- `USE_S3`: Whether to use S3 for static/media files (`True`/`False`)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: AWS credentials (if using S3)

## Project Structure

```
apps/server/
├── config/              # Django configuration
│   ├── settings/        # Environment-specific settings
│   ├── urls.py          # URL routing
│   └── wsgi.py          # WSGI application
├── content/             # Content app (articles, artists, events)
├── users/               # User management app
├── Dockerfile           # Container image definition
├── .dockerignore        # Files excluded from Docker build
├── gunicorn.conf.py     # Gunicorn configuration
├── manage.py            # Django management script
└── pyproject.toml       # Python dependencies
```

## API Endpoints

- API v1: `/v1/`
- Admin: `/deadpartyrocks/`
- Legacy API (backward compatibility): `/api/`

## Health Check

The container includes a health check endpoint at `/v1/` that returns a 200 status when healthy.

## Troubleshooting

### Container won't start

1. Check logs: `docker-compose logs api`
2. Verify database connection: Ensure PostgreSQL is running and accessible
3. Check environment variables: Ensure all required variables are set

### Database connection errors

1. Verify database credentials in environment variables
2. Check database firewall/security groups allow connections from container
3. Ensure database is running: `docker-compose ps postgres`

### Tests failing

1. Ensure all dependencies are installed: `uv pip install -r pyproject.toml`
2. Check database is accessible (tests use test database)
3. Run with verbose output: `uv run pytest -v`

## Additional Resources

- [Deployment Guide](DEPLOYMENT.md) - Production deployment instructions
- [Testing Guide](TESTING.md) - Testing documentation

# trigger deploy
