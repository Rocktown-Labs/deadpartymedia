"use client";

import { useRef } from "react";
import { Instagram, Twitter, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Spotify } from "@/components/ui/svgs/spotify";
import { useRouter } from "next/navigation";
import { useArtist, useArtistArticles, useArtistEvents } from "@/lib/api/artists";
import { ArtistStructuredData } from "@/components/seo/structured-data";
import posthogClient from "posthog-js";
import { MerchCarousel } from "@/components/merch/merch-carousel";

interface ArtistPageClientProps {
  slug: string;
}

const getInternalReferrerPath = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const { referrer } = document;
  if (!referrer) {
    return null;
  }

  try {
    const referrerUrl = new URL(referrer);
    return referrerUrl.origin === window.location.origin ? referrerUrl.pathname : null;
  } catch {
    return null;
  }
};

export function ArtistPageClient({ slug }: ArtistPageClientProps) {
  const router = useRouter();
  const { data: artist, isLoading: artistLoading } = useArtist(slug);
  const { data: articles } = useArtistArticles(slug);
  const { data: events } = useArtistEvents(slug);

  // Ensure articles and events are arrays
  const articlesArray = Array.isArray(articles) ? articles : [];
  const eventsArray = Array.isArray(events) ? events : [];
  const artistViewedRef = useRef<string | null>(null);

  // Track artist profile viewed event - using ref to prevent duplicate tracking
  if (artist && artistViewedRef.current !== artist.slug) {
    posthogClient.capture("artist_profile_viewed", {
      article_count: artist.article_count,
      artist_genre: artist.genre,
      artist_id: artist.id,
      artist_location: artist.location,
      artist_name: artist.name,
      artist_slug: artist.slug,
      event_count: artist.event_count,
    });
    artistViewedRef.current = artist.slug;
  }

  // Helper function to track social link clicks
  const handleSocialClick = (platform: string, url: string | null | undefined) => {
    if (!url) {
      return;
    }

    posthogClient.capture("artist_social_clicked", {
      artist_id: artist?.id,
      artist_name: artist?.name,
      artist_slug: artist?.slug,
      platform,
      url,
    });
  };

  const handleBackClick = () => {
    const internalReferrerPath = getInternalReferrerPath();
    if (internalReferrerPath) {
      router.back();
      return;
    }

    router.push("/artists");
  };

  if (artistLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Artist Not Found</h1>
          <Link href="/artists" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
            Back to Artists
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <ArtistStructuredData artist={artist} />
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        {/* Main Content */}
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6">
            <div className="max-w-6xl">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBackClick}
                className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Artists
              </button>

              {/* Artist Info Card */}
              <div className="border border-gray-800 rounded-lg overflow-hidden mb-12 bg-[#0A0A0A]">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
                    {artist.image && (
                      <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden shrink-0 border border-gray-800 bg-[#0E0E0E]">
                        <Image
                          src={artist.image}
                          alt={artist.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between mb-2">
                        <h1 className="text-3xl font-bold">{artist.name}</h1>
                        <span className="px-3 py-1 bg-[#7CFC00] text-black text-sm font-medium rounded whitespace-nowrap ml-4">
                          {artist.genre}
                        </span>
                      </div>
                      <p className="text-gray-400 mb-4">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        {artist.location}
                      </p>

                      {/* Bio */}
                      <p className="text-gray-300 leading-relaxed">{artist.bio}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-800 mb-4" />

                  {/* Social Links and Article Count */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      {artist.instagram && (
                        <a
                          href={artist.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                          onClick={() => handleSocialClick("instagram", artist.instagram)}
                        >
                          <Instagram className="w-5 h-5" />
                        </a>
                      )}
                      {artist.twitter && (
                        <a
                          href={artist.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                          onClick={() => handleSocialClick("twitter", artist.twitter)}
                        >
                          <Twitter className="w-5 h-5" />
                        </a>
                      )}
                      {artist.tiktok && (
                        <a
                          href={artist.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#7CFC00] transition-colors text-sm font-bold"
                          onClick={() => handleSocialClick("tiktok", artist.tiktok)}
                        >
                          TT
                        </a>
                      )}
                      {artist.spotify_url && (
                        <a
                          href={artist.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#1DB954] transition-colors"
                          onClick={() => handleSocialClick("spotify", artist.spotify_url)}
                        >
                          <Spotify className="w-5 h-5 fill-current" />
                        </a>
                      )}
                      {artist.website && (
                        <a
                          href={artist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                          onClick={() => handleSocialClick("website", artist.website)}
                        >
                          🌐
                        </a>
                      )}
                    </div>
                    <div className="text-base">
                      <span className="text-gray-400">Articles: </span>
                      <span className="font-bold text-[#7CFC00] text-xl">
                        {artist.article_count}
                      </span>
                      {artist.event_count > 0 && (
                        <>
                          <span className="text-gray-400 ml-4">Events: </span>
                          <span className="font-bold text-[#7CFC00] text-xl">
                            {artist.event_count}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Spotify Embed - Full Width */}
                {artist.spotify_artist_id && (
                  <div className="p-6 border-t border-gray-800">
                    <iframe
                      style={{ borderRadius: "12px" }}
                      src={`https://open.spotify.com/embed/artist/${artist.spotify_artist_id}?utm_source=generator&theme=0`}
                      width="100%"
                      height="352"
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Related Articles */}
              {articlesArray.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold mb-6">Articles Featuring {artist.name}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {articlesArray.map((article) => (
                      <Link
                        key={article.id}
                        href={`/article/${article.slug}`}
                        className="border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00]/50 transition-colors group"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <Image
                            src={article.cover_image || "/placeholder.svg"}
                            alt={article.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <span className="text-xs text-[#7CFC00] font-medium">
                            {article.category}
                          </span>
                          <h3 className="font-bold mt-2 mb-2 group-hover:text-[#7CFC00] transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {new Date(article.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Events */}
              {eventsArray.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Events Featuring {artist.name}</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventsArray.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.slug}`}
                        className="border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00]/50 transition-colors group"
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <Image
                            src={event.image || "/placeholder.svg"}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="p-4">
                          <span className="text-xs text-[#7CFC00] font-medium">{event.genre}</span>
                          <h3 className="font-bold mt-2 mb-2 group-hover:text-[#7CFC00] transition-colors">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                              weekday: "short",
                              year: "numeric",
                            })}
                          </p>
                          <div className="mt-2 space-y-1 text-sm text-gray-500">
                            {event.time && <p>{event.time}</p>}
                            {event.venue && <p>{event.venue}</p>}
                            {event.location && <p>{event.location}</p>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <MerchCarousel heading="Merch" />
        </main>
      </div>
    </>
  );
}
