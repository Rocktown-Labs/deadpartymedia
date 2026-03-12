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
import { artistOnboardingSchema, fanOnboardingSchema } from "@/lib/validations/onboarding";
import { ensureUniqueSlug, generateSlug } from "@/lib/utils/slug";
import { getPrimaryEmail } from "@/lib/auth/clerk";

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
      {
        error: sanitizeError(error),
        operation: "sync_user_on_profile_read",
        userId,
      },
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
          bio: artistProfile.bio ?? "",
          genre: artistProfile.genre ?? "OTHER",
          id: artistProfile.id,
          image: artistProfile.image ?? "",
          instagram: artistProfile.instagram ?? "",
          location: artistProfile.location ?? "",
          name: artistProfile.name ?? "",
          phoneNumber: artistProfile.phoneNumber ?? "",
          spotifyArtistId: artistProfile.spotifyArtistId ?? "",
          spotifyUrl: artistProfile.spotifyUrl ?? "",
          tiktok: artistProfile.tiktok ?? "",
          twitter: artistProfile.twitter ?? "",
          website: artistProfile.website ?? "",
        }
      : null,
    fan: {
      name: clerkUser.firstName ?? dbUser?.firstName ?? "",
    },
    onboardingComplete,
    role,
  });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const role = typeof body === "object" && body !== null ? (body as { role?: unknown }).role : null;
  if (role !== "fan" && role !== "artist") {
    return NextResponse.json({ error: "Role must be 'fan' or 'artist'" }, { status: 400 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const primaryEmail = getPrimaryEmail(user);
  if (!primaryEmail) {
    return NextResponse.json({ error: "Unable to determine current user email" }, { status: 400 });
  }

  if (role === "fan") {
    const parsed = fanOnboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    await client.users.updateUser(userId, {
      firstName: parsed.data.name,
    });
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingComplete: true,
        role: "fan",
      },
    });

    await upsertUserAuthState({
      clerkId: userId,
      email: primaryEmail,
      firstName: parsed.data.name,
      imageUrl: user.imageUrl,
      lastName: user.lastName,
      onboardingComplete: true,
      role: "fan",
    });

    return NextResponse.json({
      onboardingComplete: true,
      role: "fan",
      success: true,
    });
  }

  const parsed = artistOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const metadataArtistId = parseArtistId(
    (user.publicMetadata as Record<string, unknown> | undefined)?.artistId,
  );
  let claimedArtistId: number | null = null;
  let artistSlug = "";

  const existingClaimedArtist = await db
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.claimedById, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existingClaimedArtist) {
    claimedArtistId = existingClaimedArtist.id;
  } else if (metadataArtistId !== null) {
    claimedArtistId = metadataArtistId;
  }

  if (claimedArtistId) {
    artistSlug = await ensureUniqueSlug(generateSlug(parsed.data.name), claimedArtistId, "artists");
    await db
      .update(artists)
      .set({
        bio: parsed.data.bio,
        claimed: true,
        claimedById: userId,
        genre: parsed.data.genre,
        image: parsed.data.image || null,
        instagram: parsed.data.instagram,
        location: parsed.data.location,
        name: parsed.data.name,
        phoneNumber: parsed.data.phoneNumber || null,
        slug: artistSlug,
        spotifyArtistId: parsed.data.spotifyArtistId,
        spotifyUrl: parsed.data.spotifyUrl,
        tiktok: parsed.data.tiktok || null,
        twitter: parsed.data.twitter || null,
        updatedAt: new Date(),
        website: parsed.data.website || null,
      })
      .where(eq(artists.id, claimedArtistId));
  } else {
    artistSlug = await ensureUniqueSlug(generateSlug(parsed.data.name), undefined, "artists");
    const [createdArtist] = await db
      .insert(artists)
      .values({
        bio: parsed.data.bio,
        claimed: true,
        claimedById: userId,
        genre: parsed.data.genre,
        image: parsed.data.image || null,
        instagram: parsed.data.instagram,
        location: parsed.data.location,
        name: parsed.data.name,
        phoneNumber: parsed.data.phoneNumber || null,
        slug: artistSlug,
        spotifyArtistId: parsed.data.spotifyArtistId,
        spotifyUrl: parsed.data.spotifyUrl,
        tiktok: parsed.data.tiktok || null,
        twitter: parsed.data.twitter || null,
        website: parsed.data.website || null,
      })
      .returning({ id: artists.id });

    claimedArtistId = createdArtist?.id ?? null;
  }

  try {
    await client.users.updateUser(userId, {
      firstName: parsed.data.name,
      username: artistSlug,
    });
  } catch (error) {
    logger.warn(
      {
        error: sanitizeError(error),
        operation: "artist_onboarding_update_user",
        userId,
      },
      "Unable to update Clerk user profile during mobile artist onboarding",
    );
  }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...user.publicMetadata,
      artistId: claimedArtistId ? String(claimedArtistId) : user.publicMetadata?.artistId,
      onboardingComplete: true,
      role: "artist",
    },
  });

  await upsertUserAuthState({
    clerkId: userId,
    email: primaryEmail,
    firstName: parsed.data.name,
    imageUrl: user.imageUrl,
    lastName: user.lastName,
    onboardingComplete: true,
    role: "artist",
  });

  return NextResponse.json({
    artistId: claimedArtistId,
    onboardingComplete: true,
    role: "artist",
    success: true,
  });
}
