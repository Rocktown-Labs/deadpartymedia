"use client"
import { Instagram, Youtube, Twitter, ArrowLeft, MapPin } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function ArtistDetailPage({ params }: { params: { id: string } }) {
  const artistId = params.id

  // Mock artist data - in production this would come from an API/database
  const artists = [
    {
      id: 1,
      name: "Billy Jeter",
      spotifyId: "4M5nttNvXHuSJaMIlZyAan",
      location: "Little Rock, AR",
      genre: "Country",
      articleCount: 3,
      bio: "Billy Jeter's journey through country music has been anything but conventional. From his early days playing honky-tonks across Arkansas to his recent album release, Jeter has carved out a unique space in the state's country music landscape. His authentic storytelling and traditional sound have earned him a dedicated following throughout the Natural State.",
      socials: {
        instagram: "https://instagram.com/billyjeter",
        twitter: "https://twitter.com/billyjeter",
        youtube: "https://youtube.com/@billyjeter",
        tiktok: "https://tiktok.com/@billyjeter",
        website: "https://billyjeter.com",
      },
    },
    {
      id: 2,
      name: "Grace Wells",
      spotifyId: "5bw8UvI8tgEqhZqY9IcxGC",
      location: "Fayetteville, AR",
      genre: "Country",
      articleCount: 2,
      bio: "Grace Wells embodies the spirit of modern Arkansas country music. Her heartfelt lyrics and melodic sensibilities have quickly established her as an artist to watch. With influences ranging from classic country to contemporary Americana, Wells brings a fresh perspective to the Arkansas music scene while honoring the genre's rich traditions.",
      socials: {
        instagram: "https://instagram.com/gracewells",
        twitter: "https://twitter.com/gracewells",
        youtube: "https://youtube.com/@gracewells",
        tiktok: "",
        website: "https://gracewells.com",
      },
    },
    {
      id: 3,
      name: "BABYFACECAM",
      spotifyId: "6VTpCIFWgi9ZwNzd3uq2U0",
      location: "Little Rock, AR",
      genre: "Hip-Hop & R&B",
      articleCount: 5,
      bio: "BABYFACECAM has emerged as one of Little Rock's most exciting voices in hip-hop. His unique blend of melodic rap and introspective lyrics has garnered attention both locally and nationally. With a growing catalog of hits and collaborations, BABYFACECAM continues to push the boundaries of Arkansas hip-hop while staying true to his roots.",
      socials: {
        instagram: "https://instagram.com/babyfacecam",
        twitter: "https://twitter.com/babyfacecam",
        youtube: "https://youtube.com/@babyfacecam",
        tiktok: "https://tiktok.com/@babyfacecam",
        website: "",
      },
    },
  ]

  const artist = artists.find((a) => a.id === Number.parseInt(artistId))

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
    )
  }

  // Mock articles related to this artist
  const relatedArticles = [
    {
      id: 1,
      title: `${artist.name} Releases New Single`,
      category: artist.genre,
      date: "December 10, 2024",
      image: "https://picsum.photos/400/300?random=1",
    },
    {
      id: 2,
      title: `Behind the Music: ${artist.name}'s Creative Process`,
      category: artist.genre,
      date: "November 22, 2024",
      image: "https://picsum.photos/400/300?random=2",
    },
    {
      id: 3,
      title: `${artist.name} to Headline Local Festival`,
      category: artist.genre,
      date: "October 15, 2024",
      image: "https://picsum.photos/400/300?random=3",
    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Main Content */}
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Back Button */}
          <Link href="/artists" className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8">
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
                  {artist.socials.instagram && (
                    <a
                      href={artist.socials.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {artist.socials.twitter && (
                    <a
                      href={artist.socials.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {artist.socials.youtube && (
                    <a
                      href={artist.socials.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#7CFC00] transition-colors"
                    >
                      <Youtube className="w-5 h-5" />
                    </a>
                  )}
                  {artist.socials.tiktok && (
                    <a
                      href={artist.socials.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#7CFC00] transition-colors text-sm font-bold"
                    >
                      TT
                    </a>
                  )}
                  {artist.socials.website && (
                    <a
                      href={artist.socials.website}
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
                  <span className="font-bold text-[#7CFC00] text-xl">{artist.articleCount}</span>
                </div>
              </div>
            </div>

            {/* Spotify Embed - Full Width */}
            <div className="p-6 border-t border-gray-800">
              <iframe
                style={{ borderRadius: "12px" }}
                src={`https://open.spotify.com/embed/artist/${artist.spotifyId}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                frameBorder="0"
                allowFullScreen
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </div>

          {/* Related Articles */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Articles Featuring {artist.name}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((article) => (
                <Link
                  key={article.id}
                  href={`/article/${article.id}`}
                  className="border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00]/50 transition-colors group"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <Image
                      src={article.image || "/placeholder.svg"}
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
                    <p className="text-sm text-gray-400">{article.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
