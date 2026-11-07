# web-start — Next.js → TanStack Start migration

The TanStack Start successor to `apps/web` (Next.js 16), scaffolded alongside
it per the [official migration guide](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js).
Next.js stays runnable until parity. Dev: `https://start.deadpartymedia.localhost`.

Data comes from the platform API worker (`apps/api`) — no DB driver ships in
this app. Auth (Clerk, then better-auth in Phase 4) arrives with the first
authenticated route.

## Route inventory & mapping

| Next.js (apps/web/src/app)                               | Start file (src/routes)                             | Status                                         |
| -------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------- |
| `layout.tsx` (fonts, providers)                          | `__root.tsx`                                        | partial (fonts/providers pending)              |
| `page.tsx` (home)                                        | `index.tsx`                                         | scaffold placeholder                           |
| `about/page.tsx`                                         | `about.tsx`                                         | ✅ ported                                      |
| `venues/page.tsx` (direct Drizzle)                       | `venues.tsx` (via API loader)                       | ✅ ported                                      |
| `contact/page.tsx`                                       | `contact.tsx`                                       | pending                                        |
| `{country,edm,hardcore,hip-hop-r-b,other}/page.tsx`      | `genres.$genre.tsx` (single dynamic route)          | pending                                        |
| `articles/page.tsx`                                      | `articles.index.tsx`                                | ✅ ported (data+route; UI parity pass pending) |
| `article/[slug]/page.tsx` (+generateMetadata)            | `article.$slug.tsx` + `head()` + `notFound`         | ✅ ported (data+route; comments UI pending)    |
| `artists/page.tsx` + `artists/[slug]/page.tsx`           | `artists.index.tsx` + `artists.$slug.tsx`           | list ✅ ported; detail pending                 |
| `events/page.tsx` + `events/[slug]/page.tsx`             | `events.index.tsx` + `events.$slug.tsx`             | list ✅ ported; detail pending                 |
| `music/page.tsx` + `music/[slug]/page.tsx`               | `music.index.tsx` + `music.$slug.tsx`               | list ✅ ported; detail pending                 |
| `merch/…`, `cart/…`                                      | `merch…`, `cart…`                                   | pending                                        |
| `writers/page.tsx`                                       | `writers.index.tsx`                                 | pending                                        |
| `donate/page.tsx`                                        | `donate.tsx`                                        | pending                                        |
| `sign-in/[[...rest]]`, `sign-up/[[...rest]]`             | `sign-in.$`, `sign-up.$`                            | pending (needs Clerk)                          |
| `onboarding/…`                                           | `onboarding…`                                       | pending (needs Clerk)                          |
| `dashboard/…`, `artist-dashboard/…`, `venue-dashboard/…` | pathless layouts `_dashboards/…`                    | pending (needs Clerk)                          |
| `admin/…` (24 pages)                                     | `_admin/…` + `beforeLoad` guards                    | pending (needs Clerk)                          |
| `sitemap.ts`, `robots.ts`                                | `sitemap[.]xml.ts`, `robots[.]txt.ts` server routes | ✅ ported (API-driven)                         |
| `not-found.tsx`                                          | `__root.tsx` `notFoundComponent`                    | ✅ ported                                      |
| `api/**` (32 routes)                                     | —                                                   | ✅ already extracted to `apps/api`             |
| `workflows/**` (Vercel Workflow)                         | —                                                   | retired (scripts remain in apps/web/scripts)   |

## Conversion patterns (established)

- Server components with direct Drizzle → loader + `apiFetch` (see `venues.tsx`)
- react-query client pages → component ports keep hooks; base URL via env
- `generateMetadata`/`metadata` → route `head()`
- `proxy.ts` route guards → `beforeLoad` with `getSession` server fn (arts pattern)
- `next/image` → plain `<img>` for local assets, Unpic for remote (arts pattern)
- `next/font` → fontsource packages (arts pattern)
- Server actions → server functions (`createServerFn`) or direct API mutations
