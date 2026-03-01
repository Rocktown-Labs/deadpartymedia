# Dead Party Media

Your #1 outlet for Arkansas music.

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- Python 3.11+ and [UV](https://github.com/astral-sh/uv)
- Docker (for local PostgreSQL)

### Setup

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**

   ```bash
   # Backend - create .env file (gitignored)
   cp apps/server/.env.example apps/server/.env
   # Edit apps/server/.env with your settings
   # Defaults work with Docker PostgreSQL (see docker-compose.yml)

   # Frontend - create .env.local file (gitignored)
   cp apps/web/.env.example apps/web/.env.local
   # Edit apps/web/.env.local with your settings
   # Default: NEXT_PUBLIC_API_URL=http://localhost:8000/api
   # Also set DATABASE_URL for the web app (Drizzle + Neon)
   ```

3. **Start PostgreSQL (Docker):**

   ```bash
   docker-compose up -d
   ```

4. **Set up Django database:**

   ```bash
   cd apps/server
   uv run python manage.py makemigrations
   uv run python manage.py migrate
   uv run python manage.py createsuperuser
   ```

5. **Run the application:**

   ```bash
   # From root directory - runs both frontend and backend
   pnpm dev
   ```

   Or run individually:

   ```bash
   pnpm dev:web      # Frontend: http://localhost:3001
   pnpm dev:server   # Backend: http://localhost:8000
   ```

## Project Structure

See [APPLICATION_STRUCTURE.md](./APPLICATION_STRUCTURE.md) for detailed documentation on:

- Directory structure
- Environment variables
- Configuration files
- API endpoints
- Content management
- Common tasks

## Tech Stack

### Frontend

- Next.js 16 (App Router)
- React 19
- TanStack Query
- Tailwind CSS v4
- Shadcn UI

### Backend

- Django 5.2
- Django REST Framework
- Django Admin (Jazzmin)
- PostgreSQL
- Amazon S3 (for image storage)
- Django Allauth (authentication)

## Development

### Running Services

```bash
# Both frontend and backend
pnpm dev

# Individual services
pnpm dev:web      # Next.js frontend
pnpm dev:server   # Django backend
```

### Database

Local development uses Docker PostgreSQL:

```bash
docker-compose up -d    # Start
docker-compose down     # Stop
docker-compose logs     # View logs
```

### Admin Access

- Django Admin: http://localhost:8000/admin/
- Create superuser: `cd apps/server && uv run python manage.py createsuperuser`

## Environment Variables

### Backend (`apps/server/.env`)

**Location:** `apps/server/.env` (create from `.env.example`)

- `SECRET_KEY` - Django secret key (generate with: `python -c "import secrets; print(secrets.token_urlsafe(50))"`)
- `DEBUG` - Debug mode (True for dev, False for prod)
- `DB_*` - PostgreSQL connection (defaults match docker-compose.yml)
- `USE_S3` - Enable S3 storage (False for local dev, True for prod)
- `AWS_*` - S3 credentials (only needed if USE_S3=True)

### Frontend (`apps/web/.env.local`)

**Location:** `apps/web/.env.local` (create from `.env.example`)

- `NEXT_PUBLIC_API_URL` - Django API URL (default: http://localhost:8000/api)
- `DATABASE_URL` - Postgres connection string for Next.js server code + API routes (Neon)

Tip: For Neon branch switching, see `apps/web/.env.development.local.example` (dev) and `apps/web/.env.production.local.example` (main).

## Vercel + Neon

This repo expects `DATABASE_URL` to be set in the Vercel Project Environment Variables so API routes can access Postgres.

- **Production**: set `DATABASE_URL` to the Neon **main** branch pooler URL (host like `ep-restless-leaf-...-pooler...`).
- **Preview**: set `DATABASE_URL` to the Neon **dev** branch pooler URL (host like `ep-autumn-lab-...-pooler...`).

Optional (nice for catching migration drift in Preview/CI):

- Set `DB_SCHEMA_SANITY_CHECK=1` for **Preview** (and/or **Development**).

## Database Migrations (GitHub Actions)

This repo includes a workflow that runs Drizzle migrations against the Neon **main** branch when code is pushed to `main`.

- Workflow: `.github/workflows/web-db-migrate.yml`
- Required repo variable:
  - `NEON_PROJECT_ID` (Neon project id, e.g. `cold-mud-71328663`)

- Required repo secrets:
  - `NEON_DATABASE_URL_MAIN` (set this to the Neon **main** branch pooled connection string)
  - `NEON_API_KEY` (Neon API key used to create/delete a temporary branch for a migration dry-run)

## Production

1. **Backend:** Update `apps/server/.env` with production values:
   - Set `DEBUG=False`
   - Set `USE_S3=True` and configure AWS credentials
   - Update `DB_*` with production database connection
   - Set `ALLOWED_HOSTS` with your domain

2. **Frontend:** Update `apps/web/.env.local`:
   - Set `NEXT_PUBLIC_API_URL` to production API URL

3. **Deploy:**
   - Build frontend: `pnpm build`
   - Deploy Django backend (Gunicorn + Nginx recommended)
   - Run migrations on production database

See [APPLICATION_STRUCTURE.md](./APPLICATION_STRUCTURE.md) and [SETUP.md](./SETUP.md) for detailed production setup.

## Deployment

For production deployment to AWS Lightsail:

- **Deployment Guide**: [apps/server/DEPLOYMENT.md](./apps/server/DEPLOYMENT.md)
- **IAM Policies**: [apps/server/IAM_POLICIES.md](./apps/server/IAM_POLICIES.md)

The deployment uses GitHub Actions for CI/CD. Ensure you have:

1. GitHub Secrets configured (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. IAM user with required permissions (see IAM_POLICIES.md)
3. AWS Secrets Manager configured with application secrets
