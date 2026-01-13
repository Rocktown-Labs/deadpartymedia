"use client";

import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useRef } from "react";

/**
 * Hook to identify users with PostHog when they sign in via Clerk.
 * Call this in components where you need to ensure the user is identified.
 */
export function usePostHogIdentify() {
  const { user, isSignedIn } = useUser();
  const identifiedRef = useRef<string | null>(null);

  // Only identify if user is signed in and we haven't already identified this user
  if (isSignedIn && user && identifiedRef.current !== user.id) {
    posthog.identify(user.id, {
      email: user.primaryEmailAddress?.emailAddress,
      name: user.fullName || user.firstName || undefined,
      username: user.username || undefined,
      role: user.publicMetadata?.role || "fan",
    });
    identifiedRef.current = user.id;
  }
}

/**
 * Call this function to reset PostHog identification on logout.
 */
export function resetPostHogIdentification() {
  posthog.reset();
}
