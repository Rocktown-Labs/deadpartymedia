import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, postArtists, eventArtists, posts, events } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");

    // Build where conditions
    const conditions = [];
    if (genre) {
      conditions.push(eq(artists.genre, genre as any));
    }

    // Query artists with counts
    const results = await db
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
        profile_views: artists.profileViews,
        slug: artists.slug,
        spotify_artist_id: artists.spotifyArtistId,
        spotify_url: artists.spotifyUrl,
        tiktok: artists.tiktok,
        twitter: artists.twitter,
        website: artists.website,
      })
      .from(artists)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Transform to match existing Artist interface
    const artistList = results.map((artist) => ({
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
      profile_views: artist.profile_views,
      slug: artist.slug,
      spotify_artist_id: artist.spotify_artist_id,
      spotify_url: artist.spotify_url,
      tiktok: artist.tiktok,
      twitter: artist.twitter,
      website: artist.website,
    }));

    return NextResponse.json(artistList, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_artists" },
      "Error fetching artists",
    );
    return NextResponse.json({ error: "Failed to fetch artists" }, { status: 500 });
  }
}
