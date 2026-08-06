import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtsArticles } from "#/lib/content.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

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

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <Link
          to="/"
          className="mb-8 inline-flex items-center text-[#7CFC00] no-underline transition-transform duration-300 hover:scale-105 hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Home
        </Link>

        <PageTitleHeader
          title="ARTICLES"
          description="Artist interviews, studio notes, show previews, and the stories behind Arkansas visual culture."
        />

        {articles.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-gray-800 bg-[#111111] transition-all duration-300 hover:border-[#7CFC00]"
              >
                <div className="grid h-60 place-items-center overflow-hidden bg-black">
                  {article.coverImage ? (
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      width={640}
                      height={384}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <BookOpen className="size-14 text-gray-700" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="mb-3 flex items-center text-gray-500 text-xs uppercase tracking-[0.2em]">
                    <CalendarDays className="mr-2 size-4" />
                    {formatPublishedDate(article.publishedAt)}
                  </p>
                  <h2 className="font-black text-2xl tracking-tight transition-colors group-hover:text-[#7CFC00]">
                    {article.title}
                  </h2>
                  {article.artmakers.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {article.artmakers.map((artmaker) => (
                        <Link
                          key={artmaker.id}
                          to="/artmakers/$slug"
                          params={{ slug: artmaker.slug }}
                          className="rounded border border-[#7CFC00]/40 px-2 py-1 text-[#7CFC00] text-xs no-underline hover:bg-[#7CFC00] hover:text-black"
                        >
                          {artmaker.name}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-4 line-clamp-4 text-gray-400 leading-7">{article.excerpt}</p>
                  <div className="mt-auto pt-6">
                    <span className="inline-flex items-center gap-2 font-black text-[#7CFC00] text-xs uppercase tracking-[0.2em]">
                      Read article
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-[#111111] px-6 py-12 text-center">
            <p className="text-gray-400 text-lg">
              The articles wall is empty for now. Interviews and studio visits will land here soon.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
