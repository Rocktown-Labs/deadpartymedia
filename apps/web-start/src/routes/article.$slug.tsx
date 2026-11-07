import { createFileRoute, notFound } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";

interface Article {
  category: string;
  comment_count: number;
  content: string;
  cover_image: string | null;
  created_at: string;
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  tags?: string[];
  title: string;
  views: number;
}

/**
 * Ported from apps/web/src/app/article/[slug]/page.tsx: generateMetadata ->
 * route head() driven by loader data; 404 via notFound(). The API renders
 * stored TipTap content to HTML server-side (GET /music/posts/:slug).
 */
export const Route = createFileRoute("/article/$slug")({
  component: ArticlePage,
  loader: async ({ params }) => {
    const article = await apiFetch<Article>(`/music/posts/${params.slug}`).catch(() => null);
    if (!article) {
      throw notFound();
    }
    return { article };
  },
  head: ({ loaderData }) => {
    const article = loaderData?.article;
    if (!article) {
      return { meta: [{ title: "Article | Dead Party Media" }] };
    }
    const url = `https://www.deadpartymedia.com/article/${article.slug}`;
    return {
      meta: [
        { title: `${article.title} | Dead Party Media` },
        { content: article.excerpt, name: "description" },
        { content: article.excerpt, property: "og:description" },
        { content: article.title, property: "og:title" },
        { content: "article", property: "og:type" },
        { content: url, property: "og:url" },
        ...(article.cover_image ? [{ content: article.cover_image, property: "og:image" }] : []),
      ],
    };
  },
});

function ArticlePage() {
  const { article } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-3xl px-6 pt-24 pb-20">
      <p className="mb-2 text-xs text-[#7CFC00]">{article.category}</p>
      <h1 className="mb-3 text-4xl font-black leading-tight">{article.title}</h1>
      <p className="mb-8 text-sm text-gray-400">
        {article.published_at
          ? new Date(article.published_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : ""}{" "}
        | {article.views} views | {article.comment_count} comments
      </p>

      {article.cover_image ? (
        <img
          alt={article.title}
          className="mb-8 w-full rounded-md border border-white/10"
          src={article.cover_image}
        />
      ) : null}

      {article.tags && article.tags.length > 0 ? (
        <p className="mb-6 text-sm text-gray-500">Tags: {article.tags.join(", ")}</p>
      ) : null}

      <div
        className="prose-invert max-w-none text-gray-200"
        // The API renders stored TipTap JSON to sanitized HTML server-side,
        // matching the Next.js app's article pipeline.
        dangerouslySetInnerHTML={{ __html: article.content }}
      />
    </main>
  );
}
