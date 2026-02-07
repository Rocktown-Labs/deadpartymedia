import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { posts, userArticleSaves } from "@/lib/db/schema";

const saveArticleSchema = z.object({
  article_id: z.number().int().positive(),
});

function serializeArticle(row: {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  authorId: string;
  publishedAt: Date | null;
  views: number;
  createdAt: Date;
}) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    cover_image: row.coverImage,
    author: {
      id: row.authorId,
      name: "",
    },
    published_at: row.publishedAt?.toISOString() ?? null,
    views: row.views,
    created_at: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db
    .select({
      id: userArticleSaves.id,
      savedAt: userArticleSaves.savedAt,
      article: {
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        coverImage: posts.coverImage,
        authorId: posts.authorId,
        publishedAt: posts.publishedAt,
        views: posts.views,
        createdAt: posts.createdAt,
      },
    })
    .from(userArticleSaves)
    .innerJoin(posts, eq(userArticleSaves.postId, posts.id))
    .where(and(eq(userArticleSaves.clerkUserId, userId), eq(posts.status, "published")))
    .orderBy(desc(userArticleSaves.savedAt));

  return NextResponse.json({
    count: items.length,
    next: null,
    previous: null,
    results: items.map((item) => ({
      id: item.id,
      article: serializeArticle(item.article),
      saved_at: item.savedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = saveArticleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid article_id" }, { status: 400 });
  }

  const articleId = parsed.data.article_id;

  const [article] = await db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      coverImage: posts.coverImage,
      authorId: posts.authorId,
      publishedAt: posts.publishedAt,
      views: posts.views,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(and(eq(posts.id, articleId), eq(posts.status, "published")))
    .limit(1);

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  const [saved] = await db
    .insert(userArticleSaves)
    .values({
      clerkUserId: userId,
      postId: articleId,
      savedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userArticleSaves.clerkUserId, userArticleSaves.postId],
      set: { savedAt: new Date() },
    })
    .returning({
      id: userArticleSaves.id,
      savedAt: userArticleSaves.savedAt,
    });

  return NextResponse.json({
    id: saved.id,
    article: serializeArticle(article),
    saved_at: saved.savedAt.toISOString(),
  });
}
