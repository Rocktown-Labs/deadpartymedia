"use client"

import { useUserComments } from "@/lib/api/user-activity"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { MessageSquare, Calendar, Reply } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"

export default function CommentsPage() {
  const { data: comments, isLoading } = useUserComments()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  const userComments = comments?.results || []

  if (userComments.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">My Comments</h1>
              <p className="text-gray-400">Comments you've made will appear here.</p>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <MessageSquare className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>No comments yet</EmptyTitle>
                <EmptyDescription>
                  Start engaging with articles by leaving comments. They'll appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">My Comments</h1>
            <p className="text-gray-400">Comments you've made ({userComments.length})</p>
          </div>

      <div className="space-y-4">
        {userComments.map((comment) => (
          <div
            key={comment.id}
            className="bg-[#111111] border border-gray-800 rounded-lg p-6"
          >
            <div className="flex gap-4 mb-4">
              {comment.article.cover_image && (
                <div className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden">
                  <Image
                    src={comment.article.cover_image}
                    alt={comment.article.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/article/${comment.article.slug}`}
                  className="text-lg font-semibold text-white hover:text-[#7CFC00] transition-colors line-clamp-2"
                >
                  {comment.article.title}
                </Link>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              {comment.replies.length > 0 && (
                <div className="flex items-center gap-1">
                  <Reply className="w-3 h-3" />
                  <span>{comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}</span>
                </div>
              )}
            </div>

            {comment.replies.length > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-gray-800 space-y-3">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="text-sm">
                    <p className="text-gray-400 whitespace-pre-wrap">{reply.content}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
          </div>
        </div>
      </main>
    </div>
  )
}

