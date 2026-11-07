# Dead Party Media — Platform Migration Plan

**Branch:** `tanstack-cloudflare-migration`
**Date:** 2026-11-07
**Status:** In progress — Phase 0 ✅ complete, Phase 1 ✅ implemented (API extracted, tests + dev-run green; frontend flip pending). Decisions marked ✅ are locked; ⚠️ items are open gates.

**Progress log:**
- 2026-11-07: Phase 0 merged on branch (`packages/db/http`, `@dpmedia/contracts`, `@dpmedia/auth` scaffold, cleanup) — issue #159.
- 2026-11-07: Phase 1 routers ported (web's 32 API routes → `/music/*`, arts' server fns → `/arts/*`), mounted, 66 tests green, `wrangler dev` boots. Frontend flip to the API = follow-up (issue #160). **Blocked on user:** valid Neon `DATABASE_URL` for local dev (the one in `apps/web/.env` is stale — password rejected), Cloudflare credentials for deploy, Clerk dashboard export for Phase 4.

---

## Summary

Migrate the platform from **Next.js + Clerk + Vercel + Neon (per-app backends)** to:

- **TanStack Start frontends** (three brands: `deadpartymedia.com` music, `deadpartyarts.com` arts, Arkansas Music Awards)
- **One Hono API** on **Cloudflare Workers** (`apps/api`), shared by all frontends
- **better-auth** self-hosted in the API — "Dead Party ID": one login, role-based access across all three sites
- **One Postgres database** — stays on Neon first (phased cutover); DB vendor gate in Phase 2 (D1 vs PlanetScale Postgres vs stay-Neon)
- **Cloudflare for everything**: Workers (API + frontends), R2 uploads, Workers AI, `workers-og` images

---

## Locked decisions

1. ✅ **One Hono API, not per-app APIs.** With AMA as a third frontend, per-app APIs triple operational cost for little benefit. The schema was already designed as one shared platform (`posts.vertical`, `events.vertical`, one roles enum, shared `venues`). Brand decoupling happens at the domain/frontend layer, not the data layer. Routers stay modular (`/music/*`, `/arts/*`, `/ama/*`) so a future split is cheap.
2. ✅ **better-auth everywhere, migrated from Clerk** per the official guide: <https://better-auth.com/docs/guides/clerk-migration-guide>. The Clerk dashboard export includes `password_digest` (bcrypt) + `password_hasher` + TOTP secrets, and the migration script preserves Clerk user IDs (`forceAllowId: true`), so **users keep their passwords and every FK keyed on `clerk_id` stays valid**. Cost: all sessions invalidated — everyone logs in once.
3. ✅ **Phased cutover: API on Neon first.** Extract the Hono API against Neon (HTTP driver), flip frontends to it, then swap the data layer in a separate, revertible phase. No big-bang.
4. ✅ **Shared users/auth.** One `users` store; roles decide per-site access (existing `roleEnum` already covers all brands: `artist`, `artmaker`, `arts_admin`, `arts_writer`, `fan`, `super_admin`, `venue`, `writer`). Cookie mechanics:
   - `*.deadpartymedia.com` apps: transparent SSO via better-auth `crossSubDomainCookies` (`.deadpartymedia.com`).
   - `deadpartyarts.com` (different registrable domain — cookies cannot cross): SSO via better-auth **OAuth 2.1 provider plugin** — arts redirects through the auth domain; one click, no re-entered password.
   - Third-party-cookie XHR tricks are blocked on Safari — do not attempt.
5. ✅ **`deadpartyarts.com` becomes the arts primary domain** (301 from `arts.deadpartymedia.com/*`). Assets are already branded "deadpartyarts".
6. ✅ **Frontends deploy to Cloudflare Workers** via `@cloudflare/vite-plugin` (TanStack's official Cloudflare partner path): <https://tanstack.com/start/latest/docs/framework/react/guide/hosting>

## Open gate ⚠️ — Phase 2 database target

|             | D1                                                                                               | PlanetScale Postgres + Hyperdrive                                                          | Stay Neon + Hyperdrive                                              |
| ----------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Schema work | SQLite rewrite (enums→checks, `jsonb`→text JSON, `text[].array()`→JSON text, `serial`→int) + ETL | None — pg dialect keeps working                                                            | None                                                                |
| Ops         | Cloudflare-native: bindings, Time Travel, read replication, no creds                             | Branching, deploy requests, Insights — matches existing RocktownLabs PlanetScale workflows | Current CI (`web-db-migrate.yml` Neon branch dry-run) keeps working |
| Cost        | ~Workers paid ($5/mo)                                                                            | PlanetScale plan (~$29+/mo)                                                                | Current                                                             |
| Risk        | Mechanical but wide 17-table rewrite; loses pg features                                          | pg→pg dump/restore                                                                         | Lowest effort                                                       |

**Lean:** PlanetScale Postgres + Hyperdrive (no rewrite + team's existing PlanetScale ops). Nothing upstream changes regardless of the choice — the gate only affects Phase 2 mechanics. Staying on Neon is a legitimate fallback.

---

## Current state (inventory, 2026-11-07)

- `apps/web` — Next.js 16 App Router, deadpartymedia.com. 324 files / ~46k lines. 32 API route handlers, 17 server-action files, Clerk in 64 import sites, direct Drizzle in 67 files (Neon serverless driver, local schema copy byte-identical to `packages/db`), Vercel Blob, Vercel Workflow (WP backfill), `@vercel/og`, PostHog, react-query on the client, shadcn/ui (62 files), TipTap editors, Fourthwall + Spotify proxies, typed routes, React Compiler. Deploy: Vercel.
- `apps/arts` — TanStack Start + Nitro node, arts.deadpartymedia.com. 71 files / ~15k lines. 60 `createServerFn` RPCs in 6 `*.functions.ts` files + 1 upload route (R2 via `@better-upload`). Clerk via `@clerk/tanstack-react-start`. `@dpmedia/db` (pg Pool). Fourthwall, Sentry. Deploy: Vercel.
- `packages/db` — Drizzle pg schema, 17 tables, 10 enums. Only arts consumes it; web has a byte-identical local copy. `packages/contracts` exists but is empty. `packages/env` web/native schemas.
- `apps/native` — Expo scaffold, no data access, no auth (expects a deleted Django API).
- DB: one Neon Postgres, migrations fragmented (web: 15-migration journal + 3 manual SQL; arts: 1 targeted migration). CI migrates via `web-db-migrate.yml`.
- No Hono, no wrangler, no better-auth usage anywhere yet. R2 (S3 API) + Workers AI (REST) already in use.

## Target architecture

```
deadpartymedia.com (apps/web, TanStack Start) ──┐
deadpartyarts.com (apps/arts, TanStack Start) ──┼──► ONE Hono API Worker (apps/api)
AMA app          (apps/ama, TanStack Start)  ──┘     api.deadpartymedia.com
                                                       ├─ /auth/*    better-auth (Dead Party ID)
                                                       ├─ /music/*   web routers (from web's 32 API routes)
                                                       ├─ /arts/*    arts routers (from arts' 60 server fns)
                                                       ├─ /ama/*     AMA routers (new)
                                                       └─ shared: R2 uploads, Workers AI, workers-og,
                                                                  Fourthwall/Spotify proxies, Clerk webhook (until cutover)
                                                                   │
                                                        ONE Postgres (Neon → Phase 2 gate)
```

Repo layout after migration:

```
apps/web     TanStack Start (music)
apps/arts    TanStack Start (arts)
apps/ama     TanStack Start (AMA, new)
apps/api     ONE Hono worker (routers per brand)
packages/db        drizzle schema + driver factory (HTTP driver for Workers, pg for Node/Vercel)
packages/auth      better-auth factory (server) + auth-client factories (web/expo)
packages/contracts  zod schemas shared by API + frontends
packages/env        env schemas (add api + arts)
```

Frontends become pure — no DB drivers ship in frontend bundles (kills the `stubServerOnlyModulesForClient` hack in arts' vite config).

---

## Phases

### Phase 0 — Foundations (no behavior change)

- Consolidate web's local schema copy into `packages/db`; add a driver factory (Neon HTTP driver for Workers; `pg` Pool for Node/Vercel — both needed during transition).
- Populate `packages/contracts` with zod schemas (port web `lib/validations/*`, arts `lib/artmakers.ts`, etc.).
- Scaffold `packages/auth`: better-auth factory, drizzle adapter, bcrypt `password.verify` config (Clerk-import ready), admin plugin (roles).
- Cleanup: delete dead `apps/mobile` scaffold, Django remnants (`docker-compose.yml` api service, `.vercelignore`), orphaned `packages/env/src/server.ts`, unused `src/data/*.json` mocks, prunable worktrees.
- **Start the Clerk user export early** (dashboard → `exported_users.csv`; includes password digests + TOTP) so Phase 4 is never blocked. Collect OAuth client IDs for social providers in use.
- Acceptance: `pnpm check`, `check-types`, `test` green; apps unchanged.

### Phase 1 — One Hono API on Workers, data still on Neon

- `apps/api`: Hono worker (`cf init`/`cf dev`/`cf deploy`), Clerk JWT verification behind a `getAuth()` interface (swappable in Phase 4 without touching routes).
- Port web's 32 routes → `/music/*` **with identical response shapes** (existing react-query hooks work unchanged).
- Port arts' 60 server fns → `/arts/*` REST; arts server fns become thin HTTP callers (loader signatures unchanged).
- Unify uploads on R2 (arts `@better-upload` pattern; web's Vercel Blob routes migrate). OG images via `workers-og`. Spotify/Fourthwall proxies move. Clerk webhook keeps syncing users until Phase 4.
- Frontends flip route-group by route-group behind an env var; old routes stay as rollback.
- Acceptance: both sites fully functional against the API on Neon; staging parity on response shapes; rollback = env flip.

### Phase 2 — Database gate ⚠️ + move

- Decide D1 vs PlanetScale Postgres vs stay-Neon (see gate above).
- ETL/cutover with verification (counts/checksums), rollback window; replace `web-db-migrate.yml` with the chosen DB's migration flow.
- Acceptance: API reads/writes the new target; Neon frozen read-only for a week.

### Phase 3 — `apps/web` → TanStack Start

- Per the official guide: <https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js>
- Route mapping (`app/layout.tsx`→`__root.tsx`, `[slug]`→`$slug`, API routes already gone from the app, `sitemap.ts`/`robots.ts`→server routes, `generateMetadata`→route `head()`), `proxy.ts` guards→`beforeLoad` (arts' `requireUser` pattern is the template), `next/image`→Unpic, `next/font`→fontsource, typed routes native, `revalidatePath`/`revalidateTag`→`router.invalidate()` + query invalidation.
- Components port nearly free (shadcn, TipTap, react-form/table). Keep Next.js running until parity; Playwright e2e both apps; inventory URLs/redirects/status/canonicals first.
- Deploy to Workers via `@cloudflare/vite-plugin`.

### Phase 4 — Auth cutover (Clerk → better-auth)

- Run the better-auth Clerk import (IDs + passwords preserved); mount better-auth in the API (`app.all("/auth/*")`), CORS + `trustedOrigins` for all app origins; `crossSubDomainCookies` for `.deadpartymedia.com`; OIDC provider plugin for `deadpartyarts.com`.
- Frontends: `ClerkProvider`→`authClient`, guards swap (`getSession` server fn + `beforeLoad`), roles move from Clerk `publicMetadata` → `users` table.
- e2e rework: drop `@clerk/testing`, adopt better-auth `test-utils` plugin.
- Ordered AFTER Phase 3 so auth integrates with web once (on TanStack), not twice.
- Acceptance: login works on all domains; Safari-tested SSO; Clerk kept paused (not deleted) for a rollback window.

### Phase 5 — Domains, AMA, decommission

- `deadpartyarts.com` primary + 301s from `arts.deadpartymedia.com/*`; canonicals/sitemaps updated; arts hosting Vercel→Workers.
- Scaffold `apps/ama` (third TanStack Start frontend consuming the same API; new `/ama/*` routers + any awards/voting tables).
- Vercel decommission: Blob→R2 (done in P1), Workflow backfill→standalone scripts, PostHog `/ingest`→Worker route, analytics swap. Keep DNS rollback for a week. Monitor GSC after each cutover.

---

## Key risks

1. **Clerk export availability** — mitigated: digests confirmed in export format; kick off early in Phase 0.
2. **D1 dialect rewrite** (if chosen) — mechanical but wide; contracts tests cover response shapes either way.
3. **Cross-domain SSO on Safari** — use OIDC redirects for deadpartyarts.com; never third-party cookies.
4. **SEO across two cutovers** (framework + domain) — inventory first, preserve URLs/canonicals/sitemaps per phase, GSC monitoring after each.
5. **46k-line frontend translation** — strangler per-route; keep Next.js running until parity; reuse arts' conventions.
6. **Runtime shift node→workerd** for apps/api + frontends — `nodejs_compat` flag; no `pg`/TCP in workerd (HTTP driver or Hyperdrive only).

## Open questions

- ⚠️ DB gate (Phase 2): D1 vs PlanetScale Postgres vs stay-Neon — decision owner/date needed.
- AMA: domain (subdomain = free SSO vs own domain = OIDC), data model (awards categories/voting?), timeline.
- Which social OAuth providers are actually in use in Clerk today (to re-create in better-auth)?

## References

- TanStack Start migration guide: <https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js>
- TanStack Start hosting (Cloudflare Workers): <https://tanstack.com/start/latest/docs/framework/react/guide/hosting>
- better-auth Clerk migration: <https://better-auth.com/docs/guides/clerk-migration-guide>
- better-auth Hono integration: <https://better-auth.com/docs/integrations/hono>
- better-auth TanStack Start integration: <https://better-auth.com/docs/integrations/tanstack>
- better-auth multi-domain: <https://better-auth.com/docs/guides/dynamic-base-url>
- better-auth OAuth 2.1 provider: <https://better-auth.com/docs/plugins/oauth-provider>

---

## Working with this branch

- **Test:** this is a full worktree checkout — `pnpm install` then `pnpm check && pnpm check-types && pnpm test`; run apps via `pnpm dev:web` / `pnpm dev:arts`.
- **Stash:** branch is pushed to origin (`tanstack-cloudflare-migration`); it carries this plan + all migration work; master stays untouched.
- **Abandon:** `git push origin --delete tanstack-cloudflare-migration` + remove the worktree — nothing on master is affected.
- Implementation work proceeds per the repo workflow (issues → `feat|fix|chore/<slug>-<issue>` branches → PRs → merge); this branch serves as the migration epic/integration branch.
