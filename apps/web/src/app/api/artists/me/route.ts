import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { artists, postArtists, eventArtists, posts, events } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { artistUpdateSchema } from "@/lib/validations/artist";
import { generateImagePathname, validateImageFile } from "@/lib/upload";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query artist where claimedById matches user's Clerk ID
    const [artist] = await db
      .select({
        article_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${postArtists}
          INNER JOIN ${posts} ON ${postArtists.postId} = ${posts.id}
          WHERE ${postArtists.artistId} = ${artists.id}
          AND ${posts.status} = 'published'
        )`.as("article_count"),
        bio: artists.bio,
        claimed: artists.claimed,
        created_at: artists.createdAt,
        event_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${eventArtists}
          INNER JOIN ${events} ON ${eventArtists.eventId} = ${events.id}
          WHERE ${eventArtists.artistId} = ${artists.id}
          AND ${events.status} = 'published'
        )`.as("event_count"),
        genre: artists.genre,
        id: artists.id,
        image: artists.image,
        instagram: artists.instagram,
        location: artists.location,
        name: artists.name,
        phone_number: artists.phoneNumber,
        profile_views: artists.profileViews,
        slug: artists.slug,
        spotify_artist_id: artists.spotifyArtistId,
        spotify_url: artists.spotifyUrl,
        tiktok: artists.tiktok,
        twitter: artists.twitter,
        website: artists.website,
      })
      .from(artists)
      .where(eq(artists.claimedById, userId))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Transform to match existing Artist interface
    const artistData = {
      article_count: artist.article_count || 0,
      bio: artist.bio,
      claimed: artist.claimed,
      created_at: artist.created_at.toISOString(),
      event_count: artist.event_count || 0,
      genre: artist.genre,
      id: artist.id,
      image: artist.image,
      instagram: artist.instagram,
      location: artist.location,
      name: artist.name,
      phone_number: artist.phone_number,
      profile_views: artist.profile_views,
      slug: artist.slug,
      spotify_artist_id: artist.spotify_artist_id,
      spotify_url: artist.spotify_url,
      tiktok: artist.tiktok,
      twitter: artist.twitter,
      website: artist.website,
    };

    return NextResponse.json(artistData);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_current_user_artist" },
      "Error fetching current user artist",
    );
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();

    const name = String(formData.get("name") ?? "");
    const bio = String(formData.get("bio") ?? "");
    const location = String(formData.get("location") ?? "");
    const genre = String(formData.get("genre") ?? "");

    const spotifyUrl = String(formData.get("spotifyUrl") ?? formData.get("spotify_url") ?? "");
    const instagram = String(formData.get("instagram") ?? "");
    const twitter = String(formData.get("twitter") ?? "");
    const tiktok = String(formData.get("tiktok") ?? "");
    const website = String(formData.get("website") ?? "");
    const phoneNumber = String(formData.get("phoneNumber") ?? formData.get("phone_number") ?? "");

    // Image can be either a File or a URL string (or empty to clear)
    const imageField = formData.get("image");
    let imageUrl: string | undefined;

    if (imageField instanceof File) {
      const validation = validateImageFile(imageField);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      const pathname = generateImagePathname("profile", imageField.name, true);
      const blob = await put(pathname, imageField, {
        access: "public",
        addRandomSuffix: true,
      });
      imageUrl = blob.url;
    } else if (typeof imageField === "string") {
      // Allow clearing with empty string
      imageUrl = imageField;
    }

    const validationResult = artistUpdateSchema.safeParse({
      bio,
      genre,
      image: imageUrl ?? "",
      instagram,
      location,
      name,
      phoneNumber,
      spotifyUrl,
      tiktok,
      twitter,
      website,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: validationResult.error.issues },
        { status: 400 },
      );
    }

    const validated = validationResult.data;

    const [updated] = await db
      .update(artists)
      .set({
        bio: validated.bio,
        genre: validated.genre,
        image: validated.image ?? null,
        instagram: validated.instagram ?? null,
        location: validated.location,
        name: validated.name,
        phoneNumber: validated.phoneNumber ?? null,
        spotifyUrl: validated.spotifyUrl ?? null,
        tiktok: validated.tiktok ?? null,
        twitter: validated.twitter ?? null,
        updatedAt: new Date(),
        website: validated.website ?? null,
      })
      .where(eq(artists.claimedById, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Re-fetch with computed counts to keep PATCH response consistent with GET
    const [artistWithCounts] = await db
      .select({
        article_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${postArtists}
          INNER JOIN ${posts} ON ${postArtists.postId} = ${posts.id}
          WHERE ${postArtists.artistId} = ${artists.id}
          AND ${posts.status} = 'published'
        )`.as("article_count"),
        bio: artists.bio,
        claimed: artists.claimed,
        created_at: artists.createdAt,
        event_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${eventArtists}
          INNER JOIN ${events} ON ${eventArtists.eventId} = ${events.id}
          WHERE ${eventArtists.artistId} = ${artists.id}
          AND ${events.status} = 'published'
        )`.as("event_count"),
        genre: artists.genre,
        id: artists.id,
        image: artists.image,
        instagram: artists.instagram,
        location: artists.location,
        name: artists.name,
        phone_number: artists.phoneNumber,
        profile_views: artists.profileViews,
        slug: artists.slug,
        spotify_artist_id: artists.spotifyArtistId,
        spotify_url: artists.spotifyUrl,
        tiktok: artists.tiktok,
        twitter: artists.twitter,
        website: artists.website,
      })
      .from(artists)
      .where(eq(artists.id, updated.id))
      .limit(1);

    if (!artistWithCounts) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      article_count: artistWithCounts.article_count || 0,
      bio: artistWithCounts.bio,
      claimed: artistWithCounts.claimed,
      created_at: artistWithCounts.created_at.toISOString(),
      event_count: artistWithCounts.event_count || 0,
      genre: artistWithCounts.genre,
      id: artistWithCounts.id,
      image: artistWithCounts.image,
      instagram: artistWithCounts.instagram,
      location: artistWithCounts.location,
      name: artistWithCounts.name,
      phone_number: artistWithCounts.phone_number,
      profile_views: artistWithCounts.profile_views,
      slug: artistWithCounts.slug,
      spotify_artist_id: artistWithCounts.spotify_artist_id,
      spotify_url: artistWithCounts.spotify_url,
      tiktok: artistWithCounts.tiktok,
      twitter: artistWithCounts.twitter,
      website: artistWithCounts.website,
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "update_current_user_artist" },
      "Error updating current user artist",
    );
    return NextResponse.json({ error: "Failed to update artist" }, { status: 500 });
  }
}
