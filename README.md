# Dead Party Media (`dpmedia`)

> The premier digital outlet and community platform for Arkansas music, arts, and culture.

Dead Party Media is a full-stack TypeScript monorepo powering editorial coverage, event listings, artist & artmaker directories, gallery exhibitions, community interaction, e-commerce storefronts, and mobile experiences across Arkansas.

---

## 🏛️ Monorepo Architecture

This repository is organized as a monorepo managed with [Turborepo](https://turbo.build/repo) and [pnpm workspaces](https://pnpm.io/workspaces):

```txt
deadpartymedia/
├── apps/
│   ├── web/        # Main Next.js 16 Web Application (deadpartymedia.com)
│   ├── arts/       # Dead Party Arts Portal (arts.deadpartymedia.com)
│   └── native/     # Dead Party Mobile App (Expo SDK 54 / React Native)
├── packages/
│   ├── db/         # Central Drizzle ORM schema, relations & Neon Postgres client
│   ├── env/        # Type-safe environment validation schemas (@t3-oss/env-core + Zod)
│   └── config/     # Shared TypeScript & build configs
```

### Applications

| App               | Framework / Stack                                                                              | Role / Description                                                                                                  | Local Dev Domain (Portless)             |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **`apps/web`**    | Next.js 16 (App Router), React 19, Tailwind CSS v4, Shadcn UI, Clerk, TipTap, Fourthwall       | Music editorial magazine, show calendar, artist directory, article comments, and merch store.                       | `https://deadpartymedia.localhost`      |
| **`apps/arts`**   | TanStack React Start, Nitro, React 19, Tailwind CSS v4, Radix UI, Clerk, TipTap, Cloudflare R2 | Arkansas arts directory, artist profiles (artmakers), gallery exhibitions, AI flyer ingestion, and arts storefront. | `https://arts.deadpartymedia.localhost` |
| **`apps/native`** | Expo SDK 54, Expo Router v6, React Native 0.81, React 19, TanStack Query v5, TanStack Form     | Cross-platform iOS and Android mobile app for music, shows, and discovery.                                          | `http://localhost:8081`                 |

### Shared Packages

| Package                                   | Purpose                                                                                                                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`packages/db`** (`@dpmedia/db`)         | Central Drizzle ORM database schemas (`users`, `posts`, `events`, `artists`, `artmakers`, `artworks`, `venues`, `comments`, `tags`, etc.), relations, and Neon client. |
| **`packages/env`** (`@dpmedia/env`)       | Type-safe environment variable schemas using `@t3-oss/env-core` and `zod`.                                                                                             |
| **`packages/config`** (`@dpmedia/config`) | Shared TypeScript configurations and tool presets.                                                                                                                     |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** `20.x` or higher
- **pnpm** `10.x` (enable via `corepack enable`)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create the local environment files for the applications:

#### Web App (`apps/web/.env.local`)

Copy from template and fill in your keys:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Key variables:

- `DATABASE_URL`: Neon PostgreSQL connection string (pooled connection)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication keys
- `NEXT_PUBLIC_FW_*`: Fourthwall e-commerce storefront keys (optional)
- `GOOGLE_GENERATIVE_AI_API_KEY`: AI integration key (optional)

#### Arts App (`apps/arts/.env.local`)

Copy from template and fill in your keys:

```bash
cp apps/arts/.env.example apps/arts/.env.local
```

Key variables:

- `DATABASE_URL`: Neon PostgreSQL connection string (shares same DB)
- `VITE_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: Clerk authentication keys
- `CLOUDFLARE_R2_*`: Cloudflare R2 bucket credentials for media uploads
- `VITE_FW_*`: Fourthwall Arts collection keys (optional)
- `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`: AI flyer import (optional)

### 3. Run Development Servers

Run both web and native apps simultaneously:

```bash
pnpm dev
```

Or run all applications in the monorepo via Turborepo:

```bash
pnpm dev:all
```

Or run specific applications:

```bash
pnpm dev:web      # Main Next.js web application
pnpm dev:arts     # TanStack Start arts application
pnpm dev:native   # Expo mobile application
```

---

## 🌐 Local Development with Portless

This repository utilizes [Portless](https://github.com/Rocktown-Labs) for local development with named, HTTPS-ready `.localhost` domains without port collisions:

- **Dead Party Media Web**: [`https://deadpartymedia.localhost`](https://deadpartymedia.localhost)
- **Dead Party Arts**: [`https://arts.deadpartymedia.localhost`](https://arts.deadpartymedia.localhost)

To run any app directly without Portless:

```bash
# Web
pnpm --filter web dev:app

# Arts
PORTLESS=0 pnpm --filter arts dev:app
```

---

## 🗄️ Database Management (Drizzle ORM + Neon)

Database schemas are centrally maintained in [`packages/db/src/schema.ts`](./packages/db/src/schema.ts) and connected to **Neon Serverless PostgreSQL**.

### Common Database Commands

```bash
# Generate migration files from schema changes
pnpm web:db:generate
pnpm arts:db:generate

# Apply pending migrations
pnpm web:db:migrate
pnpm arts:db:migrate

# Push schema directly to database (development / prototyping)
pnpm web:db:push
pnpm arts:db:push

# Open Drizzle Studio web GUI
pnpm web:db:studio
pnpm arts:db:studio
```

---

## 🛠️ Content & Migration Utilities

The web workspace includes utilities for migrating, normalizing, and managing legacy WordPress content:

```bash
# Backfill posts from WordPress
pnpm --filter web content:wordpress:backfill

# Remap legacy WordPress authors to Clerk users
pnpm --filter web content:wordpress:remap-authors

# Preview post content HTML normalization
pnpm --filter web content:posts:normalize

# Apply post content HTML normalization to database
pnpm --filter web content:posts:normalize:apply

# Decode HTML entities in post titles
pnpm --filter web content:posts:decode-titles
```

---

## 🧪 Quality Gates & Testing

We enforce strict code quality using **Ultracite**, **TypeScript**, and **Vitest / Vite Plus**:

```bash
# Run Ultracite linter and formatter check
pnpm check

# Automatically format and fix lint errors
pnpm fix

# Typecheck all workspaces
pnpm check-types

# Run unit and integration tests
pnpm web:test       # Web tests (Vitest)
pnpm arts:test      # Arts tests (Vitest)

# Run Playwright E2E tests
pnpm web:test:e2e
pnpm web:test:e2e:ui
```

---

## 🚢 Deployment & CI/CD

- **Web (`apps/web`)**: Deployed to [Vercel](https://vercel.com) (`deadpartymedia.com`).
- **Arts (`apps/arts`)**: Deployed to [Vercel](https://vercel.com) (`arts.deadpartymedia.com`) using Nitro preset.
- **Mobile (`apps/native`)**: Built and distributed via EAS / Expo.
- **Database Migrations**: Automated GitHub Actions workflow (`.github/workflows/web-db-migrate.yml`) executes migrations on pushes to `master`.

---

## 📜 Contributing & Workflow

All development follows the GitHub-Driven Development workflow defined in [`AGENTS.md`](./AGENTS.md):

1. Every change traces to a **GitHub Issue**.
2. Work is tracked on the repository **GitHub Project**.
3. Feature branches derive from `master` (`feat/<slug>-<issueNumber>`, `fix/<slug>-<issueNumber>`, `chore/<slug>-<issueNumber>`).
4. Quality gates (`pnpm check`, `pnpm check-types`, `pnpm test`) must pass before opening a Pull Request.
5. All changes flow through a **Pull Request**.
