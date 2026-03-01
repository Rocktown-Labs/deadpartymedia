import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleComments, posts } from "@/lib/db/schema";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface ReplyRow {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {return fallback;}
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {return fallback;}
  return parsed;
}

function buildPaginationUrl(url: URL, page: number, pageSize: number): string {
  const nextUrl = new URL(url.toString());
  nextUrl.searchParams.set("page", String(page));
  nextUrl.searchParams.set("page_size", String(pageSize));
  return nextUrl.toString();
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
    return NextResponse.json({
      count: 0,
      next: null,
      previous: null,
      results: [],
    });
  }

  const topLevelComments = await db
    .select({
      article: {
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        coverImage: posts.coverImage,
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
    const {parentId} = reply;
    if (!parentId) {continue;}
    const existing = repliesByParent.get(parentId) ?? [];
    existing.push(reply);
    repliesByParent.set(parentId, existing);
  }

  const hasNextPage = offset + topLevelComments.length < totalComments;
  const hasPreviousPage = page > 1;

  return NextResponse.json({
    count: totalComments,
    next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
    previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
    results: topLevelComments.map((comment) => ({
      article: {
        id: comment.article.id,
        slug: comment.article.slug,
        title: comment.article.title,
        cover_image: comment.article.coverImage,
      },
      content: comment.content,
      created_at: comment.createdAt.toISOString(),
      id: comment.id,
      parent: comment.parent,
      replies: (repliesByParent.get(comment.id) ?? []).map((reply) => ({
        id: reply.id,
        content: reply.content,
        created_at: reply.createdAt.toISOString(),
        updated_at: reply.updatedAt.toISOString(),
      })),
      updated_at: comment.updatedAt.toISOString(),
    })),
  });
}
