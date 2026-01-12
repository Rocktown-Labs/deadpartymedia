"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { ArrowRight, MapPin, Instagram, Twitter, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "./actions";
import { toast } from "sonner";

type OnboardingStep = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [artistData, setArtistData] = useState({
    name: "",
    location: "",
    genre: "",
    bio: "",
    spotifyUrl: "",
    spotifyArtistId: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    website: "",
    image: "",
  });

  // Check if user is loaded and authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  // Check if onboarding is already complete
  useEffect(() => {
    if (isLoaded && user) {
      const onboardingComplete = user.publicMetadata?.onboardingComplete;
      if (onboardingComplete) {
        const role = user.publicMetadata?.role as string;
        if (role === "artist") {
          router.push("/artist-dashboard");
        } else if (role === "super_admin" || role === "writer") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [isLoaded, user, router]);

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7CFC00] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  const role = user.publicMetadata?.role as string;
  const artistId = user.publicMetadata?.artistId as number | undefined;
  const isClaimingArtist = role === "artist" && artistId;

  const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as OnboardingStep);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", artistData.name);
      formData.set("location", artistData.location);
      formData.set("genre", artistData.genre);
      formData.set("bio", artistData.bio);
      if (artistData.spotifyUrl) formData.set("spotifyUrl", artistData.spotifyUrl);
      if (artistData.spotifyArtistId) formData.set("spotifyArtistId", artistData.spotifyArtistId);
      if (artistData.instagram) formData.set("instagram", artistData.instagram);
      if (artistData.twitter) formData.set("twitter", artistData.twitter);
      if (artistData.tiktok) formData.set("tiktok", artistData.tiktok);
      if (artistData.website) formData.set("website", artistData.website);
      if (artistData.image) formData.set("image", artistData.image);

      const result = await completeOnboarding(formData);

      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      // Force token refresh to get updated metadata
      await user.reload();

      toast.success("Onboarding completed successfully!");
      
      // Redirect based on role
      if (role === "artist") {
        router.push("/artist-dashboard");
      } else if (role === "super_admin" || role === "writer") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error(error.message || "Failed to complete onboarding. Please try again.");
      setIsSubmitting(false);
    }
  };

  const progressPercentage = (currentStep / 4) * 100;

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
            <h1 className="text-4xl font-black mb-2">
              {isClaimingArtist ? "Claim Your Artist Profile" : "Complete Your Profile"}
            </h1>
            <p className="text-gray-400">
              {isClaimingArtist
                ? "Finish setting up your artist profile"
                : "Let's get your profile ready"}
            </p>
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
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    {role === "artist" ? "Artist/Band Name" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={artistData.name}
                    onChange={(e) => setArtistData({ ...artistData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder={role === "artist" ? "Your artist name" : "Your name"}
                    required
                  />
                </div>

                {role === "artist" && (
                  <>
                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={artistData.location}
                          onChange={(e) => setArtistData({ ...artistData, location: e.target.value })}
                          className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="Little Rock, AR"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                        Primary Genre
                      </label>
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
                            {genre.replace(" & ", " & ")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Bio (for artists) */}
            {currentStep === 2 && role === "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Your Story</h2>
                  <p className="text-gray-400 text-sm">Tell fans about your music journey</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Artist Bio
                  </label>
                  <textarea
                    value={artistData.bio}
                    onChange={(e) => setArtistData({ ...artistData, bio: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00] resize-none"
                    placeholder="Share your musical journey, influences, and what makes your sound unique..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Profile Image URL
                  </label>
                  <input
                    type="url"
                    value={artistData.image}
                    onChange={(e) => setArtistData({ ...artistData, image: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Music Links (for artists) */}
            {currentStep === 3 && role === "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Connect Your Music</h2>
                  <p className="text-gray-400 text-sm">Link your music platforms</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Spotify URL
                  </label>
                  <div className="relative">
                    <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={artistData.spotifyUrl}
                      onChange={(e) => setArtistData({ ...artistData, spotifyUrl: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://open.spotify.com/artist/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Spotify Artist ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={artistData.spotifyArtistId}
                    onChange={(e) => setArtistData({ ...artistData, spotifyArtistId: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="Spotify Artist ID"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Social Links (for artists) */}
            {currentStep === 4 && role === "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Social Media</h2>
                  <p className="text-gray-400 text-sm">Connect with your fans</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Instagram
                  </label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={artistData.instagram}
                      onChange={(e) => setArtistData({ ...artistData, instagram: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Twitter/X
                  </label>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={artistData.twitter}
                      onChange={(e) => setArtistData({ ...artistData, twitter: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={artistData.tiktok}
                    onChange={(e) => setArtistData({ ...artistData, tiktok: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="https://tiktok.com/@yourhandle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    value={artistData.website}
                    onChange={(e) => setArtistData({ ...artistData, website: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            )}

            {/* For non-artists, show a simple completion step */}
            {currentStep === 2 && role !== "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Welcome!</h2>
                  <p className="text-gray-400 text-sm">
                    You're all set! Click complete to finish your onboarding.
                  </p>
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

            {role === "artist" ? (
              currentStep < 4 ? (
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
                  disabled={isSubmitting || !artistData.name || !artistData.location || !artistData.genre || !artistData.bio}
                  className="ml-auto bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase px-8"
                >
                  {isSubmitting ? "Completing..." : "Complete Setup"}
                </Button>
              )
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !artistData.name}
                className="ml-auto bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase px-8"
              >
                {isSubmitting ? "Completing..." : "Complete"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
