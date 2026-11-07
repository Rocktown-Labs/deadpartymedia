import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { artists, musicReleases } from "@dpmedia/db/schema";
import type { AppEnv } from "../../bindings";
import { requireAuth } from "../../auth";
import { getDb } from "../../db";
import { ensureUniqueSlug, generateSlug } from "../../lib/slug";
import { safeHttpUrl, truncateText } from "../../lib/security";

/**
 * Ported from apps/web/src/app/artist-dashboard/releases/actions.ts — the
 * artist music-release submission flow. Auth required (the source requires
 * sign-in, not a role); the claimed-artist profile links the release when
 * present, otherwise it is filed as an independent submission. New
 * submissions land as draft/pending exactly like the source.
 *
 * Fidelity notes: the source takes FormData; the API takes the same fields
 * as JSON. The fire-and-forget Resend notification is not ported yet (API
 * gap), and the source's Next-only `redirectUrl` return field is dropped in
 * favor of the release id.
 */
export const musicSubmissionsRoutes = new Hono<AppEnv>();

const RELEASE_TYPES = ["Single", "Album", "EP"] as const;
const GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

musicSubmissionsRoutes.post("/submissions/music-release", async (c) => {
  const auth = requireAuth(c);
  const db = getDb(c.env);

  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (key: string): string | null =>
    typeof body[key] === "string" ? (body[key] as string) : null;

  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.claimedById, auth.userId))
    .limit(1);

  const artistName = artist?.name || str("artistName") || "Independent Artist";
  const title = str("title")?.trim();
  if (!title || title.length > 255) {
    return c.json({ error: "Release title is required (max 255 characters)" }, 400);
  }

  const releaseTypeRaw = str("releaseType") ?? "Single";
  const releaseType = (RELEASE_TYPES as readonly string[]).includes(releaseTypeRaw)
    ? (releaseTypeRaw as (typeof RELEASE_TYPES)[number])
    : "Single";
  const genreRaw = str("genre") ?? "OTHER";
  const genre = (GENRES as readonly string[]).includes(genreRaw)
    ? (genreRaw as (typeof GENRES)[number])
    : "OTHER";

  const releaseDate = str("releaseDate") || null;
  const coverArt = safeHttpUrl(str("coverArt"));
  const excerpt = truncateText(str("excerpt")?.trim() || `New release by ${artistName}.`, 1000);
  const content = truncateText(str("content") || "", 20_000);
  const spotifyUrl = safeHttpUrl(str("spotifyUrl"));
  const appleMusicUrl = safeHttpUrl(str("appleMusicUrl"));
  const bandcampUrl = safeHttpUrl(str("bandcampUrl"));
  const youtubeUrl = safeHttpUrl(str("youtubeUrl"));
  const audioUrl = safeHttpUrl(str("audioUrl"));

  const slug = await ensureUniqueSlug(
    db,
    generateSlug(`${artistName}-${title}`),
    undefined,
    "musicReleases",
  );

  const [createdRelease] = await db
    .insert(musicReleases)
    .values({
      appleMusicUrl,
      artistId: artist?.id || null,
      artistName,
      audioUrl,
      authorId: auth.userId,
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

  if (!createdRelease) {
    return c.json({ error: "Failed to submit release" }, 500);
  }

  return c.json({ releaseId: createdRelease.id, success: true }, 201);
});
