"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { ArrowRight, MapPin, Instagram, Twitter, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "./actions";
import { toast } from "sonner";
import { SpotifySearch } from "@/components/spotify-search";
import type { SpotifyArtist } from "@/lib/api/artists";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

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

  // Get role information - must be before useState to ensure consistent hook order
  const existingRole = user?.publicMetadata?.role as string | undefined;
  const artistId = user?.publicMetadata?.artistId as number | undefined;
  
  // Always declare selectedRole state BEFORE any conditional returns
  // Initialize with existingRole if available, otherwise undefined
  const [selectedRole, setSelectedRole] = useState<"fan" | "artist" | undefined>(
    existingRole as "fan" | "artist" | undefined
  );
  
  // Use selected role or existing role
  const role = selectedRole || existingRole || "fan";
  const isClaimingArtist = role === "artist" && artistId;

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
        const userRole = user.publicMetadata?.role as string;
        if (userRole === "artist") {
          router.push("/artist-dashboard");
        } else if (userRole === "super_admin" || userRole === "writer") {
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

  const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"];

  const handleNext = () => {
    const maxStep = !existingRole && selectedRole === "artist" ? 5 : 
                    existingRole && role === "artist" ? 4 : 2;
    if (currentStep < maxStep) {
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
      
      // Set role if not already set
      if (!existingRole && selectedRole) {
        formData.set("role", selectedRole);
      }

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
      const finalRole = selectedRole || existingRole || "fan";
      if (finalRole === "artist") {
        router.push("/artist-dashboard");
      } else if (finalRole === "super_admin" || finalRole === "writer") {
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

  const maxStep = !existingRole && selectedRole === "artist" ? 5 : 
                  existingRole && role === "artist" ? 4 : 2;
  const progressPercentage = (currentStep / maxStep) * 100;

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
              <span className="text-gray-400">Step {currentStep} of {maxStep}</span>
              <span className="text-[#7CFC00] font-bold">{Math.round(progressPercentage)}% Complete</span>
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
            {/* Step 1: Role Selection (if no role exists) or Basic Info */}
            {currentStep === 1 && !existingRole && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Choose Your Role</h2>
                  <p className="text-gray-400 text-sm">How would you like to use Dead Party Media?</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("fan")}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      selectedRole === "fan"
                        ? "border-[#7CFC00] bg-[#7CFC00]/10"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <h3 className="font-bold text-lg mb-2">Fan</h3>
                    <p className="text-sm text-gray-400">
                      Discover music, read articles, and follow your favorite artists
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("artist")}
                    className={`p-6 rounded-lg border-2 transition-all text-left ${
                      selectedRole === "artist"
                        ? "border-[#7CFC00] bg-[#7CFC00]/10"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <h3 className="font-bold text-lg mb-2">Artist</h3>
                    <p className="text-sm text-gray-400">
                      Create your profile, share your music, and connect with fans
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Basic Info (if role already exists) */}
            {currentStep === 1 && existingRole && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Basic Information</h2>
                  <p className="text-gray-400 text-sm">Tell us about yourself</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    {existingRole === "artist" ? "Artist/Band Name" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={artistData.name}
                    onChange={(e) => setArtistData({ ...artistData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder={existingRole === "artist" ? "Your artist name" : "Your name"}
                    required
                  />
                </div>

                {existingRole === "artist" && (
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

            {/* Step 2: Basic Info (if role was just selected) */}
            {currentStep === 2 && !existingRole && selectedRole && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Basic Information</h2>
                  <p className="text-gray-400 text-sm">Tell us about yourself</p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                    {selectedRole === "artist" ? "Artist/Band Name" : "Name"}
                  </label>
                  <input
                    type="text"
                    value={artistData.name}
                    onChange={(e) => setArtistData({ ...artistData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                    placeholder={selectedRole === "artist" ? "Your artist name" : "Your name"}
                    required
                  />
                </div>

                {selectedRole === "artist" && (
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

            {/* Step 2: Bio (for artists with existing role) - this is step 2 when role exists */}
            {currentStep === 2 && existingRole === "artist" && (
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

            {/* Step 3: Bio (for artists who just selected role) */}
            {currentStep === 3 && !existingRole && selectedRole === "artist" && (
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

            {/* Step 3: Music Links (for artists with existing role) - this is step 3 when role exists */}
            {currentStep === 3 && existingRole === "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Connect Your Music</h2>
                  <p className="text-gray-400 text-sm">Link your music platforms</p>
                </div>

                <SpotifySearch
                  value={artistData.spotifyUrl}
                  onSelect={(artist: SpotifyArtist) => {
                    setArtistData({
                      ...artistData,
                      spotifyUrl: artist.external_urls.spotify,
                      spotifyArtistId: artist.id,
                    });
                  }}
                />
              </div>
            )}

            {/* Step 4: Music Links (for artists who just selected role) */}
            {currentStep === 4 && !existingRole && selectedRole === "artist" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black mb-2">Connect Your Music</h2>
                  <p className="text-gray-400 text-sm">Link your music platforms</p>
                </div>

                <SpotifySearch
                  value={artistData.spotifyUrl}
                  onSelect={(artist: SpotifyArtist) => {
                    setArtistData({
                      ...artistData,
                      spotifyUrl: artist.external_urls.spotify,
                      spotifyArtistId: artist.id,
                    });
                  }}
                />
              </div>
            )}

            {/* Step 4: Social Links (for artists with existing role) - this is step 4 when role exists */}
            {currentStep === 4 && existingRole === "artist" && (
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

            {/* Step 5: Social Links (for artists who just selected role) */}
            {currentStep === 5 && !existingRole && selectedRole === "artist" && (
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
            {((currentStep === 2 && existingRole && existingRole !== "artist") || 
             (currentStep === 2 && !existingRole && selectedRole === "fan")) && (
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

            {(!existingRole && !selectedRole) ? (
              <Button
                onClick={handleNext}
                disabled={!selectedRole}
                className="ml-auto bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold tracking-wider uppercase flex items-center gap-2"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (role === "artist" || selectedRole === "artist") ? (
              currentStep < maxStep ? (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 2 && (!artistData.name || (selectedRole === "artist" && (!artistData.location || !artistData.genre)))}
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
