import { HTTPException } from "hono/http-exception";
import { artists } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { hasMusicRole } from "../../../lib/music-access";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function AdminArtistsImportActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  const ARTIST_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

  type ArtistGenre = (typeof ARTIST_GENRES)[number];

  function cleanText(value: FormDataEntryValue | null, maxLength: number) {
    return String(value ?? "")
      .trim()
      .replaceAll(/\s+/g, " ")
      .slice(0, maxLength);
  }

  function normalizeName(value: string) {
    return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  }

  function toGenre(value: string): ArtistGenre {
    return ARTIST_GENRES.includes(value as ArtistGenre) ? (value as ArtistGenre) : "OTHER";
  }

  async function createImportedArtistAction(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Unauthorized" });
    }
    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can import artist lists",
      });
    }

    const name = cleanText(formData.get("name"), 150);
    if (!name) {
      return { error: "Artist name is required", success: false };
    }

    const genre = toGenre(cleanText(formData.get("genre"), 50));
    const location = cleanText(formData.get("location"), 150) || "Arkansas";
    const spotifyArtistId = cleanText(formData.get("spotifyArtistId"), 150) || null;
    const spotifyUrl = cleanText(formData.get("spotifyUrl"), 500) || null;
    const image = cleanText(formData.get("image"), 1000) || null;
    const website = cleanText(formData.get("website"), 500) || null;

    const existingArtist = (
      await db
        .select({
          genre: artists.genre,
          hidden: artists.hidden,
          id: artists.id,
          image: artists.image,
          location: artists.location,
          name: artists.name,
          slug: artists.slug,
          spotifyUrl: artists.spotifyUrl,
          website: artists.website,
        })
        .from(artists)
    ).find((candidate) => normalizeName(candidate.name) === normalizeName(name));

    if (existingArtist) {
      return { artist: existingArtist, existing: true, success: true };
    }

    const slug = await ensureUniqueSlug(db, generateSlug(name), undefined, "artists");
    const [artist] = await db
      .insert(artists)
      .values({
        bio: "Profile pending update.",
        claimed: false,
        claimedById: null,
        email: null,
        genre,
        hidden: true,
        image,
        instagram: null,
        location,
        name,
        phoneNumber: null,
        slug,
        spotifyArtistId,
        spotifyUrl,
        tiktok: null,
        twitter: null,
        website,
      })
      .returning({
        genre: artists.genre,
        hidden: artists.hidden,
        id: artists.id,
        image: artists.image,
        location: artists.location,
        name: artists.name,
        slug: artists.slug,
        spotifyUrl: artists.spotifyUrl,
        website: artists.website,
      });

    return { artist, existing: false, success: true };
  }
  return { createImportedArtistAction };
}
export const adminArtistsImportActionsRoutes = new Hono<AppEnv>().post(
  "/admin/artists/import/createImportedArtistAction",
  zValidator("json", z.object({ formData: formFields })),
  async (c) => {
    requireRole(c, ["super_admin", "writer"]);
    const input = c.req.valid("json");
    return c.json(
      (await AdminArtistsImportActions(c).createImportedArtistAction(input.formData)) ?? null,
    );
  },
);
