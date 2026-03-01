import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artists, users } from "@/lib/db/schema";
import { parseRole, roleOrDefault } from "@/lib/auth/role";
import { upsertUserAuthState } from "@/lib/auth/user-state";
import type { Roles } from "@/types/globals";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

function parseArtistId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET() {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);

  const primaryEmail =
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    return NextResponse.json({ error: "No email available for current user" }, { status: 400 });
  }

  const metadataRole = parseRole(sessionClaims?.metadata?.role);
  const dbUser = await db
    .select({
      firstName: users.firstName,
      lastName: users.lastName,
      onboardingComplete: users.onboardingComplete,
      role: users.role,
    })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  const role: Roles = metadataRole ?? dbUser?.role ?? "fan";
  const onboardingComplete =
    sessionClaims?.metadata?.onboardingComplete === true || dbUser?.onboardingComplete === true;

  // Keep DB role/onboarding in sync with Clerk/session whenever this endpoint is used.
  try {
    await upsertUserAuthState({
      clerkId: userId,
      email: primaryEmail,
      firstName: clerkUser.firstName,
      imageUrl: clerkUser.imageUrl,
      lastName: clerkUser.lastName,
      onboardingComplete,
      role: roleOrDefault(role, "fan"),
    });
  } catch (error) {
    logger.warn(
      { error: sanitizeError(error), operation: "sync_user_on_profile_read", userId },
      "Failed to sync user auth state during onboarding profile fetch",
    );
  }

  const metadataArtistId = parseArtistId(
    (clerkUser.publicMetadata as Record<string, unknown> | undefined)?.artistId,
  );

  let artistProfile = await db
    .select({
      bio: artists.bio,
      claimedById: artists.claimedById,
      genre: artists.genre,
      id: artists.id,
      image: artists.image,
      instagram: artists.instagram,
      location: artists.location,
      name: artists.name,
      phoneNumber: artists.phoneNumber,
      slug: artists.slug,
      spotifyArtistId: artists.spotifyArtistId,
      spotifyUrl: artists.spotifyUrl,
      tiktok: artists.tiktok,
      twitter: artists.twitter,
      website: artists.website,
    })
    .from(artists)
    .where(eq(artists.claimedById, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!artistProfile && metadataArtistId !== null) {
    artistProfile = await db
      .select({
        bio: artists.bio,
        claimedById: artists.claimedById,
        genre: artists.genre,
        id: artists.id,
        image: artists.image,
        instagram: artists.instagram,
        location: artists.location,
        name: artists.name,
        phoneNumber: artists.phoneNumber,
        slug: artists.slug,
        spotifyArtistId: artists.spotifyArtistId,
        spotifyUrl: artists.spotifyUrl,
        tiktok: artists.tiktok,
        twitter: artists.twitter,
        website: artists.website,
      })
      .from(artists)
      .where(and(eq(artists.id, metadataArtistId), eq(artists.claimed, false)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  return NextResponse.json({
    artist: artistProfile
      ? {
          id: artistProfile.id,
          name: artistProfile.name ?? "",
          bio: artistProfile.bio ?? "",
          location: artistProfile.location ?? "",
          genre: artistProfile.genre ?? "OTHER",
          spotifyUrl: artistProfile.spotifyUrl ?? "",
          spotifyArtistId: artistProfile.spotifyArtistId ?? "",
          instagram: artistProfile.instagram ?? "",
          twitter: artistProfile.twitter ?? "",
          tiktok: artistProfile.tiktok ?? "",
          website: artistProfile.website ?? "",
          image: artistProfile.image ?? "",
          phoneNumber: artistProfile.phoneNumber ?? "",
        }
      : null,
    fan: {
      name: clerkUser.firstName ?? dbUser?.firstName ?? "",
    },
    onboardingComplete,
    role,
  });
}
