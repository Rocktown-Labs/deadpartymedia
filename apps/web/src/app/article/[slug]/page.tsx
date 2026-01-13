import type { Metadata } from "next";
import { getArticle } from "@/lib/api/server";
import { generateArticleMetadata } from "@/lib/seo";
import { ArticlePageClient } from "./article-page-client";

interface ArticlePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return {
      title: "Article Not Found | Dead Party Media",
      description: "The article you're looking for could not be found.",
    };
  }

  return generateArticleMetadata(article);
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  return <ArticlePageClient slug={slug} />;
}
