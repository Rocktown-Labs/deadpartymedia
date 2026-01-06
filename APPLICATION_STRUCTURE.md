# Dead Party Media - Application Structure

This document outlines the structure of the Dead Party Media application and where to find and configure different components.

**Quick Links:**
- [Environment Variables](#environment-variables) - Where to put `.env` files
- [Database Setup](#database-setup) - Docker PostgreSQL for local dev
- [Running the Application](#running-the-application) - Scripts to run frontend and backend
- [Content Management](#content-management) - Creating content manually
- [Key Configuration Files](#key-configuration-files) - Where everything is configured

## Project Overview

Dead Party Media is a monorepo containing:
- **Next.js Frontend** (`apps/web`) - Public-facing website
- **Django Backend** (`apps/server`) - Content management and API
- **React Native App** (`apps/native`) - Mobile app (future)

## Directory Structure

```
deadpartymedia/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── src/
│   │   │   ├── app/            # Next.js App Router pages
│   │   │   │   ├── (site)/     # Public routes (articles, events, artists, etc.)
│   │   │   │   ├── layout.tsx  # Root layout with providers
│   │   │   │   └── globals.css # Global styles
│   │   │   ├── components/     # React components
│   │   │   │   ├── ui/         # Shadcn UI components
│   │   │   │   ├── cart/       # Shopping cart components
│   │   │   │   └── ...
│   │   │   ├── lib/            # Utilities and API clients
│   │   │   │   ├── api/        # TanStack Query hooks and API client
│   │   │   │   │   ├── client.ts      # API client base
│   │   │   │   │   ├── articles.ts    # Article API hooks
│   │   │   │   │   ├── events.ts      # Event API hooks
│   │   │   │   │   ├── artists.ts     # Artist API hooks
│   │   │   │   │   ├── writers.ts    # Writer API hooks
│   │   │   │   │   └── auth.ts       # Authentication hooks
│   │   │   │   ├── fourthwall.ts     # E-commerce integration
│   │   │   │   └── utils.ts          # Utility functions
│   │   │   └── data/           # Static JSON data (legacy, will be migrated)
│   │   ├── public/             # Static assets
│   │   ├── package.json        # Frontend dependencies
│   │   ├── .env.local          # Frontend environment variables (create this)
│   │   └── .env.example        # Example env file
│   │
│   ├── server/                 # Django Backend
│   │   ├── config/             # Django project configuration
│   │   │   ├── settings/       # Settings files
│   │   │   │   ├── __init__.py # Loads development.py by default
│   │   │   │   ├── base.py     # Base settings (shared config)
│   │   │   │   ├── development.py  # Dev-specific settings (default)
│   │   │   │   └── production.py   # Production settings
│   │   │   ├── urls.py         # Main URL configuration
│   │   │   └── wsgi.py         # WSGI configuration
│   │   ├── .env                # Backend environment variables (create this)
│   │   ├── .env.example        # Example env file
│   │   ├── manage.py           # Django management script
│   │   ├── pyproject.toml      # Python dependencies (UV)
│   │   └── media/              # Local media files (when USE_S3=False)
│   │   ├── content/            # Content management app
│   │   │   ├── models.py       # Article, Event, Artist, Writer, Comment models
│   │   │   ├── admin.py        # Django Admin configuration
│   │   │   ├── api/            # REST API
│   │   │   │   ├── serializers.py  # DRF serializers
│   │   │   │   ├── views.py        # API viewsets
│   │   │   │   └── urls.py         # API URL routing
│   │   │   └── migrations/     # Database migrations
│   │   ├── users/              # User management app
│   │   │   ├── models.py       # Custom User model
│   │   │   ├── admin.py        # User admin
│   │   │   ├── api.py          # Auth API endpoints
│   │   │   └── urls.py         # Auth URL routing
│   │   ├── manage.py           # Django management script
│   │   ├── pyproject.toml      # Python dependencies (UV)
│   │   ├── .env                # Backend environment variables (create this)
│   │   ├── .env.example        # Example env file
│   │   └── media/              # Local media files (when USE_S3=False)
│   │
│   └── native/                 # React Native app (future)
│
├── packages/
│   ├── env/                    # Shared environment variable validation
│   │   └── src/
│   │       └── web.ts          # Web environment schema
│   └── config/                 # Shared TypeScript config
│
├── docker-compose.yml          # Local PostgreSQL setup (Docker)
├── package.json                # Root package.json with scripts
├── turbo.json                  # Turborepo configuration
├── .gitignore                  # Git ignore rules
├── README.md                   # Quick start guide
├── SETUP.md                    # Detailed setup instructions
└── APPLICATION_STRUCTURE.md   # This file - application structure guide

```

## Environment Variables

### Backend (Django) - `apps/server/.env`

Create this file from `apps/server/.env.example`:

```bash
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (for local Docker PostgreSQL)
DB_NAME=deadpartymedia
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# S3 Storage
USE_S3=False  # Set to True in production
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
AWS_S3_REGION_NAME=us-east-1
```

**For Production:**
- Set `DEBUG=False`
- Set `USE_S3=True` and configure AWS credentials
- Update `ALLOWED_HOSTS` with your domain
- Use production database credentials

### Frontend (Next.js) - `apps/web/.env.local`

**Location:** `apps/web/.env.local` (create this file - it's gitignored)

**To create:** Copy `apps/web/.env.example` to `apps/web/.env.local` and edit with your values.

```bash
# Django API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**For Production:**
- Set to your production Django API URL (e.g., `https://api.deadpartymedia.com/api`)

## Database Setup

### Local Development (Docker)

The application is configured to use PostgreSQL in Docker for local development.

1. **Start PostgreSQL:**
   ```bash
   # From root directory
   docker-compose up -d
   ```
   
   This starts PostgreSQL on `localhost:5432` with:
   - Database: `deadpartymedia`
   - User: `postgres`
   - Password: `postgres`
   
   These match the defaults in `apps/server/.env.example`

2. **Run Django migrations:**
   ```bash
   cd apps/server
   uv run python manage.py makemigrations
   uv run python manage.py migrate
   ```

3. **Create superuser:**
   ```bash
   uv run python manage.py createsuperuser
   ```

### Production

For production, update `apps/server/.env` with your production PostgreSQL connection:
- `DB_HOST` - Your production database host (e.g., `your-db.railway.app` or `your-db.rds.amazonaws.com`)
- `DB_NAME` - Your production database name
- `DB_USER` - Your production database user
- `DB_PASSWORD` - Your production database password
- `DB_PORT` - Usually `5432` for PostgreSQL

**Note:** The same `.env` file is used, but with production values. You can also use environment variables set by your hosting platform.

## Running the Application

### Development (Both Frontend and Backend)

From the root directory:

```bash
# Run both frontend and backend simultaneously
pnpm dev
```

This uses `concurrently` to run:
- **Frontend**: http://localhost:3001 (Next.js)
- **Backend**: http://localhost:8000 (Django)
- **Django Admin**: http://localhost:8000/admin/

### Running Individual Services

```bash
# Frontend only
pnpm dev:web

# Backend only  
pnpm dev:server
```

### Individual Services

```bash
# Frontend only
pnpm dev:web

# Backend only
pnpm dev:server

# Native app (future)
pnpm dev:native
```

## Key Configuration Files

### Django Settings

**Location:** `apps/server/config/settings/`

- **`base.py`** - Core settings (database, apps, middleware, CORS, S3, CKEditor, Jazzmin)
- **`development.py`** - Development overrides (DEBUG=True, local storage)
- **`production.py`** - Production overrides (DEBUG=False, S3 enabled, security)

**Important Settings:**
- `AUTH_USER_MODEL = "users.User"` - Custom user model
- `CORS_ALLOWED_ORIGINS` - Configure allowed frontend origins (defaults include localhost:3001)
- `USE_S3` - Toggle S3 storage (False in development.py, True in production.py)
- Database settings read from `DB_*` environment variables in `.env`
- `SECRET_KEY` - Read from `SECRET_KEY` environment variable (set in `.env`)

### Django Admin

**Location:** `apps/server/content/admin.py`

- Configured with Jazzmin (dark theme)
- Role-based permissions:
  - **Super Admin**: Full CRUD on all models
  - **Writer**: CRU on own articles/events, can create artists
- Inline admins for Article-Artist and Event-Artist relationships

**Access:** http://localhost:8000/admin/

### API Endpoints

**Location:** `apps/server/content/api/` and `apps/server/users/api.py`

**Public Endpoints:**
- `GET /api/articles/` - List articles (filter by category)
- `GET /api/articles/{slug}/` - Get article by slug
- `GET /api/articles/{slug}/comments/` - Get article comments
- `POST /api/articles/{slug}/comments/` - Create comment (authenticated)
- `GET /api/events/` - List events
- `GET /api/events/{slug}/` - Get event by slug
- `GET /api/artists/` - List artists
- `GET /api/artists/{slug}/` - Get artist by slug
- `GET /api/artists/{slug}/articles/` - Get artist's articles
- `GET /api/artists/{slug}/events/` - Get artist's events
- `GET /api/writers/` - List writers

**Auth Endpoints:**
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login
- `POST /api/auth/logout/` - Logout
- `GET /api/auth/user/` - Get current user
- `POST /api/artists/onboard/` - Create artist profile (authenticated)

### Frontend API Client

**Location:** `apps/web/src/lib/api/`

- **`client.ts`** - Base API client with fetch wrapper
- **`articles.ts`** - `useArticles()`, `useArticle()`, `useArticleComments()`, `useCreateComment()`
- **`events.ts`** - `useEvents()`, `useEvent()`
- **`artists.ts`** - `useArtists()`, `useArtist()`, `useOnboardArtist()`
- **`writers.ts`** - `useWriters()`, `useWriter()`
- **`auth.ts`** - `useRegister()`, `useLogin()`, `useLogout()`, `useCurrentUser()`

### Models

**Location:** `apps/server/content/models.py`

**Models:**
- `Article` - Blog posts/articles with categories
- `Event` - Music events/shows
- `Artist` - Music artists
- `Writer` - Content writers
- `ArticleArtist` - Many-to-many through model (Article ↔ Artist)
- `EventArtist` - Many-to-many through model (Event ↔ Artist)
- `Comment` - Article comments with replies

**Location:** `apps/server/users/models.py`

- `User` - Custom user model with roles (super_admin, admin, writer, artist, fan)

## Content Management

### Creating Content

All content is created through **Django Admin** at http://localhost:8000/admin/

1. **Create Writers:**
   - Go to Users → Writers → Add Writer
   - Link to a User account
   - Only super_admins can create writers

2. **Create Artists:**
   - Go to Content → Artists → Add Artist
   - Slug is auto-generated from name
   - Super admins and writers can create artists

3. **Create Articles:**
   - Go to Content → Articles → Add Article
   - Use CKEditor for rich text content
   - Images in content upload to S3 automatically
   - Associate multiple artists via inline admin
   - Writers can only edit their own articles

4. **Create Events:**
   - Go to Content → Events → Add Event
   - Associate multiple artists via inline admin
   - Writers can only edit their own events

### Image Uploads

- **Cover images** (articles, events) - Upload via Django admin, stored in S3
- **Content images** (within article body) - Upload via CKEditor, stored in S3
- **Artist images** - Upload via Django admin, stored in S3
- **Profile images** - Upload via onboarding flow, stored in S3

**Local Development:** Set `USE_S3=False` in `apps/server/.env` to use local file storage

## Authentication

### User Registration

Users register via `/sign-up` page:
- Select "Music Fan" or "Artist"
- If "Artist", redirected to `/onboarding` after registration
- Onboarding creates Artist profile and links to user account

### Admin Access

- Admin users log in at http://localhost:8000/admin/
- Regular users authenticate via frontend (`/sign-in`)

## Common Tasks

### Adding a New API Endpoint

1. Add serializer in `apps/server/content/api/serializers.py`
2. Add viewset in `apps/server/content/api/views.py`
3. Register route in `apps/server/content/api/urls.py`
4. Create hook in `apps/web/src/lib/api/` (e.g., `articles.ts`)

### Modifying Models

1. Edit `apps/server/content/models.py` or `apps/server/users/models.py`
2. Create migration: `cd apps/server && uv run python manage.py makemigrations`
3. Apply migration: `uv run python manage.py migrate`

### Changing Admin Permissions

Edit `apps/server/content/admin.py`:
- Override `has_add_permission()`, `has_change_permission()`, `has_delete_permission()`
- Override `get_queryset()` to filter by ownership

### Updating Frontend Routes

All public routes are in `apps/web/src/app/(site)/`:
- Pages use TanStack Query hooks from `apps/web/src/lib/api/`
- No static JSON imports - all data comes from Django API

## Troubleshooting

### Database Connection Issues

- Ensure Docker PostgreSQL is running: `docker-compose ps`
- Check `apps/server/.env` has correct database credentials
- Verify database exists: `docker-compose exec postgres psql -U postgres -l`

### CORS Errors

- Check `CORS_ALLOWED_ORIGINS` in `apps/server/config/settings/base.py`
- Ensure frontend URL matches (default: http://localhost:3001)

### S3 Upload Issues

- For local dev, set `USE_S3=False` in `apps/server/.env`
- For production, verify AWS credentials and bucket permissions

### API Not Responding

- Check Django server is running: `pnpm dev:server`
- Verify API URL in `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`
- Check Django logs for errors

## Production Deployment

### Environment Variables

1. **Backend (`apps/server/.env`):**
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
   
   # S3 Storage (required)
   USE_S3=True
   AWS_ACCESS_KEY_ID=your-aws-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret
   AWS_STORAGE_BUCKET_NAME=your-bucket-name
   AWS_S3_REGION_NAME=us-east-1
   ```

2. **Frontend (`apps/web/.env.local`):**
   ```env
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
   ```

### Deployment Steps

1. **Backend:**
   - Set `DJANGO_SETTINGS_MODULE=config.settings.production` or use production `.env`
   - Configure production database (AWS RDS, Railway, etc.)
   - Set `USE_S3=True` and configure AWS credentials
   - Set `ALLOWED_HOSTS` with your domain
   - Run migrations: `uv run python manage.py migrate`
   - Deploy with Gunicorn + Nginx (or similar)

2. **Frontend:**
   - Set `NEXT_PUBLIC_API_URL` to production API URL
   - Build: `pnpm build`
   - Deploy to Vercel/Netlify/etc.

3. **Database:**
   - Use managed PostgreSQL (AWS RDS, Railway, Supabase, etc.)
   - Update `DB_*` variables in production `.env`

4. **S3:**
   - Create S3 bucket
   - Configure IAM user with S3 permissions
   - Set bucket CORS policy for image access
   - Configure bucket for public read access (or use CloudFront CDN)

