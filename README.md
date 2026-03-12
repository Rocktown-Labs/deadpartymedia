# Dead Party Media

Dead Party Media is a `pnpm`/Turbo monorepo with a Next.js web app and an Expo mobile app.

The main workspace packages are:

- `apps/web`: Next.js 16 app, API routes, auth flows, admin flows, and Fourthwall commerce integration
- `apps/mobile`: Expo Router mobile client built on React Native Reusables + Clerk
- `packages/contracts`: shared DTOs/contracts for web and mobile
- `packages/env`: shared typed env helpers
- `packages/config`: shared TypeScript config

There is no Django app in this repo.

## Current architecture

### `apps/web`

`apps/web` is the primary backend/BFF surface today. It handles:

- editorial pages, artists, writers, events, and article detail
- user comments, saved/read history, and dashboard stats
- fan onboarding and artist onboarding/dashboard flows
- admin CRUD for posts, artists, events, and users
- Fourthwall product browsing and cart support
- internal JSON API routes under `apps/web/src/app/api/*`
- Clerk auth/webhooks
- Drizzle ORM + Neon Postgres

### `apps/mobile`

`apps/mobile` is the active native client. It is being built to mirror the mobile web app as closely as practical while staying native-safe where React Native needs different patterns.

Phase 1 covers:

- Home, Music, Events, Merch, and Artists tabs
- article, event, artist, and merch detail screens
- Clerk sign-in, sign-up, verify-email, forgot-password, and reset-password
- fan onboarding, saved stories, reading history, comments, settings, and stats
- artist dashboard routes for profile, articles, and events
- in-app cart management with checkout handoff to Fourthwall

Phase 2 adds native admin parity.

Merch checkout still happens on Fourthwall. The app keeps browsing and cart state in-app, then opens the Fourthwall checkout URL.

## Tech stack

- `pnpm` workspaces
- Turbo
- TypeScript
- Next.js 16 + React 19
- Expo 54 + React Native 0.81
- React Native Reusables + NativeWind
- TanStack Query
- Clerk
- Drizzle ORM + Neon Postgres
- Fourthwall storefront/cart APIs
- Vitest + Playwright
- Ultracite / Oxlint

## Prerequisites

- Node.js 20+
- `pnpm` 10+

Optional depending on the work you are doing:

- a Neon Postgres database
- a Clerk app
- a Fourthwall storefront token
- Expo/iOS/Android tooling for `apps/mobile`

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create the web env file:

   ```bash
   cp apps/web/.env.development.local.example apps/web/.env.development.local
   ```

3. Create the mobile env file:

   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```

4. Fill in the env values you need.

5. Start development:

   ```bash
   pnpm dev
   ```

Useful commands:

```bash
pnpm dev:web
pnpm dev:mobile
pnpm dev:native
pnpm check
pnpm check-types
pnpm web:test
pnpm web:test:e2e
```

`pnpm dev` starts `web` and `mobile` in parallel. `pnpm dev:native` is kept as an alias for `pnpm dev:mobile`.

The web app runs on [http://localhost:3001](http://localhost:3001).

To run only the mobile app:

```bash
pnpm --filter mobile dev
pnpm --filter mobile ios
pnpm --filter mobile android
pnpm --filter mobile web
```

## Environment variables

The repo does not use a single root `.env`.

### Web

Important web variables include:

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `DB_SCHEMA_SANITY_CHECK=1`
- Clerk variables required by `@clerk/nextjs`
- `NEXT_PUBLIC_FW_STOREFRONT_TOKEN`
- `NEXT_PUBLIC_FW_CHECKOUT`
- `NEXT_PUBLIC_FW_API_URL`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`

### Mobile

Important mobile variables include:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_FW_CHECKOUT`

`apps/mobile` uses `apps/web` as its backend/BFF through JSON API routes.

## Data and contracts

- Database schema and migrations live in `apps/web/src/lib/db/schema.ts`, `apps/web/drizzle/`, and `apps/web/drizzle.config.ts`
- Shared mobile/web DTOs live in `packages/contracts`
- Mobile cart flows use `apps/web/src/app/api/cart`
- Product detail for mobile uses `apps/web/src/app/api/products/[handle]`

Useful database commands:

```bash
pnpm web:db:generate
pnpm web:db:migrate
pnpm web:db:push
pnpm web:db:studio
```

## Testing

Root-level checks:

```bash
pnpm check
pnpm check-types
```

Web tests:

```bash
pnpm web:test
pnpm web:test:coverage
pnpm web:test:e2e
```

There is not yet a full automated test suite wired up for `apps/mobile`.

## Project layout

```text
.
├── apps/
│   ├── mobile/     # Expo Router app
│   └── web/        # Next.js app
├── packages/
│   ├── config/     # shared TS config
│   ├── contracts/  # shared DTOs/contracts
│   └── env/        # shared env helpers
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Current caveats

- `apps/mobile` is the active native client, but full runtime verification still depends on installing its Expo/Clerk/Reusables dependencies in the workspace.
- A duplicated template folder currently exists at `apps/mobile/mobile`; it is not part of the intended app structure.
- Some older comments and env references still mention previous architecture directions. This README reflects the current intended architecture.
