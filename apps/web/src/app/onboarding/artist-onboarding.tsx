"use client";

import { useState, useActionState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { MapPin, Instagram, Twitter, Phone, Upload, X } from "lucide-react";
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
import { validateImageFile } from "@/lib/upload";
import { normalizeInstagramInput } from "./validation";
import type { ArtistFormData } from "./form-options";

type OnboardingStep = 1 | 2 | 3;
interface ArtistOnboardingProps {
  initialValues?: Partial<ArtistFormData> | null;
}

function hasSuccessfulSubmission(state: unknown): state is { success: true } {
  if (typeof state !== "object" || state === null) {
    return false;
  }
  const { success } = state as { success?: unknown };
  return success === true;
}

export function ArtistOnboarding({ initialValues }: ArtistOnboardingProps) {
  const router = useRouter();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [selectedSpotifyArtist, setSelectedSpotifyArtist] = useState<SpotifyArtist | null>(null);
  const [state, action] = useActionState(artistOnboardingAction, initialFormState);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [useSpotifyProfileImage, setUseSpotifyProfileImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const hasAppliedPrefill = useRef(false);

  const form = useForm({
    ...artistFormOptions,
    transform: useTransform((baseForm) => mergeForm(baseForm, state ?? initialFormState), [state]),
  });

  const formErrors = useStore(form.store, (formState) => formState.errors);

  const genres: ArtistFormData["genre"][] = [
    "COUNTRY",
    "EDM",
    "HARDCORE & ROCK",
    "HIP-HOP & R&B",
    "OTHER",
  ];

  useEffect(() => {
    if (!initialValues || hasAppliedPrefill.current) {
      return;
    }

    const fields: (keyof ArtistFormData)[] = [
      "name",
      "location",
      "genre",
      "bio",
      "spotifyUrl",
      "spotifyArtistId",
      "instagram",
      "twitter",
      "tiktok",
      "website",
      "image",
      "phoneNumber",
    ];

    for (const field of fields) {
      const value = initialValues[field];
      if (typeof value === "string" && value.trim().length > 0) {
        form.setFieldValue(field, value as never);
      }
    }

    hasAppliedPrefill.current = true;
  }, [form, initialValues]);

  // Handle successful submission

  useEffect(() => {
    if (hasSuccessfulSubmission(state) && user) {
      toast.success("Onboarding completed successfully!");
      user.reload().then(() => {
        router.push("/artist-dashboard");
      });
    }
  }, [state, user, router]);

  const handleProfileImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid image file");
      return;
    }

    setProfileImageUploading(true);

    try {
      const loadingId = toast.loading("Uploading profile image...");

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image?type=profile", {
        body: formData,
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(error.error || "Failed to upload image");
      }

      const { url } = await response.json();
      form.setFieldValue("image", url);
      setUseSpotifyProfileImage(false);
      toast.dismiss(loadingId);
      toast.success("Profile image uploaded successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload profile image");
    } finally {
      setProfileImageUploading(false);
    }
  };

  const handleNext = async () => {
    if (currentStep >= 3) {
      return;
    }

    // Validate required fields for current step before proceeding

    const formState = form.state;
    const { values } = formState;

    if (currentStep === 1) {
      // Step 1: name, location, and genre are required

      // Trigger validation for each required field to show errors in UI

      await form.validateField("spotifyArtistId", "change");
      await form.validateField("name", "change");
      await form.validateField("location", "change");
      await form.validateField("genre", "change");

      // Check if required fields are filled

      if (!values.spotifyArtistId || String(values.spotifyArtistId).trim() === "") {
        // Don't proceed if Spotify artist isn't selected
        return;
      }
      if (!values.name || values.name.trim() === "") {
        // Don't proceed if name is empty
        return;
      }
      if (!values.location || values.location.trim() === "") {
        // Don't proceed if location is empty
        return;
      }
      if (!values.genre) {
        // Don't proceed if genre is not selected
        return;
      }
    } else if (currentStep === 2) {
      // Step 2: bio is required (min 10 characters)

      await form.validateField("bio", "change");

      if (
        !values.bio ||
        values.bio.trim() === "" ||
        values.bio.trim().length < 10 ||
        values.bio.length > 500
      ) {
        // Don't proceed if bio is invalid
        return;
      }
    }
    // Step 3 is the final step; required fields are validated on submit

    // All validations passed, proceed to next step

    setCurrentStep((currentStep + 1) as OnboardingStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const progressPercentage = (currentStep / 3) * 100;

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
              <span className="text-gray-400">Step {currentStep} of 3</span>
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
            <form
              action={action as never}
              onSubmit={(e) => {
                e.preventDefault();

                // Get current form state

                const formState = form.state;

                // Create FormData from form values

                const formData = new FormData();
                const { values } = formState;

                // Add all form fields to FormData

                Object.entries(values).forEach(([key, value]) => {
                  if (value !== undefined && value !== null && value !== "") {
                    formData.append(key, String(value));
                  }
                });

                // `action` is called imperatively (not via native `<form action={...}>` submit),

                // so wrap in a transition to keep React state updates consistent.

                startTransition(() => action(formData));
              }}
            >
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
                    name="spotifyArtistId"
                    validators={{
                      onChange: ({ value }) =>
                        !value || String(value).trim() === ""
                          ? "Spotify artist is required"
                          : undefined,
                    }}
                  >
                    {(spotifyArtistIdField) => (
                      <div>
                        <SpotifySearch
                          value={form.getFieldValue("spotifyUrl")}
                          onSelect={(artist: SpotifyArtist) => {
                            setSelectedSpotifyArtist(artist);
                            spotifyArtistIdField.handleChange(artist.id);
                            form.setFieldValue("spotifyUrl", artist.external_urls.spotify);

                            // Artist/Band Name is tied to streaming identity; lock to Spotify.

                            form.setFieldValue("name", artist.name);
                          }}
                        />
                        {spotifyArtistIdField.state.meta.errors.length > 0 && (
                          <p className="mt-2 text-sm text-red-400">
                            {spotifyArtistIdField.state.meta.errors[0] as string}
                          </p>
                        )}
                      </div>
                    )}
                  </form.Field>

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
                          Artist/Band Name (from Spotify)
                        </label>
                        <input
                          name={field.name}
                          type="text"
                          value={field.state.value}
                          readOnly
                          aria-readonly="true"
                          className="w-full px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                          placeholder="Select your Spotify artist above"
                        />
                        <p className="mt-2 text-xs text-gray-500">
                          This is locked to match your Spotify artist profile.
                        </p>
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
                              onClick={() => field.handleChange(genre)}
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

                  <form.Field name="phoneNumber">
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Phone Number (Optional)
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            name={field.name}
                            type="tel"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                            placeholder="+1 555 123 4567"
                          />
                        </div>
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
                        return;
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
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-bold uppercase tracking-wider">
                            Profile Image
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !useSpotifyProfileImage;
                              setUseSpotifyProfileImage(next);
                              if (next) {
                                const spotifyImage = selectedSpotifyArtist?.images?.[0]?.url;
                                if (!spotifyImage) {
                                  toast.error(
                                    "No Spotify profile image found for this artist. Please upload an image instead.",
                                  );
                                  setUseSpotifyProfileImage(false);
                                  return;
                                }
                                field.handleChange(spotifyImage);
                              }
                            }}
                            className="text-xs text-[#7CFC00] hover:text-[#6EE600] transition-colors"
                          >
                            {useSpotifyProfileImage ? "Upload Image" : "Use Spotify Image"}
                          </button>
                        </div>

                        {useSpotifyProfileImage ? (
                          field.state.value ? (
                            <div className="space-y-2">
                              <div className="relative w-32 h-32 border border-gray-800 rounded-lg overflow-hidden bg-[#0A0A0A]">
                                <img
                                  src={field.state.value}
                                  alt="Spotify profile preview"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <p className="text-xs text-gray-500">
                                Using your Spotify profile image
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400">
                              Select your Spotify artist in Step 1 to use this option.
                            </p>
                          )
                        ) : (
                          <div className="space-y-2">
                            <input
                              ref={profileImageInputRef}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleProfileImageUpload(file);
                                }
                              }}
                              className="hidden"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => profileImageInputRef.current?.click()}
                                disabled={profileImageUploading}
                                className="px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white hover:border-[#7CFC00] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                {profileImageUploading ? "Uploading..." : "Upload Image"}
                              </button>
                              {field.state.value && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    field.handleChange("");
                                    if (profileImageInputRef.current) {
                                      profileImageInputRef.current.value = "";
                                    }
                                  }}
                                  className="px-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white hover:border-red-500 transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            {field.state.value && (
                              <div className="relative w-32 h-32 border border-gray-800 rounded-lg overflow-hidden bg-[#0A0A0A]">
                                <Image
                                  src={field.state.value}
                                  alt="Profile preview"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </form.Field>
                </div>
              )}

              {/* Step 3: Social Links */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">Social Media</h2>
                    <p className="text-gray-400 text-sm">Connect with your fans</p>
                  </div>

                  <form.Field
                    name="instagram"
                    validators={{
                      onChange: ({ value }) => {
                        const normalized = normalizeInstagramInput(String(value ?? ""));
                        if (!normalized) {
                          return "Instagram username is required";
                        }
                        return;
                      },
                    }}
                  >
                    {(field) => (
                      <div>
                        <label className="block text-sm font-bold mb-2 uppercase tracking-wider">
                          Instagram Username (Required)
                        </label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            name={field.name}
                            type="text"
                            value={String(field.state.value ?? "")}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={(e) => {
                              field.handleChange(normalizeInstagramInput(e.target.value));
                              field.handleBlur();
                            }}
                            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0A] border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#7CFC00]"
                            placeholder="yourhandle (no @)"
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

                  {/* Optional socials nudge */}
                  {(() => {
                    const values = form.state.values as Record<string, unknown>;
                    const hasOptionalSocial =
                      Boolean(String(values.twitter ?? "").trim()) ||
                      Boolean(String(values.tiktok ?? "").trim()) ||
                      Boolean(String(values.website ?? "").trim());
                    if (hasOptionalSocial) {
                      return null;
                    }
                    return (
                      <div className="p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg">
                        <p className="text-sm text-gray-300 font-bold">
                          Finish setting up your account
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Add other social links so fans can follow you everywhere.
                        </p>
                      </div>
                    );
                  })()}

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
                            value={String(field.state.value ?? "")}
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
                          value={String(field.state.value ?? "")}
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
                          value={String(field.state.value ?? "")}
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

                {currentStep < 3 ? (
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
