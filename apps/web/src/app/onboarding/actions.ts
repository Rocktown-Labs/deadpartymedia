"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import {
  ServerValidateError,
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { db } from "@/lib/db";
import { artists, venues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import {
  fanOnboardingSchema,
  artistOnboardingSchema,
  venueOnboardingSchema,
} from "@/lib/validations/onboarding";
import { fanFormOptions, artistFormOptions, venueFormOptions } from "./form-options";
import { logger } from "@/lib/logger";
import { withUserContext } from "@/lib/logger/context";
import { sanitizeError } from "@/lib/logger/sanitize";
import { upsertUserAuthState } from "@/lib/auth/user-state";
import { getPrimaryEmail } from "@/lib/auth/clerk";
import type { ZodType } from "zod";

type ArtistGenre = (typeof artists.$inferInsert)["genre"];

// Helper to validate with Zod and return errors in TanStack Form format
function validateWithZod<T>(schema: ZodType<T>, data: unknown): string | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    return result.error.issues.map((e: { message: string }) => e.message).join(", ");
  }
  return undefined;
}

// Fan onboarding server action
const fanServerValidate = createServerValidate({
  ...fanFormOptions,
  onServerValidate: ({ value }) => validateWithZod(fanOnboardingSchema, value),
});

export async function fanOnboardingAction(_prev: unknown, formData: FormData) {
  const { userId } = await auth();
  const log = userId ? withUserContext(logger, userId, "fan") : logger;
  try {
    if (!userId) {
      redirect("/sign-in" as Route);
    }

    const validatedData = await fanServerValidate(formData);
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Update user's profile with name and metadata
    // validatedData.name is guaranteed to be non-empty by fanOnboardingSchema
    await client.users.updateUser(userId, {
      firstName: validatedData.name,
    });

    // Update user's publicMetadata to set role and mark onboarding as complete
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingComplete: true,
        role: "fan",
      },
    });

    const primaryEmail = getPrimaryEmail(user);
    if (!primaryEmail) {
      throw new Error("Unable to determine user email for onboarding sync");
    }

    await upsertUserAuthState({
      clerkId: userId,
      email: primaryEmail,
      firstName: validatedData.name,
      imageUrl: user.imageUrl,
      lastName: user.lastName,
      onboardingComplete: true,
      role: "fan",
    });

    // Return success in a way that TanStack Form can handle
    // We'll merge it with the form state
    return {
      ...initialFormState,
      success: true,
    };
  } catch (error) {
    if (error instanceof ServerValidateError) {
      return error.formState;
    }
    // Handle operational errors (database, Clerk API) gracefully
    log.error(
      { error: sanitizeError(error), operation: "fan_onboarding" },
      "Error completing onboarding",
    );
    return {
      ...initialFormState,
      errors: [
        error instanceof Error ? error.message : "Failed to complete onboarding. Please try again.",
      ],
    };
  }
}

// Artist onboarding server action
const artistServerValidate = createServerValidate({
  ...artistFormOptions,
  onServerValidate: ({ value }) => validateWithZod(artistOnboardingSchema, value),
});

export async function artistOnboardingAction(_prev: unknown, formData: FormData) {
  const { userId } = await auth();
  const log = userId ? withUserContext(logger, userId, "artist") : logger;
  try {
    if (!userId) {
      redirect("/sign-in" as Route);
    }

    const validatedData = await artistServerValidate(formData);
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Artists are identified publicly by their slug; keep it derived from the artist name.
    // We also best-effort mirror this to the Clerk user's profile (firstName/username).
    let artistSlug: string | undefined;

    // Get artistId from publicMetadata (set during invitation)
    const artistId = user.publicMetadata?.artistId
      ? Number.parseInt(user.publicMetadata.artistId as string, 10)
      : null;

    // If user is an artist and has an artistId, claim the existing artist profile
    if (artistId) {
      const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);

      if (!artist) {
        return {
          ...initialFormState,
          errors: ["Artist profile not found"],
        };
      }

      if (artist.claimed) {
        return {
          ...initialFormState,
          errors: ["This artist profile has already been claimed"],
        };
      }

      artistSlug = await ensureUniqueSlug(generateSlug(validatedData.name), artistId, "artists");

      // Update artist profile with user's information
      await db
        .update(artists)
        .set({
          bio: validatedData.bio,
          claimed: true,
          claimedById: userId,
          genre: validatedData.genre as ArtistGenre,
          image: validatedData.image || null,
          instagram: validatedData.instagram,
          location: validatedData.location,
          name: validatedData.name,
          phoneNumber: validatedData.phoneNumber || null,
          slug: artistSlug,
          spotifyArtistId: validatedData.spotifyArtistId,
          spotifyUrl: validatedData.spotifyUrl,
          tiktok: validatedData.tiktok || null,
          twitter: validatedData.twitter || null,
          updatedAt: new Date(),
          website: validatedData.website || null,
        })
        .where(eq(artists.id, artistId));
    } else {
      // If user is an artist but doesn't have an artistId, create a new artist profile
      artistSlug = await ensureUniqueSlug(generateSlug(validatedData.name), undefined, "artists");

      await db.insert(artists).values({
        bio: validatedData.bio,
        claimed: true,
        claimedById: userId,
        genre: validatedData.genre as ArtistGenre,
        image: validatedData.image || null,
        instagram: validatedData.instagram,
        location: validatedData.location,
        name: validatedData.name,
        phoneNumber: validatedData.phoneNumber || null,
        slug: artistSlug,
        spotifyArtistId: validatedData.spotifyArtistId,
        spotifyUrl: validatedData.spotifyUrl,
        tiktok: validatedData.tiktok || null,
        twitter: validatedData.twitter || null,
        website: validatedData.website || null,
      });
    }

    // Best-effort: keep the Clerk user's display identity aligned with the artist's name.
    // Username is optional depending on Clerk configuration, so failures should not block onboarding.
    try {
      const usernameCandidate = artistSlug;
      await client.users.updateUser(userId, {
        firstName: validatedData.name,
        username: usernameCandidate,
      });
    } catch (error) {
      log.warn(
        { error: sanitizeError(error), operation: "artist_onboarding_update_user" },
        "Unable to update Clerk user profile during artist onboarding",
      );
    }

    // Update user's publicMetadata to set role and mark onboarding as complete
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingComplete: true,
        role: "artist",
      },
    });

    const primaryEmail = getPrimaryEmail(user);
    if (!primaryEmail) {
      throw new Error("Unable to determine user email for onboarding sync");
    }

    await upsertUserAuthState({
      clerkId: userId,
      email: primaryEmail,
      firstName: validatedData.name,
      imageUrl: user.imageUrl,
      lastName: user.lastName,
      onboardingComplete: true,
      role: "artist",
    });

    // Return success in a way that TanStack Form can handle
    return {
      ...initialFormState,
      success: true,
    };
  } catch (error) {
    if (error instanceof ServerValidateError) {
      return error.formState;
    }
    // Handle operational errors (database, Clerk API) gracefully
    log.error(
      { error: sanitizeError(error), operation: "artist_onboarding" },
      "Error completing onboarding",
    );
    return {
      ...initialFormState,
      errors: [
        error instanceof Error ? error.message : "Failed to complete onboarding. Please try again.",
      ],
    };
  }
}

// Venue onboarding server action
const venueServerValidate = createServerValidate({
  ...venueFormOptions,
  onServerValidate: ({ value }) => validateWithZod(venueOnboardingSchema, value),
});

export async function venueOnboardingAction(_prev: unknown, formData: FormData) {
  const { userId } = await auth();
  const log = userId ? withUserContext(logger, userId, "venue") : logger;
  try {
    if (!userId) {
      redirect("/sign-in" as Route);
    }

    const validatedData = await venueServerValidate(formData);
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const venueSlug = await ensureUniqueSlug(
      generateSlug(validatedData.name),
      undefined,
      "venues",
    );

    // Insert venue into database
    const [createdVenue] = await db
      .insert(venues)
      .values({
        address: validatedData.address || null,
        capacity: validatedData.capacity || null,
        city: validatedData.city || "Little Rock",
        claimedById: userId,
        description: validatedData.description || null,
        name: validatedData.name,
        phone: validatedData.phone || null,
        slug: venueSlug,
        state: validatedData.state || "AR",
        website: validatedData.website || null,
      })
      .returning();

    // Update user display name
    try {
      await client.users.updateUser(userId, {
        firstName: validatedData.name,
      });
    } catch {
      // Best-effort name sync
    }

    // Update user's publicMetadata to set role and mark onboarding as complete
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingComplete: true,
        role: "venue",
        venueId: createdVenue?.id,
      },
    });

    const primaryEmail = getPrimaryEmail(user);
    if (primaryEmail) {
      await upsertUserAuthState({
        clerkId: userId,
        email: primaryEmail,
        firstName: validatedData.name,
        imageUrl: user.imageUrl,
        lastName: user.lastName,
        onboardingComplete: true,
        role: "venue",
      });
    }

    return {
      ...initialFormState,
      success: true,
    };
  } catch (error) {
    if (error instanceof ServerValidateError) {
      return error.formState;
    }
    log.error(
      { error: sanitizeError(error), operation: "venue_onboarding" },
      "Error completing venue onboarding",
    );
    return {
      ...initialFormState,
      errors: [
        error instanceof Error ? error.message : "Failed to complete onboarding. Please try again.",
      ],
    };
  }
}
