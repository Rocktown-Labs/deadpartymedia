import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  ArticleGrid,
  ArticleSpotlight,
  MerchSection,
  MusicSection,
  ShowsStrip,
  type HomeArticle,
  type HomeEvent,
  type HomeProduct,
  type HomeRelease,
} from "../components/home/home-sections";
import { apiFetch } from "../lib/api";
import { getSiteDefaults } from "../lib/seo";

const { defaultDescription, siteName } = getSiteDefaults();

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
  const dateSource = article.published_at ?? article.created_at;
  return {
    author: article.author?.name ?? "Unknown",
    category: article.category,
    cover_image: article.cover_image ?? null,
    date: new Date(dateSource).toLocaleDateString("en-US", {
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

/**
 * Ported from apps/web/src/app/page.tsx + homepage-client.tsx: the visual
 * parity pass replaces the simplified layout with the real section
 * composition — spotlight hero, article grid, shows table, music, merch.
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
  loader: async (): Promise<LoaderData> => {
    const [articles, events, releases, products] = await Promise.allSettled([
      apiFetch<{ results: Parameters<typeof transformArticle>[0][] }>("/music/posts?limit=100"),
      apiFetch<{ results: HomeEvent[] }>("/music/events?status=upcoming&limit=100"),
      apiFetch<HomeRelease[]>("/music/releases?limit=10"),
      apiFetch<HomeProduct[]>("/music/products?currency=USD&limit=5"),
    ]);

    const rawArticles = articles.status === "fulfilled" ? articles.value.results : [];
    return {
      articles: rawArticles.map(transformArticle),
      error: articles.status === "rejected",
      events: events.status === "fulfilled" ? events.value.results : [],
      products: products.status === "fulfilled" ? products.value : [],
      releases: releases.status === "fulfilled" ? releases.value : [],
    };
  },
});

function HomePage() {
  const { articles, error, events, products, releases } = Route.useLoaderData();
  const featured = articles.slice(0, 4);
  const hero = featured[0];
  const secondary = featured.slice(1, 4);
  const featuredSlugs = new Set(featured.map((article) => article.slug));
  const archive = articles.filter((article) => !featuredSlugs.has(article.slug)).slice(0, 6);

  return (
    <main>
      {error ? (
        <section className="mx-auto max-w-5xl px-6 pt-16">
          <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">
            Latest articles failed to load — refresh to retry.
          </p>
        </section>
      ) : null}

      <ArticleSpotlight hero={hero} secondary={secondary} />
      <ArticleGrid articles={archive} />
      <ShowsStrip events={events} />
      <MusicSection releases={releases} />
      <MerchSection products={products} />

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="rounded-2xl border border-[#7CFC00]/20 bg-gradient-to-br from-zinc-950 to-[#0A0A0A] p-10 text-center">
          <h2 className="mb-3 text-3xl font-black">
            Your premier destination for all things music in{" "}
            <span className="text-[#7CFC00]">Arkansas</span>
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-gray-400">
            Local rappers, country singers, hardcore bands, EDM DJs — we celebrate it all.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-3">
            <Link
              className="flex items-center gap-1 rounded-md border border-[#7CFC00]/40 px-4 py-2 text-sm text-[#7CFC00] hover:bg-[#7CFC00]/10"
              to="/artists"
            >
              Browse Artists <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="flex items-center gap-1 rounded-md border border-white/10 px-4 py-2 text-sm text-gray-300 hover:border-[#7CFC00]/40 hover:text-[#7CFC00]"
              to="/donate"
            >
              Support the Scene
            </Link>
          </nav>
        </div>
      </section>
    </main>
  );
}
