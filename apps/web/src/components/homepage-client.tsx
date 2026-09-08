"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, Calendar, Users, MapPin, ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useMonthlyHomepageStats } from "@/lib/api/stats";
import type { Route } from "next";
import type { ArticleList } from "@/lib/api/articles";
import type { EventList } from "@/lib/api/events";
import { ShowsTable } from "@/components/events/shows-table";
import { SubmitShowModal } from "@/components/events/submit-show-modal";

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
  upcomingEvents?: HomepageEvent[];
  allEvents?: EventList[];
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
  upcomingEvents: _upcomingEvents = [],
  allEvents = [],
  featuredProducts = [],
  isArticlesLoading = false,
  isEventsLoading = false,
  isProductsLoading = false,
  hasArticlesError: _hasArticlesError = false,
  hasEventsError: _hasEventsError = false,
  hasProductsError = false,
}: HomepageClientProps) {
  const { data: monthlyStats, isLoading: isStatsLoading } = useMonthlyHomepageStats();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const latestArticles = useMemo(() => articlesData.slice(3, 12), [articlesData]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Subtle Background Glow */}
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

      {/* Hero & Scene Schedule Section */}
      <section className="relative pt-[calc(var(--navbar-offset)+0.75rem)] sm:pt-[calc(var(--navbar-offset)+1rem)] lg:pt-[calc(var(--navbar-offset)+1.5rem)] pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6">
        <div className="container mx-auto my-2.5">
          {/* Scene Mission & Community Intro Bar */}
          <div className="mb-6 py-3 px-4 rounded-xl border border-zinc-800/80 bg-zinc-950/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-3">
              <span className="inline-block size-2 rounded-full bg-[#7CFC00] animate-pulse" />
              <p className="text-zinc-300 font-medium">
                <span className="font-bold text-white uppercase tracking-wider">Dead Party Media</span> — Arkansas' independent hub for live music, underground bands, shows, and venues.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/about"
                className="text-zinc-400 hover:text-white uppercase tracking-wider font-mono text-[11px] underline"
              >
                Our Mission
              </Link>
              <span className="text-zinc-700">•</span>
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="text-[#7CFC00] hover:underline uppercase tracking-wider font-mono text-[11px] font-bold cursor-pointer"
              >
                + Submit a Show
              </button>
              <span className="text-zinc-700">•</span>
              <Link
                href={"/donate" as Route}
                className="text-purple-400 hover:underline uppercase tracking-wider font-mono text-[11px] font-bold"
              >
                Tip Cash App
              </Link>
            </div>
          </div>

          {/* Hybrid Grid: Spotlight Cover Story (Left) + Shows Schedule Table (Right) */}
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Main Cover Story (Col 7) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {isArticlesLoading ? (
                <div className="relative h-full min-h-[460px] sm:min-h-[500px] lg:min-h-[560px] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Skeleton className="absolute inset-0" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-12 w-5/6 mb-3" />
                    <Skeleton className="h-5 w-2/3 mb-4" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ) : featuredArticles.length > 0 ? (
                <Link href={`/article/${featuredArticles[0]?.slug}`} prefetch={false}>
                  <article className="relative group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 hover:border-[#7CFC00] transition-all duration-300 shadow-2xl h-[460px] sm:h-[520px] lg:h-[560px] bg-zinc-950">
                    <Image
                      src={
                        featuredArticles[0]?.image ||
                        featuredArticles[0]?.cover_image ||
                        "/placeholder.svg"
                      }
                      alt={featuredArticles[0]?.title || "Featured Story"}
                      fill
                      priority
                      className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                      <div className="mb-3">
                        <span className="inline-block bg-[#7CFC00] px-3 py-1 text-[10px] sm:text-xs text-black font-black tracking-[0.2em] uppercase rounded-sm">
                          Spotlight Cover Story
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight mb-3 tracking-tight group-hover:text-[#7CFC00] transition-colors">
                        {featuredArticles[0]?.title}
                      </h1>

                      <p className="text-sm sm:text-base text-zinc-300 mb-4 max-w-2xl leading-relaxed line-clamp-3 border-l-4 border-[#7CFC00] pl-4">
                        {featuredArticles[0]?.excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-400 uppercase tracking-wider">
                        <span className="font-semibold text-zinc-200">
                          By {featuredArticles[0]?.author || "Dead Party Staff"}
                        </span>
                        <span>•</span>
                        <span>{featuredArticles[0]?.date}</span>
                        <span>•</span>
                        <span className="text-[#7CFC00] font-bold">Read Article →</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ) : (
                <div className="h-[400px] border border-zinc-800 rounded-xl flex items-center justify-center bg-zinc-950">
                  <p className="text-zinc-500">Stories coming soon.</p>
                </div>
              )}

              {/* Secondary Spotlight Stories Preview */}
              {featuredArticles.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {featuredArticles.slice(1, 3).map((article, idx) => (
                    <Link key={article.id || idx} href={`/article/${article.slug}`}>
                      <div className="group p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900/40 transition-all flex gap-4 items-center">
                        <div className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-zinc-900">
                          <Image
                            src={article.image || article.cover_image || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#7CFC00] block mb-1">
                            {article.category}
                          </span>
                          <h4 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-[#7CFC00] transition-colors">
                            {article.title}
                          </h4>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1 block">
                            By {article.author}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Live Shows & Concert Schedule Table (Col 5) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#7CFC00]" />
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">
                    Live Shows Schedule
                  </h2>
                </div>
                <Link
                  href="/events"
                  className="text-xs font-mono font-bold text-[#7CFC00] hover:underline uppercase tracking-wider flex items-center gap-1"
                >
                  All Shows <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* TanStack Table Shows Widget */}
              {isEventsLoading ? (
                <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <ShowsTable
                  events={allEvents}
                  compact={true}
                  limit={6}
                  showFilters={false}
                  onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                />
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-500 px-1">
                <span className="text-[11px]">
                  Shows recent to least • <span className="line-through text-zinc-600">Crossed out</span> = Past
                </span>
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="text-[#7CFC00] hover:underline font-bold text-xs uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Submit a Show
                </button>
              </div>

              {/* Quick Monthly Scene Stats */}
              <div className="border border-zinc-800 bg-zinc-950/80 rounded-xl p-4 mt-2">
                <h3 className="text-xs tracking-widest text-zinc-500 uppercase font-mono font-bold mb-3">
                  Arkansas Scene This Month
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-xs text-zinc-500 block uppercase font-mono">Bands</span>
                    <span className="text-lg font-black text-[#7CFC00]">
                      {isStatsLoading ? "—" : monthlyStats?.featuredArtistsCount ?? "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-xs text-zinc-500 block uppercase font-mono">Shows</span>
                    <span className="text-lg font-black text-purple-400">
                      {isStatsLoading ? "—" : allEvents.length || monthlyStats?.liveEventsCount || "—"}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
                    <span className="text-xs text-zinc-500 block uppercase font-mono">Articles</span>
                    <span className="text-lg font-black text-white">
                      {isStatsLoading ? "—" : monthlyStats?.newArticlesCount ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community Directory Shortcuts Bar */}
      <section className="py-8 px-4 sm:px-6 border-y border-zinc-800/80 bg-zinc-950/60">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/events">
              <div className="p-5 rounded-xl border border-zinc-800 hover:border-[#7CFC00] bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer h-full flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-3">
                  <Calendar className="w-6 h-6 text-[#7CFC00]" />
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-white">
                    {allEvents.length} Shows
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-1 group-hover:text-[#7CFC00] transition-colors">
                    Shows & Concerts
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Explore upcoming Arkansas live shows, flyers, dates, and ticket links.
                  </p>
                </div>
              </div>
            </Link>

            <Link href="/artists">
              <div className="p-5 rounded-xl border border-zinc-800 hover:border-[#7CFC00] bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer h-full flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-white">
                    Directory
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-1 group-hover:text-[#7CFC00] transition-colors">
                    Arkansas Bands & Artists
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Search local artists, listen to tracks, and check upcoming gigs.
                  </p>
                </div>
              </div>
            </Link>

            <Link href={"/venues" as Route}>
              <div className="p-5 rounded-xl border border-zinc-800 hover:border-[#7CFC00] bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer h-full flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-3">
                  <MapPin className="w-6 h-6 text-[#7CFC00]" />
                  <span className="text-xs font-mono font-bold text-zinc-500 group-hover:text-white">
                    Venues
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-1 group-hover:text-[#7CFC00] transition-colors">
                    Local Music Venues
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Explore venues, addresses, booking contacts, and stage capacities.
                  </p>
                </div>
              </div>
            </Link>

            <Link href={"/donate" as Route}>
              <div className="p-5 rounded-xl border border-zinc-800 hover:border-purple-500 bg-zinc-900/40 hover:bg-zinc-900/80 transition-all cursor-pointer h-full flex flex-col justify-between group">
                <div className="flex items-center justify-between mb-3">
                  <HeartHandshake className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-mono font-bold text-[#7CFC00] group-hover:underline">
                    Cash App
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-black text-white mb-1 group-hover:text-purple-400 transition-colors">
                    Support the Scene
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Direct tips for Dead Party Media and local music writers & photographers.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* The Stories (Editorial Magazine Grid) */}
      <section className="py-20 px-4 sm:px-6 border-t border-zinc-800">
        <div className="container mx-auto">
          <div className="mb-14 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="text-xs tracking-[0.4em] text-zinc-500 mb-2 uppercase font-mono font-bold">
                Scene Journalism & Coverage
              </div>
              <h2 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
                The Stories
              </h2>
            </div>
            <Link
              href="/music"
              className="text-xs font-mono font-bold uppercase tracking-widest text-[#7CFC00] hover:underline flex items-center gap-1"
            >
              Browse Archive <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isArticlesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : latestArticles.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {latestArticles.map((article) => (
                <Link key={article.id} href={`/article/${article.slug}`} prefetch={false}>
                  <article className="group cursor-pointer rounded-xl border border-zinc-800/80 hover:border-zinc-700 bg-zinc-950 overflow-hidden transition-all duration-300 h-full flex flex-col">
                    <div className="relative h-64 overflow-hidden bg-zinc-900">
                      <Image
                        src={article.image || article.cover_image || "/placeholder.svg"}
                        alt={article.title}
                        fill
                        className="object-cover transition-all duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="inline-block px-2.5 py-1 bg-black/80 backdrop-blur-md text-[#7CFC00] text-[10px] font-mono font-bold tracking-wider uppercase rounded">
                          {article.category}
                        </span>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold leading-snug group-hover:text-[#7CFC00] transition-colors line-clamp-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="flex items-center text-xs text-zinc-500 uppercase tracking-wider pt-4 border-t border-zinc-800/80 font-mono">
                        <span className="text-zinc-300">{article.author || "Dead Party"}</span>
                        <span className="mx-2">•</span>
                        <span>{article.date}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-zinc-500">More stories coming soon...</p>
            </div>
          )}
        </div>
      </section>

      {/* Merch Carousel */}
      <MerchCarousel
        products={featuredProducts}
        heading="Dead Party Merch"
        isLoading={isProductsLoading}
        hasError={hasProductsError}
      />

      {/* Submit Show Modal Dialog */}
      <SubmitShowModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />
    </div>
  );
}
