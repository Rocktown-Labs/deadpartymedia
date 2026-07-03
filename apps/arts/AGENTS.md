<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Project Context

- App: `arts`
- Purpose: `arts.deadpartymedia.com`, a sibling Dead Party property for Arkansas visual artists.
- Framework: TanStack Start, React, file router, Nitro output.
- Package manager in this monorepo: `pnpm`.
- Original scaffold context: generated from the TanStack CLI with React/file-router/Tailwind-style setup, then integrated into `apps/arts`.
- Follow-up TanStack Intent commands used during implementation:
  - `pnpm dlx @tanstack/intent@latest list`
  - `pnpm dlx @tanstack/intent@latest load @tanstack/react-start#react-start`
  - `pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core`
  - `pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions`
  - `pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards`
  - `pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation`

## Architecture Decisions

- Shared Postgres is accessed through `@dpmedia/db`.
- `packages/db/src/schema.ts` is the shared schema source for arts tables and the existing music tables.
- Arts-specific public profiles use `artmakers`, not the existing music-oriented `artists` table.
- `artworks` is ready for uploads, sale flags, and future Stripe Connect pricing.
- Editorial/event reuse is modeled with `posts.vertical` and `events.vertical`, plus `post_artmakers` and `event_artmakers`.
- Arts roles are separate from music-site super admin:
  - `artmaker`
  - `arts_admin`
  - `arts_writer`
- Artmaker onboarding updates Clerk public metadata to `role: "artmaker"`, `onboardingComplete: true`, and `artmakerId`.

## Local URLs

Portless is configured for stable local URLs:

- Web: `https://deadpartymedia.localhost`
- Arts: `https://arts.deadpartymedia.localhost`

Use:

```bash
pnpm arts:dev
pnpm web:dev
```

If Portless needs to be bypassed:

```bash
PORTLESS=0 pnpm --filter arts dev:app
```

## Environment

Required for arts:

```env
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
DATABASE_URL=
VITE_APP_TITLE="Dead Party Arts"
CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_PUBLIC_URL=
```

Known gotcha: the official Clerk TanStack Start middleware requires `CLERK_SECRET_KEY`.
`VITE_CLERK_PUBLISHABLE_KEY` is still required for the browser-facing Clerk provider.

Optional arts commerce/import integrations:

```env
VITE_FW_STOREFRONT_TOKEN=
VITE_FW_CHECKOUT=
VITE_FW_ARTS_COLLECTION_ID=
VITE_FW_API_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
AI_GATEWAY_API_KEY=
```

Fourthwall falls back to the existing `NEXT_PUBLIC_FW_*` names so the arts app can share the
current storefront config until an arts-specific collection is created. AI flyer import only needs
one of the listed AI keys.

## Routes

- `/` public arts landing/directory entry
- `/artmakers` public artmaker directory
- `/artmakers/$slug` public profile
- `/onboarding` protected artmaker onboarding/profile edit
- `/dashboard` protected artmaker dashboard
- `/admin` protected arts staff shell for `arts_admin`, `arts_writer`, and `super_admin`
- `/admin/events/import` protected AI event flyer import
- `/exhibitions?medium=<slug>` public artwork wall filtered by medium group

## Next Steps

- Add Google Sheet import tooling for artmaker seed data.
- Port the full shared article/event editors from `apps/web` once the arts admin CRUD forms are
  ready to be 1:1.
- Add commission/Stripe Connect marketplace tables and flows.
- Migrate the existing web app to import schema/client from `@dpmedia/db` instead of its local DB schema.
