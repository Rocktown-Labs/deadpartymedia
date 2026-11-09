import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { artists, users } from "@dpmedia/db/schema";
import { clerkClient, requireAuth } from "../../auth";
import { getDb } from "../../db";
import { getPrimaryEmail } from "../../lib/clerk-user";
import { parseRole, roleOrDefault } from "../../lib/role";
import type { Roles } from "../../lib/role";
import { upsertUserAuthState } from "../../lib/user-state";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/auth/me/route.ts and
 * apps/web/src/app/api/onboarding/profile/route.ts.
 * Response shapes are identical to the Next.js routes so the web app's
 * react-query hooks keep working.
 */
export const musicAccountRoutes = new Hono<AppEnv>();

musicAccountRoutes.get("/auth/me", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const db = getDb(c.env);
  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);

  const metadata = auth.claims.metadata as { role?: unknown } | undefined;
  const role = parseRole(metadata?.role) ?? dbUser?.role ?? "fan";
  const clerk = clerkClient(c.env);
  const clerkUser = await clerk.users.getUser(userId);
  const email = getPrimaryEmail(clerkUser);

  return c.json({
    avatar: clerkUser.imageUrl ?? null,
    email: email ?? "",
    id: userId,
    name: clerkUser.fullName || clerkUser.firstName || email || "User",
    role,
  });
});

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

const artistProfileColumns = {
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
};

musicAccountRoutes.get("/onboarding/profile", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const clerk = clerkClient(c.env);
  const clerkUser = await clerk.users.getUser(userId);

  const primaryEmail =
    clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    return c.json({ error: "No email available for current user" }, 400);
  }

  const db = getDb(c.env);
  const metadata = auth.claims.metadata as
    | { onboardingComplete?: unknown; role?: unknown }
    | undefined;
  const metadataRole = parseRole(metadata?.role);
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
    metadata?.onboardingComplete === true || dbUser?.onboardingComplete === true;

  // Keep DB role/onboarding in sync with Clerk/session whenever this endpoint is used.
  try {
    await upsertUserAuthState(db, {
      clerkId: userId,
      email: primaryEmail,
      firstName: clerkUser.firstName,
      imageUrl: clerkUser.imageUrl,
      lastName: clerkUser.lastName,
      onboardingComplete,
      role: roleOrDefault(role, "fan"),
    });
  } catch (error) {
    console.error("Failed to sync user auth state during onboarding profile fetch", {
      error,
      operation: "sync_user_on_profile_read",
      userId,
    });
  }

  const metadataArtistId = parseArtistId(clerkUser.publicMetadata.artistId);

  let artistProfile = await db
    .select(artistProfileColumns)
    .from(artists)
    .where(eq(artists.claimedById, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!artistProfile && metadataArtistId !== null) {
    artistProfile = await db
      .select(artistProfileColumns)
      .from(artists)
      .where(and(eq(artists.id, metadataArtistId), eq(artists.claimed, false)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
  }

  return c.json({
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
});
