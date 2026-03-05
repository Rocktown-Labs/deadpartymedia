"use client";

import { useState, useEffect } from "react";
import { MapPin, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useRouter } from "next/navigation";
import { useMonthlyHomepageStats } from "@/lib/api/stats";
import type { Route } from "next";
import type { ArticleList } from "@/lib/api/articles";

export type HomepageArticle = Omit<ArticleList, "author"> & {
  author: string;
  date: string;
  image: string;
};

export interface HomepageEvent {
  artist: string;
  date: {
    day: string;
    month: string;
  };
  image: string;
  ticketUrl: string;
  venue: string;
}

interface HomepageClientProps {
  featuredArticles: HomepageArticle[];
  articlesData: HomepageArticle[];
  upcomingEvents: HomepageEvent[];
  featuredProducts: Product[];
  isArticlesLoading?: boolean;
  isEventsLoading?: boolean;
  isProductsLoading?: boolean;
  hasArticlesError?: boolean;
  hasEventsError?: boolean;
  hasProductsError?: boolean;
}

export default function HomepageClient({
  featuredArticles = [],
  articlesData = [],
  upcomingEvents = [],
  featuredProducts = [],
  isArticlesLoading = false,
  isEventsLoading = false,
  isProductsLoading = false,
  hasArticlesError = false,
  hasEventsError = false,
  hasProductsError = false,
}: HomepageClientProps) {
  const router = useRouter();
  const { data: monthlyStats, isLoading: isStatsLoading } = useMonthlyHomepageStats();
  const [visibleArticles, setVisibleArticles] = useState(9);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const loadMoreArticles = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleArticles((prev) => prev + 6);
      setIsLoadingMore(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-5" />
        <div
          className="absolute w-96 h-96 bg-[#7CFC00]/3 rounded-full blur-3xl"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
            transition: "all 0.5s ease-out",
          }}
        />
      </div>

      {/* Magazine Cover Hero */}
      <section className="relative pt-[calc(var(--navbar-offset)+0.75rem)] sm:pt-[calc(var(--navbar-offset)+1rem)] lg:pt-[calc(var(--navbar-offset)+1.5rem)] pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6">
        <div className="container mx-auto my-2.5">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Cover Story */}
            {isArticlesLoading ? (
              <div className="lg:col-span-8">
                <div className="relative h-full min-h-[460px] sm:min-h-[500px] lg:min-h-[600px] overflow-hidden bg-linear-to-br from-gray-900 to-black border border-gray-800">
                  <Skeleton className="absolute inset-0" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 lg:p-12">
                    <Skeleton className="h-6 w-40 mb-4 sm:mb-6" />
                    <Skeleton className="h-14 w-5/6 mb-4" />
                    <Skeleton className="h-14 w-3/5 mb-4 sm:mb-6" />
                    <Skeleton className="h-6 w-4/5 mb-6 sm:mb-8" />
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ) : featuredArticles.length > 0 ? (
              <div className="lg:col-span-8">
                <Link href={`/article/${featuredArticles[0]?.slug}`} prefetch={false}>
                  <div className="relative group cursor-pointer h-full">
                    {/* Cover Image */}
                    <div className="relative h-full min-h-[460px] sm:min-h-[500px] lg:min-h-[600px] overflow-hidden bg-linear-to-br from-gray-900 to-black">
                      <Image
                        src={
                          featuredArticles[0]?.image ||
                          featuredArticles[0]?.cover_image ||
                          "/placeholder.svg"
                        }
                        alt={featuredArticles[0]?.title || "Featured Article"}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />

                      {/* Magazine-style text overlay */}
                      <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-8 lg:p-12">
                        {/* Category Label */}
                        <div className="mb-3 sm:mb-6">
                          <span className="inline-block bg-[#7CFC00] px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs text-black font-black tracking-[0.24em] sm:tracking-[0.3em] uppercase">
                            Cover Story
                          </span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-2xl sm:text-5xl lg:text-7xl font-black leading-[1.02] sm:leading-[0.95] mb-3 sm:mb-6 tracking-tight">
                          {featuredArticles[0]?.title}
                        </h1>

                        {/* Deck/Subheadline */}
                        <p className="text-sm sm:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-8 max-w-none sm:max-w-3xl leading-relaxed line-clamp-6 sm:line-clamp-none border-l-4 border-[#7CFC00] pl-3 sm:pl-6">
                          {featuredArticles[0]?.excerpt}
                        </p>

                        {/* Byline */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 lg:gap-x-6 text-[11px] sm:text-sm text-gray-400 uppercase tracking-wider">
                          <span className="font-medium">
                            By {featuredArticles[0]?.author || "Unknown"}
                          </span>
                          <span>•</span>
                          <span>
                            {featuredArticles[0]?.date ||
                              (featuredArticles[0]?.published_at
                                ? new Date(featuredArticles[0].published_at).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric", year: "numeric" },
                                  )
                                : "")}
                          </span>
                          <span>•</span>
                          <span className="text-[#7CFC00]">Featured</span>
                        </div>
                      </div>

                      {/* Vertical Text Accent */}
                      <div className="hidden sm:block absolute right-8 top-1/2 -translate-y-1/2 -rotate-90 origin-right">
                        <span className="text-xs tracking-[0.5em] text-gray-600 font-bold uppercase">
                          Arkansas Music
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ) : (
              <div className="lg:col-span-8">
                <div className="relative h-full min-h-[600px] overflow-hidden bg-linear-to-br from-gray-900 to-black border border-gray-800 flex items-center justify-center">
                  <div className="text-center max-w-md px-6">
                    <h1 className="text-3xl lg:text-5xl font-black mb-3">Dead Party Media</h1>
                    <p className="text-gray-400">
                      {hasArticlesError
                        ? "Stories are temporarily unavailable. Check back soon."
                        : "More stories coming soon."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sidebar - In This Issue */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Artist CTA */}
              <div className="bg-linear-to-br from-[#7CFC00]/10 to-[#9400D3]/10 p-8 border border-[#7CFC00]/20">
                <div className="text-sm tracking-[0.3em] text-gray-400 mb-4 uppercase font-bold">
                  For Artists
                </div>
                <h3 className="text-2xl font-black mb-4 leading-tight">
                  Get Featured in Our Next Issue
                </h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  Join our community of Arkansas artists. Create your profile and connect with our
                  editorial team.
                </p>
                <div className="space-y-3">
                  <Button
                    className="w-full bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase text-sm"
                    onClick={() => router.push("/sign-up?role=artist" as Route)}
                  >
                    Artist Registration
                  </Button>
                  <Button
                    className="w-full bg-transparent border border-gray-700 hover:border-[#7CFC00] text-white font-bold tracking-wider uppercase text-sm"
                    onClick={() => router.push("/sign-in" as Route)}
                  >
                    Sign In
                  </Button>
                </div>
              </div>

              {/* In This Issue */}
              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-sm tracking-[0.3em] text-gray-400 mb-6 uppercase font-bold flex items-center">
                  <Flame className="w-4 h-4 mr-2 text-[#7CFC00]" />
                  In This Issue
                </h3>
                <div className="space-y-6">
                  {isArticlesLoading ? (
                    <>
                      <div className="group cursor-pointer my-0 py-0 mb-2">
                        <div className="relative h-48 mb-4 overflow-hidden border border-gray-800">
                          <Skeleton className="absolute inset-0" />
                        </div>
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                      <div className="group cursor-pointer my-0 py-0 mb-2">
                        <div className="relative h-48 mb-4 overflow-hidden border border-gray-800">
                          <Skeleton className="absolute inset-0" />
                        </div>
                        <Skeleton className="h-3 w-24 mb-2" />
                        <Skeleton className="h-6 w-full mb-2" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    </>
                  ) : featuredArticles.length > 1 ? (
                    featuredArticles.slice(1, 3).map((article, index) => (
                      <Link
                        key={article.id || index}
                        href={`/article/${article.slug}`}
                        prefetch={false}
                      >
                        <div className="group cursor-pointer my-0 py-0 mb-2">
                          <div className="relative h-48 mb-4 overflow-hidden">
                            <Image
                              src={article.image || article.cover_image || "/placeholder.svg"}
                              alt={article.title}
                              fill
                              className="object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                            />
                            <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent" />
                          </div>
                          <div className="text-xs tracking-wider text-[#7CFC00] mb-2 uppercase font-bold">
                            {article.category}
                          </div>
                          <h4 className="text-lg font-bold leading-tight mb-2 group-hover:text-[#7CFC00] transition-colors">
                            {article.title}
                          </h4>
                          <div className="text-xs text-gray-500 uppercase tracking-wider">
                            By {article.author || "Unknown"}
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm">More articles coming soon...</p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="border border-gray-800 p-6">
                <h3 className="text-sm tracking-[0.3em] text-gray-400 mb-4 uppercase font-bold">
                  This Month
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Featured Artists</span>
                    {isStatsLoading ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <span className="text-lg font-black text-[#7CFC00]">
                        {monthlyStats?.featuredArtistsCount ?? "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Live Events</span>
                    {isStatsLoading ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <span className="text-lg font-black text-[#9400D3]">
                        {monthlyStats?.liveEventsCount ?? "—"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">New Articles</span>
                    {isStatsLoading ? (
                      <Skeleton className="h-6 w-8" />
                    ) : (
                      <span className="text-lg font-black text-white">
                        {monthlyStats?.newArticlesCount ?? "—"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Magazine Spread Style */}
      <section className="py-20 px-6 border-t border-gray-800">
        <div className="container mx-auto">
          {/* Section Header */}
          <div className="mb-16 text-center">
            <div className="text-sm tracking-[0.4em] text-gray-500 mb-4 uppercase font-bold">
              Latest Features
            </div>
            <h2 className="text-5xl lg:text-6xl font-black tracking-tight">The Stories</h2>
            <div className="w-24 h-1 bg-[#7CFC00] mx-auto mt-6" />
          </div>

          {/* Magazine Grid Layout */}
          {isArticlesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="group cursor-pointer">
                  <div className="relative h-80 mb-6 overflow-hidden bg-black border border-gray-800">
                    <Skeleton className="absolute inset-0" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-7 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="pt-4 border-t border-gray-800">
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : articlesData.length > 3 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
              {articlesData.slice(3, visibleArticles).map((article) => (
                <Link key={article.id} href={`/article/${article.slug}`} prefetch={false}>
                  <article className="group cursor-pointer">
                    {/* Image */}
                    <div className="relative h-80 mb-6 overflow-hidden bg-black">
                      <Image
                        src={article.image || article.cover_image || "/placeholder.svg"}
                        alt={article.title}
                        fill
                        className="object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="inline-block px-3 py-1 bg-black/80 backdrop-blur-sm text-[#7CFC00] text-xs font-bold tracking-wider uppercase">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                      <h3 className="text-2xl font-black leading-tight group-hover:text-[#7CFC00] transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-gray-400 leading-relaxed line-clamp-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center text-xs text-gray-500 uppercase tracking-wider pt-4 border-t border-gray-800">
                        <span className="font-medium">{article.author || "Unknown"}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {article.date ||
                            (article.published_at
                              ? new Date(article.published_at).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : new Date(article.created_at).toLocaleDateString("en-US", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                }))}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                {hasArticlesError
                  ? "Stories are temporarily unavailable."
                  : "More articles coming soon..."}
              </p>
            </div>
          )}

          {articlesData.length > 3 && visibleArticles < articlesData.length && (
            <div className="text-center mt-16">
              <Button
                onClick={loadMoreArticles}
                disabled={isLoadingMore}
                className="bg-transparent border-2 border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black font-black tracking-wider uppercase px-12 py-6 text-sm"
              >
                {isLoadingMore ? "Loading..." : "Read More Stories"}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Events Section - Editorial Style */}
      <section className="py-20 px-6 bg-linear-to-b from-transparent to-[#0A0A0A] border-t border-gray-800">
        <div className="container mx-auto">
          <div className="flex items-end justify-between mb-16">
            <div>
              <div className="text-sm tracking-[0.4em] text-gray-500 mb-4 uppercase font-bold">
                What's On
              </div>
              <h2 className="text-5xl lg:text-6xl font-black tracking-tight">Live Events</h2>
            </div>
            <Link
              href="/events"
              className="text-sm tracking-wider uppercase font-bold text-[#7CFC00] hover:text-[#7CFC00]/80 transition-colors flex items-center space-x-2"
            >
              <span>View Calendar</span>
              <span>→</span>
            </Link>
          </div>

          {isEventsLoading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="group cursor-pointer">
                  <div className="relative h-96 mb-6 overflow-hidden bg-black border border-gray-800">
                    <Skeleton className="absolute inset-0" />
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#7CFC00] text-black px-4 py-3 font-black">
                        <Skeleton className="h-3 w-10 bg-black/20" />
                        <Skeleton className="h-6 w-8 mt-1 bg-black/20" />
                      </div>
                    </div>
                  </div>
                  <Skeleton className="h-7 w-2/3 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {upcomingEvents.map((event, index) => (
                <div key={index} className="group cursor-pointer">
                  <div className="relative h-96 mb-6 overflow-hidden bg-black">
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt={event.artist}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#7CFC00] text-black px-4 py-3 font-black">
                        <div className="text-xs tracking-wider">{event.date.month}</div>
                        <div className="text-2xl leading-none">{event.date.day}</div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-black mb-2 group-hover:text-[#7CFC00] transition-colors">
                    {event.artist}
                  </h3>
                  <p className="text-sm text-gray-400 uppercase tracking-wider flex items-center mb-4">
                    <MapPin className="w-3 h-3 mr-2" />
                    {event.venue}
                  </p>
                  <div className="text-xs font-bold tracking-wider uppercase text-[#7CFC00] flex items-center">
                    <span>Get Tickets</span>
                    <span className="ml-2">→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                {hasEventsError
                  ? "Events are temporarily unavailable. Check back soon."
                  : "No upcoming events right now."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Merch Section */}
      <MerchCarousel
        products={featuredProducts}
        heading="Merch"
        isLoading={isProductsLoading}
        hasError={hasProductsError}
      />
    </div>
  );
}
