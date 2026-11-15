# Dead Party Media

<div align="center">
  <h3>Arkansas music, arts, events, and independent creators</h3>
  <p>A media platform combining music discovery, arts coverage, artist and event directories, editorial publishing, and creator storefronts.</p>
</div>

[deadpartymedia.com](https://deadpartymedia.com)

---

## 1. Executive Summary

**Dead Party Media** is a multi-application publishing and commerce platform for music and arts communities. The repository brings the music product and the arts publication together under one identity system, while keeping their content, permissions, and media libraries separate.

The system is a pnpm / Turborepo monorepo with two TanStack Start applications, a shared Hono API on Cloudflare Workers, and shared packages for authentication, database access, contracts, and infrastructure.

## 2. System Architecture

```text
Readers, artists, and administrators
                 │
       ┌─────────┴──────────┐
       │                    │
   apps/web              apps/arts
 Music application      Arts publication
       │                    │
       └──── same-origin API proxies ────┐
                                          ▼
                                  apps/api (Hono)
                                          │
                    ┌─────────────────────┼───────────────────┐
                    ▼                     ▼                   ▼
             Arts D1 + media       Music D1 + media     Auth / workflows
              and migrations        and migrations     scoped memberships
```

Both frontends use the API through service bindings and same-origin proxies. Shared identity supports sign-in across the products; it does not give a user access to both content spaces or roles automatically.

### Technology

| Layer            | Technologies                                                     |
| ---------------- | ---------------------------------------------------------------- |
| Web applications | TanStack Start, React, TypeScript                                |
| API              | Hono RPC on Cloudflare Workers                                   |
| Data             | Separate Cloudflare D1 schemas and migrations for arts and music |
| Media            | Cloudflare R2                                                    |
| Authentication   | Better Auth, scoped memberships, and Clerk import tooling        |
| Background work  | Cloudflare Workflows                                             |
| Infrastructure   | Alchemy                                                          |
| Workspace        | Node.js 24, pnpm 10.19, Turborepo                                |

## 3. Applications & Packages

| Workspace                         | Responsibility                                                              |
| --------------------------------- | --------------------------------------------------------------------------- |
| `apps/web`                        | Music discovery, publishing, editorial, and storefront experiences          |
| `apps/arts`                       | Arts articles, artmakers, events, exhibitions, and the arts dashboard       |
| `apps/api`                        | Shared Hono RPC, authorization, uploads, commerce, and background jobs      |
| `apps/native`                     | Expo scaffold; deeper mobile integration is a later deliverable             |
| `packages/api-client`             | Inferred Hono clients for web and future native use                         |
| `packages/contracts`              | Shared validation schemas and job inputs                                    |
| `packages/db`                     | Separate arts/music D1 schemas, migrations, and PostgreSQL export utilities |
| `packages/auth`                   | Better Auth, scoped memberships, and Clerk import planning                  |
| `packages/infra`                  | Alchemy definitions for Workers, D1, R2, AI, Email, and Workflows           |
| `packages/env`, `packages/config` | Shared environment validation and TypeScript configuration                  |

## 4. Product Areas

### Music

The music application brings together creator profiles and catalog pages with publishing, editorial discovery, and storefront surfaces. API routes are grouped by music and arts domains, so content operations and access checks stay bounded to the product they serve.

### Arts

The arts publication covers articles, artmakers and galleries, events, exhibitions, and venues. Public pages are complemented by an artist dashboard and administrative tools for managing editorial content, profiles, events, exhibitions, venues, and users.

### Identity and access

Better Auth provides shared authentication plumbing. Memberships and permissions are scoped to the relevant product area: a music role does not imply an arts role, and an arts role does not imply a music role. The repository also includes planning and tooling for importing existing Clerk identities.

### Data and media

Arts and music have separate D1 schemas and migration histories. Media is stored in R2, while shared contracts define API inputs and background-job payloads. The infrastructure package provisions the edge services and workflows used by the apps.

## 5. Local Development

### Prerequisites

- Node.js 24
- pnpm 10.19.0

Install the locked workspace dependencies:

```bash
pnpm install --frozen-lockfile
```

For local infrastructure configuration, copy `packages/infra/.env.example` to `packages/infra/.env` and set a stable `BETTER_AUTH_SECRET` of at least 32 characters before starting the local stage. Keep secrets and backend credentials in the backend environment; frontend example files are for public build settings.

Start the local stage:

```bash
pnpm dev --stage local
```

The local API runs on port 3000, the music app on 3001, and the arts app on 3002. The frontends call the API through service bindings and same-origin proxies.

## 6. Workspace Commands

| Command                                            | Purpose                                                   |
| -------------------------------------------------- | --------------------------------------------------------- |
| `pnpm dev --stage local`                           | Start local services through the infrastructure workspace |
| `pnpm --filter @dpmedia/infra plan --stage review` | Preview an isolated review deployment                     |
| `pnpm run deploy --stage review --yes`             | Deploy the review stage                                   |
| `pnpm check`                                       | Run repository formatting and lint checks                 |
| `pnpm typecheck`                                   | Check TypeScript types                                    |
| `pnpm test`                                        | Run configured package tests                              |
| `pnpm --filter web build`                          | Build the music web application                           |
| `pnpm --filter arts build`                         | Build the arts application                                |

Database and migration utilities are available as `pnpm db:generate:arts`, `pnpm db:generate:music`, and `pnpm migration:export`.

## 7. Deployment & Data Separation

Deploy isolated stages with Alchemy. Production resource names are `deadpartymedia`, `deadpartyarts`, and `deadparty-api`; preview resources use a stage suffix. Domain attachment is disabled by default, and production data resources are retained.

The migration runbook at [docs/migration/cloudflare.md](docs/migration/cloudflare.md) documents the verified preview, source inventory, data and media tooling, Clerk migration requirements, production cutover, and rollback. The live cutover completed on November 10, 2026. The previous Vercel / Clerk / Neon system is retained only for the documented rollback window.

## 8. Repository Layout

```text
deadpartymedia/
├── apps/
│   ├── api/                 # Hono API, routes, jobs, and bindings
│   ├── arts/                # Arts publication and management app
│   ├── native/              # Expo scaffold
│   └── web/                 # Music application
├── packages/
│   ├── api-client/          # Typed API clients
│   ├── auth/                # Authentication and import tooling
│   ├── config/              # Shared TypeScript configuration
│   ├── contracts/           # Shared request and job schemas
│   ├── db/                  # Product-specific database schemas
│   ├── env/                 # Runtime environment validation
│   └── infra/               # Alchemy infrastructure
└── docs/
    └── migration/           # Cloudflare migration runbook
```

<div align="center">
  <sub>Independent music and arts, built for Arkansas communities.</sub>
</div>
