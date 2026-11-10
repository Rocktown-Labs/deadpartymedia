import { useMusicSession } from "@/lib/auth-client";
import { musicApi } from "@/lib/music-client";
import { readResponse } from "@dpmedia/api-client";

import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { parseRole } from "@/lib/auth/role";

export default function ArtistDashboardLayout({ children }: { children: React.ReactNode }) {
  const { session: user, isPending: sessionPending } = useMusicSession();
  const isLoaded = !sessionPending;
  const isSignedIn = !!user;
  const router = useRouter();
  const navigate = useNavigate();

  const role = parseRole(user?.roles[0]);
  const isAuthorized =
    user?.roles.some((value) => value === "artist" || value === "super_admin") ?? false;

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !isAuthorized)) {
      navigate({ to: "/sign-in" });
    }
  }, [isLoaded, isSignedIn, isAuthorized, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || role !== "artist") {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/artists/me", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            navigate({ to: "/onboarding" });
          }
          return;
        }

        const artist = await readResponse(await musicApi.artists.me.$get({ query: {} }));
        const hasSpotify = Boolean(artist?.spotify_artist_id) && Boolean(artist?.spotify_url);
        const hasInstagram = Boolean(artist?.instagram);

        if (!hasSpotify || !hasInstagram) {
          if (!cancelled) {
            navigate({ to: "/onboarding" });
          }
        }
      } catch {
        if (!cancelled) {
          navigate({ to: "/onboarding" });
        }
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

  if (!isSignedIn || !user || !isAuthorized) {
    return null;
  }

  return (
    <>
      {role === "super_admin" && (
        <div className="bg-[#7CFC00]/15 border-b border-[#7CFC00]/30 px-6 py-2.5 flex items-center justify-between text-xs text-white">
          <span className="font-bold text-[#7CFC00] flex items-center gap-2">
            <span>👁️</span> Super Admin Preview: Viewing Music Artist Dashboard
          </span>
          <Link to="/admin" className="text-white hover:underline font-mono">
            Return to Admin Desk →
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
