import type { Metadata } from "next";
import { getArticle } from "@/lib/api/server";
import { generateArticleMetadata } from "@/lib/seo";
import { ArticlePageClient } from "./article-page-client";

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

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticlePageClient slug={slug} />;
}
