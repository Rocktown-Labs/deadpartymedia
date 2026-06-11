import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

const ARTIST_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type ArtistGenre = (typeof ARTIST_GENRES)[number];

function isArtistGenre(value: string): value is ArtistGenre {
  return ARTIST_GENRES.includes(value as ArtistGenre);
}

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const paginated = searchParams.get("paginated") === "true";
    const limit = Math.max(1, Math.min(Number.parseInt(searchParams.get("limit") || "24", 10), 48));
    const offset = Math.max(0, Number.parseInt(searchParams.get("offset") || "0", 10));
    const sort = searchParams.get("sort") === "name" ? "name" : "created_at";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";

    // Build where conditions
    const conditions = [];
    if (genre && isArtistGenre(genre)) {
      conditions.push(eq(artists.genre, genre));
    }

    // Query artists with counts
    const results = await db
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
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Deduplicate artists by name (case-insensitive)
    const uniqueArtists = new Map<string, (typeof results)[0]>();

    for (const artist of results) {
      const normalizedName = artist.name.trim().toLowerCase();
      const existing = uniqueArtists.get(normalizedName);

      if (!existing) {
        uniqueArtists.set(normalizedName, artist);
        continue;
      }

      // Conflict Resolution Logic:
      // 1. Prefer claimed profiles
      // 2. Prefer profiles with images
      // 3. Prefer profiles with more engagement (articles + events)
      // 4. Prefer profiles with more views
      let shouldReplace = false;

      if (artist.claimed && !existing.claimed) {
        shouldReplace = true;
      } else if (artist.claimed === existing.claimed) {
        if (artist.image && !existing.image) {
          shouldReplace = true;
        } else if (!!artist.image === !!existing.image) {
          const artistTotal = (artist.article_count || 0) + (artist.event_count || 0);
          const existingTotal = (existing.article_count || 0) + (existing.event_count || 0);

          if (artistTotal > existingTotal) {
            shouldReplace = true;
          } else if (artistTotal === existingTotal) {
            if ((artist.profile_views || 0) > (existing.profile_views || 0)) {
              shouldReplace = true;
            }
          }
        }
      }

      if (shouldReplace) {
        uniqueArtists.set(normalizedName, artist);
      }
    }

    // Transform to match existing Artist interface
    const artistList = [...uniqueArtists.values()]
      .map((artist) => ({
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
      }))
      .toSorted((a, b) => {
        const direction = order === "asc" ? 1 : -1;
        if (sort === "name") {
          return a.name.localeCompare(b.name) * direction;
        }
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
      });

    if (paginated) {
      const pageResults = artistList.slice(offset, offset + limit);
      return NextResponse.json(
        {
          count: artistList.length,
          hasMore: offset + limit < artistList.length,
          results: pageResults,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
          },
        },
      );
    }

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
