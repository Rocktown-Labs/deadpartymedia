"use client";

import { useEffect, useState } from "react";
import { ArrowRight, PlusCircle, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useMonthlyHomepageStats } from "@/lib/api/stats";
import type { ArticleList } from "@/lib/api/articles";
import type { EventList } from "@/lib/api/events";
import { ShowsTable } from "@/components/events/shows-table";
import { SubmitShowModal } from "@/components/events/submit-show-modal";
import { ArticlesTable } from "@/components/articles/articles-table";
import { RecentMusicReleases, type MusicRelease } from "@/components/music/recent-music-releases";
import { AboutMissionSection } from "@/components/home/about-mission-section";

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
  musicReleases?: MusicRelease[];
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
  musicReleases = [],
  featuredProducts = [],
  isArticlesLoading = false,
  isEventsLoading = false,
  isProductsLoading = false,
  hasArticlesError: _hasArticlesError = false,
  hasEventsError: _hasEventsError = false,
  hasProductsError = false,
}: HomepageClientProps) {
  const { data: monthlyStats } = useMonthlyHomepageStats();
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

  // Spotlight layout: 1 big card + 2-3 underneath
  const heroArticle = featuredArticles[0];
  const secondaryArticles =
    featuredArticles.length > 1
      ? featuredArticles.slice(1, 4)
      : articlesData.filter((a) => a.slug !== heroArticle?.slug).slice(0, 3);

  // Archive stories for Recent Articles section (exclude the hero article to prevent redundancy)
  const archiveArticles =
    articlesData.length > 4
      ? articlesData.slice(4)
      : articlesData.filter((a) => a.slug !== heroArticle?.slug);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Subtle Ambient Glow */}
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

      {/* =========================================================================
          SECTION 1: FEATURED / RECENT SPOTLIGHT
          Hero: One big card with 2-3 underneath
         ========================================================================= */}
      <section className="relative pt-[calc(var(--navbar-offset)+1rem)] pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="container mx-auto">
          {/* Top Kicker Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3 mb-6">
            <h2 className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
              Featured Spotlight
            </h2>
            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              Arkansas Independent Music &amp; Scene Coverage
            </span>
          </div>

          {/* 1 Big Hero Card */}
          {isArticlesLoading ? (
            <div className="relative h-[380px] sm:h-[480px] lg:h-[540px] overflow-hidden bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Skeleton className="absolute inset-0" />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/60 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
                <Skeleton className="h-6 w-36 mb-4" />
                <Skeleton className="h-12 w-4/5 mb-4" />
                <Skeleton className="h-5 w-2/3 mb-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ) : heroArticle ? (
            <Link href={`/article/${heroArticle.slug}`} prefetch={false}>
              <article className="relative group cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 hover:border-[#7CFC00] transition-all duration-300 shadow-2xl h-[400px] sm:h-[500px] lg:h-[560px] bg-zinc-950">
                <Image
                  src={heroArticle.image || heroArticle.cover_image || "/placeholder.svg"}
                  alt={heroArticle.title || "Featured Spotlight"}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/65 to-black/20" />

                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <span className="inline-block bg-[#7CFC00] px-3 py-1 text-[11px] text-black font-black tracking-[0.2em] uppercase rounded-xs shadow-md">
                      Spotlight Cover Story
                    </span>
                    {heroArticle.category && (
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 bg-black/60 px-2.5 py-0.5 rounded border border-zinc-700">
                        {heroArticle.category}
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight mb-3 sm:mb-4 tracking-tight group-hover:text-[#7CFC00] transition-colors max-w-4xl">
                    {heroArticle.title}
                  </h1>

                  <p className="text-sm sm:text-base text-zinc-300 mb-5 max-w-3xl leading-relaxed line-clamp-2 sm:line-clamp-3 border-l-2 border-[#7CFC00] pl-4">
                    {heroArticle.excerpt}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-400 uppercase tracking-wider font-mono">
                    <span className="font-semibold text-zinc-200">
                      By {heroArticle.author || "Dead Party Staff"}
                    </span>
                    <span>•</span>
                    <span>{heroArticle.date}</span>
                    <span>•</span>
                    <span className="text-[#7CFC00] font-bold flex items-center gap-1 group-hover:underline">
                      Read Cover Story <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ) : null}

          {/* 2-3 Cards Underneath Hero */}
          {secondaryArticles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {secondaryArticles.map((article) => {
                const img = article.image || article.cover_image || "/placeholder.svg";
                return (
                  <Link
                    key={article.slug}
                    href={`/article/${article.slug}`}
                    className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-950/80 hover:border-[#7CFC00] hover:bg-zinc-900/40 transition-all overflow-hidden shadow-lg"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                      <Image
                        src={img}
                        alt={article.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {article.category && (
                        <span className="absolute top-3 left-3 bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-[#7CFC00] px-2 py-0.5 rounded border border-[#7CFC00]/30 uppercase tracking-wider">
                          {article.category}
                        </span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-white group-hover:text-[#7CFC00] transition-colors line-clamp-2 mb-2 leading-snug">
                          {article.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                          {article.excerpt}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-3 border-t border-zinc-800/60">
                        <span className="text-zinc-500 truncate">
                          By {article.author || "Staff"}
                        </span>
                        <span className="text-[#7CFC00] font-bold shrink-0 flex items-center gap-1 group-hover:underline">
                          Read Story <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          SECTION 2: UPCOMING DEAD PARTY EVENTS
          List of events in TanStack Table with flyer thumbnails and past shows crossed out
         ========================================================================= */}
      <section className="relative py-14 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/50">
        <div className="container mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                Live Scene Calendar
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
                Upcoming Shows &amp; Live Events
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Concerts, basement shows, and tour stops across Arkansas. Check flyers and ticket
                links.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#7CFC00] bg-[#7CFC00]/10 text-[#7CFC00] hover:bg-[#7CFC00] hover:text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Submit a Show
              </button>
              <Link
                href="/events"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 font-mono font-bold text-xs uppercase tracking-wider transition-colors"
              >
                <Calendar className="w-4 h-4" /> All Shows
              </Link>
            </div>
          </div>

          {/* Shows TanStack Table */}
          {isEventsLoading ? (
            <div className="space-y-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <ShowsTable
              events={allEvents}
              compact={false}
              limit={8}
              showFilters={false}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            />
          )}

          {/* Subtext and Quick Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-zinc-500 pt-3 px-1">
            <span>
              Shows listed recent to least •{" "}
              <span className="line-through text-zinc-600">Crossed out</span> = Past events
            </span>
            <div className="flex items-center gap-4 font-mono">
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="text-[#7CFC00] hover:underline font-bold uppercase tracking-wider cursor-pointer"
              >
                + Submit Your Show Flyer
              </button>
              <Link
                href="/events"
                className="text-zinc-400 hover:text-white uppercase tracking-wider"
              >
                Full Calendar Archive →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: RECENT MUSIC RELEASES
          Hidden automatically when no release data exists yet
         ========================================================================= */}
      <RecentMusicReleases releases={musicReleases} />

      {/* =========================================================================
          SECTION 4: RECENT ARTICLES
          List of stories with cover art thumbnails, excerpts, and search/pagination
         ========================================================================= */}
      <section className="relative py-14 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/30">
        <div className="container mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-6">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
                Scene Journalism
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
                Recent Articles &amp; Stories
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                Interviews, show reviews, artist spotlights, and underground scene commentary.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <Link href="/hardcore" className="hover:text-[#7CFC00] transition-colors">
                Hardcore
              </Link>
              <span>•</span>
              <Link href="/hip-hop-r-b" className="hover:text-[#7CFC00] transition-colors">
                Hip-Hop
              </Link>
              <span>•</span>
              <Link href="/edm" className="hover:text-[#7CFC00] transition-colors">
                EDM
              </Link>
              <span>•</span>
              <Link href="/country" className="hover:text-[#7CFC00] transition-colors">
                Country
              </Link>
            </div>
          </div>

          {/* TanStack Table of Articles */}
          <ArticlesTable articles={archiveArticles} pageSize={6} showSearch={true} />
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: BRIEF INTRODUCTION EXPLAINING WHAT DEAD PARTY IS
          What is Dead Party Media? Mission & Scene Navigation Pillars
         ========================================================================= */}
      <AboutMissionSection
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        bandsCount={monthlyStats?.featuredArtistsCount ?? 0}
        showsCount={allEvents.length || monthlyStats?.liveEventsCount || 0}
        articlesCount={monthlyStats?.newArticlesCount ?? 0}
      />

      {/* =========================================================================
          SECTION 6: MERCH
          Horizontally scrolling merch carousel
         ========================================================================= */}
      <MerchCarousel
        products={featuredProducts}
        heading="Dead Party Merch"
        isLoading={isProductsLoading}
        hasError={hasProductsError}
      />

      {/* Submit Show Modal Dialog */}
      <SubmitShowModal isOpen={isSubmitModalOpen} onClose={() => setIsSubmitModalOpen(false)} />
    </div>
  );
}
