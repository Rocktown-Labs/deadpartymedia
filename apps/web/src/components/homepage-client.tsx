"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Users, MapPin, HeartHandshake } from "lucide-react";
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
import { ArticlesTable } from "@/components/articles/articles-table";

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

      {/* Main Grid Section: Left = Shows Schedule + Scene Directories, Right = Spotlight Story + Articles Table */}
      <section className="relative pt-[calc(var(--navbar-offset)+1rem)] pb-12 sm:pb-16 lg:pb-20 px-4 sm:px-6">
        <div className="container mx-auto my-2.5">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Live Shows Schedule & Directories (Col 5 on desktop, order-2 on mobile) */}
            <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
              {/* Shows Schedule Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black uppercase tracking-wider text-white">
                  Live Shows Schedule
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="text-xs font-mono font-bold text-[#7CFC00] hover:underline uppercase tracking-wider cursor-pointer"
                  >
                    + Submit Show
                  </button>
                  <span className="text-zinc-700">•</span>
                  <Link
                    href="/events"
                    className="text-xs font-mono font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1"
                  >
                    All Shows <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* TanStack Table Shows Widget */}
              {isEventsLoading ? (
                <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : (
                <ShowsTable
                  events={allEvents}
                  compact={true}
                  limit={8}
                  showFilters={false}
                  onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                />
              )}

              <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
                <span className="text-[11px]">
                  Shows recent to least • <span className="line-through text-zinc-600">Crossed out</span> = Past
                </span>
                <button
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="text-[#7CFC00] hover:underline font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  + Submit a Show
                </button>
              </div>

              {/* Scene Directories & Community Links */}
              <div className="flex flex-col gap-3 pt-2">
                <Link href="/artists">
                  <div className="p-4 rounded-xl border border-zinc-800 hover:border-[#7CFC00] bg-zinc-950/80 hover:bg-zinc-900/60 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-400 group-hover:text-[#7CFC00] transition-colors">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#7CFC00] transition-colors">
                          Arkansas Bands & Artists
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Claimed local artist profiles and discographies
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#7CFC00] transition-colors" />
                  </div>
                </Link>

                <Link href={"/venues" as Route}>
                  <div className="p-4 rounded-xl border border-zinc-800 hover:border-[#7CFC00] bg-zinc-950/80 hover:bg-zinc-900/60 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[#7CFC00]">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-[#7CFC00] transition-colors">
                          Local Venues Directory
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Stages, capacities, contacts, and dive bars across Arkansas
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-[#7CFC00] transition-colors" />
                  </div>
                </Link>

                <Link href={"/donate" as Route}>
                  <div className="p-4 rounded-xl border border-zinc-800 hover:border-purple-500 bg-zinc-950/80 hover:bg-zinc-900/60 transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-400">
                        <HeartHandshake className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">
                          Tip Scene Writers & Photographers
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Direct Cash App tips for independent scene coverage
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                  </div>
                </Link>
              </div>

              {/* Arkansas Scene This Month */}
              <div className="border border-zinc-800 bg-zinc-950/80 rounded-xl p-4">
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

            {/* Right Column: Spotlight Cover Story + Articles Table (Col 7 on desktop, order-1 on mobile) */}
            <div className="lg:col-span-7 flex flex-col gap-6 order-1 lg:order-2">
              {/* Intro Tagline */}
              <div className="flex flex-col sm:flex-row items-start sm:items-baseline justify-between gap-2 border-b border-zinc-800/80 pb-3">
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                    Arkansas Independent Music
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live shows, underground bands, interviews, and scene journalism.
                  </p>
                </div>
                <Link
                  href="/about"
                  className="text-[11px] font-mono font-bold text-zinc-500 hover:text-white uppercase tracking-wider"
                >
                  About Dead Party →
                </Link>
              </div>

              {/* Featured Story Hero */}
              {isArticlesLoading ? (
                <div className="relative h-[380px] sm:h-[440px] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-xl">
                  <Skeleton className="absolute inset-0" />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                    <Skeleton className="h-5 w-28 mb-3" />
                    <Skeleton className="h-10 w-4/5 mb-3" />
                    <Skeleton className="h-4 w-2/3 mb-3" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ) : featuredArticles.length > 0 ? (
                <Link href={`/article/${featuredArticles[0]?.slug}`} prefetch={false}>
                  <article className="relative group cursor-pointer overflow-hidden rounded-xl border border-zinc-800 hover:border-[#7CFC00] transition-all duration-300 shadow-2xl h-[380px] sm:h-[440px] bg-zinc-950">
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
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-transparent" />

                    <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                      <div className="mb-2">
                        <span className="inline-block bg-[#7CFC00] px-2.5 py-0.5 text-[10px] text-black font-black tracking-[0.2em] uppercase rounded-sm">
                          Spotlight Cover Story
                        </span>
                      </div>

                      <h1 className="text-xl sm:text-3xl lg:text-4xl font-black leading-tight mb-2 tracking-tight group-hover:text-[#7CFC00] transition-colors">
                        {featuredArticles[0]?.title}
                      </h1>

                      <p className="text-xs sm:text-sm text-zinc-300 mb-3 max-w-2xl leading-relaxed line-clamp-2 border-l-2 border-[#7CFC00] pl-3">
                        {featuredArticles[0]?.excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-zinc-400 uppercase tracking-wider font-mono">
                        <span className="font-semibold text-zinc-200">
                          By {featuredArticles[0]?.author || "Dead Party Staff"}
                        </span>
                        <span>•</span>
                        <span>{featuredArticles[0]?.date}</span>
                        <span>•</span>
                        <span className="text-[#7CFC00] font-bold">Read Story →</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ) : null}

              {/* TanStack Table of Articles with In-Place Pagination */}
              <ArticlesTable
                articles={articlesData}
                pageSize={5}
              />
            </div>
          </div>
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
