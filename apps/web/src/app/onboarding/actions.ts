"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ServerValidateError,
  createServerValidate,
  initialFormState,
} from "@tanstack/react-form-nextjs";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import {
  fanOnboardingSchema,
  artistOnboardingSchema,
} from "@/lib/validations/onboarding";
import { fanFormOptions, artistFormOptions } from "./form-options";

// Helper to validate with Zod and return errors in TanStack Form format
function validateWithZod<T>(schema: any, data: T): string | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    return result.error.issues
      .map((e: { message: string }) => e.message)
      .join(", ");
  }
  return undefined;
}

// Fan onboarding server action
const fanServerValidate = createServerValidate({
  ...fanFormOptions,
  onServerValidate: async ({ value }) => {
    const error = validateWithZod(fanOnboardingSchema, value);
    if (error) {
      return error;
    }
  },
});

export async function fanOnboardingAction(prev: unknown, formData: FormData) {
  try {
    const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    const validatedData = await fanServerValidate(formData);
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // For fans, if name is empty, use email username or default
    const name =
      validatedData.name ||
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
      "User";

    // Update user's profile with name and metadata
    await client.users.updateUser(userId, {
      firstName: name,
    });

    // Update user's publicMetadata to set role and mark onboarding as complete
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        role: "fan",
        onboardingComplete: true,
      },
    });

    // Return success in a way that TanStack Form can handle
    // We'll merge it with the form state
    return {
      ...initialFormState,
      success: true,
    } as any;
  } catch (e) {
    if (e instanceof ServerValidateError) {
      return e.formState;
    }
    throw e;
  }
}

// Artist onboarding server action
const artistServerValidate = createServerValidate({
  ...artistFormOptions,
  onServerValidate: async ({ value }) => {
    const error = validateWithZod(artistOnboardingSchema, value);
    if (error) {
      return error;
    }
  },
});

export async function artistOnboardingAction(
  prev: unknown,
  formData: FormData
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    const validatedData = await artistServerValidate(formData);
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Get artistId from publicMetadata (set during invitation)
    const artistId = user.publicMetadata?.artistId
      ? Number.parseInt(user.publicMetadata.artistId as string, 10)
      : null;

    try {
      // If user is an artist and has an artistId, claim the existing artist profile
      if (artistId) {
        const [artist] = await db
          .select()
          .from(artists)
          .where(eq(artists.id, artistId))
          .limit(1);

        if (!artist) {
          throw new Error("Artist profile not found");
        }

        if (artist.claimed) {
          throw new Error("This artist profile has already been claimed");
        }

        // Update artist profile with user's information
        await db
          .update(artists)
          .set({
            name: validatedData.name || artist.name,
            bio: validatedData.bio || artist.bio,
            location: validatedData.location || artist.location,
            genre: (validatedData.genre as any) || artist.genre,
            spotifyUrl: validatedData.spotifyUrl || artist.spotifyUrl,
            spotifyArtistId:
              validatedData.spotifyArtistId || artist.spotifyArtistId,
            instagram: validatedData.instagram || artist.instagram,
            twitter: validatedData.twitter || artist.twitter,
            tiktok: validatedData.tiktok || artist.tiktok,
            website: validatedData.website || artist.website,
            image: validatedData.image || artist.image,
            claimed: true,
            claimedById: userId,
            updatedAt: new Date(),
          })
          .where(eq(artists.id, artistId));
      } else {
        // If user is an artist but doesn't have an artistId, create a new artist profile
        const slug = await ensureUniqueSlug(
          generateSlug(validatedData.name),
          undefined,
          "artists"
        );

        await db.insert(artists).values({
          name: validatedData.name,
          slug,
          bio: validatedData.bio,
          location: validatedData.location,
          genre: validatedData.genre as any,
          spotifyUrl: validatedData.spotifyUrl || null,
          spotifyArtistId: validatedData.spotifyArtistId || null,
          instagram: validatedData.instagram || null,
          twitter: validatedData.twitter || null,
          tiktok: validatedData.tiktok || null,
          website: validatedData.website || null,
          image: validatedData.image || null,
          claimed: true,
          claimedById: userId,
        });
      }

      // Update user's publicMetadata to set role and mark onboarding as complete
      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          role: "artist",
          onboardingComplete: true,
        },
      });

      // Return success in a way that TanStack Form can handle
      return {
        ...initialFormState,
        success: true,
      } as any;
    } catch (err: any) {
      console.error("Error completing onboarding:", err);
      throw new Error(err.message || "Failed to complete onboarding");
    }
  } catch (e) {
    if (e instanceof ServerValidateError) {
      return e.formState;
    }
    throw e;
  }
}
