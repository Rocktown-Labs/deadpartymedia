"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ArtistDashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const role = user?.publicMetadata?.role as string | undefined;

  useEffect(() => {
    if (isLoaded && (!isSignedIn || role !== "artist")) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, role, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || role !== "artist") return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/artists/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) router.push("/onboarding");
          return;
        }

        const artist = await response.json();
        const hasSpotify = Boolean(artist?.spotify_artist_id) && Boolean(artist?.spotify_url);
        const hasInstagram = Boolean(artist?.instagram);

        if (!hasSpotify || !hasInstagram) {
          if (!cancelled) router.push("/onboarding");
        }
      } catch {
        if (!cancelled) router.push("/onboarding");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, role, router]);

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

  if (!isSignedIn || !user || role !== "artist") {
    return null;
  }

  return <>{children}</>;
}
