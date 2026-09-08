import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { musicReleases, artists, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    const [release] = await db
      .select({
        appleMusicUrl: musicReleases.appleMusicUrl,
        artistBio: artists.bio,
        artistId: musicReleases.artistId,
        artistImage: artists.image,
        artistName: musicReleases.artistName,
        artistSlug: artists.slug,
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorId: musicReleases.authorId,
        authorLastName: users.lastName,
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
        status: musicReleases.status,
        title: musicReleases.title,
        updatedAt: musicReleases.updatedAt,
        views: musicReleases.views,
        youtubeUrl: musicReleases.youtubeUrl,
      })
      .from(musicReleases)
      .leftJoin(artists, eq(musicReleases.artistId, artists.id))
      .leftJoin(users, eq(musicReleases.authorId, users.clerkId))
      .where(and(eq(musicReleases.slug, slug), eq(musicReleases.status, "published")))
      .limit(1);

    if (!release) {
      return NextResponse.json({ error: "Music release not found" }, { status: 404 });
    }

    // Increment view count asynchronously
    db.update(musicReleases)
      .set({ views: sql`${musicReleases.views} + 1` })
      .where(eq(musicReleases.id, release.id))
      .catch((err) => {
        log.error({ error: sanitizeError(err) }, "Failed to increment music release views");
      });

    const authorName =
      [release.authorFirstName, release.authorLastName].filter(Boolean).join(" ").trim() ||
      release.authorEmail ||
      "Dead Party Media";

    return NextResponse.json({
      ...release,
      author: {
        id: release.authorId,
        name: authorName,
      },
    });
  } catch (error) {
    log.error({ error: sanitizeError(error) }, "Error fetching single music release");
    return NextResponse.json({ error: "Failed to fetch music release" }, { status: 500 });
  }
}
