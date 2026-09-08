"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { FanOnboarding } from "./fan-onboarding";
import { ArtistOnboarding } from "./artist-onboarding";
import { VenueOnboarding } from "./venue-onboarding";
import posthog from "posthog-js";
import type { Route } from "next";
import { parseRole } from "@/lib/auth/role";

interface OnboardingProfilePayload {
  role: "artist" | "fan" | "venue" | "super_admin" | "writer";
  onboardingComplete: boolean;
  fan: {
    name: string;
  };
  venue?: {
    name: string;
    city: string;
    address?: string;
    phone?: string;
    website?: string;
    capacity?: string;
    description?: string;
  } | null;
  artist: {
    name: string;
    location: string;
    genre: "COUNTRY" | "EDM" | "HARDCORE & ROCK" | "HIP-HOP & R&B" | "OTHER";
    bio: string;
    spotifyUrl: string;
    spotifyArtistId: string;
    instagram: string;
    twitter: string;
    tiktok: string;
    website: string;
    image: string;
    phoneNumber: string;
  } | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const [selectedRole, setSelectedRole] = useState<"fan" | "artist" | "venue" | undefined>();
  const [profileData, setProfileData] = useState<OnboardingProfilePayload | null>(null);

  // Get role information
  const existingRole = parseRole(user?.publicMetadata?.role);
  const roleFromUrlRaw = searchParams.get("role");
  const roleFromUrl =
    roleFromUrlRaw === "fan" || roleFromUrlRaw === "artist" || roleFromUrlRaw === "venue"
      ? roleFromUrlRaw
      : null;

  // Check if user is loaded and authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in" as Route);
    }
  }, [isLoaded, user, router]);

  // Auto-select role from URL params if user has no existing role
  useEffect(() => {
    if (
      isLoaded &&
      user &&
      !existingRole &&
      roleFromUrl &&
      (roleFromUrl === "fan" || roleFromUrl === "artist" || roleFromUrl === "venue")
    ) {
      setSelectedRole(roleFromUrl);
      // Track onboarding role selection from URL
      posthog.capture("onboarding_role_selected", {
        role: roleFromUrl,
        source: "url_param",
        user_id: user?.id,
      });
    }
  }, [isLoaded, user, existingRole, roleFromUrl]);

  // Check if onboarding is already complete or user has admin role
  useEffect(() => {
    if (isLoaded && user) {
      const onboardingComplete = user.publicMetadata?.onboardingComplete;
      const userRole = parseRole(user.publicMetadata?.role);

      // Handle admin roles - redirect them immediately
      if (userRole === "super_admin" || userRole === "writer") {
        router.push("/admin");
        return;
      }

      // If onboarding is complete, redirect to appropriate dashboard or redirect_url
      if (onboardingComplete) {
        const rawRedirect = searchParams.get("redirect_url") || searchParams.get("redirect");
        const destination =
          rawRedirect &&
          !rawRedirect.startsWith("/onboarding") &&
          !rawRedirect.startsWith("/sign-in") &&
          !rawRedirect.startsWith("/sign-up")
            ? rawRedirect
            : userRole === "artist"
              ? "/artist-dashboard"
              : userRole === "venue"
                ? "/venues"
                : "/dashboard";
        router.push(destination as Route);
      }
    }
  }, [isLoaded, user, router, searchParams]);

  useEffect(() => {
    if (!isLoaded || !user) {
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/onboarding/profile", {
          cache: "no-store",
          headers: { Accept: "application/json" },
          method: "GET",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as OnboardingProfilePayload;
        if (cancelled) {
          return;
        }
        setProfileData(payload);
      } catch {
        // Prefill is best-effort; onboarding should still work without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, user]);

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

  // Handle admin roles - they should not be able to change their role
  // The useEffect above will redirect them, but show loading state while redirecting
  if (existingRole === "super_admin" || existingRole === "writer") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7CFC00] mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  // Determine which role to use
  const role = selectedRole || existingRole;

  // If role is already determined (from metadata or selection), show appropriate component
  if (role === "artist") {
    return <ArtistOnboarding initialValues={profileData?.artist ?? undefined} />;
  }

  if (role === "venue") {
    return <VenueOnboarding initialValues={profileData?.venue ?? undefined} />;
  }

  if (role === "fan") {
    return <FanOnboarding initialName={profileData?.fan?.name} />;
  }

  // If no role exists, show role selection
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="container mx-auto px-6 pt-40 pb-20">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Image
              src="/images/dead-party-logo.png"
              alt="Dead Party Media"
              width={80}
              height={80}
              className="mx-auto mb-6"
            />
            <h1 className="text-4xl font-black mb-2">Welcome to Dead Party Media</h1>
            <p className="text-gray-400">Choose how you want to participate</p>
          </div>

          {/* Role Selection */}
          <div className="bg-[#111111] border border-gray-800 rounded-lg p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-black mb-2">Choose Your Role</h2>
                <p className="text-gray-400 text-sm">
                  How do you want to participate in Dead Party Media?
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("fan");
                    // Track onboarding role selection
                    posthog.capture("onboarding_role_selected", {
                      role: "fan",
                      user_id: user?.id,
                    });
                  }}
                  className={`p-5 rounded-lg border-2 transition-all text-left flex flex-col justify-between ${
                    selectedRole === "fan"
                      ? "border-[#7CFC00] bg-[#7CFC00]/10"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold mb-1">Fan</h3>
                    <p className="text-xs text-gray-400">
                      Read articles, discover events, save content.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("artist");
                    // Track onboarding role selection
                    posthog.capture("onboarding_role_selected", {
                      role: "artist",
                      user_id: user?.id,
                    });
                  }}
                  className={`p-5 rounded-lg border-2 transition-all text-left flex flex-col justify-between ${
                    selectedRole === "artist"
                      ? "border-[#7CFC00] bg-[#7CFC00]/10"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold mb-1">Artist</h3>
                    <p className="text-xs text-gray-400">
                      Manage your profile, submit music, promote events.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("venue");
                    // Track onboarding role selection
                    posthog.capture("onboarding_role_selected", {
                      role: "venue",
                      user_id: user?.id,
                    });
                  }}
                  className={`p-5 rounded-lg border-2 transition-all text-left flex flex-col justify-between ${
                    selectedRole === "venue"
                      ? "border-[#7CFC00] bg-[#7CFC00]/10"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div>
                    <h3 className="text-lg font-bold mb-1">Venue</h3>
                    <p className="text-xs text-gray-400">
                      Manage venue page, post upcoming shows, connect with bands.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
