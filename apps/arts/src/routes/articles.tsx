import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { useMemo } from "react";
import {
  ArticleFilterBar,
  type ArticleSortOption,
} from "#/components/articles/article-filter-bar.tsx";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtsArticles } from "#/lib/content.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export interface ArticlesSearch {
  category?: string;
  q?: string;
  sort?: ArticleSortOption;
}

export const Route = createFileRoute("/articles")({
  component: ArticlesPage,
  head: () =>
    createSeoMeta({
      description:
        "Read Dead Party Arts articles, interviews, studio visits, and field notes from Arkansas visual culture.",
      path: "/articles",
      title: "Articles",
    }),
  loader: () => listArtsArticles(),
  validateSearch: (search: Record<string, unknown>): ArticlesSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
    sort:
      typeof search.sort === "string" && ["recent", "title"].includes(search.sort)
        ? (search.sort as ArticleSortOption)
        : undefined,
  }),
});

function formatPublishedDate(date: Date | null) {
  if (!date) {
    return "Coming soon";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function ArticlesPage() {
  const articles = Route.useLoaderData();
  const { category, q, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const activeSort: ArticleSortOption = sort ?? "recent";
  const searchQuery = q ?? "";

  // Extract unique categories/tags across articles
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const article of articles) {
      if (article.tags && Array.isArray(article.tags)) {
        for (const tag of article.tags) {
          if (tag.trim()) set.add(tag.trim());
        }
      }
    }
    // Fallback standard editorial categories if no tags exist yet
    if (set.size === 0) {
      return ["Interviews", "Studio Visits", "Exhibitions", "Features"];
    }
    return Array.from(set);
  }, [articles]);

  const displayArticles = useMemo(() => {
    let filtered = [...articles];

    if (category) {
      const target = category.toLowerCase().trim();
      filtered = filtered.filter((article) => {
        const matchesTags = article.tags?.some((t) => t.toLowerCase() === target);
        const matchesTitle = article.title.toLowerCase().includes(target);
        return matchesTags || matchesTitle;
      });
    }

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (article) =>
          article.title.toLowerCase().includes(term) ||
          article.excerpt.toLowerCase().includes(term) ||
          article.artmakers.some((m) => m.name.toLowerCase().includes(term)),
      );
    }

    filtered.sort((a, b) => {
      if (activeSort === "title") {
        return a.title.localeCompare(b.title);
      }
      const timeA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const timeB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return timeB - timeA;
    });

    return filtered;
  }, [articles, category, searchQuery, activeSort]);

  const handleSelectCategory = (nextCategory?: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        category: nextCategory,
      }),
    });
  };

  const handleSearchChange = (query: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        q: query.trim() ? query : undefined,
      }),
    });
  };

  const handleSelectSort = (nextSort: ArticleSortOption) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        sort: nextSort === "recent" ? undefined : nextSort,
      }),
    });
  };

  return (
    <main className="px-4 pb-24 pt-[calc(var(--navbar-offset)+1.5rem)] sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-[#7CFC00] text-xs font-black uppercase tracking-[0.2em] no-underline transition-transform duration-200 hover:text-[#a5ff43]"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Home
        </Link>

        <PageTitleHeader
          title="ARTICLES"
          description="Artist interviews, studio notes, show previews, and the stories behind Arkansas visual culture."
        />

        {/* Cohesive Article Filter Bar */}
        <ArticleFilterBar
          activeCategory={category}
          categories={categories}
          searchQuery={searchQuery}
          activeSort={activeSort}
          totalCount={displayArticles.length}
          onSelectCategory={handleSelectCategory}
          onSearchChange={handleSearchChange}
          onSelectSort={handleSelectSort}
        />

        {displayArticles.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayArticles.map((article) => (
              <article
                key={article.id}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-[#111111] transition-all duration-200 hover:border-[#7CFC00]"
              >
                <div className="relative grid h-60 place-items-center overflow-hidden bg-black">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      width={640}
                      height={384}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <BookOpen className="size-14 text-neutral-700" />
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5 sm:p-6">
                  <p className="mb-2.5 flex items-center text-xs uppercase tracking-[0.2em] text-neutral-500">
                    <CalendarDays className="mr-2 size-3.5 text-[#7CFC00]" />
                    {formatPublishedDate(article.publishedAt)}
                  </p>

                  <h2 className="font-black text-xl tracking-tight text-white transition-colors group-hover:text-[#7CFC00] sm:text-2xl">
                    {article.title}
                  </h2>

                  {article.artmakers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {article.artmakers.map((artmaker) => (
                        <Link
                          key={artmaker.id}
                          to="/artmakers/$slug"
                          params={{ slug: artmaker.slug }}
                          className="rounded-full border border-[#7CFC00]/40 bg-[#7CFC00]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#7CFC00] no-underline transition-colors hover:bg-[#7CFC00] hover:text-black"
                        >
                          {artmaker.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                    {article.excerpt}
                  </p>

                  <div className="mt-auto pt-6">
                    <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#7CFC00]">
                      Read article
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-[#101010]/90 px-6 py-16 text-center">
            <Sparkles className="mx-auto size-8 text-[#7CFC00]/60" />
            <h3 className="mt-4 font-black text-lg text-white">No Articles Found</h3>
            <p className="mt-2 text-sm text-neutral-400">
              {searchQuery || category
                ? "No published articles match your current filters. Try resetting."
                : "Articles and artist features will appear here as stories are published."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
