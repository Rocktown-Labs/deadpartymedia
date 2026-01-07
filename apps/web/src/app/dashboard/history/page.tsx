"use client"

import { useReadArticles } from "@/lib/api/user-activity"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { BookOpen, Calendar } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"

export default function HistoryPage() {
  const { data: readArticles, isLoading } = useReadArticles()

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

  const articles = readArticles?.results || []

  if (articles.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">Reading History</h1>
              <p className="text-gray-400">Articles you've read will appear here.</p>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <BookOpen className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>No reading history yet</EmptyTitle>
                <EmptyDescription>
                  Start reading articles to see them appear in your history.
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
            <h1 className="text-4xl font-black mb-2">Reading History</h1>
            <p className="text-gray-400">Articles you've read ({articles.length})</p>
          </div>

      <div className="space-y-4">
        {articles.map((item) => {
          const article = item.article
          return (
            <Link
              key={item.id}
              href={`/article/${article.slug}`}
              className="block bg-[#111111] border border-gray-800 rounded-lg p-6 hover:border-[#7CFC00] transition-colors"
            >
              <div className="flex gap-4">
                {article.cover_image && (
                  <div className="relative w-32 h-32 shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={article.cover_image}
                      alt={article.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white mb-2 line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {article.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Read {formatDistanceToNow(new Date(item.read_at), { addSuffix: true })}
                      </span>
                    </div>
                    {article.author && (
                      <span>By {article.author.name}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
          </div>
        </div>
      </main>
    </div>
  )
}

