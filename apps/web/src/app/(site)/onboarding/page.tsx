"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowRight, Music, MapPin, Instagram, Youtube, Twitter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOnboardArtist } from "@/lib/api/artists"
import { toast } from "sonner"

type OnboardingStep = 1 | 2 | 3 | 4

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1)
  const onboardArtist = useOnboardArtist()
  const [artistData, setArtistData] = useState({
    artistName: "",
    location: "",
    genre: "",
    bio: "",
    spotifyId: "",
    socials: {
      instagram: "",
      twitter: "",
      youtube: "",
      website: "",
    },
    profileImage: "",
  })

  const genres = ["Country", "EDM", "Hardcore & Rock", "Hip-Hop & R&B", "Other"]

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as OnboardingStep)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep)
    }
  }

  const handleSubmit = async () => {
    try {
      await onboardArtist.mutateAsync({
        artistName: artistData.artistName,
        location: artistData.location,
        genre: artistData.genre as "Country" | "EDM" | "Hardcore & Rock" | "Hip-Hop & R&B" | "Other",
        bio: artistData.bio,
        spotifyId: artistData.spotifyId || undefined,
        socials: {
          instagram: artistData.socials.instagram || undefined,
          twitter: artistData.socials.twitter || undefined,
          youtube: artistData.socials.youtube || undefined,
          website: artistData.socials.website || undefined,
        },
        profileImage: artistData.profileImage ? (artistData.profileImage as unknown as File) : undefined,
      })
      toast.success("Artist profile created successfully!")
      router.push("/artist-dashboard")
    } catch (error: any) {
      console.error("Error creating artist profile:", error)
      toast.error(error.message || "Failed to create artist profile. Please try again.")
    }
  }

  const progressPercentage = (currentStep / 4) * 100

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-6 py-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Image
              src="/images/dead-party-logo.png"
              alt="Dead Party Media"
              width={80}
              height={80}
              className="mx-auto mb-6"
            />
            <h1 className="text-4xl font-black mb-2">Artist Profile Setup</h1>
            <p className="text-gray-400">Let's get your profile ready to shine</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Step {currentStep} of 4</span>
              <span className="text-[#7CFC00] font-bold">{progressPercentage}% Complete</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7CFC00] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 mb-8">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Basic Information</h2>
                  <p className="text-gray-400 text-sm">Tell us about yourself</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Artist/Band Name</label>
                  <input
                    type="text"
                    value={artistData.artistName}
                    onChange={(e) => setArtistData({ ...artistData, artistName: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="Your artist name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={artistData.location}
                      onChange={(e) => setArtistData({ ...artistData, location: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="Little Rock, AR"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Primary Genre</label>
                  <div className="grid grid-cols-2 gap-3">
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => setArtistData({ ...artistData, genre })}
                        className={`p-3 rounded-lg border-2 transition-all text-sm font-bold ${
                          artistData.genre === genre
                            ? "border-[#7CFC00] bg-[#7CFC00]/10"
                            : "border-gray-800 hover:border-gray-700"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Bio */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Your Story</h2>
                  <p className="text-gray-400 text-sm">Tell fans about your music journey</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Artist Bio</label>
                  <textarea
                    value={artistData.bio}
                    onChange={(e) => setArtistData({ ...artistData, bio: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00] resize-none"
                    placeholder="Share your musical journey, influences, and what makes your sound unique..."
                  />
                  <p className="text-xs text-gray-500 mt-2">{artistData.bio.length}/500 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setArtistData({ ...artistData, profileImage: file as any })
                      }
                    }}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white focus:outline-none focus:border-[#7CFC00]"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Music Links */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Connect Your Music</h2>
                  <p className="text-gray-400 text-sm">Link your music platforms</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Spotify Artist ID</label>
                  <div className="relative">
                    <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={artistData.spotifyId}
                      onChange={(e) => setArtistData({ ...artistData, spotifyId: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="Your Spotify Artist ID"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Find this in your Spotify for Artists dashboard or from your artist URL
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Social Links */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Social Media</h2>
                  <p className="text-gray-400 text-sm">Connect with your fans</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Instagram</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={artistData.socials.instagram}
                      onChange={(e) =>
                        setArtistData({ ...artistData, socials: { ...artistData.socials, instagram: e.target.value } })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Twitter/X</label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={artistData.socials.twitter}
                      onChange={(e) =>
                        setArtistData({ ...artistData, socials: { ...artistData.socials, twitter: e.target.value } })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">YouTube</label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={artistData.socials.youtube}
                      onChange={(e) =>
                        setArtistData({ ...artistData, socials: { ...artistData.socials, youtube: e.target.value } })
                      }
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://youtube.com/@yourchannel"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">Website (Optional)</label>
                  <input
                    type="text"
                    value={artistData.socials.website}
                    onChange={(e) =>
                      setArtistData({ ...artistData, socials: { ...artistData.socials, website: e.target.value } })
                    }
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {currentStep > 1 && (
              <Button
                onClick={handleBack}
                variant="outline"
                className="border-gray-800 hover:border-[#7CFC00] text-white font-bold tracking-wider uppercase bg-transparent"
              >
                Back
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                onClick={handleNext}
                className="ml-auto bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase flex items-center gap-2"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={onboardArtist.isPending}
                className="ml-auto bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase px-8"
              >
                {onboardArtist.isPending ? "Creating Profile..." : "Complete Setup"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
