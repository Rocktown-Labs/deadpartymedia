"use client";

import { useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useArtists } from "@/lib/api/artists";
import { PageTitleHeader } from "@/components/page-title-header";
import { Spotify } from "@/components/ui/svgs/spotify";

export default function ArtistsPageClient() {
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const artistGenreFilter = filterGenre === "ALL" ? undefined : filterGenre;
  const { data: artists, isLoading } = useArtists(artistGenreFilter);

  const completeArtists = (artists ?? []).filter((artist) => {
    const hasSpotify =
      Boolean(artist.spotify_url?.trim()) && Boolean(artist.spotify_artist_id?.trim());
    const hasBio = Boolean(artist.bio?.trim()) && artist.bio !== "Profile pending update.";
    const hasImage = Boolean(artist.image?.trim());
    return (artist.claimed && hasBio) || (hasSpotify && hasImage);
  });

  const genres = ["ALL", "Country", "EDM", "Hardcore & Rock", "Hip-Hop & R&B", "Other"];

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
          <div className="mb-8 flex gap-2 overflow-x-auto pb-4">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setFilterGenre(genre)}
                className={`px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  filterGenre === genre
                    ? "bg-[#7CFC00] text-black"
                    : "bg-[#111111] border border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {genre}
              </button>
            ))}
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
        </div>
      </main>
    </div>
  );
}
