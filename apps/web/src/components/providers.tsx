"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, useUser } from "@clerk/nextjs";
import { Toaster } from "./ui/sonner";
import posthog from "posthog-js";
import { useRef } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
    },
  },
});

// Component to handle PostHog identification with Clerk
function PostHogIdentify() {
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

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogIdentify />
        {children}
        <Toaster richColors />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
