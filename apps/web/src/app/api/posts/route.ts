import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: Request) {
  try {
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

    // Transform to match existing ArticleList interface
    const articles = results.map((post) => ({
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
      published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      views: post.views,
      is_cover_story: post.isCoverStory,
    }));

    return NextResponse.json({
      count: articles.length,
      results: articles,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
