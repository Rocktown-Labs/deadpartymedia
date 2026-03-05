import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postArtists, artists, articleComments, users } from "@/lib/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

const POST_CATEGORIES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type PostCategory = (typeof POST_CATEGORIES)[number];

function isPostCategory(value: string): value is PostCategory {
  return POST_CATEGORIES.includes(value as PostCategory);
}

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

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const coverStory = searchParams.get("cover_story") === "true";

    // Build where conditions
    const conditions = [eq(posts.status, "published")];
    if (category && isPostCategory(category)) {
      conditions.push(eq(posts.category, category));
    }
    if (coverStory) {
      conditions.push(eq(posts.isCoverStory, true));
    }

    const results = await db
      .select({
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorId: posts.authorId,
        authorLastName: users.lastName,
        category: posts.category,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
        excerpt: posts.excerpt,
        id: posts.id,
        isCoverStory: posts.isCoverStory,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        status: posts.status,
        title: posts.title,
        updatedAt: posts.updatedAt,
        views: posts.views,
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.clerkId))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(posts.publishedAt))
      .limit(limit)
      .offset(offset);

    // Get artist relations for all posts
    const postIds = results.map((post) => post.id);
    const artistRelations: Record<
      number,
      {
        postId: number;
        artistId: number;
        artistSlug: string;
        artistName: string;
        artistImage: string | null;
      }[]
    > = {};
    const commentCountByPostId = new Map<number, number>();

    if (postIds.length > 0) {
      const relations = await db
        .select({
          artistId: artists.id,
          artistImage: artists.image,
          artistName: artists.name,
          artistSlug: artists.slug,
          postId: postArtists.postId,
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
          count: sql<number>`count(*)::int`.as("count"),
          postId: articleComments.postId,
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
        artists: postArtistsData.map((a) => ({
          id: a.artistId,
          image: a.artistImage,
          name: a.artistName,
          slug: a.artistSlug,
        })),
        author: {
          id: post.authorId,
          name: resolveAuthorName(post.authorFirstName, post.authorLastName, post.authorEmail),
        },
        category: post.category,
        comment_count: commentCountByPostId.get(post.id) ?? 0,
        cover_image: post.coverImage,
        created_at: post.createdAt.toISOString(),
        excerpt: post.excerpt,
        id: post.id,
        is_cover_story: post.isCoverStory,
        published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
        slug: post.slug,
        title: post.title,
        views: post.views,
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
      },
    );
  } catch (error) {
    log.error({ error: sanitizeError(error), operation: "fetch_posts" }, "Error fetching posts");
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
