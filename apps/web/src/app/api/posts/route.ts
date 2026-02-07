import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postArtists, artists, articleComments } from "@/lib/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { cacheTag } from "next/cache";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    cacheTag("posts");
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const coverStory = searchParams.get("cover_story") === "true";

    // Build where conditions
    const conditions = [eq(posts.status, "published")];
    if (category) {
      conditions.push(eq(posts.category, category as any));
    }
    if (coverStory) {
      conditions.push(eq(posts.isCoverStory, true));
    }

    const results = await db
      .select()
      .from(posts)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset);

    // Get artist relations for all posts
    const postIds = results.map((post) => post.id);
    let artistRelations: Record<number, Array<{
      postId: number;
      artistId: number;
      artistSlug: string;
      artistName: string;
      artistImage: string | null;
    }>> = {};
    const commentCountByPostId = new Map<number, number>();

    if (postIds.length > 0) {
      const relations = await db
        .select({
          postId: postArtists.postId,
          artistId: artists.id,
          artistSlug: artists.slug,
          artistName: artists.name,
          artistImage: artists.image,
        })
        .from(postArtists)
        .innerJoin(artists, eq(postArtists.artistId, artists.id))
        .where(inArray(postArtists.postId, postIds));

      // Group by postId
      for (const rel of relations) {
        if (!artistRelations[rel.postId]) {
          artistRelations[rel.postId] = [];
        }
        artistRelations[rel.postId].push(rel);
      }

      const commentCounts = await db
        .select({
          postId: articleComments.postId,
          count: sql<number>`count(*)::int`.as("count"),
        })
        .from(articleComments)
        .where(inArray(articleComments.postId, postIds))
        .groupBy(articleComments.postId);

      for (const row of commentCounts) {
        commentCountByPostId.set(row.postId, row.count);
      }
    }

    // Transform to match existing ArticleList interface
    const articles = results.map((post) => {
      const postArtistsData = artistRelations[post.id] || [];
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        category: post.category,
        excerpt: post.excerpt,
        cover_image: post.coverImage,
        author: {
          id: post.authorId,
          name: "", // Would need to fetch from Clerk or join
        },
        artists: postArtistsData.map((a) => ({
          id: a.artistId,
          slug: a.artistSlug,
          name: a.artistName,
          image: a.artistImage,
        })),
        published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
        views: post.views,
        comment_count: commentCountByPostId.get(post.id) ?? 0,
        is_cover_story: post.isCoverStory,
        created_at: post.createdAt.toISOString(),
      };
    });

    return NextResponse.json(
      {
        count: articles.length,
        results: articles,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_posts" },
      "Error fetching posts"
    );
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
