# Dead Party Media

Arkansas music, arts, events, editorial coverage, artist directories, and storefronts. A pnpm/Turborepo monorepo with two TanStack Start applications and a shared Hono RPC API on Cloudflare Workers.

| Workspace                         | Purpose                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web`                        | Existing music application, ported in place from Next.js to TanStack Start                  |
| `apps/arts`                       | Existing TanStack Start arts application                                                    |
| `apps/api`                        | Hono RPC, scoped authorization, content operations, uploads, commerce, and native Workflows |
| `apps/native`                     | Existing Expo scaffold; mobile integration is a later deliverable                           |
| `packages/api-client`             | Inferred Hono RPC clients for web and future mobile                                         |
| `packages/contracts`              | Shared validation and job inputs                                                            |
| `packages/db`                     | Separate arts/music D1 schemas, migrations, and read-only PostgreSQL exporter               |
| `packages/auth`                   | Better Auth, scoped memberships, and Clerk import planner                                   |
| `packages/infra`                  | Alchemy-managed Workers, D1, R2, AI, Email, and Workflows                                   |
| `packages/env`, `packages/config` | Shared environment validation and TypeScript configuration                                  |

Use Node 24 and pnpm 10.19.0. Copy `packages/infra/.env.example` to `packages/infra/.env` and set a random, stable `BETTER_AUTH_SECRET` of at least 32 characters. Database/API credentials belong to the backend; frontend `.env.example` files contain public build settings.

```sh
pnpm install --frozen-lockfile
pnpm dev --stage local
```

The local API runs on port 3000, music on 3001, and arts on 3002. Both frontends call the API through service bindings and same-origin proxies. Arts/music data and media are separate; shared identity does not grant shared roles.

```sh
pnpm check
pnpm typecheck
pnpm test
pnpm --filter web build
pnpm --filter arts build
```

Deploy isolated stages through Alchemy:

```sh
pnpm infra:plan --stage review
pnpm run deploy --stage review --yes
```

Production names are `deadpartymedia`, `deadpartyarts`, and `deadparty-api`; preview resources use a stage suffix. Domain attachment defaults off. Production data resources are retained.

The [migration runbook](docs/migration/cloudflare.md) records the verified preview, source inventory, native data/media tools, Clerk migration requirements, production cutover, and rollback. The live Vercel/Clerk/Neon system remains available until the production identity export and cutover checks are complete.
