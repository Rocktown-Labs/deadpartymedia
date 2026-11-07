# @dpmedia/api

Dead Party Media platform API — one Hono worker on Cloudflare, serving the
music site, arts site, and (later) the Arkansas Music Awards app.

Part of the TanStack Start + Cloudflare migration ([MIGRATION_PLAN.md](../../MIGRATION_PLAN.md),
issue #160). Data stays on Neon during Phase 1; the Phase 2 gate decides the
long-term database (D1 vs PlanetScale Postgres).

## Routes

- `GET /healthz` — liveness + db check
- `/music/*` — ported from `apps/web` API routes (response-shape compatible)
- `/arts/*` — ported from `apps/arts` server functions

## Dev

```bash
pnpm --filter api dev          # wrangler dev on http://localhost:8787
pnpm --filter api test         # unit tests (Neon smoke auto-skips without .dev.vars)
```

Copy `.dev.vars.example` to `.dev.vars` and fill in secrets (Neon URL, Clerk
keys, Spotify, R2). `.dev.vars` is gitignored.

## Deploy

```bash
pnpm --filter api deploy       # wrangler deploy
```

Secrets are set with `wrangler secret put <NAME>` (see `.dev.vars.example`).
A Cloudflare API token is required — not yet configured for this environment.

## Auth

Clerk session tokens are verified in `src/auth.ts` (Bearer header or
`__session` cookie) behind `getAuth`/`requireAuth`/`requireRole`. Phase 4
swaps the implementation to better-auth without touching route code.
