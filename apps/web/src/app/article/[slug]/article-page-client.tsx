"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, Calendar, User, Share2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMarkArticleRead } from "@/lib/api/user-activity";
import { ArticleStructuredData } from "@/components/seo/structured-data";
import posthogClient from "posthog-js";
import { ArticleComments } from "@/components/comments/article-comments";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useArticle } from "@/lib/api/articles";

interface ArticlePageClientProps {
  slug: string;
}

const getInternalReferrerPath = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { referrer } = document;
  if (!referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(referrer);
    return referrerUrl.origin === window.location.origin ? referrerUrl.pathname : null;
  } catch {
    return null;
  }
};

export function ArticlePageClient({ slug }: ArticlePageClientProps) {
  const router = useRouter();
  const { data: article, isLoading } = useArticle(slug);
  const { isSignedIn, user: currentUser } = useUser();
  const markArticleRead = useMarkArticleRead();
  const articleViewedRef = useRef<string | null>(null);

  // Track article read when article loads and user is logged in
  useEffect(() => {
    if (article && isSignedIn && currentUser && article.id) {
      // Mark article as read (handles duplicates gracefully on backend)
      markArticleRead.mutate(article.id, {
        onError: (error) => {
          // Silently fail - don't interrupt user experience
          console.error("Error tracking article read:", error);
        },
      });
    }
  }, [article, isSignedIn, currentUser, markArticleRead]);

  // Track article viewed event (top of content funnel) - using ref to prevent duplicate tracking
  if (article && articleViewedRef.current !== article.slug) {
    posthogClient.capture("article_viewed", {
      article_category: article.category,
      article_id: article.id,
      article_slug: article.slug,
      article_title: article.title,
      author_name: article.author?.name,
      is_signed_in: isSignedIn,
    });
    articleViewedRef.current = article.slug;
  }

  const handleLikeClick = () => {
    posthogClient.capture("article_liked", {
      article_category: article?.category,
      article_id: article?.id,
      article_slug: slug,
      article_title: article?.title,
    });
  };

  const handleShareClick = () => {
    posthogClient.capture("article_shared", {
      article_category: article?.category,
      article_id: article?.id,
      article_slug: slug,
      article_title: article?.title,
    });
  };

  const handleBackClick = () => {
    const internalReferrerPath = getInternalReferrerPath();
    if (internalReferrerPath) {
      router.back();
      return;
    }

    router.push("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">Article Not Found</h1>
          <Link href="/" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ArticleStructuredData article={article} />
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Article Content */}
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackClick}
                className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Articles
              </button>

              {/* Article Header */}
              <header className="mb-12">
                <div className="flex items-center space-x-4 mb-6">
                  <span className="inline-block px-3 py-1 bg-[#7CFC00] text-black text-xs font-bold tracking-wider">
                    {article.category}
                  </span>
                  <div className="flex items-center text-gray-400 text-sm space-x-4">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {article.author.name}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {article.published_at
                        ? new Date(article.published_at).toLocaleDateString()
                        : "Draft"}
                    </div>
                  </div>
                </div>
                <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">
                  {article.title}
                </h1>

                {/* Social Actions */}
                <div className="flex items-center space-x-4 mb-8">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black bg-transparent"
                    onClick={handleLikeClick}
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Like
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-[#9400D3] text-[#9400D3] hover:bg-[#9400D3] hover:text-white bg-transparent"
                    onClick={handleShareClick}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </header>

              {/* Featured Image */}
              <div className="mb-12">
                <Image
                  src={article.cover_image || "/placeholder.svg"}
                  alt={article.title}
                  width={800}
                  height={500}
                  className="w-full h-96 object-cover rounded-lg"
                />
              </div>

              {/* Article Content */}
              <article
                className="prose prose-invert prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: String(article.content || "") }}
              />

              <ArticleComments
                slug={slug}
                commentCount={article.comment_count}
                articleId={article.id}
                articleTitle={article.title}
              />
            </div>
          </div>

          <MerchCarousel heading="Merch" />
        </main>
      </div>
    </>
  );
}
