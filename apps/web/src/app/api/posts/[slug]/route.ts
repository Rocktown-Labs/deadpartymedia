import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postArtists, artists, articleComments } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

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

    // Get artist relations for this post
    const postArtistsData = await db
      .select({
        id: artists.id,
        slug: artists.slug,
        name: artists.name,
        image: artists.image,
      })
      .from(postArtists)
      .innerJoin(artists, eq(postArtists.artistId, artists.id))
      .where(eq(postArtists.postId, post.id));

    const [commentCountResult] = await db
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(articleComments)
      .where(eq(articleComments.postId, post.id));

    // Parse Tiptap content and convert to HTML
    let content;
    try {
      const tiptapJson = JSON.parse(post.content);
      // Convert Tiptap JSON to HTML using the same extensions as the editor
      content = generateHTML(tiptapJson, [StarterKit, Image]);
    } catch {
      // If parsing fails, assume it's already HTML or plain text
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
      artists: postArtistsData,
      published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      views: post.views,
      comment_count: commentCountResult?.count ?? 0,
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
