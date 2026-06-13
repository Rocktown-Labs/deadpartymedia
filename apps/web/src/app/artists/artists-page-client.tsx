"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useArtistsPage } from "@/lib/api/artists";
import { PageTitleHeader } from "@/components/page-title-header";
import { Spotify } from "@/components/ui/svgs/spotify";

const INITIAL_PAGE_SIZE = 24;
const PAGE_SIZE = 12;
const genreFilters = [
  { label: "ALL", value: "ALL" },
  { label: "Country", value: "COUNTRY" },
  { label: "EDM", value: "EDM" },
  { label: "Hardcore & Rock", value: "HARDCORE & ROCK" },
  { label: "Hip-Hop & R&B", value: "HIP-HOP & R&B" },
  { label: "Other", value: "OTHER" },
] as const;

export default function ArtistsPageClient() {
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const artistGenreFilter = filterGenre === "ALL" ? undefined : filterGenre;
  const { data, isLoading } = useArtistsPage({
    genre: artistGenreFilter,
    limit: visibleCount,
    offset: 0,
    order: sortOrder,
    sort: "name",
  });

  const completeArtists = useMemo(
    () =>
      (data?.results ?? []).filter((artist) => {
        const hasSpotify =
          Boolean(artist.spotify_url?.trim()) && Boolean(artist.spotify_artist_id?.trim());
        const hasBio = Boolean(artist.bio?.trim()) && artist.bio !== "Profile pending update.";
        const hasImage = Boolean(artist.image?.trim());
        return (artist.claimed && hasBio) || (hasSpotify && hasImage);
      }),
    [data?.results],
  );

  const resetGenre = (genre: string) => {
    setFilterGenre(genre);
    setVisibleCount(INITIAL_PAGE_SIZE);
  };

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !data?.hasMore || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => count + PAGE_SIZE);
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [data?.hasMore, isLoading]);

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
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <PageTitleHeader title="ARTISTS" description="Explore Arkansas music artists" />

          {/* Genre Filters */}
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              {genreFilters.map((genre) => (
                <button
                  key={genre.value}
                  type="button"
                  onClick={() => resetGenre(genre.value)}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    filterGenre === genre.value
                      ? "bg-[#7CFC00] text-black"
                      : "bg-[#111111] border border-gray-800 text-gray-400 hover:text-white"
                  }`}
                >
                  {genre.label}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-gray-800 bg-[#111111] p-1">
              <button
                type="button"
                onClick={() => {
                  setSortOrder("asc");
                  setVisibleCount(INITIAL_PAGE_SIZE);
                }}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sortOrder === "asc" ? "bg-[#7CFC00] text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                A-Z
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortOrder("desc");
                  setVisibleCount(INITIAL_PAGE_SIZE);
                }}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  sortOrder === "desc"
                    ? "bg-[#7CFC00] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Z-A
              </button>
            </div>
          </div>

          {/* Artists Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {completeArtists.length > 0 ? (
              completeArtists.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.slug}`}>
                  <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer h-full flex flex-row md:flex-col group">
                    <div className="relative w-24 md:w-full md:aspect-square overflow-hidden shrink-0 border-r border-gray-800 md:border-r-0 md:border-b">
                      <Image
                        src={artist.image || "/placeholder.svg"}
                        alt={artist.name}
                        fill
                        className="object-cover object-top md:object-center group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4 md:p-6 flex-1 flex flex-col justify-center md:justify-start min-w-0">
                      <div className="flex items-center gap-2 mb-1 md:mb-2">
                        <h3 className="text-lg md:text-xl font-black group-hover:text-[#7CFC00] transition-colors line-clamp-1 md:line-clamp-none">
                          {artist.name}
                        </h3>
                        {artist.spotify_url && (
                          <span className="shrink-0 text-[#1DB954]" title="Spotify connected">
                            <Spotify className="w-4 h-4 fill-current" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-xs md:text-sm text-gray-400 mb-2 md:mb-3">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 shrink-0" />
                        <span className="truncate">{artist.location}</span>
                      </div>
                      <p className="text-xs md:text-sm text-gray-300 line-clamp-2 md:line-clamp-3 mb-3 md:mb-4 flex-1">
                        {artist.bio}
                      </p>
                      <div className="mt-auto pt-3 md:pt-4 border-t border-gray-800 flex items-center justify-between text-[10px] md:text-xs text-gray-500">
                        <span className="truncate mr-2">{artist.genre}</span>
                        <div className="flex items-center gap-2 md:gap-4 shrink-0">
                          <span>
                            {artist.article_count}{" "}
                            <span className="hidden md:inline">articles</span>
                            <span className="md:hidden">art.</span>
                          </span>
                          <span>
                            {artist.event_count} <span className="hidden md:inline">events</span>
                            <span className="md:hidden">ev.</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-400 text-lg">No artists found.</p>
              </div>
            )}
          </div>

          <div ref={loadMoreRef} className="mt-10 flex min-h-8 items-center justify-center">
            {data?.hasMore && (
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                Loading more artists
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
