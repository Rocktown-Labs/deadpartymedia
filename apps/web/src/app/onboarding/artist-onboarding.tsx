"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { MapPin, Instagram, Twitter } from "lucide-react";
import {
  initialFormState,
  mergeForm,
  useForm,
  useStore,
  useTransform,
} from "@tanstack/react-form-nextjs";
import { artistOnboardingAction } from "./actions";
import { artistFormOptions } from "./form-options";
import { SpotifySearch } from "@/components/spotify-search";
import type { SpotifyArtist } from "@/lib/api/artists";
import { toast } from "sonner";

type OnboardingStep = 1 | 2 | 3 | 4;

export function ArtistOnboarding() {
  const router = useRouter();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtist | null>(null);
  const [state, action] = useActionState(artistOnboardingAction, initialFormState);

  const form = useForm({
    ...artistFormOptions,
    transform: useTransform((baseForm) => mergeForm(baseForm, state!), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);

  const genres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"];

  // Handle successful submission
  useEffect(() => {
    const success = (state as any)?.success;
    if (success && user) {
      toast.success("Onboarding completed successfully!");
      user.reload().then(() => {
        router.push("/artist-dashboard");
      });
    }
  }, [state, user, router]);

  // Update form when Spotify artist is selected
  useEffect(() => {
    if (selectedSpotifyArtist) {
      form.setFieldValue("spotifyUrl", selectedSpotifyArtist.external_urls.spotify);
      form.setFieldValue("spotifyArtistId", selectedSpotifyArtist.id);
    }
  }, [selectedSpotifyArtist, form]);

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

  const progressPercentage = (currentStep / 4) * 100;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-6 pt-40 pb-20">
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
            <h1 className="text-4xl font-black mb-2">Complete Your Artist Profile</h1>
            <p className="text-gray-400">Let's get your profile ready</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-12">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Step {currentStep} of 4</span>
              <span className="text-[#7CFC00] font-bold">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7CFC00] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Form */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8 mb-8">
            <form action={action as never} onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}>
              {/* Form Errors */}
              {formErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-400">
                    {formErrors.map((error, index) => (
                      <li key={index}>{String(error ?? "Unknown error")}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Basic Information</h2>
                    <p className="text-gray-400 text-sm">Tell us about yourself</p>
                  </div>

                  <form.Field
                    name="name"
                    validators={{
                      onChange: ({ value }) =>
                        !value || value.trim() === "" ? "Artist name is required" : undefined,
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Artist/Band Name
                        </label>
                        <input
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="Your artist name"
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="mt-2 text-sm text-red-400">
                            {field.state.meta.errors[0] as string}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="location"
                    validators={{
                      onChange: ({ value }) =>
                        !value || value.trim() === "" ? "Location is required" : undefined,
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            name={field.name}
                            type="text"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                            placeholder="Little Rock, AR"
                          />
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="mt-2 text-sm text-red-400">
                            {field.state.meta.errors[0] as string}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field
                    name="genre"
                    validators={{
                      onChange: ({ value }) => (!value ? "Please select a valid genre" : undefined),
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Primary Genre
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {genres.map((genre) => (
                            <button
                              key={genre}
                              type="button"
                              onClick={() => field.handleChange(genre as any)}
                              className={`p-3 rounded-lg border-2 transition-all text-sm font-bold ${
                                field.state.value === genre
                                  ? "border-[#7CFC00] bg-[#7CFC00]/10"
                                  : "border-gray-800 hover:border-gray-700"
                              }`}
                            >
                              {genre.replace(" & ", " & ")}
                            </button>
                          ))}
                        </div>
                        {field.state.meta.errors.length > 0 && (
                          <p className="mt-2 text-sm text-red-400">
                            {field.state.meta.errors[0] as string}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>
                </div>
              )}

              {/* Step 2: Bio */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Your Story</h2>
                    <p className="text-gray-400 text-sm">Tell fans about your music journey</p>
                  </div>

                  <form.Field
                    name="bio"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value || value.trim() === "") {
                          return "Bio is required";
                        }
                        if (value.length < 10) {
                          return "Bio must be at least 10 characters";
                        }
                        if (value.length > 500) {
                          return "Bio must be less than 500 characters";
                        }
                        return undefined;
                      },
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Artist Bio
                        </label>
                        <textarea
                          name={field.name}
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          rows={8}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00] resize-none"
                          placeholder="Share your musical journey, influences, and what makes your sound unique..."
                        />
                        {field.state.meta.errors.length > 0 && (
                          <p className="mt-2 text-sm text-red-400">
                            {field.state.meta.errors[0] as string}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="image">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Profile Image URL
                        </label>
                        <input
                          name={field.name}
                          type="url"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )}

              {/* Step 3: Spotify Search */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Connect Your Music</h2>
                    <p className="text-gray-400 text-sm">Link your music platforms</p>
                  </div>

                  <SpotifySearch
                    value={form.getFieldValue("spotifyUrl")}
                    onSelect={(artist: SpotifyArtist) => {
                      setSelectedSpotifyArtist(artist);
                    }}
                  />
                </div>
              )}

              {/* Step 4: Social Links */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Social Media</h2>
                    <p className="text-gray-400 text-sm">Connect with your fans</p>
                  </div>

                  <form.Field name="instagram">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Instagram
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            name={field.name}
                            type="url"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                            placeholder="https://instagram.com/yourhandle"
                          />
                        </div>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="twitter">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Twitter/X
                        </label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            name={field.name}
                            type="url"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                            placeholder="https://twitter.com/yourhandle"
                          />
                        </div>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="tiktok">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          TikTok
                        </label>
                        <input
                          name={field.name}
                          type="url"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="https://tiktok.com/@yourhandle"
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="website">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Website
                        </label>
                        <input
                          name={field.name}
                          type="url"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          onBlur={field.handleBlur}
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="https://yourwebsite.com"
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between gap-4 mt-8">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="px-6 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Back
                </button>

                {currentStep < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-3 bg-[#7CFC00] text-black font-bold rounded-lg hover:bg-[#6EE600] transition-colors"
                  >
                    Next
                  </button>
                ) : (
                  <form.Subscribe
                    selector={(formState) => [formState.canSubmit, formState.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <button
                        type="submit"
                        disabled={!canSubmit || isSubmitting}
                        className="px-6 py-3 bg-[#7CFC00] text-black font-bold rounded-lg hover:bg-[#6EE600] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? "Completing..." : "Complete"}
                      </button>
                    )}
                  </form.Subscribe>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
