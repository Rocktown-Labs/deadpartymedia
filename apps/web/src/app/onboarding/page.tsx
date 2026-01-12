"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { FanOnboarding } from "./fan-onboarding";
import { ArtistOnboarding } from "./artist-onboarding";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [selectedRole, setSelectedRole] = useState<"fan" | "artist" | undefined>(undefined);

  // Get role information
  const existingRole = user?.publicMetadata?.role as string | undefined;

  // Check if user is loaded and authenticated
  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/sign-in");
    }
  }, [isLoaded, user, router]);

  // Check if onboarding is already complete or user has admin role
  useEffect(() => {
    if (isLoaded && user) {
      const onboardingComplete = user.publicMetadata?.onboardingComplete;
      const userRole = user.publicMetadata?.role as string;
      
      // Handle admin roles - redirect them immediately
      if (userRole === "super_admin" || userRole === "writer") {
        router.push("/admin");
        return;
      }
      
      // If onboarding is complete, redirect to appropriate dashboard
      if (onboardingComplete) {
        if (userRole === "artist") {
          router.push("/artist-dashboard");
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
    return <ArtistOnboarding />;
  }

  if (role === "fan") {
    return <FanOnboarding />;
  }

  // If no role exists, show role selection
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole("fan")}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    selectedRole === "fan"
                      ? "border-[#7CFC00] bg-[#7CFC00]/10"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <h3 className="text-lg font-bold mb-1">Fan</h3>
                  <p className="text-sm text-gray-400">
                    Read articles, discover events, save content.
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
                  <h3 className="text-lg font-bold mb-1">Artist</h3>
                  <p className="text-sm text-gray-400">
                    Manage your profile, submit music, promote events.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
