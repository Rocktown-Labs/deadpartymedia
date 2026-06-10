"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Calendar, User, Share2, Bookmark, Edit, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMarkArticleRead, useSaveArticle, useSavedArticles } from "@/lib/api/user-activity";
import { ArticleStructuredData } from "@/components/seo/structured-data";
import posthogClient from "posthog-js";
import { ArticleComments } from "@/components/comments/article-comments";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useArticle } from "@/lib/api/articles";
import { toast } from "sonner";

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
  const { mutate: markArticleRead } = useMarkArticleRead();
  const { mutateAsync: saveArticle, isPending: isSavingArticle } = useSaveArticle();
  const { data: savedArticles } = useSavedArticles({ enabled: isSignedIn });
  const articleViewedRef = useRef<string | null>(null);
  const markArticleReadRef = useRef(markArticleRead);
  const trackedArticleReadRef = useRef<string | null>(null);
  const [savedInSession, setSavedInSession] = useState(false);

  useEffect(() => {
    markArticleReadRef.current = markArticleRead;
  }, [markArticleRead]);

  // Track article read when article loads and user is logged in
  useEffect(() => {
    const articleId = article?.id;
    const userId = currentUser?.id;

    if (!articleId || !isSignedIn || !userId) {
      return;
    }

    const trackingKey = `${userId}:${articleId}`;
    if (trackedArticleReadRef.current === trackingKey) {
      return;
    }
    trackedArticleReadRef.current = trackingKey;

    // Mark article as read (handles duplicates gracefully on backend)
    markArticleReadRef.current(articleId, {
      onError: (error) => {
        // Silently fail - don't interrupt user experience
        console.error("Error tracking article read:", error);
      },
    });
  }, [article?.id, currentUser?.id, isSignedIn]);

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

  const savedEntry = useMemo(() => {
    if (!article?.id || !savedArticles?.results) {
      return null;
    }

    return (
      savedArticles.results.find((savedArticle) => savedArticle.article.id === article.id) ?? null
    );
  }, [article?.id, savedArticles?.results]);

  const isArticleSaved = savedInSession || Boolean(savedEntry);

  const handleSaveClick = async () => {
    if (!article?.id) {
      return;
    }

    if (!isSignedIn) {
      router.push("/sign-in" as Route);
      return;
    }

    if (isArticleSaved) {
      toast.info("Article already saved");
      return;
    }

    try {
      await saveArticle(article.id);
      setSavedInSession(true);
      toast.success("Article saved");
      posthogClient.capture("article_saved", {
        article_category: article.category,
        article_id: article.id,
        article_slug: slug,
        article_title: article.title,
      });
    } catch (error) {
      toast.error("Failed to save article");
      posthogClient.captureException(error);
    }
  };

  const canEdit = useMemo(() => {
    if (!isSignedIn || !currentUser || !article) {
      return false;
    }
    const role = (currentUser.publicMetadata?.role as string | undefined)?.toLowerCase();
    const isSuperAdmin = role === "super_admin";
    const isWriter = role === "writer";
    const isAuthor = currentUser.id === article.author?.id;
    return isSuperAdmin || (isWriter && isAuthor);
  }, [isSignedIn, currentUser, article]);

  const handleShareClick = async () => {
    if (!article) {
      return;
    }

    const shareUrl = typeof window !== "undefined" ? window.location.href : `/article/${slug}`;
    const shareText = article.excerpt || article.title;

    try {
      const browserNavigator = navigator as Navigator & {
        share?: (data?: ShareData) => Promise<void>;
        clipboard?: Clipboard;
      };

      if (typeof browserNavigator.share === "function") {
        await browserNavigator.share({
          text: shareText,
          title: article.title,
          url: shareUrl,
        });
        posthogClient.capture("article_shared", {
          article_category: article.category,
          article_id: article.id,
          article_slug: slug,
          article_title: article.title,
          share_method: "native",
        });
        return;
      }

      if (browserNavigator.clipboard?.writeText) {
        await browserNavigator.clipboard.writeText(shareUrl);
      } else {
        toast.error("Sharing is not supported on this device");
        return;
      }

      toast.success("Article link copied");
      posthogClient.capture("article_shared", {
        article_category: article.category,
        article_id: article.id,
        article_slug: slug,
        article_title: article.title,
        share_method: "clipboard",
      });
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "";
      if (errorName === "AbortError") {
        return;
      }

      toast.error("Unable to share article");
      posthogClient.captureException(error);
    }
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
            <div className="max-w-4xl mx-auto">
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
                    className="border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black bg-transparent disabled:opacity-100"
                    onClick={handleSaveClick}
                    disabled={isSavingArticle || isArticleSaved}
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    {isArticleSaved ? "Saved" : isSavingArticle ? "Saving..." : "Save"}
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
                  {canEdit && (
                    <Link href={`/admin/posts/${article.id}`} passHref>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black bg-transparent"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Post
                      </Button>
                    </Link>
                  )}
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

              {/* Tagged Artists */}
              {article.artists && article.artists.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-800 space-y-6">
                  <h3 className="text-lg font-black tracking-wider uppercase text-gray-400">Featured Artists</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {article.artists.map((artist) => (
                      <Link key={artist.id} href={`/artists/${artist.slug}`}>
                        <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer flex flex-row group h-32">
                          <div className="relative w-28 h-full overflow-hidden shrink-0 border-r border-gray-800">
                            <Image
                              src={artist.image || "/placeholder.svg"}
                              alt={artist.name}
                              fill
                              className="object-cover object-center group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-center min-w-0">
                            <h4 className="text-base font-black mb-1 group-hover:text-[#7CFC00] transition-colors line-clamp-1">
                              {artist.name}
                            </h4>
                            <div className="flex items-center text-xs text-gray-400 mb-1.5">
                              <MapPin className="w-3.5 h-3.5 mr-1 shrink-0" />
                              <span className="truncate">{artist.location || "Arkansas"}</span>
                            </div>
                            <p className="text-xs text-gray-300 line-clamp-2">
                              {artist.bio || "Profile pending update."}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

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
