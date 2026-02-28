import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, postArtists, posts, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

function resolveAuthorName(firstName: string | null, lastName: string | null, email: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName.length > 0) return fullName;
  if (typeof email === "string" && email.trim().length > 0) return email;
  return "Unknown";
}

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
        author_first_name: users.firstName,
        author_last_name: users.lastName,
        author_email: users.email,
        published_at: posts.publishedAt,
        views: posts.views,
        is_cover_story: posts.isCoverStory,
        created_at: posts.createdAt,
      })
      .from(posts)
      .innerJoin(postArtists, eq(posts.id, postArtists.postId))
      .leftJoin(users, eq(posts.authorId, users.clerkId))
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
        name: resolveAuthorName(
          post.author_first_name,
          post.author_last_name,
          post.author_email,
        ),
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
