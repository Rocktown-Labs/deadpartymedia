import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "../lib/api";

interface ArticleListItem {
  category: string;
  comment_count?: number;
  cover_image: string | null;
  created_at: string;
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
  views: number;
}

interface ArticlesLoaderData {
  articles: ArticleListItem[];
  error: string | null;
}

const CATEGORIES = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

/**
 * Ported from apps/web/src/app/articles/page.tsx (+ client). The loader reads
 * the platform API (GET /music/posts); category filtering is client-side over
 * the loaded list. The full article-card UI port (shadcn kit) comes with the
 * visual-parity pass — see MIGRATION.md.
 */
export const Route = createFileRoute("/articles/")({
  component: ArticlesPage,
  head: () => ({
    meta: [{ title: "Articles | Dead Party Media" }],
  }),
  loader: async (): Promise<ArticlesLoaderData> => {
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
  const [category, setCategory] = useState<"ALL" | (typeof CATEGORIES)[number]>("ALL");

  const filtered =
    category === "ALL" ? articles : articles.filter((article) => article.category === category);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Articles</h1>
      <p className="mb-8 text-sm text-gray-400">Served by the platform API (GET /music/posts)</p>

      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            className={
              category === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 hover:border-white/30"
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
        <ul className="space-y-4">
          {filtered.map((article) => (
            <li
              className="rounded-md border border-white/10 p-4 hover:border-[#7CFC00]/40"
              key={article.id}
            >
              <Link params={{ slug: article.slug }} to="/article/$slug">
                <span className="text-xs text-[#7CFC00]">{article.category}</span>
                <h2 className="text-xl font-bold">{article.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-400">{article.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
