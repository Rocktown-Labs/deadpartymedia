"use client";

import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ExternalLink, Disc3 } from "lucide-react";

export interface MusicRelease {
  id: string;
  title: string;
  slug?: string;
  artistName: string;
  artistSlug?: string;
  coverArt: string;
  releaseDate?: string;
  type?: "Album" | "EP" | "Single";
  spotifyUrl?: string;
  appleMusicUrl?: string;
  bandcampUrl?: string;
}

interface RecentMusicReleasesProps {
  releases?: MusicRelease[];
  isLoading?: boolean;
}

export function RecentMusicReleases({
  releases = [],
  isLoading = false,
}: RecentMusicReleasesProps) {
  // If loading or no releases posted yet, gracefully hide the section as per blueprint
  if (isLoading || !releases || releases.length === 0) {
    return null;
  }

  return (
    <section className="relative py-12 px-4 sm:px-6 border-t border-zinc-900 bg-zinc-950/40">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
          <div>
            <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-[#7CFC00]">
              Scene Discography
            </span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
              Recent Music Releases
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              New records, singles, and tapes from Arkansas artists and producers.
            </p>
          </div>
          <Link
            href="/music"
            className="text-xs font-mono font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1.5"
          >
            Explore All Music →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {releases.map((release) => {
            const releaseHref = (release.slug ? `/music/${release.slug}` : "/music") as Route;
            return (
              <div
                key={release.id}
                className="group relative flex flex-col rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/80 hover:border-[#7CFC00]/60 transition-all p-3 overflow-hidden shadow-lg"
              >
                <Link
                  href={releaseHref}
                  className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-950 mb-3 block"
                >
                  <Image
                    src={release.coverArt || "/placeholder.svg"}
                    alt={release.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {release.type && (
                    <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-xs text-[10px] font-mono font-bold text-[#7CFC00] px-2 py-0.5 rounded border border-[#7CFC00]/30 uppercase">
                      {release.type}
                    </span>
                  )}
                </Link>

                <div className="flex flex-col flex-1 min-w-0">
                  <Link href={releaseHref}>
                    <h3
                      className="font-bold text-sm text-white group-hover:text-[#7CFC00] transition-colors truncate"
                      title={release.title}
                    >
                      {release.title}
                    </h3>
                  </Link>

                  {release.artistSlug ? (
                    <Link
                      href={`/artists/${release.artistSlug}`}
                      className="text-xs text-zinc-400 hover:text-white truncate transition-colors mt-0.5"
                    >
                      {release.artistName}
                    </Link>
                  ) : (
                    <span className="text-xs text-zinc-400 truncate mt-0.5">
                      {release.artistName}
                    </span>
                  )}

                  {release.releaseDate && (
                    <span className="text-[10px] text-zinc-500 font-mono mt-1">
                      {release.releaseDate}
                    </span>
                  )}

                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-zinc-800/50">
                    {release.spotifyUrl && (
                      <a
                        href={release.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-[#1DB954] hover:underline flex items-center gap-1"
                      >
                        <Disc3 className="w-3 h-3" /> Spotify
                      </a>
                    )}
                    {release.bandcampUrl && (
                      <a
                        href={release.bandcampUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Bandcamp
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
