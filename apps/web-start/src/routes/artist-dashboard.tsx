import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api.server";
import { getSession } from "../lib/auth.functions";

interface MyArtist {
  id: number;
  instagram: string | null;
  name: string;
  slug: string;
  spotify_artist_id: string | null;
  spotify_url: string | null;
}

/**
 * Ported from apps/web/src/app/artist-dashboard/layout.tsx: the Next layout
 * gates client-side (useUser role check + /api/artists/me completeness
 * probe); here both checks run in beforeLoad — artist/super_admin roles, and
 * the onboarding-completeness redirect to /onboarding when the claimed
 * profile lacks Spotify/Instagram.
 */
export const Route = createFileRoute("/artist-dashboard")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session.userId) {
      throw redirect({ to: "/sign-in" });
    }
    const authorized = session.roles.includes("artist") || session.roles.includes("super_admin");
    if (!authorized) {
      throw redirect({ to: "/dashboard" });
    }

    if (session.roles.includes("artist")) {
      const artist = await apiFetchWithAuth<MyArtist>("/music/artists/me").catch(() => null);
      const complete =
        artist !== null &&
        Boolean(artist.spotify_artist_id) &&
        Boolean(artist.spotify_url) &&
        Boolean(artist.instagram);
      if (!complete) {
        throw redirect({ to: "/onboarding" });
      }
      return { artist, session };
    }

    return { artist: null, session };
  },
  component: ArtistDashboardLayout,
});

function ArtistDashboardLayout() {
  const { session } = Route.useRouteContext();

  return (
    <>
      {session.roles.includes("super_admin") ? (
        <div className="flex items-center justify-between border-b border-[#7CFC00]/30 bg-[#7CFC00]/15 px-6 py-2.5 text-xs text-white">
          <span className="flex items-center gap-2 font-bold text-[#7CFC00]">
            <span>👁️</span> Super Admin Preview: Viewing Music Artist Dashboard
          </span>
        </div>
      ) : null}
      <Outlet />
    </>
  );
}
