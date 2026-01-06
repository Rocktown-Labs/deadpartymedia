"use client"

import Image from "next/image"
import Link from "next/link"

interface Article {
  id: number
  slug: string
  title: string
  category: string
  image: string
  excerpt: string
  author: string
  date: string
}

interface ArticleCardProps {
  article: Article
  index: number
  categoryColor?: string
}

export default function ArticleCard({ article, index, categoryColor = "#7CFC00" }: ArticleCardProps) {
  return (
    <Link key={article.id} href={`/article/${article.slug}`}>
      <article className="group cursor-pointer">
        {/* Image */}
        <div className="relative h-80 mb-6 overflow-hidden bg-black">
          <Image
            src={article.image || "/placeholder.svg"}
            alt={article.title}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
          />
          <div className="absolute top-4 left-4">
            <span
              className="inline-block px-3 py-1 bg-black/80 backdrop-blur-sm text-xs font-bold tracking-wider uppercase"
              style={{ color: categoryColor }}
            >
              {article.category}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h3
            className="text-2xl font-black leading-tight transition-colors"
            style={{
              color: "white",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = categoryColor)}
            onMouseLeave={(e) => (e.currentTarget.style.color = "white")}
          >
            {article.title}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">{article.excerpt}</p>
          <div className="flex items-center text-xs text-gray-500 uppercase tracking-wider pt-4 border-t border-gray-800">
            <span className="font-medium">{article.author}</span>
            <span className="mx-2">•</span>
            <span>{article.date}</span>
          </div>
        </div>
      </article>
    </Link>
  )
}
