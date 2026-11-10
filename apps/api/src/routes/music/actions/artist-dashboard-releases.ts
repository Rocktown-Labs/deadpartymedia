import { artists, musicReleases } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { sendMusicReleaseSubmissionNotification } from "../../../lib/music/notifications";
import { safeHttpUrl, truncateText } from "../../../lib/security";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function ArtistDashboardReleasesActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type MusicReleaseInsert = typeof musicReleases.$inferInsert;

  async function submitArtistRelease(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Find the artist profile claimed by this user
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.claimedById, userId))
      .limit(1);

    const artistName =
      artist?.name || (formData.get("artistName") as string) || "Independent Artist";
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
    const slug = await ensureUniqueSlug(db, baseSlug, undefined, "musicReleases");

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
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      // Dispatch email notification to deadpartyplaylist@gmail.com
      sendMusicReleaseSubmissionNotification(c.env, {
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
        console.warn({ err }, "Failed to send music submission notification email");
      });

      return { redirectUrl: "/artist-dashboard/releases", releaseId: createdRelease.id };
    } catch (error) {
      console.error(
        { error, operation: "submit_artist_release", userId },
        "Failed to submit release",
      );
      throw error;
    }
  }
  return { submitArtistRelease };
}
export const artistDashboardReleasesActionsRoutes = new Hono<AppEnv>().post(
  "/artist-dashboard/releases/submitArtistRelease",
  zValidator("json", z.object({ formData: formFields })),
  async (c) => {
    requireAuth(c);
    const input = c.req.valid("json");
    return c.json(
      (await ArtistDashboardReleasesActions(c).submitArtistRelease(input.formData)) ?? null,
    );
  },
);
