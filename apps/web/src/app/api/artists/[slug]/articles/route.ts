import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, postArtists, posts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    // First get the artist by slug
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.slug, slug))
      .limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Query posts joined with postArtists where artist matches and post is published
    const results = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        category: posts.category,
        excerpt: posts.excerpt,
        cover_image: posts.coverImage,
        author_id: posts.authorId,
        published_at: posts.publishedAt,
        views: posts.views,
        is_cover_story: posts.isCoverStory,
        created_at: posts.createdAt,
      })
      .from(posts)
      .innerJoin(postArtists, eq(posts.id, postArtists.postId))
      .where(and(eq(postArtists.artistId, artist.id), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt));

    // Transform to match existing ArticleList interface
    const articles = results.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
      cover_image: post.cover_image,
      author: {
        id: post.author_id,
        name: "", // Would need to fetch from Clerk or join
      },
      published_at: post.published_at?.toISOString() || post.created_at.toISOString(),
      views: post.views,
      is_cover_story: post.is_cover_story,
      created_at: post.created_at.toISOString(),
    }));

    return NextResponse.json(articles);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_artist_articles", slug: (await params).slug },
      "Error fetching artist articles"
    );
    return NextResponse.json({ error: "Failed to fetch artist articles" }, { status: 500 });
  }
}
