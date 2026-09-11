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
import { safeHttpUrl, truncateText } from "@/lib/security";
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
  if (!title || title.length > 255) {
    throw new Error("Release title is required (max 255 characters)");
  }

  const allowedReleaseTypes = ["Single", "Album", "EP"] as const;
  const releaseTypeRaw = (formData.get("releaseType") as string) || "Single";
  const releaseType = (allowedReleaseTypes as readonly string[]).includes(releaseTypeRaw)
    ? (releaseTypeRaw as "Single" | "Album" | "EP")
    : "Single";
  const allowedGenres = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;
  const genreRaw = (formData.get("genre") as string) || "OTHER";
  const genre = (allowedGenres as readonly string[]).includes(genreRaw)
    ? (genreRaw as MusicReleaseInsert["genre"])
    : "OTHER";
  const releaseDate = (formData.get("releaseDate") as string) || null;
  const coverArt = safeHttpUrl(formData.get("coverArt") as string | null);
  const excerpt = truncateText(
    (formData.get("excerpt") as string)?.trim() || `New release by ${artistName}.`,
    1000,
  );
  const content = truncateText((formData.get("content") as string) || "", 20_000);
  const spotifyUrl = safeHttpUrl(formData.get("spotifyUrl") as string | null);
  const appleMusicUrl = safeHttpUrl(formData.get("appleMusicUrl") as string | null);
  const bandcampUrl = safeHttpUrl(formData.get("bandcampUrl") as string | null);
  const youtubeUrl = safeHttpUrl(formData.get("youtubeUrl") as string | null);
  const audioUrl = safeHttpUrl(formData.get("audioUrl") as string | null);

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
      genre: genre ?? "OTHER",
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
