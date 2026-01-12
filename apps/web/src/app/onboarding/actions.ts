"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { onboardingSchema } from "@/lib/validations/onboarding";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  // Get role and artistId from publicMetadata (set during invitation)
  const role = (user.publicMetadata?.role as string) || "fan";
  const artistId = user.publicMetadata?.artistId
    ? Number.parseInt(user.publicMetadata.artistId as string, 10)
    : null;

  // Validate form data
  const rawData = {
    name: formData.get("name") as string,
    location: formData.get("location") as string,
    genre: formData.get("genre") as string,
    bio: formData.get("bio") as string,
    spotifyUrl: formData.get("spotifyUrl") as string | undefined,
    spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
    instagram: formData.get("instagram") as string | undefined,
    twitter: formData.get("twitter") as string | undefined,
    tiktok: formData.get("tiktok") as string | undefined,
    website: formData.get("website") as string | undefined,
    image: formData.get("image") as string | undefined,
  };

  const validationResult = onboardingSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      error: validationResult.error.errors.map((e) => e.message).join(", "),
    };
  }

  const validatedData = validationResult.data;

  try {
    // If user is an artist and has an artistId, claim the existing artist profile
    if (role === "artist" && artistId) {
      const [artist] = await db
        .select()
        .from(artists)
        .where(eq(artists.id, artistId))
        .limit(1);

      if (!artist) {
        return { error: "Artist profile not found" };
      }

      if (artist.claimed) {
        return { error: "This artist profile has already been claimed" };
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
          spotifyArtistId: validatedData.spotifyArtistId || artist.spotifyArtistId,
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
    } else if (role === "artist" && !artistId) {
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

    // Update user's publicMetadata to mark onboarding as complete
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingComplete: true,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error completing onboarding:", err);
    return { error: err.message || "Failed to complete onboarding" };
  }
}
