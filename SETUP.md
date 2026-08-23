# Setup Guide

This guide details setting up the Dead Party Media monorepo for local development and production deployments.

---

## 🛠️ Prerequisites

- **Node.js**: `20.x` or later
- **pnpm**: `10.x` (Enable via `corepack enable`)
- **Neon PostgreSQL Account**: Access to a Neon project or local PostgreSQL database
- **Clerk Account**: Access to Clerk dashboard for authentication keys

---

## 💻 Local Environment Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/Rocktown-Labs/deadpartymedia.git
cd deadpartymedia
pnpm install
```

### 2. Configure Environment Variables

#### Web Application (`apps/web/.env.local`)

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
# Database connection string (Neon Postgres)
DATABASE_URL=postgresql://user:password@ep-dev-...pooler.eastus2.azure.neon.tech/neondb?sslmode=require

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional Integrations
NEXT_PUBLIC_FW_STOREFRONT_TOKEN=
NEXT_PUBLIC_FW_CHECKOUT=
GOOGLE_GENERATIVE_AI_API_KEY=
```

#### Arts Application (`apps/arts/.env.local`)

```bash
cp apps/arts/.env.example apps/arts/.env.local
```

Edit `apps/arts/.env.local`:

```env
# Database connection string (Shared Neon Postgres instance)
DATABASE_URL=postgresql://user:password@ep-dev-...pooler.eastus2.azure.neon.tech/neondb?sslmode=require

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Cloudflare R2 (Media / Image Uploads)
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=

# App Configuration
VITE_APP_TITLE="Dead Party Arts"
```

---

## 🏃 Running the Applications

### Start via Portless (Recommended)

Run all dev servers:

```bash
pnpm dev:all
```

Navigate to:

- **Dead Party Media**: [`https://deadpartymedia.localhost`](https://deadpartymedia.localhost)
- **Dead Party Arts**: [`https://arts.deadpartymedia.localhost`](https://arts.deadpartymedia.localhost)

### Start Individual Services

```bash
pnpm dev:web      # Web app only (http://localhost:3000)
pnpm dev:arts     # Arts app only (http://localhost:3001)
pnpm dev:native   # Expo mobile dev server
```

---

## 🗄️ Database Migrations

Database schemas live in `packages/db/src/schema.ts`.

```bash
# Generate migrations
pnpm web:db:generate

# Apply migrations
pnpm web:db:migrate

# Launch Drizzle Studio
pnpm web:db:studio
```
