import { Link } from "@tanstack/react-router";

interface GenreArticle {
  category: string;
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
}

export interface GenrePageProps {
  articles: GenreArticle[];
  error: string | null;
  genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
  subtitle: string;
  title: string;
}

/**
 * Shared layout for the genre category pages, ported from
 * apps/web/src/app/{country,edm,hardcore,hip-hop-r-b,other}/*-page-client.
 */
export function GenrePage({ articles, error, genre, subtitle, title }: GenrePageProps) {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <p className="mb-2 font-mono text-sm text-[#7CFC00]">{genre}</p>
      <h1 className="mb-2 text-4xl font-black md:text-5xl">{title}</h1>
      <p className="mb-8 text-gray-400">{subtitle}</p>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : articles.length === 0 ? (
        <p className="text-gray-400">No {genre.toLowerCase()} coverage yet — check back soon.</p>
      ) : (
        <ul className="space-y-4">
          {articles.map((article) => (
            <li
              className="rounded-md border border-white/10 p-4 hover:border-[#7CFC00]/40"
              key={article.id}
            >
              <Link params={{ slug: article.slug }} to="/article/$slug">
                <h2 className="text-xl font-bold">{article.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-400">{article.excerpt}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {article.published_at
                    ? new Date(article.published_at).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
