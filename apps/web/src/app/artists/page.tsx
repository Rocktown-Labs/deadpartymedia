"use client";

import { useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useArtists } from "@/lib/api/artists";

export default function ArtistsPage() {
  const [filterGenre, setFilterGenre] = useState<string>("ALL");
  const { data: artists, isLoading } = useArtists(filterGenre !== "ALL" ? filterGenre : undefined);

  const completeArtists = (artists ?? []).filter((artist) => {
    const hasSpotify =
      Boolean(artist.spotify_url?.trim()) && Boolean(artist.spotify_artist_id?.trim());
    const hasInstagram = Boolean(artist.instagram?.trim());
    return Boolean(artist.claimed) && hasSpotify && hasInstagram;
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
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-black mb-4">ARTISTS</h1>
            <p className="text-xl text-gray-400">Explore Arkansas music artists</p>
          </div>

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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {completeArtists.length > 0 ? (
              completeArtists.map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.slug}`}>
                  <div className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer h-full flex flex-col">
                    <div className="relative h-64 overflow-hidden">
                      <Image
                        src={artist.image || "/placeholder.svg"}
                        alt={artist.name}
                        fill
                        className="object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-xl font-black mb-2 hover:text-[#7CFC00] transition-colors">
                        {artist.name}
                      </h3>
                      <div className="flex items-center text-sm text-gray-400 mb-3">
                        <MapPin className="w-4 h-4 mr-2" />
                        {artist.location}
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-3 mb-4 flex-1">{artist.bio}</p>
                      <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
                        <span>{artist.genre}</span>
                        <div className="flex items-center gap-4">
                          <span>{artist.article_count} articles</span>
                          <span>{artist.event_count} events</span>
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
