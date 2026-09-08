"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useArticles } from "@/lib/api/articles";
import { PageTitleHeader } from "@/components/page-title-header";

export default function HardcorePage() {
  const { data: articles, isLoading } = useArticles("HARDCORE & ROCK");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <Link
            href={"/articles" as any}
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Articles
          </Link>

          <PageTitleHeader title="HARDCORE & ROCK" />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles && articles.length > 0 ? (
              articles.map((article) => (
                <Link key={article.id} href={`/article/${article.slug}`}>
                  <div className="border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer h-full">
                    <div className="relative overflow-hidden bg-[#111111] h-40">
                      <img
                        src={article.cover_image || "/placeholder.svg"}
                        alt={article.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-white mb-2 line-clamp-2 hover:text-[#7CFC00] transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{article.excerpt}</p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{article.author.name}</span>
                        <span>{new Date(article.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">No articles found in this category.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
