"use client";

import { useMemo } from "react";
import { ArrowLeft, Calendar, Share2, Edit, Disc3, ExternalLink, Music, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { useUser } from "@clerk/nextjs";
import { MerchCarousel } from "@/components/merch/merch-carousel";
import { useMusicRelease } from "@/lib/api/music";
import { toast } from "sonner";

interface MusicReleaseClientProps {
  slug: string;
}

export function MusicReleaseClient({ slug }: MusicReleaseClientProps) {
  const { data: release, isLoading } = useMusicRelease(slug);
  const { isSignedIn, user: currentUser } = useUser();

  const canEdit = useMemo(() => {
    if (!isSignedIn || !currentUser || !release) {
      return false;
    }
    const role = (currentUser.publicMetadata?.role as string | undefined)?.toLowerCase();
    const isSuperAdmin = role === "super_admin";
    const isWriter = role === "writer";
    const isAuthor = currentUser.id === release.author?.id;
    return isSuperAdmin || (isWriter && isAuthor);
  }, [isSignedIn, currentUser, release]);

  const handleShareClick = async () => {
    if (!release) return;

    const shareUrl = typeof window !== "undefined" ? window.location.href : `/music/${slug}`;
    const shareText = `${release.title} by ${release.artistName}`;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          text: release.excerpt || shareText,
          title: shareText,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Release link copied");
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Unable to share release");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading release...</div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black mb-4">Release Not Found</h1>
          <Link href="/music" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
            Return to Music
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
              href="/music"
              className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Music
            </Link>

            {/* Release Header */}
            <header className="mb-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="inline-block px-3 py-1 bg-[#7CFC00] text-black text-xs font-bold tracking-wider uppercase rounded-sm">
                  {release.releaseType}
                </span>
                <span className="inline-block px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono">
                  {release.genre}
                </span>
                {release.releaseDate && (
                  <div className="flex items-center text-zinc-400 text-sm font-mono">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    {release.releaseDate}
                  </div>
                )}
              </div>

              <h1 className="text-4xl md:text-6xl font-black leading-tight mb-2 text-white">
                {release.title}
              </h1>

              <div className="text-xl md:text-2xl font-bold text-zinc-300 mb-6">
                {release.artistSlug ? (
                  <Link
                    href={`/artists/${release.artistSlug}`}
                    className="hover:text-[#7CFC00] transition-colors"
                  >
                    by {release.artistName}
                  </Link>
                ) : (
                  <span>by {release.artistName}</span>
                )}
              </div>

              {/* Social Actions */}
              <div className="flex items-center space-x-4 mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#9400D3] text-[#9400D3] hover:bg-[#9400D3] hover:text-white bg-transparent"
                  onClick={handleShareClick}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Release
                </Button>
                {canEdit && (
                  <Link href={`/admin/music/${release.id}` as Route}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black bg-transparent"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Release
                    </Button>
                  </Link>
                )}
              </div>
            </header>

            {/* Hero Cover Art & Streaming Links */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12 items-start">
              <div className="md:col-span-6">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl">
                  <Image
                    src={release.coverArt || "/placeholder.svg"}
                    alt={release.title}
                    fill
                    priority
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="md:col-span-6 flex flex-col justify-between space-y-6">
                {/* Excerpt Hook */}
                <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
                  <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-[#7CFC00] mb-2">
                    About This Release
                  </h2>
                  <p className="text-base text-zinc-300 leading-relaxed italic">
                    &quot;{release.excerpt}&quot;
                  </p>
                </div>

                {/* Streaming Links Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
                    Stream & Purchase
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {release.spotifyUrl && (
                      <a
                        href={release.spotifyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-[#1DB954] hover:bg-[#1DB954]/10 transition-all group"
                      >
                        <Disc3 className="w-5 h-5 text-[#1DB954] group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white">Spotify</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Stream now</span>
                        </div>
                      </a>
                    )}

                    {release.appleMusicUrl && (
                      <a
                        href={release.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-pink-500 hover:bg-pink-500/10 transition-all group"
                      >
                        <Music className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white">Apple Music</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Listen here</span>
                        </div>
                      </a>
                    )}

                    {release.bandcampUrl && (
                      <a
                        href={release.bandcampUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all group"
                      >
                        <ExternalLink className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white">Bandcamp</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Support artist
                          </span>
                        </div>
                      </a>
                    )}

                    {release.youtubeUrl && (
                      <a
                        href={release.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-red-500 hover:bg-red-500/10 transition-all group"
                      >
                        <Video className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white">YouTube</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Watch video</span>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Content / Review */}
            {release.content && (
              <section className="mb-16 pt-8 border-t border-zinc-800">
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-6">
                  Review &amp; Notes
                </h2>
                <div className="text-zinc-300 text-lg leading-relaxed whitespace-pre-line space-y-4">
                  {release.content}
                </div>
              </section>
            )}

            {/* Artist Spotlight Footer Card */}
            {release.artistBio && (
              <section className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950 mb-16">
                <div className="flex items-start gap-4">
                  {release.artistImage && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                      <Image
                        src={release.artistImage}
                        alt={release.artistName}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-white">{release.artistName}</h3>
                    <p className="text-xs text-zinc-400 font-mono mb-2">Arkansas Artist</p>
                    <p className="text-sm text-zinc-300 leading-relaxed">{release.artistBio}</p>
                    {release.artistSlug && (
                      <Link
                        href={`/artists/${release.artistSlug}`}
                        className="inline-block mt-3 text-xs font-mono font-bold text-[#7CFC00] hover:underline"
                      >
                        View Artist Profile →
                      </Link>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Merch Carousel */}
            <div className="mt-20">
              <MerchCarousel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
