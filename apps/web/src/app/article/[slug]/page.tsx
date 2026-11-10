import { getMusicApi } from "@/lib/api.server";
import { getArticle } from "@/lib/api/server";
import type { PageMetadata as Metadata } from "@/lib/page-head";
import { generateArticleMetadata } from "@/lib/seo";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { ArticlePageClient } from "./article-page-client";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["article"][":slug"].$get({
        param: { slug: input.params.slug },
        query: input.search,
      }),
    ),
  );

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const generateMetadata = async ({ params }: ArticlePageProps): Promise<Metadata> => {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      description: "The article you're looking for could not be found.",
      title: "Article Not Found",
    };
  }

  return generateArticleMetadata(article);
};

export default function ArticlePage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { slug } = data;
  return <ArticlePageClient slug={slug} />;
}

export const loadPageMetadata = createServerFn({ method: "GET" })
  .validator((params: { slug: string }) => params)
  .handler(({ data }) => generateMetadata({ params: Promise.resolve(data) }));
