import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { musicReleases, artists } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const releaseType = searchParams.get("type");
    const genre = searchParams.get("genre");
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const featured = searchParams.get("featured") === "true";

    const conditions = [eq(musicReleases.status, "published")];
    if (releaseType && ["Album", "Single", "EP"].includes(releaseType)) {
      conditions.push(eq(musicReleases.releaseType, releaseType));
    }
    if (genre && ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"].includes(genre)) {
      conditions.push(eq(musicReleases.genre, genre as any));
    }
    if (featured) {
      conditions.push(eq(musicReleases.featured, true));
    }

    const rows = await db
      .select({
        appleMusicUrl: musicReleases.appleMusicUrl,
        artistId: musicReleases.artistId,
        artistName: musicReleases.artistName,
        artistSlug: artists.slug,
        bandcampUrl: musicReleases.bandcampUrl,
        content: musicReleases.content,
        coverArt: musicReleases.coverArt,
        createdAt: musicReleases.createdAt,
        excerpt: musicReleases.excerpt,
        featured: musicReleases.featured,
        genre: musicReleases.genre,
        id: musicReleases.id,
        releaseDate: musicReleases.releaseDate,
        releaseType: musicReleases.releaseType,
        slug: musicReleases.slug,
        spotifyUrl: musicReleases.spotifyUrl,
        title: musicReleases.title,
        youtubeUrl: musicReleases.youtubeUrl,
      })
      .from(musicReleases)
      .leftJoin(artists, eq(musicReleases.artistId, artists.id))
      .where(and(...conditions))
      .orderBy(desc(musicReleases.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(rows);
  } catch (error) {
    log.error({ error: sanitizeError(error) }, "Error fetching music releases");
    return NextResponse.json({ error: "Failed to fetch music releases" }, { status: 500 });
  }
}
