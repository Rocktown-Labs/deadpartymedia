"use client";
import { use } from "react";
import { Instagram, Twitter, ArrowLeft, MapPin } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useArtist, useArtistArticles, useArtistEvents } from "@/lib/api/artists";

export default function ArtistDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { data: artist, isLoading: artistLoading } = useArtist(slug);
  const { data: articles } = useArtistArticles(slug);
  const { data: events } = useArtistEvents(slug);

  // Ensure articles and events are arrays
  const articlesArray = Array.isArray(articles) ? articles : [];
  const eventsArray = Array.isArray(events) ? events : [];

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
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Main Content */}
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Back Button */}
          <Link
            href="/artists"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artists
          </Link>

          {/* Artist Info Card */}
          <div className="border border-gray-800 rounded-lg overflow-hidden mb-12 bg-[#0A0A0A]">
            <div className="p-6">
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
              <p className="text-gray-300 leading-relaxed mb-4">{artist.bio}</p>

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
                    >
                      TT
                    </a>
                  )}
                  {artist.website && (
                    <a
                      href={artist.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                    >
                      🌐
                    </a>
                  )}
                </div>
                <div className="text-base">
                  <span className="text-gray-400">Articles: </span>
                  <span className="font-bold text-[#7CFC00] text-xl">{artist.article_count}</span>
                  {artist.event_count > 0 && (
                    <>
                      <span className="text-gray-400 ml-4">Events: </span>
                      <span className="font-bold text-[#7CFC00] text-xl">{artist.event_count}</span>
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
                      <span className="text-xs text-[#7CFC00] font-medium">{article.category}</span>
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
                      <h3 className="font-bold mt-2 mb-2 group-hover:text-[#7CFC00] transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {new Date(event.date).toLocaleDateString()} at {event.time}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {event.venue}, {event.location}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
