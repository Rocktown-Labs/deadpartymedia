import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { posts, userArticleReads } from "@/lib/db/schema";

const markReadSchema = z.object({
  article_id: z.number().int().positive(),
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function buildPaginationUrl(url: URL, page: number, pageSize: number): string {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set("page", String(page));
  nextUrl.searchParams.set("page_size", String(pageSize));
  return nextUrl.toString();
}

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

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const page = parsePositiveInt(requestUrl.searchParams.get("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(requestUrl.searchParams.get("page_size"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const [countResult] = await db
    .select({ total: count() })
    .from(userArticleReads)
    .innerJoin(posts, eq(userArticleReads.postId, posts.id))
    .where(and(eq(userArticleReads.clerkUserId, userId), eq(posts.status, "published")));

  const totalReads = Number(countResult?.total ?? 0);
  if (totalReads === 0) {
    return NextResponse.json({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  }

  const items = await db
    .select({
      id: userArticleReads.id,
      readAt: userArticleReads.readAt,
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
    .from(userArticleReads)
    .innerJoin(posts, eq(userArticleReads.postId, posts.id))
    .where(and(eq(userArticleReads.clerkUserId, userId), eq(posts.status, "published")))
    .orderBy(desc(userArticleReads.readAt))
    .limit(pageSize)
    .offset(offset);

  const hasNextPage = offset + items.length < totalReads;
  const hasPreviousPage = page > 1;

  return NextResponse.json({
    count: totalReads,
    next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
    previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
    results: items.map((item) => ({
      id: item.id,
      article: serializeArticle(item.article),
      read_at: item.readAt.toISOString(),
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

  const parsed = markReadSchema.safeParse(body);

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
    .insert(userArticleReads)
    .values({
      clerkUserId: userId,
      postId: articleId,
      readAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [userArticleReads.clerkUserId, userArticleReads.postId],
      set: { readAt: new Date() },
    })
    .returning({
      id: userArticleReads.id,
      readAt: userArticleReads.readAt,
    });

  return NextResponse.json({
    id: saved.id,
    article: serializeArticle(article),
    read_at: saved.readAt.toISOString(),
  });
}
