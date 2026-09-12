"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Disc, Disc3, ExternalLink, Filter, Music } from "lucide-react";
import { PageTitleHeader } from "@/components/page-title-header";
import { useMusicReleases } from "@/lib/api/music";
import { Button } from "@/components/ui/button";

const RELEASE_TYPES = ["All", "Album", "Single", "EP"] as const;
const GENRES = [
  "All Genres",
  "COUNTRY",
  "EDM",
  "HARDCORE & ROCK",
  "HIP-HOP & R&B",
  "OTHER",
] as const;

export default function MusicPage() {
  const [selectedType, setSelectedType] = useState<(typeof RELEASE_TYPES)[number]>("All");
  const [selectedGenre, setSelectedGenre] = useState<(typeof GENRES)[number]>("All Genres");

  const { data: releases = [], isLoading } = useMusicReleases({
    genre: selectedGenre === "All Genres" ? undefined : selectedGenre,
    limit: 100,
    type: selectedType === "All" ? undefined : selectedType,
  });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <PageTitleHeader
            title="ARKANSAS MUSIC"
            description="New records, singles, and discography from Arkansas artists and producers"
          />

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 pb-6 border-b border-gray-800">
            {/* Release Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              {RELEASE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    selectedType === type
                      ? "bg-[#7CFC00] text-black shadow-[0_0_15px_rgba(124,252,0,0.3)]"
                      : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                  }`}
                >
                  {type === "All" ? "All Releases" : `${type}s`}
                </button>
              ))}
            </div>

            {/* Genre Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value as (typeof GENRES)[number])}
                className="bg-zinc-900 border border-zinc-800 text-xs font-mono rounded-lg px-3 py-2 text-zinc-300 focus:outline-hidden focus:border-[#7CFC00]"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Releases Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-gray-800 bg-zinc-950/40 p-4 animate-pulse"
                >
                  <div className="aspect-square w-full rounded-lg bg-zinc-900 mb-4" />
                  <div className="h-5 w-3/4 bg-zinc-900 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-900 rounded mb-4" />
                  <div className="h-10 bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          ) : releases.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/20">
              <Disc className="w-12 h-12 text-zinc-600 mx-auto mb-4 animate-spin-slow" />
              <h3 className="text-xl font-bold text-white mb-2">No music releases found</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
                No releases match your current filters. Check back soon for new Arkansas music
                drops!
              </p>
              {(selectedType !== "All" || selectedGenre !== "All Genres") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedType("All");
                    setSelectedGenre("All Genres");
                  }}
                  className="border-[#7CFC00] text-[#7CFC00] hover:bg-[#7CFC00]/10"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {releases.map((release) => (
                <div
                  key={release.id}
                  className="group flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-[#7CFC00] transition-all duration-300 overflow-hidden shadow-lg"
                >
                  <Link
                    href={`/music/${release.slug}` as Route}
                    className="block relative aspect-square w-full bg-zinc-900 overflow-hidden"
                  >
                    <Image
                      src={release.coverArt || "/placeholder.svg"}
                      alt={release.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-black/85 backdrop-blur-xs text-[11px] font-mono font-bold text-[#7CFC00] px-2.5 py-0.5 rounded border border-[#7CFC00]/30 uppercase">
                        {release.releaseType}
                      </span>
                      {release.featured && (
                        <span className="bg-purple-950/90 text-purple-300 text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-purple-500/40">
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-black/80 text-zinc-400 text-[10px] font-mono px-2 py-0.5 rounded">
                        {release.genre}
                      </span>
                    </div>
                  </Link>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="mb-2">
                      <Link href={`/music/${release.slug}` as Route}>
                        <h3 className="text-xl font-bold text-white group-hover:text-[#7CFC00] transition-colors line-clamp-1">
                          {release.title}
                        </h3>
                      </Link>
                      {release.artistSlug ? (
                        <Link
                          href={`/artists/${release.artistSlug}`}
                          className="text-sm text-zinc-400 hover:text-white font-medium transition-colors"
                        >
                          {release.artistName}
                        </Link>
                      ) : (
                        <p className="text-sm text-zinc-400 font-medium">{release.artistName}</p>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {release.excerpt}
                    </p>

                    <div className="mt-auto pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                      {/* Quick streaming links */}
                      <div className="flex items-center gap-2">
                        {release.spotifyUrl && (
                          <a
                            href={release.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1DB954] hover:scale-110 transition-transform"
                            title="Listen on Spotify"
                          >
                            <Disc3 className="w-4 h-4" />
                          </a>
                        )}
                        {release.bandcampUrl && (
                          <a
                            href={release.bandcampUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:scale-110 transition-transform"
                            title="Listen on Bandcamp"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {release.appleMusicUrl && (
                          <a
                            href={release.appleMusicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-400 hover:scale-110 transition-transform"
                            title="Listen on Apple Music"
                          >
                            <Music className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      <Link
                        href={`/music/${release.slug}` as Route}
                        className="text-xs font-mono font-bold text-[#7CFC00] group-hover:translate-x-1 transition-transform flex items-center gap-1"
                      >
                        Read Review
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
