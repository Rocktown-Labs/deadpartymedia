"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";

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

      // Get form data
      const name = formData.get("name") as string;
      const bio = formData.get("bio") as string;
      const location = formData.get("location") as string;
      const genre = formData.get("genre") as string;
      const spotifyUrl = formData.get("spotifyUrl") as string;
      const spotifyArtistId = formData.get("spotifyArtistId") as string;
      const instagram = formData.get("instagram") as string;
      const twitter = formData.get("twitter") as string;
      const tiktok = formData.get("tiktok") as string;
      const website = formData.get("website") as string;
      const image = formData.get("image") as string;

      // Update artist profile with user's information
      await db
        .update(artists)
        .set({
          name: name || artist.name,
          bio: bio || artist.bio,
          location: location || artist.location,
          genre: (genre as any) || artist.genre,
          spotifyUrl: spotifyUrl || artist.spotifyUrl,
          spotifyArtistId: spotifyArtistId || artist.spotifyArtistId,
          instagram: instagram || artist.instagram,
          twitter: twitter || artist.twitter,
          tiktok: tiktok || artist.tiktok,
          website: website || artist.website,
          image: image || artist.image,
          claimed: true,
          claimedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, artistId));
    } else if (role === "artist" && !artistId) {
      // If user is an artist but doesn't have an artistId, create a new artist profile
      const name = formData.get("name") as string;
      const bio = formData.get("bio") as string;
      const location = formData.get("location") as string;
      const genre = formData.get("genre") as string;
      const spotifyUrl = formData.get("spotifyUrl") as string;
      const spotifyArtistId = formData.get("spotifyArtistId") as string;
      const instagram = formData.get("instagram") as string;
      const twitter = formData.get("twitter") as string;
      const tiktok = formData.get("tiktok") as string;
      const website = formData.get("website") as string;
      const image = formData.get("image") as string;

      const slug = await ensureUniqueSlug(generateSlug(name), undefined, "artist");

      await db.insert(artists).values({
        name,
        slug,
        bio,
        location,
        genre: genre as any,
        spotifyUrl: spotifyUrl || null,
        spotifyArtistId: spotifyArtistId || null,
        instagram: instagram || null,
        twitter: twitter || null,
        tiktok: tiktok || null,
        website: website || null,
        image: image || null,
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
