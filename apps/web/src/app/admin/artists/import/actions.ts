"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { canDelete } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { ensureUniqueSlug, generateSlug } from "@/lib/utils/slug";

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

export async function createImportedArtistAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can import artist lists");
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

  const [existingArtist] = await db
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
    .where(
      sql`regexp_replace(lower(${artists.name}), '[^a-z0-9]', '', 'g') = ${normalizeName(name)}`,
    )
    .limit(1);

  if (existingArtist) {
    return { artist: existingArtist, existing: true, success: true };
  }

  const slug = await ensureUniqueSlug(generateSlug(name), undefined, "artists");
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

  revalidateTag("artists", "max");
  revalidatePath("/admin/artists");
  revalidatePath("/admin/artists/import");
  revalidatePath("/artists");

  return { artist, existing: false, success: true };
}
