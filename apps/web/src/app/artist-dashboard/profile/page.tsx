"use client"

import { useState, useEffect } from "react"
import { useCurrentUserArtist, useUpdateArtist } from "@/lib/api/artists"
import { artistUpdateSchema, type ArtistUpdateInput } from "@/lib/validations/artist"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Edit, User, MapPin, Music, Link as LinkIcon, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export default function ArtistProfilePage() {
  const { data: artist, isLoading } = useCurrentUserArtist()
  const updateArtist = useUpdateArtist()
  const [isEditing, setIsEditing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Form state
  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [location, setLocation] = useState("")
  const [genre, setGenre] = useState<"Country" | "EDM" | "Hardcore & Rock" | "Hip-Hop & R&B" | "Other">("Other")
  const [spotifyUrl, setSpotifyUrl] = useState("")
  const [instagram, setInstagram] = useState("")
  const [twitter, setTwitter] = useState("")
  const [tiktok, setTiktok] = useState("")
  const [website, setWebsite] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)

  // Initialize form with artist data
  useEffect(() => {
    if (artist) {
      setName(artist.name || "")
      setBio(artist.bio || "")
      setLocation(artist.location || "")
      setGenre(artist.genre || "Other")
      setSpotifyUrl(artist.spotify_url || "")
      setInstagram(artist.instagram || "")
      setTwitter(artist.twitter || "")
      setTiktok(artist.tiktok || "")
      setWebsite(artist.website || "")
    }
  }, [artist])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    try {
      const data: ArtistUpdateInput = {
        name,
        bio,
        location,
        genre,
        spotify_url: spotifyUrl || undefined,
        instagram: instagram || undefined,
        twitter: twitter || undefined,
        tiktok: tiktok || undefined,
        website: website || undefined,
        image: imageFile || undefined,
      }

      const validated = artistUpdateSchema.parse(data)
      // Map validated data to API format (send empty strings to clear URL fields)
      await updateArtist.mutateAsync({
        name: validated.name,
        bio: validated.bio,
        location: validated.location,
        genre: validated.genre,
        spotify_url: validated.spotify_url || "",
        instagram: validated.instagram || "",
        twitter: validated.twitter || "",
        tiktok: validated.tiktok || "",
        website: validated.website || "",
        image: validated.image ?? undefined,
      })
      toast.success("Profile updated successfully!")
      setIsEditing(false)
      setImageFile(null)
    } catch (error: any) {
      if (error.errors) {
        // Zod validation errors
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err: any) => {
          if (err.path) {
            fieldErrors[err.path[0]] = err.message
          }
        })
        setErrors(fieldErrors)
      } else if (error.response?.data) {
        // API validation errors
        const apiErrors = error.response.data
        const fieldErrors: Record<string, string> = {}
        Object.keys(apiErrors).forEach((key) => {
          fieldErrors[key] = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key]
        })
        setErrors(fieldErrors)
        toast.error("Failed to update profile. Please check the errors.")
      } else {
        toast.error(error.message || "Failed to update profile")
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">Edit Profile</h1>
              <p className="text-gray-400">Manage your artist profile</p>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <User className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>No artist profile found</EmptyTitle>
                <EmptyDescription>
                  You need to claim or create an artist profile first.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black mb-2">Edit Profile</h1>
              <p className="text-gray-400">Manage your artist profile</p>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          <Card className="bg-[#111111] border-gray-800 p-6">
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-gray-300">
                      Artist Name
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 bg-[#0A0A0A] border-gray-700 text-white"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-gray-300">
                      Bio
                    </Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="mt-1 w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-md text-white focus:border-[#7CFC00] focus:outline-none"
                      rows={5}
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location" className="text-gray-300">
                        Location
                      </Label>
                      <Input
                        id="location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="mt-1 bg-[#0A0A0A] border-gray-700 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="genre" className="text-gray-300">
                        Genre
                      </Label>
                      <select
                        id="genre"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value as typeof genre)}
                        className="mt-1 w-full px-3 py-2 bg-[#0A0A0A] border border-gray-700 rounded-md text-white focus:border-[#7CFC00] focus:outline-none"
                        required
                      >
                        <option value="Country">Country</option>
                        <option value="EDM">EDM</option>
                        <option value="Hardcore & Rock">Hardcore & Rock</option>
                        <option value="Hip-Hop & R&B">Hip-Hop & R&B</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center gap-2 mb-4">
                      <LinkIcon className="w-5 h-5 text-[#7CFC00]" />
                      <h3 className="text-lg font-bold">Social Links</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="spotify" className="text-gray-300">
                          Spotify URL
                        </Label>
                        <Input
                          id="spotify"
                          type="url"
                          value={spotifyUrl}
                          onChange={(e) => {
                            setSpotifyUrl(e.target.value)
                            if (errors.spotify_url) setErrors({ ...errors, spotify_url: "" })
                          }}
                          className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${errors.spotify_url ? "border-red-500" : ""}`}
                          placeholder="https://open.spotify.com/artist/..."
                        />
                        {errors.spotify_url && <p className="mt-1 text-sm text-red-500">{errors.spotify_url}</p>}
                      </div>

                      <div>
                        <Label htmlFor="instagram" className="text-gray-300">
                          Instagram URL
                        </Label>
                        <Input
                          id="instagram"
                          type="url"
                          value={instagram}
                          onChange={(e) => {
                            setInstagram(e.target.value)
                            if (errors.instagram) setErrors({ ...errors, instagram: "" })
                          }}
                          className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${errors.instagram ? "border-red-500" : ""}`}
                          placeholder="https://instagram.com/..."
                        />
                        {errors.instagram && <p className="mt-1 text-sm text-red-500">{errors.instagram}</p>}
                      </div>

                      <div>
                        <Label htmlFor="twitter" className="text-gray-300">
                          Twitter URL
                        </Label>
                        <Input
                          id="twitter"
                          type="url"
                          value={twitter}
                          onChange={(e) => {
                            setTwitter(e.target.value)
                            if (errors.twitter) setErrors({ ...errors, twitter: "" })
                          }}
                          className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${errors.twitter ? "border-red-500" : ""}`}
                          placeholder="https://twitter.com/..."
                        />
                        {errors.twitter && <p className="mt-1 text-sm text-red-500">{errors.twitter}</p>}
                      </div>

                      <div>
                        <Label htmlFor="tiktok" className="text-gray-300">
                          TikTok URL
                        </Label>
                        <Input
                          id="tiktok"
                          type="url"
                          value={tiktok}
                          onChange={(e) => {
                            setTiktok(e.target.value)
                            if (errors.tiktok) setErrors({ ...errors, tiktok: "" })
                          }}
                          className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${errors.tiktok ? "border-red-500" : ""}`}
                          placeholder="https://tiktok.com/@..."
                        />
                        {errors.tiktok && <p className="mt-1 text-sm text-red-500">{errors.tiktok}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="website" className="text-gray-300">
                          Website URL
                        </Label>
                        <Input
                          id="website"
                          type="url"
                          value={website}
                          onChange={(e) => {
                            setWebsite(e.target.value)
                            if (errors.website) setErrors({ ...errors, website: "" })
                          }}
                          className={`mt-1 bg-[#0A0A0A] border-gray-700 text-white ${errors.website ? "border-red-500" : ""}`}
                          placeholder="https://..."
                        />
                        {errors.website && <p className="mt-1 text-sm text-red-500">{errors.website}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor="image" className="text-gray-300">
                          Profile Image
                        </Label>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setImageFile(file)
                              if (errors.image) setErrors({ ...errors, image: "" })
                            }
                          }}
                          className="mt-1 bg-[#0A0A0A] border-gray-700 text-white"
                        />
                        {errors.image && <p className="mt-1 text-sm text-red-500">{errors.image}</p>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-gray-800">
                  <Button
                    type="submit"
                    disabled={updateArtist.isPending}
                    className="bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateArtist.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setErrors({})
                      setImageFile(null)
                      // Reset form to original values
                      if (artist) {
                        setName(artist.name || "")
                        setBio(artist.bio || "")
                        setLocation(artist.location || "")
                        setGenre(artist.genre || "Other")
                        setSpotifyUrl(artist.spotify_url || "")
                        setInstagram(artist.instagram || "")
                        setTwitter(artist.twitter || "")
                        setTiktok(artist.tiktok || "")
                        setWebsite(artist.website || "")
                      }
                    }}
                    className="border-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-6">
                  {artist.image && (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={artist.image}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{artist.name}</h2>
                    <div className="flex items-center gap-4 text-gray-400 text-sm mb-4">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{artist.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Music className="w-4 h-4" />
                        <span>{artist.genre}</span>
                      </div>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap">{artist.bio}</p>
                  </div>
                </div>

                {(artist.spotify_url || artist.instagram || artist.twitter || artist.tiktok || artist.website) && (
                  <div className="pt-6 border-t border-gray-800">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-[#7CFC00]" />
                      Social Links
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      {artist.spotify_url && (
                        <a
                          href={artist.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          Spotify
                        </a>
                      )}
                      {artist.instagram && (
                        <a
                          href={artist.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          Instagram
                        </a>
                      )}
                      {artist.twitter && (
                        <a
                          href={artist.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          Twitter
                        </a>
                      )}
                      {artist.tiktok && (
                        <a
                          href={artist.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          TikTok
                        </a>
                      )}
                      {artist.website && (
                        <a
                          href={artist.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7CFC00] hover:underline"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-800">
                  <Link href={`/artists/${artist.slug}`}>
                    <Button variant="outline" className="border-gray-700 text-white">
                      View Public Profile
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}

