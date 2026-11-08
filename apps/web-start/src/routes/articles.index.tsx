import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch } from "../lib/api";

interface ArticleListItem {
  category: string;
  cover_image: string | null;
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
}

interface LoaderData {
  articles: ArticleListItem[];
  error: string | null;
}

const CATEGORIES = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

/**
 * Ported from apps/web/src/app/articles/articles-page-client.tsx — the
 * visual parity pass uses the shadcn card grid with category filter pills,
 * matching the source layout.
 */
export const Route = createFileRoute("/articles/")({
  component: ArticlesPage,
  head: () => ({ meta: [{ title: "Articles | Dead Party Media" }] }),
  loader: async (): Promise<LoaderData> => {
    try {
      const data = await apiFetch<{ results: ArticleListItem[] }>("/music/posts?limit=50");
      return { articles: data.results, error: null };
    } catch {
      return { articles: [], error: "Failed to load articles" };
    }
  },
});

function ArticlesPage() {
  const { articles, error } = Route.useLoaderData();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("ALL");

  const filtered =
    category === "ALL" ? articles : articles.filter((article) => article.category === category);

  return (
    <main className="mx-auto max-w-5xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Articles</h1>
      <p className="mb-8 text-sm text-gray-400">Covering Arkansas music across every genre</p>

      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            className={
              category === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm font-medium text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/30"
            }
            key={item}
            onClick={() => {
              setCategory(item);
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">No articles found.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => (
            <li key={article.id}>
              <Link className="group" params={{ slug: article.slug }} to="/article/$slug">
                <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors group-hover:border-[#7CFC00]/40">
                  {article.cover_image ? (
                    <div className="aspect-video overflow-hidden">
                      <img
                        alt={article.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        src={article.cover_image}
                      />
                    </div>
                  ) : null}
                  <CardContent className="p-4">
                    <Badge className="mb-2 bg-[#7CFC00]/10 text-[#7CFC00]" variant="secondary">
                      {article.category}
                    </Badge>
                    <h2 className="mb-1 font-bold leading-tight group-hover:text-[#7CFC00]">
                      {article.title}
                    </h2>
                    <p className="line-clamp-2 text-sm text-gray-400">{article.excerpt}</p>
                    {article.published_at ? (
                      <p className="mt-2 text-xs text-gray-600">
                        {new Date(article.published_at).toLocaleDateString("en-US", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
