"use client";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useArticles } from '@/lib/api/articles';
import type { ArticleList } from '@/lib/api/articles';

const categoryOrder = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"];
const categoryRouteMap: Record<string, Route> = {
  COUNTRY: "/country",
  EDM: "/edm",
  "HARDCORE & ROCK": "/hardcore",
  "HIP-HOP & R&B": "/hip-hop-r-b",
  OTHER: "/other",
};

export default function MusicPage() {
  const { data: allArticles, isLoading } = useArticles();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const categoryGroups = {
    COUNTRY: (allArticles || []).filter((a) => a.category === "COUNTRY"),
    EDM: (allArticles || []).filter((a) => a.category === "EDM"),
    "HARDCORE & ROCK": (allArticles || []).filter((a) => a.category === "HARDCORE & ROCK"),
    "HIP-HOP & R&B": (allArticles || []).filter((a) => a.category === "HIP-HOP & R&B"),
    OTHER: (allArticles || []).filter((a) => a.category === "OTHER"),
  };

  const ArticleCard = ({ article }: { article: ArticleList }) => (
    <Link href={`/article/${article.slug}`}>
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
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Main Content */}
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-7xl">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Page Header */}
          <div className="mb-16">
            <div className="flex items-center mb-6">
              <h1 className="text-5xl font-black tracking-wider">MUSIC</h1>
              <div className="ml-8 w-32 h-1 bg-[#7CFC00]"></div>
            </div>
            <p className="text-xl text-gray-400">
              Explore the diverse sounds and stories of Arkansas music
            </p>
          </div>

          {/* Music Categories */}
          <div className="space-y-16">
            {categoryOrder.map((category) => {
              const articles = categoryGroups[category as keyof typeof categoryGroups] || [];
              if (articles.length === 0) {return null;}

              const categoryHref = categoryRouteMap[category] ?? "/music";

              return (
                <section key={category} className="animate-fadeInUp">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                      <h2 className="text-3xl font-black tracking-wider">{category}</h2>
                      <div
                        className="ml-6 h-1 bg-[#7CFC00] grow"
                        style={{ maxWidth: "200px" }}
                      ></div>
                    </div>
                    <Link
                      href={categoryHref}
                      className="text-[#7CFC00] hover:text-[#7CFC00]/80 flex items-center gap-2 transition-all"
                    >
                      View all
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 flex md:flex-none overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                    {articles.slice(0, 3).map((article) => (
                      <div key={article.id} className="flex-none w-[85vw] md:w-auto snap-center">
                        <ArticleCard article={article} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
