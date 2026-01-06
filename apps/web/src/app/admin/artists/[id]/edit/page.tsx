"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import artists from "@/data/artists.json"

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const artist = artists.find((a) => a.id === Number.parseInt(resolvedParams.id))

  const [formData, setFormData] = useState({
    name: artist?.name || "",
    spotifyId: artist?.spotifyId || "",
    location: artist?.location || "",
    genre: artist?.genre || "Country",
    bio: artist?.bio || "",
    email: artist?.email || "",
    phone: artist?.phone || "",
    instagram: artist?.socials?.instagram || "",
    twitter: artist?.socials?.twitter || "",
    youtube: artist?.socials?.youtube || "",
    tiktok: artist?.socials?.tiktok || "",
    website: artist?.socials?.website || "",
  })

  const genres = ["Country", "EDM", "Hardcore & Rock", "Hip-Hop & R&B", "Other"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("[v0] Updating artist:", resolvedParams.id, formData)
    toast.success("Artist updated successfully")

    setIsLoading(false)
    router.push("/admin/artists")
  }

  if (!artist) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Artist not found</h1>
        <Link href="/admin/artists">
          <Button>Back to Artists</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/admin/artists"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Artists
        </Link>
        <h1 className="text-4xl font-black">Edit Artist</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Basic Information</h2>

          <div>
            <Label htmlFor="name">Artist Name *</Label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Location *</Label>
              <input
                id="location"
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="genre">Genre *</Label>
              <select
                id="genre"
                required
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-purple-600"
              >
                {genres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="spotifyId">Spotify Artist ID</Label>
            <input
              id="spotifyId"
              type="text"
              value={formData.spotifyId}
              onChange={(e) => setFormData({ ...formData, spotifyId: e.target.value })}
              className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Contact Information</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold mb-4">Social Media</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <input
                id="instagram"
                type="url"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="twitter">Twitter/X</Label>
              <input
                id="twitter"
                type="url"
                value={formData.twitter}
                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="youtube">YouTube</Label>
              <input
                id="youtube"
                type="url"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="tiktok">TikTok</Label>
              <input
                id="tiktok"
                type="url"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full mt-1.5 px-4 py-2.5 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link href="/admin/artists">
            <Button
              type="button"
              variant="outline"
              className="border-gray-800 text-gray-400 hover:text-white bg-transparent"
            >
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-purple-600 text-white hover:bg-purple-700 font-medium"
          >
            <Save className="w-4 h-4 mr-2" />
            Update Artist
          </Button>
        </div>
      </form>
    </div>
  )
}
