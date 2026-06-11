import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    // Query artist with counts
    const [artist] = await db
      .select({
        article_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM post_artists
          INNER JOIN posts ON post_artists.post_id = posts.id
          WHERE post_artists.artist_id = artists.id
          AND posts.status = 'published'
        )`.as("article_count"),
        bio: artists.bio,
        claimed: artists.claimed,
        created_at: artists.createdAt,
        event_count: sql<number>`(
          SELECT COUNT(*)::int
          FROM event_artists
          INNER JOIN events ON event_artists.event_id = events.id
          WHERE event_artists.artist_id = artists.id
          AND events.status = 'published'
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
      .where(eq(artists.slug, slug))
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
      { error: sanitizeError(error), operation: "fetch_artist", slug: (await params).slug },
      "Error fetching artist",
    );
    return NextResponse.json({ error: "Failed to fetch artist" }, { status: 500 });
  }
}
