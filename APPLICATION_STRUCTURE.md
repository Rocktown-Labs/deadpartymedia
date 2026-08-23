# Dead Party Media - Application Structure

This document outlines the architectural structure of the Dead Party Media monorepo and describes how the applications and packages interact.

---

## 🏗️ Repository Layout

```txt
deadpartymedia/
├── apps/
│   ├── web/                    # Next.js 16 Web Application (deadpartymedia.com)
│   │   ├── src/
│   │   │   ├── app/            # App Router pages and route handlers
│   │   │   │   ├── (site)/     # Public magazine, events, artists, and store routes
│   │   │   │   ├── admin/      # Editorial & content administration dashboard
│   │   │   │   ├── api/        # Next.js API route handlers
│   │   │   │   └── layout.tsx  # Root layout with Clerk and Theme providers
│   │   │   ├── components/     # React components (UI, cart, editor, auth)
│   │   │   │   ├── ui/         # Shadcn / Radix primitives
│   │   │   │   └── tiptap/     # Rich text editor components
│   │   │   └── lib/            # Utilities, API client, validations, auth
│   │   ├── scripts/            # Content normalization and WordPress migration scripts
│   │   ├── drizzle/            # Drizzle migration files
│   │   └── package.json
│   │
│   ├── arts/                   # Dead Party Arts Portal (arts.deadpartymedia.com)
│   │   ├── src/
│   │   │   ├── routes/         # TanStack Router file-based route tree
│   │   │   │   ├── index.tsx   # Arts homepage
│   │   │   │   ├── artmakers/  # Artist profiles & directory
│   │   │   │   ├── admin/      # Arts administration & event/flyer intake
│   │   │   │   └── exhibitions/# Gallery exhibitions & mediums
│   │   │   ├── components/     # Arts UI components & image uploader
│   │   │   ├── lib/            # Server functions, DB helpers & AI integration
│   │   │   └── env.ts          # Type-safe environment validation
│   │   ├── drizzle/            # Arts-specific targeted Drizzle migrations
│   │   └── package.json
│   │
│   └── native/                 # Dead Party Mobile App (Expo SDK 54 / React Native)
│       ├── app/                # Expo Router file-based mobile navigation
│       ├── components/         # Native UI components
│       └── package.json
│
├── packages/
│   ├── db/                     # Central Drizzle ORM schema, models, & Neon client
│   │   └── src/
│   │       ├── index.ts        # Database connection & client exports
│   │       └── schema.ts       # Central database schema definitions
│   ├── env/                    # Shared runtime environment validation schemas
│   │   └── src/
│   │       ├── web.ts          # Web environment schema
│   │       └── native.ts       # Mobile environment schema
│   └── config/                 # Shared TypeScript & tool configurations
│
├── portless.json               # Portless configuration for named local domains
├── turbo.json                  # Turborepo task pipeline configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
└── README.md                   # Repository overview & quick start guide
```

---

## 📦 Packages & Core Systems

### 1. Database (`packages/db`)

- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech)
- **Schema**: Centralized in [`packages/db/src/schema.ts`](./packages/db/src/schema.ts)
- **Core Entities**:
  - `users`: User profiles synchronized with Clerk authentication
  - `posts`: Editorial articles and stories (verticals: `music`, `arts`)
  - `events`: Show and event listings (verticals: `music`, `arts`)
  - `artists`: Music artist directory profiles
  - `artmakers`: Visual/multimedia artist directory profiles
  - `artworks`: Artwork portfolio and exhibition gallery items
  - `venues`: Performance spaces, galleries, and concert venues
  - `comments`: Article comments and community discussions
  - `tags` / `taxonomies`: Categorization and classification

### 2. Environment Management (`packages/env`)

Type-safe environment variable parsing powered by `@t3-oss/env-core` and `zod`:

- Validates required secrets on startup.
- Differentiates server-only variables from client-exposed variables (`NEXT_PUBLIC_*` or `VITE_*`).

---

## 🌐 Local Development & Portless

Portless assigns human-readable `.localhost` domains to local services with automatic HTTPS proxying:

- **Web App**: `https://deadpartymedia.localhost`
- **Arts App**: `https://arts.deadpartymedia.localhost`

Configured in [`portless.json`](./portless.json).
