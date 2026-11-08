import { Link, createFileRoute } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, Calendar } from "lucide-react";
import { apiFetch } from "../lib/api";
import { getSiteDefaults } from "../lib/seo";

const { defaultDescription, siteName } = getSiteDefaults();

interface HomeArticle {
  author: string;
  category: string;
  cover_image: string | null;
  date: string;
  excerpt: string;
  id: number;
  slug: string;
  title: string;
}

interface HomeEvent {
  artists: { name: string; slug: string }[];
  date: string;
  id: number;
  image: string | null;
  location: string;
  price: string | null;
  slug: string;
  ticket_link: string | null;
  time: string | null;
  title: string;
  venue: string;
}

interface HomeRelease {
  artistName: string;
  coverArt: string | null;
  id: number;
  releaseType: "Single" | "Album" | "EP";
  slug: string;
  title: string;
}

interface HomeProduct {
  featuredImage: { altText: string | null; url: string } | null;
  handle: string;
  id: string;
  title: string;
  variants: { price: { amount: string; currencyCode: string } }[];
}

interface LoaderData {
  articles: HomeArticle[];
  error: boolean;
  events: HomeEvent[];
  products: HomeProduct[];
  releases: HomeRelease[];
}

function transformArticle(article: {
  author?: { name?: string };
  category: string;
  cover_image?: string | null;
  excerpt: string;
  id: number;
  published_at: string | null;
  created_at: string;
  slug: string;
  title: string;
}): HomeArticle {
  return {
    author: article.author?.name ?? "Dead Party Staff",
    category: article.category,
    cover_image: article.cover_image ?? null,
    date: new Date(article.published_at ?? article.created_at).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    excerpt: article.excerpt,
    id: article.id,
    slug: article.slug,
    title: article.title,
  };
}

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
  loader: async (): Promise<LoaderData> => {
    const [articles, events, releases, products] = await Promise.allSettled([
      apiFetch<{ results: Parameters<typeof transformArticle>[0][] }>("/music/posts?limit=100"),
      apiFetch<{ results: HomeEvent[] }>("/music/events?status=upcoming&limit=100"),
      apiFetch<HomeRelease[]>("/music/releases?limit=10"),
      apiFetch<HomeProduct[]>("/music/products?currency=USD&limit=5"),
    ]);
    const raw = articles.status === "fulfilled" ? articles.value.results : [];
    return {
      articles: raw.map(transformArticle),
      error: articles.status === "rejected",
      events: events.status === "fulfilled" ? events.value.results : [],
      products: products.status === "fulfilled" ? products.value : [],
      releases: releases.status === "fulfilled" ? releases.value : [],
    };
  },
});

function HomePage() {
  const { articles, error, events, products, releases } = Route.useLoaderData();
  const hero = articles[0];
  const secondary = articles.slice(1, 4);
  const archive = articles.slice(4, 10);
  const featuredSlugs = new Set(articles.slice(0, 4).map((a) => a.slug));
  const recent =
    articles.filter((a) => !featuredSlugs.has(a.slug)).length > 0
      ? articles.filter((a) => !featuredSlugs.has(a.slug)).slice(0, 6)
      : archive;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Section 1: Featured Spotlight */}
      <section className="relative pt-[calc(var(--navbar-offset)+1rem)] pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-6">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
              Featured Spotlight
            </h2>
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">
              Arkansas Independent Music &amp; Scene Coverage
            </span>
          </div>

          {/* Hero Card */}
          {hero ? (
            <Link className="group block" params={{ slug: hero.slug }} to="/article/$slug">
              <article className="relative group cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 hover:border-[#7CFC00] transition-all duration-300 shadow-2xl h-[400px] sm:h-[500px] lg:h-[560px] bg-zinc-950">
                <Image
                  layout="fullWidth"
                  alt={hero.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
                  src={hero.cover_image ?? "/placeholder.svg"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/20" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12">
                  <div className="mb-3 flex items-center gap-3 sm:mb-4">
                    <span className="inline-block bg-[#7CFC00] px-3 py-1 text-[11px] font-black tracking-[0.2em] text-black uppercase rounded-xs shadow-md">
                      Spotlight Cover Story
                    </span>
                    {hero.category ? (
                      <span className="rounded border border-zinc-700 bg-black/60 px-2.5 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-300">
                        {hero.category}
                      </span>
                    ) : null}
                  </div>
                  <h1 className="mb-3 max-w-4xl text-2xl font-black leading-tight tracking-tight transition-colors group-hover:text-[#7CFC00] sm:mb-4 sm:text-4xl lg:text-5xl">
                    {hero.title}
                  </h1>
                  <p className="mb-5 max-w-3xl border-l-2 border-[#7CFC00] pl-4 text-sm leading-relaxed text-zinc-300 line-clamp-2 sm:text-base sm:line-clamp-3">
                    {hero.excerpt}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 font-mono text-xs uppercase tracking-wider text-zinc-400">
                    <span className="font-semibold text-zinc-200">By {hero.author}</span>
                    <span>•</span>
                    <span>{hero.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-[#7CFC00] group-hover:underline">
                      Read Cover Story <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/60 px-6 text-center">
              <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#7CFC00]">
                {error ? "Coverage temporarily offline" : "Stories coming soon"}
              </p>
              <p className="max-w-md text-sm text-zinc-400">
                {error
                  ? "We couldn't load the latest stories. Please check back shortly."
                  : "New Arkansas music stories are on the way. Check back soon."}
              </p>
            </div>
          )}

          {/* Secondary Cards */}
          {secondary.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {secondary.map((article) => (
                <Link
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 shadow-lg transition-all hover:border-[#7CFC00] hover:bg-zinc-900/40"
                  key={article.slug}
                  params={{ slug: article.slug }}
                  to="/article/$slug"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                    <Image
                      layout="fullWidth"
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={article.cover_image ?? "/placeholder.svg"}
                    />
                    {article.category ? (
                      <span className="absolute left-3 top-3 rounded border border-[#7CFC00]/30 bg-black/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#7CFC00] backdrop-blur-xs">
                        {article.category}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h2 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-white transition-colors group-hover:text-[#7CFC00] sm:text-lg">
                        {article.title}
                      </h2>
                      <p className="mb-4 line-clamp-2 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                        {article.excerpt}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800/60 pt-3 font-mono text-xs">
                      <span className="truncate text-zinc-400">By {article.author}</span>
                      <span className="flex shrink-0 items-center gap-1 font-bold text-[#7CFC00] group-hover:underline">
                        Read Story <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Section 2: Upcoming Shows */}
      <section className="relative border-t border-zinc-900 bg-zinc-950/50 px-4 py-14 sm:px-6">
        <div className="container mx-auto">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                Live Scene Calendar
              </span>
              <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                Upcoming Shows &amp; Live Events
              </h2>
              <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
                Concerts, basement shows, and tour stops across Arkansas.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
                to="/events"
              >
                <Calendar className="h-4 w-4" /> All Shows
              </Link>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-6 text-center">
              <p className="text-sm text-zinc-400">No upcoming shows right now.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-800 bg-zinc-900/80 text-left">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Date
                    </th>
                    <th className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                      Event
                    </th>
                    <th className="hidden px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 sm:table-cell">
                      Venue
                    </th>
                    <th className="hidden px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 lg:table-cell">
                      Lineup
                    </th>
                    <th className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-right">
                      Tix
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 8).map((event) => (
                    <tr
                      className="border-b border-zinc-800/50 transition-colors last:border-b-0 hover:bg-zinc-900/40"
                      key={event.id}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#7CFC00]">
                        {event.date}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          className="font-semibold text-white hover:text-[#7CFC00]"
                          params={{ slug: event.slug }}
                          to="/events/$slug"
                        >
                          {event.title}
                        </Link>
                        {event.time ? (
                          <span className="ml-2 text-xs text-zinc-500">{event.time}</span>
                        ) : null}
                      </td>
                      <td className="hidden px-4 py-3 text-zinc-400 sm:table-cell">
                        {event.venue}
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-zinc-500 lg:table-cell">
                        {event.artists.map((a) => a.name).join(", ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {event.ticket_link ? (
                          <a
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-[#7CFC00] hover:underline"
                            href={event.ticket_link}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Tickets
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Recent Articles Grid */}
      {recent.length > 0 ? (
        <section className="relative px-4 py-14 sm:px-6">
          <div className="container mx-auto">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                  Recent Coverage
                </span>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                  Latest Articles
                </h2>
              </div>
              <Link
                className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#7CFC00] hover:underline"
                to="/articles"
              >
                All Articles <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((article) => (
                <Link
                  className="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 transition-all hover:border-[#7CFC00]/50"
                  key={article.id}
                  params={{ slug: article.slug }}
                  to="/article/$slug"
                >
                  <div className="relative aspect-video overflow-hidden bg-zinc-900">
                    <Image
                      layout="fullWidth"
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={article.cover_image ?? "/placeholder.svg"}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#7CFC00]">
                      {article.category}
                    </span>
                    <h3 className="font-bold leading-tight text-white transition-colors group-hover:text-[#7CFC00]">
                      {article.title}
                    </h3>
                    <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
                      {article.excerpt}
                    </p>
                    <div className="mt-auto flex items-center justify-between border-t border-zinc-800/60 pt-3 font-mono text-xs text-zinc-500">
                      <span className="truncate">{article.author}</span>
                      <span>{article.date}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 4: New Music */}
      {releases.length > 0 ? (
        <section className="relative border-t border-zinc-900 bg-zinc-950/50 px-4 py-14 sm:px-6">
          <div className="container mx-auto">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                  Fresh Drops
                </span>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                  New Music from Arkansas Artists
                </h2>
              </div>
              <Link
                className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#7CFC00] hover:underline"
                to="/music"
              >
                All Music <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {releases.slice(0, 5).map((release) => (
                <Link
                  className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-all hover:border-[#7CFC00]/50"
                  key={release.id}
                  params={{ slug: release.slug }}
                  to="/music/$slug"
                >
                  <div className="aspect-square overflow-hidden bg-zinc-900">
                    <Image
                      layout="fullWidth"
                      alt={release.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      src={release.coverArt ?? "/placeholder.svg"}
                    />
                  </div>
                  <div className="p-3">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#7CFC00]">
                      {release.releaseType}
                    </span>
                    <h3 className="mt-1 truncate text-sm font-bold text-white group-hover:text-[#7CFC00]">
                      {release.title}
                    </h3>
                    <p className="truncate text-xs text-zinc-500">{release.artistName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 5: Merch */}
      {products.length > 0 ? (
        <section className="relative px-4 py-14 sm:px-6">
          <div className="container mx-auto">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                  Support the Scene
                </span>
                <h2 className="mt-1 text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
                  Official Merch
                </h2>
              </div>
              <Link
                className="flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-[#7CFC00] hover:underline"
                to="/merch"
              >
                Shop All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {products.slice(0, 5).map((product) => {
                const variant = product.variants[0];
                const amount = variant ? Number.parseFloat(variant.price.amount) : undefined;
                return (
                  <Link
                    className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-all hover:border-[#7CFC00]/50"
                    key={product.id}
                    params={{ handle: product.handle }}
                    to="/merch/$handle"
                  >
                    <div className="aspect-square overflow-hidden bg-zinc-900">
                      {product.featuredImage ? (
                        <Image
                          layout="fullWidth"
                          alt={product.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          src={product.featuredImage.url}
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-sm font-bold text-white">{product.title}</h3>
                      {amount !== undefined && Number.isFinite(amount) ? (
                        <p className="text-xs font-bold text-[#7CFC00]">
                          {variant?.price.currencyCode} {amount.toFixed(2)}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Section 6: About / CTA */}
      <section className="relative border-t border-zinc-900 bg-zinc-950/50 px-4 py-16 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-px w-24 bg-[#7CFC00]"></div>
          </div>
          <h2 className="mb-4 text-2xl font-black tracking-tight text-white sm:text-4xl">
            What is <span className="text-[#7CFC00]">Dead Party Media?</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
            We are your premier destination for all things music in Arkansas! Whether you're looking
            for local rappers, country singers, hardcore bands or EDM DJs, we celebrate it all. Our
            mission is to shine an equal spotlight on every artist in the local scene.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-[#7CFC00] bg-[#7CFC00]/10 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#7CFC00] transition-colors hover:bg-[#7CFC00] hover:text-black"
              to="/artists"
            >
              Browse Artists <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              to="/about"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
