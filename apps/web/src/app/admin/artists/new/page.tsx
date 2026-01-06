"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, Send } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { useCreateArtist } from "@/lib/convex-hooks"

export default function NewArtistPage() {
  const router = useRouter()
  const createArtist = useCreateArtist()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    spotifyId: "",
    location: "",
    genre: "Country",
    bio: "",
    email: "",
    phone: "",
    instagram: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    website: "",
    sendInvite: false,
  })

  const genres = ["Country", "EDM", "Hardcore & Rock", "Hip-Hop & R&B", "Other"]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createArtist({
        name: formData.name,
        bio: formData.bio,
        image: "/placeholder.jpg", // TODO: Add image upload
        location: formData.location,
        genre: formData.genre,
        spotifyUrl: formData.spotifyId
          ? `https://open.spotify.com/artist/${formData.spotifyId}`
          : undefined,
        spotifyArtistId: formData.spotifyId || undefined,
        instagram: formData.instagram || undefined,
        twitter: formData.twitter || undefined,
        tiktok: formData.tiktok || undefined,
        website: formData.website || undefined,
      })

      if (formData.sendInvite) {
        toast.success(`Artist created and invitation sent to ${formData.email || formData.phone}`)
      } else {
        toast.success("Artist created successfully")
      }

      router.push("/admin/artists")
    } catch (error) {
      console.error("Error creating artist:", error)
      toast.error("Failed to create artist. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/artists"
          className="inline-flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Artists
        </Link>
        <h1 className="text-4xl font-black">Add New Artist</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
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
              placeholder="Enter artist name"
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
                placeholder="City, State"
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
              placeholder="Brief biography of the artist"
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
              placeholder="4M5nttNvXHuSJaMIlZyAan"
            />
            <p className="text-xs text-gray-500 mt-1">
              Find this in the Spotify artist URL: open.spotify.com/artist/[ID]
            </p>
          </div>
        </div>

        {/* Contact Info */}
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
                placeholder="artist@example.com"
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
                placeholder="(123) 456-7890"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg">
            <input
              type="checkbox"
              id="sendInvite"
              checked={formData.sendInvite}
              onChange={(e) => setFormData({ ...formData, sendInvite: e.target.checked })}
              className="w-4 h-4 rounded border-gray-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-0"
            />
            <label htmlFor="sendInvite" className="text-sm text-gray-300 cursor-pointer">
              Send invitation to claim artist profile (requires email or phone)
            </label>
          </div>
        </div>

        {/* Social Media */}
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
                placeholder="https://instagram.com/artist"
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
                placeholder="https://twitter.com/artist"
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
                placeholder="https://youtube.com/@artist"
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
                placeholder="https://tiktok.com/@artist"
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
                placeholder="https://artist.com"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
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
            {formData.sendInvite ? (
              <>
                <Send className="w-4 h-4 mr-2" />
                Create & Invite
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Artist
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
