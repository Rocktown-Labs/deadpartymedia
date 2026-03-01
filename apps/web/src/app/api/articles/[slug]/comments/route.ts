import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { articleComments, artists, posts, users } from "@/lib/db/schema";
import { parseRole } from "@/lib/auth/role";
import { getPrimaryEmail } from "@/lib/auth/clerk";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  parent: z.number().int().positive().optional(),
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type RouteParams = { slug: string } | Promise<{ slug: string }>;

async function resolveSlug(params: RouteParams): Promise<string> {
  const resolved = await params;
  return resolved.slug;
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

async function getPublishedPostBySlug(slug: string) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);

  return post ?? null;
}

export async function GET(request: NextRequest, { params }: { params: RouteParams }) {
  const log = getRequestLogger(request);
  let slug = "unknown";
  try {
    slug = await resolveSlug(params);
    const post = await getPublishedPostBySlug(slug);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
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
      .where(and(eq(articleComments.postId, post.id), isNull(articleComments.parentId)));

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
        content: articleComments.content,
        created_at: articleComments.createdAt,
        id: articleComments.id,
        updated_at: articleComments.updatedAt,
        user_name: articleComments.userName,
      })
      .from(articleComments)
      .where(and(eq(articleComments.postId, post.id), isNull(articleComments.parentId)))
      .orderBy(asc(articleComments.createdAt))
      .limit(pageSize)
      .offset(offset);

    if (topLevelComments.length === 0) {
      return NextResponse.json({
        count: totalComments,
        next: null,
        previous: page > 1 ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
        results: [],
      });
    }

    const parentIds = topLevelComments.map((comment) => comment.id);
    const replies = await db
      .select({
        content: articleComments.content,
        created_at: articleComments.createdAt,
        id: articleComments.id,
        parent_id: articleComments.parentId,
        updated_at: articleComments.updatedAt,
        user_name: articleComments.userName,
      })
      .from(articleComments)
      .where(and(eq(articleComments.postId, post.id), inArray(articleComments.parentId, parentIds)))
      .orderBy(asc(articleComments.createdAt));

    const repliesByParentId = new Map<number, typeof replies>();
    for (const reply of replies) {
      const parentId = reply.parent_id;
      if (!parentId) {
        continue;
      }
      const existing = repliesByParentId.get(parentId) ?? [];
      existing.push(reply);
      repliesByParentId.set(parentId, existing);
    }

    const hasNextPage = offset + topLevelComments.length < totalComments;
    const hasPreviousPage = page > 1;

    const response = topLevelComments.map((comment) => ({
      ...comment,
      created_at: comment.created_at.toISOString(),
      replies: (repliesByParentId.get(comment.id) ?? []).map((reply) => ({
        id: reply.id,
        content: reply.content,
        user_name: reply.user_name,
        created_at: reply.created_at.toISOString(),
        updated_at: reply.updated_at.toISOString(),
      })),
      updated_at: comment.updated_at.toISOString(),
    }));

    return NextResponse.json({
      count: totalComments,
      next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
      previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
      results: response,
    });
  } catch (error) {
    log.error(
      {
        error: sanitizeError(error),
        operation: "fetch_article_comments",
        slug,
      },
      "Error fetching article comments",
    );
    return NextResponse.json({ error: "Failed to fetch article comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
  const log = getRequestLogger(request);
  let slug = "unknown";
  try {
    slug = await resolveSlug(params);
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const post = await getPublishedPostBySlug(slug);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const validationResult = createCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          details: validationResult.error.issues.map((issue) => issue.message),
          error: "Validation failed",
        },
        { status: 400 },
      );
    }

    const { content, parent } = validationResult.data;

    if (parent) {
      const [parentComment] = await db
        .select({ id: articleComments.id })
        .from(articleComments)
        .where(
          and(
            eq(articleComments.id, parent),
            eq(articleComments.postId, post.id),
            isNull(articleComments.parentId),
          ),
        )
        .limit(1);

      if (!parentComment) {
        return NextResponse.json({ error: "Parent comment not found" }, { status: 400 });
      }
    }

    const [dbUser] = await db
      .select({ onboardingComplete: users.onboardingComplete, role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const sessionRole = parseRole(sessionClaims?.metadata?.role);
    const role = sessionRole ?? dbUser?.role ?? "fan";
    const onboardingComplete =
      sessionClaims?.metadata?.onboardingComplete === true || dbUser?.onboardingComplete === true;

    if (!onboardingComplete) {
      return NextResponse.json(
        { error: "Complete onboarding before posting comments" },
        { status: 403 },
      );
    }

    if (role === "artist") {
      const [artist] = await db
        .select({
          instagram: artists.instagram,
          spotifyArtistId: artists.spotifyArtistId,
          spotifyUrl: artists.spotifyUrl,
        })
        .from(artists)
        .where(eq(artists.claimedById, userId))
        .limit(1);

      const hasSpotify =
        Boolean(artist?.spotifyArtistId?.trim()) && Boolean(artist?.spotifyUrl?.trim());
      const hasInstagram = Boolean(artist?.instagram?.trim());

      if (!hasSpotify || !hasInstagram) {
        return NextResponse.json(
          { error: "Complete artist onboarding before posting comments" },
          { status: 403 },
        );
      }
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const userName = user.fullName || fallbackName || "User";
    const userEmail = getPrimaryEmail(user);

    const [created] = await db
      .insert(articleComments)
      .values({
        clerkUserId: userId,
        content,
        parentId: parent ?? null,
        postId: post.id,
        userEmail,
        userName,
      })
      .returning({
        content: articleComments.content,
        created_at: articleComments.createdAt,
        id: articleComments.id,
        updated_at: articleComments.updatedAt,
        user_name: articleComments.userName,
      });

    return NextResponse.json(
      {
        ...created,
        created_at: created.created_at.toISOString(),
        replies: [],
        updated_at: created.updated_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    log.error(
      {
        error: sanitizeError(error),
        operation: "create_article_comment",
        slug,
      },
      "Error creating article comment",
    );
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
