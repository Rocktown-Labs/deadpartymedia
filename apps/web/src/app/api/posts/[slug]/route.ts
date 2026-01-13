import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Parse Tiptap content
    let content;
    try {
      content = JSON.parse(post.content);
    } catch {
      content = post.content;
    }

    // Transform to match existing Article interface
    const article = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      category: post.category,
      excerpt: post.excerpt,
      content,
      cover_image: post.coverImage,
      author: {
        id: post.authorId,
        name: "", // Would need to fetch from Clerk or join
      },
      published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      views: post.views,
      is_cover_story: post.isCoverStory,
      created_at: post.createdAt.toISOString(),
      updated_at: post.updatedAt.toISOString(),
    };

    return NextResponse.json(article);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_post", slug: (await params).slug },
      "Error fetching post"
    );
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
