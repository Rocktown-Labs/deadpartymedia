# Dead Party Arts

TanStack Start app for `arts.deadpartymedia.com`.

## Local Development

```bash
pnpm arts:dev
```

Portless serves the app at:

```txt
https://arts.deadpartymedia.localhost
```

Bypass Portless when needed:

```bash
PORTLESS=0 pnpm --filter arts dev:app
```

## Environment

Create `apps/arts/.env.local` with:

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

`CLERK_SECRET_KEY` is required because this app uses Clerk's TanStack Start
server middleware and server-side `auth()`.

Optional integrations:

```env
VITE_FW_STOREFRONT_TOKEN=
VITE_FW_CHECKOUT=
VITE_FW_ARTS_COLLECTION_ID=
VITE_FW_API_URL=
GOOGLE_GENERATIVE_AI_API_KEY=
GEMINI_API_KEY=
AI_GATEWAY_API_KEY=
```

Fourthwall also accepts the existing `NEXT_PUBLIC_FW_*` names. AI flyer import
requires one of the listed AI keys.

## Commands

```bash
pnpm --filter arts generate-routes
pnpm --filter arts build
pnpm --filter arts test
pnpm --filter arts db:generate
pnpm --filter arts db:migrate
```

## Deployment

Vercel is configured with `apps/arts` as the project root for
`arts.deadpartymedia.com`.

## Data Model

Shared schema lives in `packages/db`.

- `artmakers`: public arts profiles backed by Clerk users
- `artworks`: future upload/gallery/marketplace records
- `posts.vertical`: `music` or `arts`
- `events.vertical`: `music` or `arts`
- `post_artmakers`: arts editorial tagging
- `event_artmakers`: arts event tagging

Arts roles:

- `artmaker`
- `arts_admin`
- `arts_writer`

## Current Routes

- `/`
- `/artmakers`
- `/artmakers/$slug`
- `/onboarding`
- `/dashboard`
- `/admin`
- `/admin/events/import`
- `/exhibitions?medium=<slug>`

## Notes

The first migration in `apps/arts/drizzle` is intentionally a targeted migration
for the existing shared database. It does not create the already-existing music
tables from scratch.
