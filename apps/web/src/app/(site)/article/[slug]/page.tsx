"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, User, Share2, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useArticle, useArticleComments, useCreateComment } from "@/lib/api/articles"
import { useCurrentUser } from "@/lib/api/auth"

interface ArticlePageProps {
  params: {
    slug: string
  }
}

export default function ArticlePage({ params }: ArticlePageProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const { data: article, isLoading } = useArticle(params.slug)
  const { data: comments } = useArticleComments(params.slug)
  const { data: currentUser } = useCurrentUser()
  const createComment = useCreateComment()
  const [commentText, setCommentText] = useState("")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return

    try {
      await createComment.mutateAsync({
        slug: params.slug,
        content: commentText,
      })
      setCommentText("")
    } catch (error) {
      console.error("Error posting comment:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
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
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Article Content */}
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Link>

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
                  {article.published_at ? new Date(article.published_at).toLocaleDateString() : "Draft"}
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-8">{article.title}</h1>

            {/* Social Actions */}
            <div className="flex items-center space-x-4 mb-8">
              <Button
                variant="outline"
                size="sm"
                className="border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black bg-transparent"
              >
                <Heart className="w-4 h-4 mr-2" />
                Like
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-[#9400D3] text-[#9400D3] hover:bg-[#9400D3] hover:text-white bg-transparent"
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
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Comments Section */}
          <div className="mt-16 border-t border-gray-800 pt-8">
            <h2 className="text-2xl font-black mb-6">Comments ({article.comment_count})</h2>

            {/* Comment Form */}
            {currentUser ? (
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
              </form>
            ) : (
              <div className="mb-8 p-4 bg-[#111111] border border-gray-800 rounded-lg">
                <p className="text-gray-400 mb-2">Please sign in to comment</p>
                <Link href="/sign-in" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
                  Sign In
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {comments && comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="border-b border-gray-800 pb-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-white">{comment.user_name || comment.user_email}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-300">{comment.content}</p>
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="mt-4 ml-8 space-y-4">
                            {comment.replies.map((reply: any) => (
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
          </div>
        </div>
      </main>
    </div>
  )
}
