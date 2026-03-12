import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, postArtists, artists, articleComments, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { normalizeStoredPostContent } from "@/lib/content/post-content";

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

    const [row] = await db
      .select({
        authorEmail: users.email,
        authorFirstName: users.firstName,
        authorId: posts.authorId,
        authorLastName: users.lastName,
        category: posts.category,
        content: posts.content,
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
      .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
      .limit(1);

    const post = row;
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get artist relations for this post
    const postArtistsData = await db
      .select({
        id: artists.id,
        image: artists.image,
        name: artists.name,
        slug: artists.slug,
      })
      .from(postArtists)
      .innerJoin(artists, eq(postArtists.artistId, artists.id))
      .where(eq(postArtists.postId, post.id));

    const [commentCountResult] = await db
      .select({ count: sql<number>`count(*)::int`.as("count") })
      .from(articleComments)
      .where(eq(articleComments.postId, post.id));

    // Normalize stored content and convert to HTML when TipTap JSON is present.
    const normalizedContent = normalizeStoredPostContent(post.content);
    const content = normalizedContent.tiptapDoc
      ? generateHTML(normalizedContent.tiptapDoc, [StarterKit, Image])
      : post.content;

    // Transform to match existing Article interface
    const article = {
      artists: postArtistsData,
      author: {
        id: post.authorId,
        name: resolveAuthorName(post.authorFirstName, post.authorLastName, post.authorEmail),
      },
      category: post.category,
      comment_count: commentCountResult?.count ?? 0,
      content,
      content_doc: normalizedContent.tiptapDoc,
      content_html: content,
      content_kind: normalizedContent.kind,
      cover_image: post.coverImage,
      created_at: post.createdAt.toISOString(),
      excerpt: post.excerpt,
      id: post.id,
      is_cover_story: post.isCoverStory,
      published_at: post.publishedAt?.toISOString() || post.createdAt.toISOString(),
      slug: post.slug,
      title: post.title,
      updated_at: post.updatedAt.toISOString(),
      views: post.views,
    };

    return NextResponse.json(article);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_post", slug: (await params).slug },
      "Error fetching post",
    );
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
