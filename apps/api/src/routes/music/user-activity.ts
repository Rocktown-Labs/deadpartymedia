import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { articleComments, posts, userArticleReads, userArticleSaves } from "@dpmedia/db/schema";
import { requireAuth } from "../../auth";
import { getDb } from "../../db";
import { getUserStats } from "../../lib/user-stats";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/user/{articles/read,articles/saved,
 * articles/saved/[id],comments,stats}/route.ts.
 * Response shapes are identical to the Next.js routes so the web app's
 * react-query hooks keep working.
 */
export const musicUserActivityRoutes = new Hono<AppEnv>();

const markReadSchema = z.object({
  article_id: z.number().int().positive(),
});

const saveArticleSchema = z.object({
  article_id: z.number().int().positive(),
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

function buildPaginationUrl(url: URL, page: number, pageSize: number): string {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set("page", String(page));
  nextUrl.searchParams.set("page_size", String(pageSize));
  return nextUrl.toString();
}

function buildRelativePaginationUrl(url: URL, page: number, pageSize: number): string {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set("page", String(page));
  nextUrl.searchParams.set("page_size", String(pageSize));
  const path = nextUrl.pathname;
  const search = nextUrl.searchParams.toString();
  return search ? `${path}?${search}` : path;
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
    author: {
      id: row.authorId,
      name: "",
    },
    cover_image: row.coverImage,
    created_at: row.createdAt.toISOString(),
    excerpt: row.excerpt,
    id: row.id,
    published_at: row.publishedAt?.toISOString() ?? null,
    slug: row.slug,
    title: row.title,
    views: row.views,
  };
}

// --- GET/POST /user/articles/read (apps/web/.../articles/read/route.ts) ---

musicUserActivityRoutes.get("/user/articles/read", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const requestUrl = new URL(c.req.url);
  const page = parsePositiveInt(c.req.query("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(c.req.query("page_size"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const db = getDb(c.env);
  const [countResult] = await db
    .select({ total: count() })
    .from(userArticleReads)
    .innerJoin(posts, eq(userArticleReads.postId, posts.id))
    .where(and(eq(userArticleReads.clerkUserId, userId), eq(posts.status, "published")));

  const totalReads = Number(countResult?.total ?? 0);
  if (totalReads === 0) {
    return c.json({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  }

  const items = await db
    .select({
      article: {
        authorId: posts.authorId,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
        excerpt: posts.excerpt,
        id: posts.id,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        title: posts.title,
        views: posts.views,
      },
      id: userArticleReads.id,
      readAt: userArticleReads.readAt,
    })
    .from(userArticleReads)
    .innerJoin(posts, eq(userArticleReads.postId, posts.id))
    .where(and(eq(userArticleReads.clerkUserId, userId), eq(posts.status, "published")))
    .orderBy(desc(userArticleReads.readAt))
    .limit(pageSize)
    .offset(offset);

  const hasNextPage = offset + items.length < totalReads;
  const hasPreviousPage = page > 1;

  return c.json({
    count: totalReads,
    next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
    previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
    results: items.map((item) => ({
      article: serializeArticle(item.article),
      id: item.id,
      read_at: item.readAt.toISOString(),
    })),
  });
});

musicUserActivityRoutes.post("/user/articles/read", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const parsed = markReadSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid article_id" }, 400);
  }

  const articleId = parsed.data.article_id;

  const db = getDb(c.env);
  const [article] = await db
    .select({
      authorId: posts.authorId,
      coverImage: posts.coverImage,
      createdAt: posts.createdAt,
      excerpt: posts.excerpt,
      id: posts.id,
      publishedAt: posts.publishedAt,
      slug: posts.slug,
      title: posts.title,
      views: posts.views,
    })
    .from(posts)
    .where(and(eq(posts.id, articleId), eq(posts.status, "published")))
    .limit(1);

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  const [saved] = await db
    .insert(userArticleReads)
    .values({
      clerkUserId: userId,
      postId: articleId,
      readAt: new Date(),
    })
    .onConflictDoUpdate({
      set: { readAt: new Date() },
      target: [userArticleReads.clerkUserId, userArticleReads.postId],
    })
    .returning({
      id: userArticleReads.id,
      readAt: userArticleReads.readAt,
    });

  if (!saved) {
    return c.json({ error: "Internal server error" }, 500);
  }

  return c.json({
    article: serializeArticle(article),
    id: saved.id,
    read_at: saved.readAt.toISOString(),
  });
});

// --- GET/POST /user/articles/saved, DELETE /user/articles/saved/:id ---

musicUserActivityRoutes.get("/user/articles/saved", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const requestUrl = new URL(c.req.url);
  const page = parsePositiveInt(c.req.query("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(c.req.query("page_size"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const db = getDb(c.env);
  const items = await db
    .select({
      article: {
        authorId: posts.authorId,
        coverImage: posts.coverImage,
        createdAt: posts.createdAt,
        excerpt: posts.excerpt,
        id: posts.id,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        title: posts.title,
        views: posts.views,
      },
      id: userArticleSaves.id,
      savedAt: userArticleSaves.savedAt,
      totalSaves: sql<number>`count(*) over()`,
    })
    .from(userArticleSaves)
    .innerJoin(posts, eq(userArticleSaves.postId, posts.id))
    .where(and(eq(userArticleSaves.clerkUserId, userId), eq(posts.status, "published")))
    .orderBy(desc(userArticleSaves.savedAt))
    .limit(pageSize)
    .offset(offset);

  if (items.length === 0) {
    const [countResult] = await db
      .select({ total: count() })
      .from(userArticleSaves)
      .innerJoin(posts, eq(userArticleSaves.postId, posts.id))
      .where(and(eq(userArticleSaves.clerkUserId, userId), eq(posts.status, "published")));

    const totalSaves = Number(countResult?.total ?? 0);
    if (totalSaves === 0) {
      return c.json({
        count: 0,
        next: null,
        previous: null,
        results: [],
      });
    }

    return c.json({
      count: totalSaves,
      next: null,
      previous: page > 1 ? buildRelativePaginationUrl(requestUrl, page - 1, pageSize) : null,
      results: [],
    });
  }

  const totalSaves = Number(items[0]?.totalSaves ?? 0);
  const hasNextPage = offset + items.length < totalSaves;
  const hasPreviousPage = page > 1;

  return c.json({
    count: totalSaves,
    next: hasNextPage ? buildRelativePaginationUrl(requestUrl, page + 1, pageSize) : null,
    previous: hasPreviousPage ? buildRelativePaginationUrl(requestUrl, page - 1, pageSize) : null,
    results: items.map((item) => ({
      article: serializeArticle(item.article),
      id: item.id,
      saved_at: item.savedAt.toISOString(),
    })),
  });
});

musicUserActivityRoutes.post("/user/articles/saved", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON payload" }, 400);
  }

  const parsed = saveArticleSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid article_id" }, 400);
  }

  const articleId = parsed.data.article_id;

  const db = getDb(c.env);
  const [article] = await db
    .select({
      authorId: posts.authorId,
      coverImage: posts.coverImage,
      createdAt: posts.createdAt,
      excerpt: posts.excerpt,
      id: posts.id,
      publishedAt: posts.publishedAt,
      slug: posts.slug,
      title: posts.title,
      views: posts.views,
    })
    .from(posts)
    .where(and(eq(posts.id, articleId), eq(posts.status, "published")))
    .limit(1);

  if (!article) {
    return c.json({ error: "Article not found" }, 404);
  }

  const [saved] = await db
    .insert(userArticleSaves)
    .values({
      clerkUserId: userId,
      postId: articleId,
      savedAt: new Date(),
    })
    .onConflictDoUpdate({
      set: { savedAt: new Date() },
      target: [userArticleSaves.clerkUserId, userArticleSaves.postId],
    })
    .returning({
      id: userArticleSaves.id,
      savedAt: userArticleSaves.savedAt,
    });

  if (!saved) {
    return c.json({ error: "Internal server error" }, 500);
  }

  return c.json({
    article: serializeArticle(article),
    id: saved.id,
    saved_at: saved.savedAt.toISOString(),
  });
});

musicUserActivityRoutes.delete("/user/articles/saved/:id", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const id = c.req.param("id");
  const parsedId = Number.parseInt(id, 10);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return c.json({ error: "Invalid id" }, 400);
  }

  const db = getDb(c.env);
  const [deleted] = await db
    .delete(userArticleSaves)
    .where(and(eq(userArticleSaves.id, parsedId), eq(userArticleSaves.clerkUserId, userId)))
    .returning({ id: userArticleSaves.id });

  if (!deleted) {
    return c.json({ error: "Saved article not found" }, 404);
  }

  return c.json({ success: true });
});

// --- GET /user/comments (apps/web/.../user/comments/route.ts) ---

interface ReplyRow {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

musicUserActivityRoutes.get("/user/comments", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  const requestUrl = new URL(c.req.url);
  const page = parsePositiveInt(c.req.query("page"), 1);
  const pageSize = Math.min(
    parsePositiveInt(c.req.query("page_size"), DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * pageSize;

  const db = getDb(c.env);
  const [countResult] = await db
    .select({ total: count() })
    .from(articleComments)
    .innerJoin(posts, eq(articleComments.postId, posts.id))
    .where(
      and(
        eq(articleComments.clerkUserId, userId),
        eq(posts.status, "published"),
        isNull(articleComments.parentId),
      ),
    );

  const totalComments = Number(countResult?.total ?? 0);
  if (totalComments === 0) {
    return c.json({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  }

  const topLevelComments = await db
    .select({
      article: {
        coverImage: posts.coverImage,
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
      },
      content: articleComments.content,
      createdAt: articleComments.createdAt,
      id: articleComments.id,
      parent: articleComments.parentId,
      postId: articleComments.postId,
      updatedAt: articleComments.updatedAt,
    })
    .from(articleComments)
    .innerJoin(posts, eq(articleComments.postId, posts.id))
    .where(
      and(
        eq(articleComments.clerkUserId, userId),
        eq(posts.status, "published"),
        isNull(articleComments.parentId),
      ),
    )
    .orderBy(desc(articleComments.createdAt))
    .limit(pageSize)
    .offset(offset);

  const topLevelCommentIds = topLevelComments.map((comment) => comment.id);
  const replies = topLevelCommentIds.length
    ? await db
        .select({
          content: articleComments.content,
          createdAt: articleComments.createdAt,
          id: articleComments.id,
          parentId: articleComments.parentId,
          updatedAt: articleComments.updatedAt,
        })
        .from(articleComments)
        .where(inArray(articleComments.parentId, topLevelCommentIds))
        .orderBy(desc(articleComments.createdAt))
    : [];

  const repliesByParent = new Map<number, ReplyRow[]>();
  for (const reply of replies) {
    const { parentId } = reply;
    if (!parentId) {
      continue;
    }
    const existing = repliesByParent.get(parentId) ?? [];
    existing.push(reply);
    repliesByParent.set(parentId, existing);
  }

  const hasNextPage = offset + topLevelComments.length < totalComments;
  const hasPreviousPage = page > 1;

  return c.json({
    count: totalComments,
    next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
    previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
    results: topLevelComments.map((comment) => ({
      article: {
        cover_image: comment.article.coverImage,
        id: comment.article.id,
        slug: comment.article.slug,
        title: comment.article.title,
      },
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      id: comment.id,
      parent: comment.parent,
      replies: (repliesByParent.get(comment.id) ?? []).map((reply) => ({
        content: reply.content,
        created_at: reply.createdAt.toISOString(),
        id: reply.id,
        updated_at: reply.updatedAt.toISOString(),
      })),
      updated_at: comment.updatedAt.toISOString(),
    })),
  });
});

// --- GET /user/stats (apps/web/.../user/stats/route.ts) ---

musicUserActivityRoutes.get("/user/stats", async (c) => {
  const auth = requireAuth(c);
  const userId = auth.userId;

  try {
    const db = getDb(c.env);
    return c.json(await getUserStats(db, userId));
  } catch {
    return c.json({ error: "Failed to fetch user stats" }, 500);
  }
});
