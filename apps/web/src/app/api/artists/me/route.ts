import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  artists,
  postArtists,
  eventArtists,
  posts,
  events,
} from "@/lib/db/schema";
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
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        bio: artists.bio,
        image: artists.image,
        location: artists.location,
        genre: artists.genre,
        spotify_url: artists.spotifyUrl,
        spotify_artist_id: artists.spotifyArtistId,
        instagram: artists.instagram,
        twitter: artists.twitter,
        tiktok: artists.tiktok,
        website: artists.website,
        claimed: artists.claimed,
        profile_views: artists.profileViews,
        created_at: artists.createdAt,
        article_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${postArtists}
          INNER JOIN ${posts} ON ${postArtists.postId} = ${posts.id}
          WHERE ${postArtists.artistId} = ${artists.id}
          AND ${posts.status} = 'published'
        )`.as("article_count"),
        event_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${eventArtists}
          INNER JOIN ${events} ON ${eventArtists.eventId} = ${events.id}
          WHERE ${eventArtists.artistId} = ${artists.id}
          AND ${events.status} = 'published'
        )`.as("event_count"),
      })
      .from(artists)
      .where(eq(artists.claimedById, userId))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Transform to match existing Artist interface
    const artistData = {
      id: artist.id,
      slug: artist.slug,
      name: artist.name,
      bio: artist.bio,
      image: artist.image,
      location: artist.location,
      genre: artist.genre,
      spotify_url: artist.spotify_url,
      spotify_artist_id: artist.spotify_artist_id,
      instagram: artist.instagram,
      twitter: artist.twitter,
      tiktok: artist.tiktok,
      website: artist.website,
      claimed: artist.claimed,
      article_count: artist.article_count || 0,
      event_count: artist.event_count || 0,
      profile_views: artist.profile_views,
      created_at: artist.created_at.toISOString(),
    };

    return NextResponse.json(artistData);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_current_user_artist" },
      "Error fetching current user artist"
    );
    return NextResponse.json(
      { error: "Failed to fetch artist" },
      { status: 500 }
    );
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

    const spotifyUrl = String(
      formData.get("spotifyUrl") ?? formData.get("spotify_url") ?? ""
    );
    const instagram = String(formData.get("instagram") ?? "");
    const twitter = String(formData.get("twitter") ?? "");
    const tiktok = String(formData.get("tiktok") ?? "");
    const website = String(formData.get("website") ?? "");

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
      name,
      bio,
      location,
      genre,
      spotifyUrl,
      instagram,
      twitter,
      tiktok,
      website,
      image: imageUrl ?? "",
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: validationResult.error.issues },
        { status: 400 }
      );
    }

    const validated = validationResult.data;

    const [updated] = await db
      .update(artists)
      .set({
        name: validated.name,
        bio: validated.bio,
        location: validated.location,
        genre: validated.genre,
        spotifyUrl: validated.spotifyUrl ?? null,
        instagram: validated.instagram ?? null,
        twitter: validated.twitter ?? null,
        tiktok: validated.tiktok ?? null,
        website: validated.website ?? null,
        image: validated.image ?? null,
        updatedAt: new Date(),
      })
      .where(eq(artists.claimedById, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Re-fetch with computed counts to keep PATCH response consistent with GET
    const [artistWithCounts] = await db
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        bio: artists.bio,
        image: artists.image,
        location: artists.location,
        genre: artists.genre,
        spotify_url: artists.spotifyUrl,
        spotify_artist_id: artists.spotifyArtistId,
        instagram: artists.instagram,
        twitter: artists.twitter,
        tiktok: artists.tiktok,
        website: artists.website,
        claimed: artists.claimed,
        profile_views: artists.profileViews,
        created_at: artists.createdAt,
        article_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${postArtists}
          INNER JOIN ${posts} ON ${postArtists.postId} = ${posts.id}
          WHERE ${postArtists.artistId} = ${artists.id}
          AND ${posts.status} = 'published'
        )`.as("article_count"),
        event_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM ${eventArtists}
          INNER JOIN ${events} ON ${eventArtists.eventId} = ${events.id}
          WHERE ${eventArtists.artistId} = ${artists.id}
          AND ${events.status} = 'published'
        )`.as("event_count"),
      })
      .from(artists)
      .where(eq(artists.id, updated.id))
      .limit(1);

    if (!artistWithCounts) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: artistWithCounts.id,
      slug: artistWithCounts.slug,
      name: artistWithCounts.name,
      bio: artistWithCounts.bio,
      image: artistWithCounts.image,
      location: artistWithCounts.location,
      genre: artistWithCounts.genre,
      spotify_url: artistWithCounts.spotify_url,
      spotify_artist_id: artistWithCounts.spotify_artist_id,
      instagram: artistWithCounts.instagram,
      twitter: artistWithCounts.twitter,
      tiktok: artistWithCounts.tiktok,
      website: artistWithCounts.website,
      claimed: artistWithCounts.claimed,
      profile_views: artistWithCounts.profile_views,
      created_at: artistWithCounts.created_at.toISOString(),
      article_count: artistWithCounts.article_count || 0,
      event_count: artistWithCounts.event_count || 0,
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "update_current_user_artist" },
      "Error updating current user artist"
    );
    return NextResponse.json(
      { error: "Failed to update artist" },
      { status: 500 }
    );
  }
}
