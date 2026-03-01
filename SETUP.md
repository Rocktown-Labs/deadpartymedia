# Setup Guide

## Initial Setup

### 1. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Python dependencies are managed by UV and will be installed automatically
```

### 2. Environment Variables

#### Backend (`apps/server/.env`)

**Location:** `apps/server/.env` (create this file - it's gitignored)

Create `apps/server/.env` from the example:

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env`:

```env
# Django Settings
SECRET_KEY=your-secret-key-here-generate-a-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for local Docker PostgreSQL)
DB_NAME=deadpartymedia
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# S3 Storage (set to False for local development)
USE_S3=False
# AWS_ACCESS_KEY_ID=your-key
# AWS_SECRET_ACCESS_KEY=your-secret
# AWS_STORAGE_BUCKET_NAME=your-bucket
# AWS_S3_REGION_NAME=us-east-1
```

**Generate SECRET_KEY:**

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

#### Frontend (`apps/web/.env.local`)

**Location:** `apps/web/.env.local` (create this file - it's gitignored)

**To create:**

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Required for Next.js server code + API routes (Drizzle + Neon)
# Use the Neon branch you want to target (dev vs main)
DATABASE_URL=postgresql://USER:PASSWORD@HOST/neondb?sslmode=require
```

#### Vercel (recommended)

If you're deploying the web app to Vercel, set `DATABASE_URL` in **Vercel → Project → Settings → Environment Variables**:

- **Production**: point to Neon **main** branch connection string
- **Preview**: point to Neon **dev** branch connection string

Optional (helps catch missing migrations early): set `DB_SCHEMA_SANITY_CHECK=1` for Preview.

### 3. Start PostgreSQL (Docker)

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify it's running
docker-compose ps

# View logs if needed
docker-compose logs postgres
```

### 4. Set Up Django Database

```bash
cd apps/server

# Create migrations
uv run python manage.py makemigrations

# Apply migrations
uv run python manage.py migrate

# Create superuser (for Django admin)
uv run python manage.py createsuperuser
```

### 5. Run the Application

From the root directory:

```bash
# Run both frontend and backend
pnpm dev
```

This will start:

- **Frontend**: http://localhost:3001
- **Backend**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin/

## Creating Content

All content is created manually through Django Admin at http://localhost:8000/admin/

Simply copy and paste your content into the admin forms - no import scripts needed!

1. Log in with your superuser credentials
2. Navigate to the appropriate section:
   - **Users → Writers** - Create writer profiles
   - **Content → Artists** - Create artist profiles
   - **Content → Articles** - Create articles (use CKEditor for rich text)
   - **Content → Events** - Create events

### Tips

- **Slugs** are auto-generated from titles/names (you can edit them)
- **Images** upload to local storage in development (S3 in production)
- **Rich text** in articles uses CKEditor - images in content upload to S3 automatically
- **Multiple artists** can be associated with articles/events via inline admin
- **Copy/paste** your content directly into the admin forms

## Production Setup

### Backend Environment Variables

Update `apps/server/.env` for production:

```env
SECRET_KEY=your-production-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

# Production Database
DB_NAME=deadpartymedia_prod
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_HOST=your-db-host.com
DB_PORT=5432

# S3 Storage (required in production)
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

### Frontend Environment Variables

Update `apps/web/.env.local` for production:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Production Database

1. Set up managed PostgreSQL (AWS RDS, Railway, etc.)
2. Update `DB_*` variables in production `.env`
3. Run migrations on production database

### S3 Configuration

1. Create S3 bucket
2. Create IAM user with S3 permissions
3. Configure bucket CORS policy for image access
4. Set `USE_S3=True` and add AWS credentials

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check database exists
docker-compose exec postgres psql -U postgres -l
```

### Port Already in Use

If port 3001 or 8000 is already in use:

```bash
# Change frontend port in apps/web/package.json
"dev": "next dev --port 3002"

# Change backend port
cd apps/server
uv run python manage.py runserver 8001
```

### CORS Errors

If you see CORS errors, check:

1. `CORS_ALLOWED_ORIGINS` in `apps/server/config/settings/base.py`
2. Frontend URL matches (default: http://localhost:3001)

### Migration Issues

```bash
cd apps/server

# Reset migrations (WARNING: deletes data)
rm -rf content/migrations/0*.py users/migrations/0*.py
uv run python manage.py makemigrations
uv run python manage.py migrate
```

## Useful Commands

```bash
# Start both services
pnpm dev

# Start individually
pnpm dev:web      # Frontend only
pnpm dev:server   # Backend only

# Database
docker-compose up -d          # Start PostgreSQL
docker-compose down           # Stop PostgreSQL
docker-compose logs postgres  # View logs

# Django
cd apps/server
uv run python manage.py createsuperuser  # Create admin user
uv run python manage.py makemigrations   # Create migrations
uv run python manage.py migrate          # Apply migrations
uv run python manage.py runserver        # Run dev server
```
