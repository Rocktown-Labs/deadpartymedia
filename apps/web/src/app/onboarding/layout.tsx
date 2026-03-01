import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { roleOrDefault } from "@/lib/auth/role";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { sessionClaims, userId } = await auth();

  // If onboarding is already complete, redirect to appropriate dashboard.
  // Exception: artists missing required profile fields (Spotify + Instagram) must complete onboarding.
  if (sessionClaims?.metadata?.onboardingComplete === true) {
    const role = roleOrDefault(sessionClaims.metadata.role, "fan");

    if (role === "artist" && userId) {
      const [artist] = await db
        .select({
          instagram: artists.instagram,
          spotifyArtistId: artists.spotifyArtistId,
          spotifyUrl: artists.spotifyUrl,
        })
        .from(artists)
        .where(eq(artists.claimedById, userId))
        .limit(1);

      const hasSpotify =
        Boolean(artist?.spotifyArtistId?.trim()) && Boolean(artist?.spotifyUrl?.trim());
      const hasInstagram = Boolean(artist?.instagram?.trim());

      if (!hasSpotify || !hasInstagram) {
        return <>{children}</>;
      }

      redirect("/artist-dashboard");
    }

    if (role === "super_admin" || role === "writer") {
      redirect("/admin");
    } else if (role === "artist") {
      redirect("/artist-dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  return <>{children}</>;
}
