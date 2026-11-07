# web-start — Next.js → TanStack Start migration

The TanStack Start successor to `apps/web` (Next.js 16), scaffolded alongside
it per the [official migration guide](https://tanstack.com/start/latest/docs/framework/react/migrate-from-next-js).
Next.js stays runnable until parity. Dev: `https://start.deadpartymedia.localhost`.

Data comes from the platform API worker (`apps/api`) — no DB driver ships in
this app. Auth (Clerk, then better-auth in Phase 4) arrives with the first
authenticated route.

## Route inventory & mapping

| Next.js (apps/web/src/app)                               | Start file (src/routes)                                         | Status                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `layout.tsx` (fonts, providers)                          | `__root.tsx`                                                    | partial (fonts/providers pending)                                |
| `page.tsx` (home)                                        | `index.tsx` (articles/events/releases/products loader)          | ✅ ported (layout parity pass pending)                           |
| `about/page.tsx`                                         | `about.tsx`                                                     | ✅ ported                                                        |
| `venues/page.tsx` (direct Drizzle)                       | `venues.tsx` (via API loader)                                   | ✅ ported                                                        |
| `contact/page.tsx`                                       | `contact.tsx`                                                   | ✅ ported (content; interactive form → UI parity pass)           |
| `{country,edm,hardcore,hip-hop-r-b,other}/page.tsx`      | `country/edm/hardcore/hip-hop-r-b/other.tsx` (shared GenrePage) | ✅ ported                                                        |
| `articles/page.tsx`                                      | `articles.index.tsx`                                            | ✅ ported (data+route; UI parity pass pending)                   |
| `article/[slug]/page.tsx` (+generateMetadata)            | `article.$slug.tsx` + `head()` + `notFound`                     | ✅ ported (data+route; comments UI pending)                      |
| `artists/page.tsx` + `artists/[slug]/page.tsx`           | `artists.index.tsx` + `artists.$slug.tsx`                       | ✅ ported (profile + related articles/events; UI parity pending) |
| `events/page.tsx` + `events/[slug]/page.tsx`             | `events.index.tsx` + `events.$slug.tsx`                         | ✅ ported (detail + lineup + tickets; UI parity pending)         |
| `music/page.tsx` + `music/[slug]/page.tsx`               | `music.index.tsx` + `music.$slug.tsx`                           | ✅ ported (detail + streaming links; UI parity pending)          |
| `merch/…`, `cart/…`                                      | `merch…`, `cart…`                                               | pending                                                          |
| `writers/page.tsx`                                       | `writers.tsx`                                                   | ✅ ported (verbatim static content)                              |
| `donate/page.tsx`                                        | `donate.tsx`                                                    | ✅ ported (content cards; cashtag links → UI parity pass)        |
| `sign-in/[[...rest]]`, `sign-up/[[...rest]]`             | `sign-in.index.tsx`, `sign-up.index.tsx`                        | ✅ ported (Clerk v6 query-param flow)                            |
| `onboarding/…`                                           | `onboarding…`                                                   | pending (auth wired; flows pending)                              |
| `dashboard/…`, `artist-dashboard/…`, `venue-dashboard/…` | `_dashboards/…` layouts + `beforeLoad` guards                   | guard ✅ proven on `/dashboard`; pages pending                   |
| `admin/…` (24 pages)                                     | `_admin/…` + `beforeLoad` guards                                | pending (auth wired; pages pending)                              |
| `sitemap.ts`, `robots.ts`                                | `sitemap[.]xml.ts`, `robots[.]txt.ts` server routes             | ✅ ported (API-driven)                                           |
| `not-found.tsx`                                          | `__root.tsx` `notFoundComponent`                                | ✅ ported                                                        |
| `api/**` (32 routes)                                     | —                                                               | ✅ already extracted to `apps/api`                               |
| `workflows/**` (Vercel Workflow)                         | —                                                               | retired (scripts remain in apps/web/scripts)                     |

## Conversion patterns (established)

- Server components with direct Drizzle → loader + `apiFetch` (see `venues.tsx`)
- react-query client pages → component ports keep hooks; base URL via env
- `generateMetadata`/`metadata` → route `head()`
- `proxy.ts` route guards → `beforeLoad` with `getSession` server fn (arts pattern)
- `next/image` → plain `<img>` for local assets, Unpic for remote (arts pattern)
- `next/font` → fontsource packages (arts pattern)
- Server actions → server functions (`createServerFn`) or direct API mutations
