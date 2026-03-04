import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, postArtists, posts, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

function resolveAuthorName(
  firstName: string | null,
  lastName: string | null,
  email: string | null,
) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName.length > 0) {
    return fullName;
  }
  if (typeof email === "string" && email.trim().length > 0) {
    return email;
  }
  return "Unknown";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    // First get the artist by slug
    const [artist] = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Query posts joined with postArtists where artist matches and post is published
    const results = await db
      .select({
        author_email: users.email,
        author_first_name: users.firstName,
        author_id: posts.authorId,
        author_last_name: users.lastName,
        category: posts.category,
        cover_image: posts.coverImage,
        created_at: posts.createdAt,
        excerpt: posts.excerpt,
        id: posts.id,
        is_cover_story: posts.isCoverStory,
        published_at: posts.publishedAt,
        slug: posts.slug,
        title: posts.title,
        views: posts.views,
      })
      .from(posts)
      .innerJoin(postArtists, eq(posts.id, postArtists.postId))
      .leftJoin(users, eq(posts.authorId, users.clerkId))
      .where(and(eq(postArtists.artistId, artist.id), eq(posts.status, "published")))
      .orderBy(desc(posts.publishedAt));

    // Transform to match existing ArticleList interface
    const articles = results.map((post) => ({
      author: {
        id: post.author_id,
        name: resolveAuthorName(post.author_first_name, post.author_last_name, post.author_email),
      },
      category: post.category,
      cover_image: post.cover_image,
      created_at: post.created_at.toISOString(),
      excerpt: post.excerpt,
      id: post.id,
      is_cover_story: post.is_cover_story,
      published_at: post.published_at?.toISOString() || post.created_at.toISOString(),
      slug: post.slug,
      title: post.title,
      views: post.views,
    }));

    return NextResponse.json(articles);
  } catch (error) {
    log.error(
      {
        error: sanitizeError(error),
        operation: "fetch_artist_articles",
        slug: (await params).slug,
      },
      "Error fetching artist articles",
    );
    return NextResponse.json({ error: "Failed to fetch artist articles" }, { status: 500 });
  }
}
