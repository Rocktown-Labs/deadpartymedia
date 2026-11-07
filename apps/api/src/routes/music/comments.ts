import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { articleComments, artists, posts, users } from "@dpmedia/db/schema";
import type { NeonHttpDb } from "@dpmedia/db/http";
import { clerkClient, requireAuth } from "../../auth";
import { getDb } from "../../db";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/articles/[slug]/comments/route.ts.
 * Response shapes are identical to the Next.js route so the web app's
 * react-query hooks keep working.
 */
export const musicCommentsRoutes = new Hono<AppEnv>();

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
  parent: z.number().int().positive().optional(),
});

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const VALID_ROLES: ReadonlySet<string> = new Set([
  "super_admin",
  "writer",
  "artist",
  "venue",
  "artmaker",
  "arts_admin",
  "arts_writer",
  "fan",
]);

const LEGACY_ROLE_ALIASES: Readonly<Record<string, string>> = {
  admin: "super_admin",
};

/** Mirrors parseRole from apps/web/src/lib/auth/role.ts. */
function parseRole(value?: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = LEGACY_ROLE_ALIASES[value] ?? value;
  return VALID_ROLES.has(normalizedValue) ? normalizedValue : null;
}

/** Mirrors getPrimaryEmail from apps/web/src/lib/auth/clerk.ts. */
function getPrimaryEmail(user: {
  emailAddresses: { emailAddress: string; id: string }[];
  primaryEmailAddressId: string | null;
}): string | null {
  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId,
  )?.emailAddress;

  return primaryEmail ?? user.emailAddresses[0]?.emailAddress ?? null;
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
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

async function getPublishedPostBySlug(db: NeonHttpDb, slug: string) {
  const [post] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .limit(1);

  return post ?? null;
}

musicCommentsRoutes.get("/articles/:slug/comments", async (c) => {
  try {
    const slug = c.req.param("slug");
    const db = getDb(c.env);
    const post = await getPublishedPostBySlug(db, slug);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const requestUrl = new URL(c.req.url);
    const page = parsePositiveInt(c.req.query("page"), 1);
    const pageSize = Math.min(
      parsePositiveInt(c.req.query("page_size"), DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const offset = (page - 1) * pageSize;

    const [countResult] = await db
      .select({ total: count() })
      .from(articleComments)
      .where(and(eq(articleComments.postId, post.id), isNull(articleComments.parentId)));

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
      return c.json({
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
        content: reply.content,
        created_at: reply.created_at.toISOString(),
        id: reply.id,
        updated_at: reply.updated_at.toISOString(),
        user_name: reply.user_name,
      })),
      updated_at: comment.updated_at.toISOString(),
    }));

    return c.json({
      count: totalComments,
      next: hasNextPage ? buildPaginationUrl(requestUrl, page + 1, pageSize) : null,
      previous: hasPreviousPage ? buildPaginationUrl(requestUrl, page - 1, pageSize) : null,
      results: response,
    });
  } catch (error) {
    console.error("[api] fetch_article_comments:", error);
    return c.json({ error: "Failed to fetch article comments" }, 500);
  }
});

musicCommentsRoutes.post("/articles/:slug/comments", async (c) => {
  // Outside the try: the HTTPException from requireAuth must not be
  // swallowed by the catch-all below (the source returns 401 directly).
  const auth = requireAuth(c);
  const userId = auth.userId;

  try {
    const slug = c.req.param("slug");
    const db = getDb(c.env);
    const post = await getPublishedPostBySlug(db, slug);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON payload" }, 400);
    }

    const validationResult = createCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json(
        {
          details: validationResult.error.issues.map((issue) => issue.message),
          error: "Validation failed",
        },
        400,
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
        return c.json({ error: "Parent comment not found" }, 400);
      }
    }

    const [dbUser] = await db
      .select({ onboardingComplete: users.onboardingComplete, role: users.role })
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1);

    const sessionClaims = auth.claims as {
      metadata?: { onboardingComplete?: unknown; role?: unknown };
    };
    const sessionRole = parseRole(sessionClaims?.metadata?.role);
    const role = sessionRole ?? dbUser?.role ?? "fan";
    const onboardingComplete =
      sessionClaims?.metadata?.onboardingComplete === true || dbUser?.onboardingComplete === true;

    if (!onboardingComplete) {
      return c.json({ error: "Complete onboarding before posting comments" }, 403);
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
        return c.json({ error: "Complete artist onboarding before posting comments" }, 403);
      }
    }

    const client = clerkClient(c.env);
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

    if (!created) {
      throw new Error("Insert returned no comment row");
    }

    return c.json(
      {
        ...created,
        created_at: created.created_at.toISOString(),
        replies: [],
        updated_at: created.updated_at.toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("[api] create_article_comment:", error);
    return c.json({ error: "Failed to create comment" }, 500);
  }
});
