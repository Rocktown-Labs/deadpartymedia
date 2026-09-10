"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { artists, musicReleases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { sendMusicReleaseSubmissionNotification } from "@/lib/email/notifications";
import { logger } from "@/lib/logger";

type MusicReleaseInsert = typeof musicReleases.$inferInsert;

export async function submitArtistRelease(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  // Find the artist profile claimed by this user
  const [artist] = await db.select().from(artists).where(eq(artists.claimedById, userId)).limit(1);

  const artistName = artist?.name || (formData.get("artistName") as string) || "Independent Artist";
  const title = (formData.get("title") as string)?.trim();
  if (!title) {
    throw new Error("Release title is required");
  }

  const releaseType = (formData.get("releaseType") as "Single" | "Album" | "EP") || "Single";
  const genre = (formData.get("genre") as MusicReleaseInsert["genre"]) || "OTHER";
  const releaseDate = (formData.get("releaseDate") as string) || null;
  const coverArt = (formData.get("coverArt") as string) || null;
  const excerpt = (formData.get("excerpt") as string)?.trim() || `New release by ${artistName}.`;
  const content = (formData.get("content") as string) || null;
  const spotifyUrl = (formData.get("spotifyUrl") as string) || null;
  const appleMusicUrl = (formData.get("appleMusicUrl") as string) || null;
  const bandcampUrl = (formData.get("bandcampUrl") as string) || null;
  const youtubeUrl = (formData.get("youtubeUrl") as string) || null;
  const audioUrl = (formData.get("audioUrl") as string) || null;

  const baseSlug = generateSlug(`${artistName}-${title}`);
  const slug = await ensureUniqueSlug(baseSlug, undefined, "musicReleases");

  try {
    const [createdRelease] = await db
      .insert(musicReleases)
      .values({
        appleMusicUrl,
        artistId: artist?.id || null,
        artistName,
        audioUrl,
        authorId: userId,
        bandcampUrl,
        content,
        coverArt,
        excerpt,
        featured: false,
        genre,
        releaseDate,
        releaseType,
        slug,
        spotifyUrl,
        status: "draft",
        submissionStatus: "pending",
        title,
        youtubeUrl,
      })
      .returning();

    // Dispatch email notification to deadpartyplaylist@gmail.com
    sendMusicReleaseSubmissionNotification({
      appleMusicUrl,
      artistName,
      audioUrl,
      bandcampUrl,
      coverArt,
      genre,
      notes: excerpt,
      releaseDate,
      releaseId: createdRelease.id,
      releaseType,
      spotifyUrl,
      title,
      youtubeUrl,
    }).catch((err) => {
      logger.warn({ err }, "Failed to send music submission notification email");
    });

    revalidatePath("/artist-dashboard/releases");
    revalidatePath("/admin/music/submissions");

    return { redirectUrl: "/artist-dashboard/releases" as Route, releaseId: createdRelease.id };
  } catch (error) {
    logger.error({ error, operation: "submit_artist_release", userId }, "Failed to submit release");
    throw error;
  }
}
