import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { artists, postArtists, eventArtists, posts, events } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

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
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
