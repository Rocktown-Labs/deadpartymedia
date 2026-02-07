"use client";

import { useState } from "react";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { useArticleComments, useCreateComment } from "@/lib/api/articles";

interface ArticleCommentsProps {
  slug: string;
  commentCount?: number;
  articleId?: number;
  articleTitle?: string;
}

function buildCommentsHref(pathname: string) {
  if (!pathname) return "#comments";
  if (pathname.includes("#")) return pathname;
  return `${pathname}#comments`;
}

export function ArticleComments({
  slug,
  commentCount,
  articleId,
  articleTitle,
}: ArticleCommentsProps) {
  const pathname = usePathname();
  const commentsHref = buildCommentsHref(pathname);
  const { isSignedIn, user: currentUser } = useUser();
  const { data: comments } = useArticleComments(slug);
  const createComment = useCreateComment();
  const [commentText, setCommentText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !isSignedIn || !currentUser) return;
    setSubmitError(null);

    try {
      await createComment.mutateAsync({ slug, content: commentText });

      posthog.capture("comment_posted", {
        article_id: articleId,
        article_slug: slug,
        article_title: articleTitle,
        comment_length: commentText.length,
      });

      setCommentText("");
    } catch (error) {
      console.error("Error posting comment:", error);
      posthog.captureException(error);
      setSubmitError(
        error instanceof Error ? error.message : "Failed to post comment. Please try again.",
      );
    }
  }

  const renderedCount = Array.isArray(comments) ? comments.length : 0;
  const totalCount = typeof commentCount === "number" ? commentCount : renderedCount;
  const hasTotalCountContext = totalCount > renderedCount;
  const headingText = hasTotalCountContext
    ? `Comments (${renderedCount} of ${totalCount})`
    : `Comments (${renderedCount})`;

  return (
    <section id="comments" className="mt-16 border-t border-gray-800 pt-8 scroll-mt-28">
      <h2 className="text-2xl font-black mb-6">{headingText}</h2>

      <SignedIn>
        <form onSubmit={handleCommentSubmit} className="mb-8">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-3 bg-[#111111] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00] resize-none mb-4"
            rows={4}
          />
          <Button
            type="submit"
            disabled={!commentText.trim() || createComment.isPending}
            className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-medium"
          >
            {createComment.isPending ? "Posting..." : "Post Comment"}
          </Button>
          {submitError ? (
            <p className="mt-3 text-sm text-red-400" role="alert" aria-live="assertive">
              {submitError}
            </p>
          ) : null}
        </form>
      </SignedIn>

      <SignedOut>
        <div className="mb-8 p-4 bg-[#111111] border border-gray-800 rounded-lg">
          <p className="text-gray-400 mb-3">Sign in to leave a comment</p>
          <SignInButton mode="modal">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-[#7CFC00] px-4 py-2 text-sm font-bold text-black hover:bg-[#7CFC00]/90"
              onClick={() => {
                // Ensure the URL points back to this section even if the user refreshes later.
                if (typeof window !== "undefined") window.location.hash = "comments";
                posthog.capture("comment_signin_clicked", { article_slug: slug });
              }}
            >
              Sign in to comment
            </button>
          </SignInButton>
          <p className="mt-2 text-xs text-gray-500">
            You’ll return right here:{" "}
            <a href={commentsHref} className="text-[#7CFC00] hover:text-[#7CFC00]/80">
              {commentsHref}
            </a>
          </p>
        </div>
      </SignedOut>

      <div className="space-y-6">
        {comments && Array.isArray(comments) && comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-800 pb-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white">
                      {comment.user_name || comment.user_email}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>

                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-8 space-y-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="border-l-2 border-gray-700 pl-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-white text-sm">
                              {reply.user_name || reply.user_email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(reply.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No comments yet. Be the first to comment!</p>
        )}
      </div>
    </section>
  );
}
