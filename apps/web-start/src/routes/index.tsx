import { createFileRoute, Link } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";
import { getSiteDefaults } from "../lib/seo";

interface HomeArticle {
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
  cover_image?: string | null;
  category: string;
}

interface HomeEvent {
  artists: { name: string }[];
  date: string;
  id: number;
  slug: string;
  title: string;
  venue: string;
}

interface HomeRelease {
  artistName: string;
  coverArt: string | null;
  id: number;
  releaseType: "Album" | "Single" | "EP";
  slug: string;
  title: string;
}

interface HomeProduct {
  id: string | number;
  image?: string | null;
  name: string;
  price?: string | null;
}

interface HomeLoaderData {
  articles: HomeArticle[];
  error: boolean;
  events: HomeEvent[];
  products: HomeProduct[];
  releases: HomeRelease[];
}

const { defaultDescription, siteName } = getSiteDefaults();

/**
 * Ported from apps/web/src/app/page.tsx: data is fetched in the loader
 * (server-rendered initial HTML, no client fetch waterfall) with the same
 * Promise.allSettled graceful-degradation semantics as the Next.js page.
 */
export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { content: defaultDescription, name: "description" },
      { content: defaultDescription, property: "og:description" },
      { content: siteName, property: "og:site_name" },
      { content: "website", property: "og:type" },
      { content: "https://www.deadpartymedia.com", property: "og:url" },
      { title: `${siteName} | Arkansas Music, Events & Culture` },
    ],
  }),
  loader: async (): Promise<HomeLoaderData> => {
    const [articles, events, releases, products] = await Promise.allSettled([
      apiFetch<{ results: HomeArticle[] }>("/music/posts?limit=100"),
      apiFetch<{ results: HomeEvent[] }>("/music/events?status=upcoming&limit=100"),
      apiFetch<HomeRelease[]>("/music/releases?limit=10"),
      apiFetch<HomeProduct[]>("/music/products?currency=USD&limit=5"),
    ]);

    return {
      articles: articles.status === "fulfilled" ? articles.value.results : [],
      error: articles.status === "rejected",
      events: events.status === "fulfilled" ? events.value.results : [],
      products: products.status === "fulfilled" ? products.value : [],
      releases: releases.status === "fulfilled" ? releases.value : [],
    };
  },
});

function HomePage() {
  const { articles, error, events, products, releases } = Route.useLoaderData();
  const [hero, ...rest] = articles;
  const latest = rest.slice(0, 6);

  return (
    <main>
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-12">
          <p className="mb-2 font-mono text-sm text-[#7CFC00]">arkansas music · events · culture</p>
          {hero ? (
            <>
              <Link params={{ slug: hero.slug }} to="/article/$slug">
                <h1 className="mb-3 max-w-3xl text-4xl font-black leading-tight hover:text-[#7CFC00] md:text-6xl">
                  {hero.title}
                </h1>
              </Link>
              <p className="max-w-2xl text-lg text-gray-400">{hero.excerpt}</p>
              <p className="mt-2 text-sm text-gray-500">
                {hero.category}
                {hero.published_at
                  ? ` | ${new Date(hero.published_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
                  : ""}
              </p>
            </>
          ) : (
            <h1 className="mb-3 text-4xl font-black md:text-6xl">{siteName}</h1>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 pt-12 pb-20">
        {error ? (
          <p className="mb-12 rounded-md border border-red-500/40 px-4 py-3 text-red-400">
            Latest articles failed to load — refresh to retry.
          </p>
        ) : null}

        {latest.length > 0 ? (
          <section className="mb-14">
            <h2 className="mb-5 text-2xl font-black">Latest Articles</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {latest.map((article) => (
                <li
                  className="rounded-md border border-white/10 p-4 hover:border-[#7CFC00]/40"
                  key={article.id}
                >
                  <Link params={{ slug: article.slug }} to="/article/$slug">
                    <span className="text-xs text-[#7CFC00]">{article.category}</span>
                    <h3 className="font-bold">{article.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-400">{article.excerpt}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {events.length > 0 ? (
          <section className="mb-14">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-2xl font-black">Upcoming Events</h2>
              <Link className="text-sm text-[#7CFC00] hover:underline" to="/events">
                All events
              </Link>
            </div>
            <ul className="space-y-3">
              {events.slice(0, 6).map((event) => (
                <li
                  className="flex items-baseline justify-between rounded-md border border-white/10 px-4 py-3"
                  key={event.id}
                >
                  <div>
                    <Link
                      className="font-semibold hover:text-[#7CFC00]"
                      params={{ slug: event.slug }}
                      to="/events/$slug"
                    >
                      {event.title}
                    </Link>
                    <p className="text-sm text-gray-500">
                      {event.venue}
                      {event.artists.length > 0
                        ? ` | ${event.artists.map((a) => a.name).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-[#7CFC00]">{event.date}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {releases.length > 0 ? (
          <section className="mb-14">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-2xl font-black">New Music</h2>
              <Link className="text-sm text-[#7CFC00] hover:underline" to="/music">
                All releases
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {releases.slice(0, 5).map((release) => (
                <li className="rounded-md border border-white/10 p-4" key={release.id}>
                  <Link params={{ slug: release.slug }} to="/music/$slug">
                    <span className="text-xs text-[#7CFC00]">{release.releaseType}</span>
                    <h3 className="font-bold">{release.title}</h3>
                    <p className="text-sm text-gray-500">{release.artistName}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {products.length > 0 ? (
          <section className="mb-14">
            <h2 className="mb-5 text-2xl font-black">Merch</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {products.map((product) => (
                <li className="rounded-md border border-white/10 p-4" key={product.id}>
                  <h3 className="font-bold">{product.name}</h3>
                  {product.price ? <p className="text-sm text-[#7CFC00]">{product.price}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav className="flex flex-wrap gap-3 border-t border-white/10 pt-8 text-sm">
          {[
            { label: "Artists", to: "/artists" },
            { label: "Articles", to: "/articles" },
            { label: "Events", to: "/events" },
            { label: "Music", to: "/music" },
            { label: "Venues", to: "/venues" },
            { label: "Writers", to: "/writers" },
            { label: "About", to: "/about" },
            { label: "Support", to: "/donate" },
          ].map((item) => (
            <Link
              className="rounded-md border border-white/10 px-3 py-1.5 text-gray-300 hover:border-[#7CFC00]/40 hover:text-[#7CFC00]"
              key={item.to}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
