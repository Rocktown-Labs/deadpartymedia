import { and, asc, count, desc, eq, ilike, inArray, ne, notInArray, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodError } from "zod";
import {
  artistSchema,
  eventSchema,
  inviteUserSchema,
  musicReleaseSchema,
  postSchema,
  venueSchema,
} from "@dpmedia/contracts";
import type { NeonHttpDb } from "@dpmedia/db/http";
import {
  artists,
  eventArtists,
  events,
  musicReleases,
  postArtists,
  posts,
  users,
  venues,
} from "@dpmedia/db/schema";
import { clerkClient, getRolesFromMetadata, requireRole } from "../../auth";
import type { AppEnv, AuthContext, Bindings } from "../../bindings";
import { getDb } from "../../db";
import { invalid, notFound } from "../../lib/arts-errors";
import { getPrimaryEmail } from "../../lib/clerk-user";
import type { Roles } from "../../lib/role";
import { clampInt } from "../../lib/security";
import { ensureUniqueSlug, generateSlug } from "../../lib/slug";
import { upsertUserAuthState } from "../../lib/user-state";

/**
 * Ported from apps/web/src/app/admin/* — the music admin desk: posts,
 * artists, events, music releases, venues, users, and Clerk invitations,
 * previously Next.js server actions consumed by the /admin tables.
 *
 * action → endpoint mapping (mirrors the source files):
 *   admin/posts/page.tsx list query        → GET    /admin/posts
 *   createPost                             → POST   /admin/posts
 *   updatePost                             → PATCH  /admin/posts/:id
 *   bulkUpdatePostStatus (single row)      → POST   /admin/posts/:id/toggle
 *   deletePost + requestDeletePost        → DELETE /admin/posts/:id
 *   admin/artists/page.tsx list query      → GET    /admin/artists
 *   createArtist                           → POST   /admin/artists
 *   updateArtist                           → PATCH  /admin/artists/:id
 *   deleteArtist                           → DELETE /admin/artists/:id
 *   setArtistHidden                        → POST   /admin/artists/:id/visibility
 *   inviteArtistToClaim                    → POST   /admin/artists/:id/invite
 *   admin/events/page.tsx list query       → GET    /admin/events
 *   createEvent                            → POST   /admin/events
 *   updateEvent                            → PATCH  /admin/events/:id
 *   updateEvent (status flip)              → POST   /admin/events/:id/toggle
 *   deleteEvent                            → DELETE /admin/events/:id
 *   admin/music/page.tsx list query        → GET    /admin/music
 *   createMusicRelease                     → POST   /admin/music
 *   updateMusicRelease                     → PATCH  /admin/music/:id
 *   bulkUpdateMusicReleaseStatus (1 row)   → POST   /admin/music/:id/toggle
 *   deleteMusicRelease                     → DELETE /admin/music/:id
 *   admin/venues/page.tsx list query       → GET    /admin/venues
 *   createVenue                            → POST   /admin/venues
 *   updateVenue                            → PATCH  /admin/venues/:id
 *   deleteVenue                            → DELETE /admin/venues/:id
 *   admin/users/page.tsx user list query   → GET    /admin/users
 *   updateLocalUserRole / updateRoleAction → POST   /admin/users/:id/role
 *   inviteUser                             → POST   /admin/invitations
 *   admin/users/page.tsx invitation list   → GET    /admin/invitations
 *
 * Guards: the music admin roles are ["super_admin", "writer"] (the
 * source's canCreate/canEdit/canDelete model); the users + invitations
 * surface is super_admin only (canManageUsers). Writers manage only their
 * own rows wherever the source enforced it (posts, events, music
 * releases); artists/venues have no ownership checks in the source.
 *
 * Response-shape rules:
 * - Actions that ended in redirect() return { success: true, <entity> }.
 * - Actions with explicit returns keep their source bodies verbatim
 *   (e.g. { redirectUrl: "/admin/music", releaseId }).
 * - Source { success: false, error } returns stay HTTP 200 so ported
 *   clients keep branching on result.success.
 * - Source Error("...") throws became 4xx JSON with the same message:
 *   validation → 400, guards → 403, missing rows → 404.
 *
 * pino logging is not ported; failures log via console.error("[api] ...").
 * revalidatePath/revalidateTag have no API equivalent — the frontend
 * invalidates its queries after a successful call.
 */
export const musicAdminRoutes = new Hono<AppEnv>();

type PostInsert = typeof posts.$inferInsert;
type ArtistGenre = (typeof artists.$inferInsert)["genre"];
type EventInsert = typeof events.$inferInsert;
type MusicReleaseInsert = typeof musicReleases.$inferInsert;

/** Music admin roles (apps/web/src/lib/auth/access.ts permission model). */
const MUSIC_ADMIN_ROLES = ["super_admin", "writer"] as const;
/** canManageUsers() — the users/invitations desk is super_admin only. */
const SUPER_ADMIN_ROLES = ["super_admin"] as const;
/** apps/web/src/lib/admin/table-state.ts ADMIN_PAGE_SIZE. */
const ADMIN_PAGE_SIZE = 10;
/** apps/web/src/lib/auth/role.ts ARTS_ROLES (filtered out of user lists). */
const ARTS_ROLES = ["arts_admin", "arts_writer", "artmaker"] as const;
const LOCAL_PLACEHOLDER_PREFIX = "local_placeholder:";
const WP_PLACEHOLDER_PREFIX = "wp_placeholder:";
const DEFAULT_SITE_URL = "https://deadpartymedia.com";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** The actions joined every zod issue message with ", " (not just the first). */
function zodValidationMessage(error: ZodError): string {
  return error.issues.map((issue) => issue.message).join(", ");
}

async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    throw invalid("Invalid JSON body");
  }
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function idParam(c: Context, name = "id"): number {
  const parsed = Number.parseInt(c.req.param(name) ?? "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw invalid("Invalid id");
  }
  return parsed;
}

function isSuperAdmin(auth: AuthContext): boolean {
  return getRolesFromMetadata(auth.claims).includes("super_admin");
}

/** canEdit(resourceAuthorId): super admins edit anything, writers only their own. */
function canEditResource(auth: AuthContext, resourceAuthorId: string): boolean {
  return isSuperAdmin(auth) || auth.userId === resourceAuthorId;
}

function forbidden(message: string): HTTPException {
  return new HTTPException(403, { res: Response.json({ error: message }) });
}

type SortOrder = "asc" | "desc";

function parseOrder(value: string | undefined, fallback: SortOrder = "desc"): SortOrder {
  return value === "asc" || value === "desc" ? value : fallback;
}

function listPagination(c: Context): { limit: number; offset: number } {
  return {
    limit: clampInt(c.req.query("limit"), ADMIN_PAGE_SIZE, 1, 100),
    offset: clampInt(c.req.query("offset"), 0, 0, 100_000),
  };
}

/**
 * Resolve the primary sort column like the pages' parseSortParam: unknown
 * or missing sort values fall back to the page default.
 */
function sortColumn(
  sort: string | undefined,
  fields: Record<string, AnyPgColumn>,
  fallback: string,
): AnyPgColumn {
  const requested = sort !== undefined ? fields[sort] : undefined;
  const resolved = requested ?? fields[fallback];
  if (!resolved) {
    throw new Error(`Missing sort fallback column: ${fallback}`);
  }
  return resolved;
}

/** Optional status filter for the list endpoints; invalid values are ignored. */
function statusFilter<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | null {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function normalizeArtistIds(ids: number[]): number[] {
  return [...new Set(ids)].toSorted((a, b) => a - b);
}

/**
 * The source read artistIds as a comma-joined FormData string; JSON bodies
 * may send that same string or a real array of ids.
 */
function artistIdsFromInput(value: unknown): number[] {
  if (typeof value === "string") {
    if (!value.trim()) {
      return [];
    }
    return normalizeArtistIds(
      value
        .split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id) && id > 0),
    );
  }
  if (Array.isArray(value)) {
    return normalizeArtistIds(
      value.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0),
    );
  }
  return [];
}

/** The event form's venueId: numeric string/number → id, else null. */
function venueIdFromInput(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  if (value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// Excerpt normalization ported from apps/web/src/lib/admin/wordpress-backfill.ts
// (used by the post actions; the backfill endpoints themselves are out of scope).

function decodeHtmlEntities(str: string): string {
  if (!str) {
    return "";
  }
  return str
    .replaceAll(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&apos;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&ndash;", "–")
    .replaceAll("&mdash;", "—")
    .replaceAll("&rdquo;", "”")
    .replaceAll("&ldquo;", "“")
    .replaceAll("&rsquo;", "’")
    .replaceAll("&lsquo;", "‘");
}

function sanitizeAndTruncateExcerpt(value: string | null | undefined, maxLength = 500): string {
  if (!value) {
    return "";
  }

  const clean = decodeHtmlEntities(value)
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

  if (clean.length <= maxLength) {
    return clean;
  }

  const targetLen = maxLength - 1;
  const cutoff = clean.slice(0, targetLen);
  const lastSpace = cutoff.lastIndexOf(" ");

  const truncated =
    lastSpace > targetLen - 40 ? cutoff.slice(0, lastSpace).trimEnd() : cutoff.trimEnd();

  return `${truncated}…`;
}

// Error message helpers ported verbatim from apps/web/src/lib/utils/error.ts.

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }
  return fallback;
}

function getNestedErrorMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const { errors } = error as { errors?: unknown };
  if (!Array.isArray(errors) || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  if (typeof firstError !== "object" || firstError === null) {
    return undefined;
  }

  const { longMessage } = firstError as { longMessage?: unknown };
  if (typeof longMessage === "string" && longMessage.trim().length > 0) {
    return longMessage;
  }

  const { message } = firstError as { message?: unknown };
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return undefined;
}

// Invitation URL helpers ported from apps/web/src/lib/auth/invitations.ts.
// VERCEL_URL has no Worker equivalent; the WEB_APP_URL binding stands in
// as the deploy URL source after NEXT_PUBLIC_SITE_URL.

function getCanonicalSiteUrl(env: Bindings): string {
  const configuredSiteUrl = env.NEXT_PUBLIC_SITE_URL?.split(",")[0]?.trim();
  const webAppUrl = env.WEB_APP_URL?.trim();
  const candidate = configuredSiteUrl || (webAppUrl ? webAppUrl : DEFAULT_SITE_URL);

  try {
    return new URL(candidate).origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function buildInvitationRedirectUrl(env: Bindings, path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return new URL(path, getCanonicalSiteUrl(env)).toString();
}

/** users/actions.ts getInviteRedirectUrl. */
function getInviteRedirectUrl(role: Roles): string {
  if (role === "writer") {
    return "/sign-up?role=writer";
  }
  if (role === "super_admin") {
    return "/sign-up?role=super_admin";
  }
  if (role === "artist") {
    return "/sign-up?role=artist";
  }
  if (role === "fan") {
    return "/sign-up?role=fan";
  }
  return "/sign-up";
}

/** admin/users/page.tsx getInvitationRole. */
function getInvitationRole(invitation: { publicMetadata?: unknown }): string {
  return (
    (invitation.publicMetadata as Record<string, string> | undefined)?.role || "fan"
  ).toLowerCase();
}

/** Keep the music-side invitation list free of arts invitations. */
function isArtsInvitationRole(invitation: { publicMetadata?: unknown }): boolean {
  return (ARTS_ROLES as readonly string[]).includes(getInvitationRole(invitation));
}

/** admin/users/page.tsx getInvitationCreatedAt (ms, 0 when unknown). */
function invitationCreatedAtMs(invitation: { createdAt?: Date | number | string | null }): number {
  const { createdAt } = invitation;
  if (typeof createdAt === "number") {
    return createdAt;
  }
  if (typeof createdAt === "string") {
    return new Date(createdAt).getTime() || 0;
  }
  return createdAt?.getTime() ?? 0;
}

/**
 * posts/actions.ts resolveAuthorIdForPost: a selected authorId is honored
 * only for super admins and only when it points at a writer/super_admin row.
 */
async function resolveAuthorIdForPost(
  db: NeonHttpDb,
  raw: Record<string, unknown>,
  callerIsSuperAdmin: boolean,
  fallbackAuthorId: string,
): Promise<string> {
  const selectedAuthorId = raw.authorId;
  if (typeof selectedAuthorId !== "string" || selectedAuthorId.trim().length === 0) {
    return fallbackAuthorId;
  }

  if (!callerIsSuperAdmin) {
    return fallbackAuthorId;
  }

  const authorId = selectedAuthorId.trim();
  const [author] = await db
    .select({ clerkId: users.clerkId })
    .from(users)
    .where(and(eq(users.clerkId, authorId), inArray(users.role, ["writer", "super_admin"])))
    .limit(1);

  return author?.clerkId ?? fallbackAuthorId;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

// admin/posts/page.tsx list query (all statuses; writers see only their own).
musicAdminRoutes.get("/admin/posts", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");
  const status = statusFilter(c.req.query("status"), ["draft", "published", "archived"]);

  const scoped = isSuperAdmin(auth)
    ? eq(posts.vertical, "music")
    : and(eq(posts.vertical, "music"), eq(posts.authorId, auth.userId));
  const whereClause = status ? and(scoped, eq(posts.status, status)) : scoped;

  const primary = sortColumn(
    c.req.query("sort"),
    {
      category: posts.category,
      createdAt: posts.createdAt,
      isCoverStory: posts.isCoverStory,
      status: posts.status,
      title: posts.title,
    },
    "createdAt",
  );

  const [totalRows, pagedPosts] = await Promise.all([
    db.select({ total: count() }).from(posts).where(whereClause),
    db
      .select({
        authorId: posts.authorId,
        category: posts.category,
        createdAt: posts.createdAt,
        deleteRequested: posts.deleteRequested,
        id: posts.id,
        isCoverStory: posts.isCoverStory,
        status: posts.status,
        title: posts.title,
      })
      .from(posts)
      .where(whereClause)
      .orderBy(order === "asc" ? asc(primary) : desc(primary), desc(posts.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  return c.json({
    posts: pagedPosts.map((post) => ({
      authorId: post.authorId,
      category: post.category,
      createdAt: post.createdAt.toISOString(),
      deleteRequested: post.deleteRequested,
      id: post.id,
      isCoverStory: post.isCoverStory,
      status: post.status,
      title: post.title,
    })),
    total: Number(totalRows[0]?.total ?? 0),
  });
});

// GET /admin/posts/:id — full row for the edit screen (content included).
musicAdminRoutes.get("/admin/posts/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) {
    return c.json({ error: "Post not found" }, 404);
  }

  if (!canEditResource(auth, post.authorId)) {
    return c.json({ error: "You do not have permission to edit this post" }, 403);
  }

  return c.json({ post });
});

// createPost
musicAdminRoutes.post("/admin/posts", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const rawExcerpt = (raw.excerpt as string) || "";
  const normalizedExcerpt =
    rawExcerpt.length > 500 ? sanitizeAndTruncateExcerpt(rawExcerpt, 500) : rawExcerpt.trim();

  const validationResult = postSchema.safeParse({
    category: (raw.category as string) || "",
    content: (raw.content as string) || "",
    coverImage: (raw.coverImage as string | null) || undefined,
    excerpt: normalizedExcerpt,
    isCoverStory:
      raw.isCoverStory === true || raw.isCoverStory === "true" || raw.isCoverStory === "on",
    slug: (raw.slug as string) || "",
    status: (raw.status as string) || "",
    title: (raw.title as string) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;
  const resolvedAuthorId = await resolveAuthorIdForPost(db, raw, isSuperAdmin(auth), auth.userId);

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.title),
    undefined,
    "posts",
  );

  // If setting as cover story, unset previous cover story
  if (validatedData.isCoverStory) {
    await db.update(posts).set({ isCoverStory: false }).where(eq(posts.isCoverStory, true));
  }

  const publishedAt = validatedData.status === "published" ? new Date() : null;

  const [post] = await db
    .insert(posts)
    .values({
      authorId: resolvedAuthorId,
      category: validatedData.category as PostInsert["category"],
      content: validatedData.content,
      coverImage: validatedData.coverImage || null,
      excerpt: validatedData.excerpt,
      isCoverStory: validatedData.isCoverStory,
      publishedAt,
      slug,
      status: validatedData.status as PostInsert["status"],
      title: validatedData.title,
      vertical: "music",
    })
    .returning();

  if (!post) {
    throw new Error("Failed to create post");
  }

  // Handle artist relations (non-fatal — the post is already created)
  const artistIds = artistIdsFromInput(raw.artistIds);
  if (artistIds.length > 0) {
    try {
      await db
        .insert(postArtists)
        .values(artistIds.map((artistId) => ({ artistId, postId: post.id })));
    } catch (error) {
      console.error("[api] create_post_artist_relations:", error);
    }
  }

  return c.json({ post, success: true });
});

// updatePost
musicAdminRoutes.patch("/admin/posts/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
    .limit(1);

  if (!post) {
    throw notFound("Post not found");
  }

  if (!canEditResource(auth, post.authorId)) {
    throw forbidden("Unauthorized: You don't have permission to edit this post");
  }

  const raw = await readJsonBody(c);

  const rawExcerpt = (raw.excerpt as string) || "";
  const normalizedExcerpt =
    rawExcerpt.length > 500 ? sanitizeAndTruncateExcerpt(rawExcerpt, 500) : rawExcerpt.trim();

  const validationResult = postSchema.safeParse({
    category: (raw.category as string) || "",
    content: (raw.content as string) || "",
    coverImage: (raw.coverImage as string | null) || undefined,
    excerpt: normalizedExcerpt,
    isCoverStory:
      raw.isCoverStory === true || raw.isCoverStory === "true" || raw.isCoverStory === "on",
    slug: (raw.slug as string) || "",
    status: (raw.status as string) || "",
    title: (raw.title as string) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;
  const resolvedAuthorId = await resolveAuthorIdForPost(db, raw, isSuperAdmin(auth), post.authorId);

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.title),
    id,
    "posts",
  );

  // If setting as cover story, unset previous cover story (excluding this post)
  if (validatedData.isCoverStory && !post.isCoverStory) {
    await db
      .update(posts)
      .set({ isCoverStory: false })
      .where(and(eq(posts.isCoverStory, true), ne(posts.id, id)));
  }

  const publishedAt =
    validatedData.status === "published" && !post.publishedAt ? new Date() : post.publishedAt;

  const [updated] = await db
    .update(posts)
    .set({
      authorId: resolvedAuthorId,
      category: validatedData.category as PostInsert["category"],
      content: validatedData.content,
      coverImage: validatedData.coverImage || null,
      excerpt: validatedData.excerpt,
      isCoverStory: validatedData.isCoverStory,
      publishedAt,
      slug,
      status: validatedData.status as PostInsert["status"],
      title: validatedData.title,
      updatedAt: new Date(),
    })
    .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
    .returning();

  // Handle artist relations — delete existing and insert new (non-fatal)
  const newArtistIds = artistIdsFromInput(raw.artistIds);
  try {
    await db.delete(postArtists).where(eq(postArtists.postId, id));
    if (newArtistIds.length > 0) {
      await db
        .insert(postArtists)
        .values(newArtistIds.map((artistId) => ({ artistId, postId: id })));
    }
  } catch (error) {
    console.error("[api] update_post_artist_relations:", error);
  }

  return c.json({ post: updated, success: true });
});

// Single-row status flip (bulkUpdatePostStatus applied to one post).
musicAdminRoutes.post("/admin/posts/:id/toggle", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
    .limit(1);

  if (!post) {
    throw notFound("Post not found");
  }

  if (!canEditResource(auth, post.authorId)) {
    throw forbidden("Unauthorized: You don't have permission to edit this post");
  }

  const nextStatus = post.status === "published" ? "draft" : "published";
  const publishedAt =
    nextStatus === "published" ? (post.publishedAt ?? new Date()) : post.publishedAt;

  const [updated] = await db
    .update(posts)
    .set({ publishedAt, status: nextStatus, updatedAt: new Date() })
    .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
    .returning();

  return c.json({ post: updated, success: true });
});

// requestDeletePost (writers flag their own) / deletePost (super admins
// hard-delete) — the source's two-branch delete flow in one endpoint.
musicAdminRoutes.delete("/admin/posts/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
    .limit(1);

  if (!post) {
    throw notFound("Post not found");
  }

  // Writers can only request deletion of their own posts
  if (!canEditResource(auth, post.authorId)) {
    throw forbidden("Unauthorized: You can only request deletion of your own posts");
  }

  // Super admins delete directly
  if (isSuperAdmin(auth)) {
    await db.delete(posts).where(and(eq(posts.id, id), eq(posts.vertical, "music")));
    return c.json({ deleted: true, success: true });
  }

  // Writers request deletion
  await db
    .update(posts)
    .set({ deleteRequested: true, deleteRequestedAt: new Date() })
    .where(eq(posts.id, id));

  return c.json({ deleteRequested: true, success: true });
});

// ---------------------------------------------------------------------------
// Artists
// ---------------------------------------------------------------------------

// admin/artists/page.tsx list query (no writer scoping in the source).
musicAdminRoutes.get("/admin/artists", async (c) => {
  requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");

  const primary = sortColumn(
    c.req.query("sort"),
    {
      claimed: artists.claimed,
      createdAt: artists.createdAt,
      email: artists.email,
      genre: artists.genre,
      location: artists.location,
      name: artists.name,
    },
    "createdAt",
  );

  const [totalRows, allArtists] = await Promise.all([
    db.select({ total: count() }).from(artists),
    db
      .select()
      .from(artists)
      .orderBy(order === "asc" ? asc(primary) : desc(primary), desc(artists.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  return c.json({ artists: allArtists, total: Number(totalRows[0]?.total ?? 0) });
});

// GET /admin/artists/:id — full row for the edit screen.
musicAdminRoutes.get("/admin/artists/:id", async (c) => {
  const id = idParam(c);
  requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);
  if (!artist) {
    return c.json({ error: "Artist not found" }, 404);
  }
  return c.json({ artist });
});

// createArtist
musicAdminRoutes.post("/admin/artists", async (c) => {
  requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const validationResult = artistSchema.safeParse({
    bio: raw.bio as string,
    email: raw.email as string | undefined,
    genre: raw.genre as string,
    image: raw.image as string | undefined,
    instagram: raw.instagram as string | undefined,
    location: raw.location as string,
    name: raw.name as string,
    phoneNumber: raw.phoneNumber as string | number | null | undefined,
    slug: raw.slug as string | undefined,
    spotifyArtistId: raw.spotifyArtistId as string | undefined,
    spotifyUrl: raw.spotifyUrl as string | undefined,
    tiktok: raw.tiktok as string | undefined,
    twitter: raw.twitter as string | undefined,
    website: raw.website as string | undefined,
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;
  const inviteArtist = raw.inviteArtist === true || raw.inviteArtist === "true";

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.name),
    undefined,
    "artists",
  );

  const [artist] = await db
    .insert(artists)
    .values({
      bio: validatedData.bio,
      email: validatedData.email || null,
      genre: validatedData.genre as ArtistGenre,
      image: validatedData.image || null,
      instagram: validatedData.instagram || null,
      location: validatedData.location,
      name: validatedData.name,
      phoneNumber: validatedData.phoneNumber || null,
      slug,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      spotifyUrl: validatedData.spotifyUrl || null,
      tiktok: validatedData.tiktok || null,
      twitter: validatedData.twitter || null,
      website: validatedData.website || null,
    })
    .returning();

  if (!artist) {
    throw new Error("Failed to create artist");
  }

  // If invitation is requested and email is provided, send invitation
  if (inviteArtist && validatedData.email) {
    const clerk = clerkClient(c.env);
    try {
      await clerk.invitations.createInvitation({
        emailAddress: validatedData.email,
        publicMetadata: {
          artistId: artist.id.toString(),
          role: "artist",
        },
        redirectUrl: buildInvitationRedirectUrl(
          c.env,
          `/sign-up?role=artist&artistId=${artist.id}`,
        ),
      });
    } catch (error) {
      console.error("[api] send_artist_invitation:", error);
      // Continue even if invitation fails - artist is already created
    }
  }

  return c.json({ artist, success: true });
});

// updateArtist — any admin/writer may edit any artist (source has no
// ownership check for artists).
musicAdminRoutes.patch("/admin/artists/:id", async (c) => {
  const id = idParam(c);
  requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

  if (!artist) {
    throw notFound("Artist not found");
  }

  const validationResult = artistSchema.safeParse({
    bio: raw.bio as string,
    email: raw.email as string | undefined,
    genre: raw.genre as string,
    image: raw.image as string | undefined,
    instagram: raw.instagram as string | undefined,
    location: raw.location as string,
    name: raw.name as string,
    phoneNumber: raw.phoneNumber as string | number | null | undefined,
    slug: raw.slug as string | undefined,
    spotifyArtistId: raw.spotifyArtistId as string | undefined,
    spotifyUrl: raw.spotifyUrl as string | undefined,
    tiktok: raw.tiktok as string | undefined,
    twitter: raw.twitter as string | undefined,
    website: raw.website as string | undefined,
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.name),
    id,
    "artists",
  );

  const [updated] = await db
    .update(artists)
    .set({
      bio: validatedData.bio,
      email: validatedData.email || null,
      genre: validatedData.genre as ArtistGenre,
      image: validatedData.image || null,
      instagram: validatedData.instagram || null,
      location: validatedData.location,
      name: validatedData.name,
      phoneNumber: validatedData.phoneNumber || null,
      slug,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      spotifyUrl: validatedData.spotifyUrl || null,
      tiktok: validatedData.tiktok || null,
      twitter: validatedData.twitter || null,
      updatedAt: new Date(),
      website: validatedData.website || null,
    })
    .where(eq(artists.id, id))
    .returning();

  return c.json({ artist: updated, success: true });
});

// deleteArtist
musicAdminRoutes.delete("/admin/artists/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  if (!isSuperAdmin(auth)) {
    throw forbidden("Unauthorized: Only super admins can delete artists");
  }

  await db.delete(artists).where(eq(artists.id, id));

  return c.json({ success: true });
});

// setArtistHidden — super_admin only. `hidden` may be sent explicitly;
// when omitted it toggles (the source page binds !artist.hidden).
musicAdminRoutes.post("/admin/artists/:id/visibility", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  if (!isSuperAdmin(auth)) {
    throw forbidden("Unauthorized: Only super admins can change artist visibility");
  }

  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

  if (!artist) {
    throw notFound("Artist not found");
  }

  const hidden =
    raw.hidden === true || raw.hidden === "true"
      ? true
      : raw.hidden === false || raw.hidden === "false"
        ? false
        : !artist.hidden;

  await db.update(artists).set({ hidden, updatedAt: new Date() }).where(eq(artists.id, id));

  return c.json({ hidden, success: true });
});

// inviteArtistToClaim — invite an unclaimed artist profile to sign up.
musicAdminRoutes.post("/admin/artists/:id/invite", async (c) => {
  const id = idParam(c);
  requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

  if (!artist) {
    throw notFound("Artist not found");
  }

  const email = (raw.email as string) ?? "";
  const clerk = clerkClient(c.env);

  try {
    await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        artistId: id.toString(),
        role: "artist",
      },
      redirectUrl: buildInvitationRedirectUrl(c.env, `/sign-up?role=artist&artistId=${id}`),
    });

    // Update artist email if different
    if (email !== artist.email) {
      await db.update(artists).set({ email }).where(eq(artists.id, id));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("[api] invite_artist_to_claim:", error);
    return c.json({
      error:
        getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to send artist invitation"),
      success: false,
    });
  }
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

// admin/events/page.tsx list query (writers see only their own).
musicAdminRoutes.get("/admin/events", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");
  const status = statusFilter(c.req.query("status"), ["draft", "published", "past"]);

  const scoped = isSuperAdmin(auth)
    ? eq(events.vertical, "music")
    : and(eq(events.vertical, "music"), eq(events.createdById, auth.userId));
  const whereClause = status ? and(scoped, eq(events.status, status)) : scoped;

  const primary = sortColumn(
    c.req.query("sort"),
    {
      createdAt: events.createdAt,
      date: events.date,
      genre: events.genre,
      status: events.status,
      title: events.title,
      venue: events.venue,
    },
    "createdAt",
  );

  const [totalRows, filteredEvents] = await Promise.all([
    db.select({ total: count() }).from(events).where(whereClause),
    db
      .select()
      .from(events)
      .where(whereClause)
      .orderBy(order === "asc" ? asc(primary) : desc(primary), desc(events.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  return c.json({ events: filteredEvents, total: Number(totalRows[0]?.total ?? 0) });
});

// GET /admin/events/:id — full row for the edit screen.
musicAdminRoutes.get("/admin/events/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) {
    return c.json({ error: "Event not found" }, 404);
  }
  if (!canEditResource(auth, event.createdById ?? "")) {
    return c.json({ error: "You do not have permission to edit this event" }, 403);
  }
  return c.json({ event });
});

// createEvent — vertical defaults to "music" via the schema default, as
// in the source insert.
musicAdminRoutes.post("/admin/events", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const validationResult = eventSchema.safeParse({
    date: (raw.date as string) || "",
    description: (raw.description as string) || "",
    genre: (raw.genre as string) || "",
    image: (raw.image as string | null) || undefined,
    location: (raw.location as string) || "",
    price: (raw.price as string | null) || undefined,
    slug: (raw.slug as string) || "",
    status: (raw.status as string) || "",
    ticketLink: (raw.ticketLink as string | null) || undefined,
    time: (raw.time as string | null) || undefined,
    title: (raw.title as string) || "",
    venue: (raw.venue as string) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.title),
    undefined,
    "events",
  );

  const venueId = venueIdFromInput(raw.venueId);

  const [event] = await db
    .insert(events)
    .values({
      createdById: auth.userId,
      date: validatedData.date as EventInsert["date"],
      description: validatedData.description,
      genre: validatedData.genre as EventInsert["genre"],
      image: validatedData.image || null,
      location: validatedData.location,
      price: validatedData.price || null,
      slug,
      status: validatedData.status as EventInsert["status"],
      ticketLink: validatedData.ticketLink || null,
      time: validatedData.time || null,
      title: validatedData.title,
      venue: validatedData.venue,
      venueId,
    })
    .returning();

  if (!event) {
    throw new Error("Failed to create event");
  }

  // Handle artist relations (optional for events; non-fatal)
  const artistIds = artistIdsFromInput(raw.artistIds);
  if (artistIds.length > 0) {
    try {
      await db
        .insert(eventArtists)
        .values(artistIds.map((artistId) => ({ artistId, eventId: event.id })));
    } catch (error) {
      console.error("[api] create_event_artist_relations:", error);
    }
  }

  return c.json({ event, success: true });
});

// updateEvent — fetched by id without a vertical filter, like the source.
musicAdminRoutes.patch("/admin/events/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);

  if (!event) {
    throw notFound("Event not found");
  }

  if (!canEditResource(auth, event.createdById)) {
    throw forbidden("Unauthorized: You don't have permission to edit this event");
  }

  const validationResult = eventSchema.safeParse({
    date: (raw.date as string) || "",
    description: (raw.description as string) || "",
    genre: (raw.genre as string) || "",
    image: (raw.image as string | null) || undefined,
    location: (raw.location as string) || "",
    price: (raw.price as string | null) || undefined,
    slug: (raw.slug as string) || "",
    status: (raw.status as string) || "",
    ticketLink: (raw.ticketLink as string | null) || undefined,
    time: (raw.time as string | null) || undefined,
    title: (raw.title as string) || "",
    venue: (raw.venue as string) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    db,
    slugInput || generateSlug(validatedData.title),
    id,
    "events",
  );

  const venueId = venueIdFromInput(raw.venueId);

  const [updated] = await db
    .update(events)
    .set({
      date: validatedData.date as EventInsert["date"],
      description: validatedData.description,
      genre: validatedData.genre as EventInsert["genre"],
      image: validatedData.image || null,
      location: validatedData.location,
      price: validatedData.price || null,
      slug,
      status: validatedData.status as EventInsert["status"],
      ticketLink: validatedData.ticketLink || null,
      time: validatedData.time || null,
      title: validatedData.title,
      updatedAt: new Date(),
      venue: validatedData.venue,
      venueId,
    })
    .where(eq(events.id, id))
    .returning();

  // Handle artist relations — delete existing and insert new (non-fatal)
  const newArtistIds = artistIdsFromInput(raw.artistIds);
  try {
    await db.delete(eventArtists).where(eq(eventArtists.eventId, id));
    if (newArtistIds.length > 0) {
      await db
        .insert(eventArtists)
        .values(newArtistIds.map((artistId) => ({ artistId, eventId: id })));
    }
  } catch (error) {
    console.error("[api] update_event_artist_relations:", error);
  }

  return c.json({ event: updated, success: true });
});

// Single-event status flip with the updateEvent ownership model.
musicAdminRoutes.post("/admin/events/:id/toggle", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);

  if (!event) {
    throw notFound("Event not found");
  }

  if (!canEditResource(auth, event.createdById)) {
    throw forbidden("Unauthorized: You don't have permission to edit this event");
  }

  const nextStatus = event.status === "published" ? "draft" : "published";

  const [updated] = await db
    .update(events)
    .set({ status: nextStatus as EventInsert["status"], updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning();

  return c.json({ event: updated, success: true });
});

// deleteEvent
musicAdminRoutes.delete("/admin/events/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  if (!isSuperAdmin(auth)) {
    throw forbidden("Unauthorized: Only super admins can delete events");
  }

  await db.delete(events).where(eq(events.id, id));

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Music releases
// ---------------------------------------------------------------------------

// admin/music/page.tsx list query (writers see only their own; also
// reports the global pending-submission count for the tabs badge).
musicAdminRoutes.get("/admin/music", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");
  const status = statusFilter(c.req.query("status"), ["draft", "published", "archived"]);

  const scoped = isSuperAdmin(auth) ? undefined : eq(musicReleases.authorId, auth.userId);
  const whereClause =
    status && scoped
      ? and(scoped, eq(musicReleases.status, status))
      : status
        ? eq(musicReleases.status, status)
        : scoped;

  const primary = sortColumn(
    c.req.query("sort"),
    {
      artistName: musicReleases.artistName,
      createdAt: musicReleases.createdAt,
      genre: musicReleases.genre,
      releaseDate: musicReleases.releaseDate,
      releaseType: musicReleases.releaseType,
      status: musicReleases.status,
      title: musicReleases.title,
    },
    "createdAt",
  );

  const [totalRows, pagedReleases, pendingRows] = await Promise.all([
    whereClause
      ? db.select({ total: count() }).from(musicReleases).where(whereClause)
      : db.select({ total: count() }).from(musicReleases),
    db
      .select({
        artistName: musicReleases.artistName,
        authorId: musicReleases.authorId,
        coverArt: musicReleases.coverArt,
        createdAt: musicReleases.createdAt,
        featured: musicReleases.featured,
        genre: musicReleases.genre,
        id: musicReleases.id,
        releaseDate: musicReleases.releaseDate,
        releaseType: musicReleases.releaseType,
        slug: musicReleases.slug,
        status: musicReleases.status,
        title: musicReleases.title,
      })
      .from(musicReleases)
      .where(whereClause)
      .orderBy(order === "asc" ? asc(primary) : desc(primary), desc(musicReleases.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(musicReleases)
      .where(eq(musicReleases.submissionStatus, "pending")),
  ]);

  return c.json({
    pendingCount: Number(pendingRows[0]?.count ?? 0),
    releases: pagedReleases.map((release) => ({
      artistName: release.artistName,
      authorId: release.authorId,
      coverArt: release.coverArt,
      createdAt: release.createdAt.toISOString(),
      featured: release.featured,
      genre: release.genre,
      id: release.id,
      releaseDate: release.releaseDate,
      releaseType: release.releaseType,
      slug: release.slug,
      status: release.status,
      title: release.title,
    })),
    total: Number(totalRows[0]?.total ?? 0),
  });
});

// GET /admin/music/:id — full row for the edit screen.
musicAdminRoutes.get("/admin/music/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [release] = await db.select().from(musicReleases).where(eq(musicReleases.id, id)).limit(1);
  if (!release) {
    return c.json({ error: "Release not found" }, 404);
  }
  if (!canEditResource(auth, release.authorId)) {
    return c.json({ error: "You do not have permission to edit this release" }, 403);
  }
  return c.json({ release });
});

// createMusicRelease
musicAdminRoutes.post("/admin/music", async (c) => {
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const authorIdInput = raw.authorId as string | null;
  const authorId = isSuperAdmin(auth) && authorIdInput ? authorIdInput : auth.userId;

  const validationResult = musicReleaseSchema.safeParse({
    appleMusicUrl: (raw.appleMusicUrl as string | null) || undefined,
    artistId: raw.artistId ? Number(raw.artistId) : undefined,
    artistName: (raw.artistName as string) || "",
    bandcampUrl: (raw.bandcampUrl as string | null) || undefined,
    content: (raw.content as string) || "",
    coverArt: (raw.coverArt as string | null) || undefined,
    excerpt: (raw.excerpt as string) || "",
    featured: raw.featured === true || raw.featured === "true" || raw.featured === "on",
    genre: (raw.genre as string) || "OTHER",
    releaseDate: (raw.releaseDate as string) || "",
    releaseType: (raw.releaseType as string) || "Single",
    slug: (raw.slug as string) || "",
    spotifyUrl: (raw.spotifyUrl as string | null) || undefined,
    status: (raw.status as string) || "published",
    title: (raw.title as string) || "",
    youtubeUrl: (raw.youtubeUrl as string | null) || undefined,
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const baseSlug =
    validatedData.slug?.trim() ||
    generateSlug(`${validatedData.artistName}-${validatedData.title}`);
  const slug = await ensureUniqueSlug(db, baseSlug, undefined, "musicReleases");

  try {
    const [release] = await db
      .insert(musicReleases)
      .values({
        appleMusicUrl: validatedData.appleMusicUrl || null,
        artistId: validatedData.artistId || null,
        artistName: validatedData.artistName,
        authorId,
        bandcampUrl: validatedData.bandcampUrl || null,
        content: validatedData.content || null,
        coverArt: validatedData.coverArt || null,
        excerpt: validatedData.excerpt,
        featured: validatedData.featured,
        genre: validatedData.genre as MusicReleaseInsert["genre"],
        releaseDate: validatedData.releaseDate || null,
        releaseType: validatedData.releaseType,
        slug,
        spotifyUrl: validatedData.spotifyUrl || null,
        status: validatedData.status as MusicReleaseInsert["status"],
        submissionStatus: "none",
        title: validatedData.title,
        youtubeUrl: validatedData.youtubeUrl || null,
      })
      .returning();

    return c.json({ redirectUrl: "/admin/music", releaseId: release?.id });
  } catch (error) {
    console.error("[api] create_music_release:", error);
    throw error;
  }
});

// updateMusicRelease
musicAdminRoutes.patch("/admin/music/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const [existingRelease] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, id))
    .limit(1);

  if (!existingRelease) {
    throw notFound("Music release not found");
  }

  if (!canEditResource(auth, existingRelease.authorId)) {
    throw forbidden("Unauthorized: You don't have permission to edit this music release");
  }

  const validationResult = musicReleaseSchema.safeParse({
    appleMusicUrl: (raw.appleMusicUrl as string | null) || undefined,
    artistId: raw.artistId ? Number(raw.artistId) : undefined,
    artistName: (raw.artistName as string) || "",
    bandcampUrl: (raw.bandcampUrl as string | null) || undefined,
    content: (raw.content as string) || "",
    coverArt: (raw.coverArt as string | null) || undefined,
    excerpt: (raw.excerpt as string) || "",
    featured: raw.featured === true || raw.featured === "true" || raw.featured === "on",
    genre: (raw.genre as string) || "OTHER",
    releaseDate: (raw.releaseDate as string) || "",
    releaseType: (raw.releaseType as string) || "Single",
    slug: (raw.slug as string) || "",
    spotifyUrl: (raw.spotifyUrl as string | null) || undefined,
    status: (raw.status as string) || "published",
    title: (raw.title as string) || "",
    youtubeUrl: (raw.youtubeUrl as string | null) || undefined,
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const baseSlug =
    validatedData.slug?.trim() ||
    generateSlug(`${validatedData.artistName}-${validatedData.title}`);
  const slug = await ensureUniqueSlug(db, baseSlug, id, "musicReleases");

  const authorIdInput = raw.authorId as string | null;
  const authorId = isSuperAdmin(auth) && authorIdInput ? authorIdInput : existingRelease.authorId;

  await db
    .update(musicReleases)
    .set({
      appleMusicUrl: validatedData.appleMusicUrl || null,
      artistId: validatedData.artistId || null,
      artistName: validatedData.artistName,
      authorId,
      bandcampUrl: validatedData.bandcampUrl || null,
      content: validatedData.content || null,
      coverArt: validatedData.coverArt || null,
      excerpt: validatedData.excerpt,
      featured: validatedData.featured,
      genre: validatedData.genre as MusicReleaseInsert["genre"],
      releaseDate: validatedData.releaseDate || null,
      releaseType: validatedData.releaseType,
      slug,
      spotifyUrl: validatedData.spotifyUrl || null,
      status: validatedData.status as MusicReleaseInsert["status"],
      title: validatedData.title,
      updatedAt: new Date(),
      youtubeUrl: validatedData.youtubeUrl || null,
    })
    .where(eq(musicReleases.id, id));

  return c.json({ redirectUrl: "/admin/music" });
});

// Single-release status flip with the updateMusicRelease ownership model.
musicAdminRoutes.post("/admin/music/:id/toggle", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [existingRelease] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, id))
    .limit(1);

  if (!existingRelease) {
    throw notFound("Music release not found");
  }

  if (!canEditResource(auth, existingRelease.authorId)) {
    throw forbidden("Unauthorized: You don't have permission to edit this music release");
  }

  const nextStatus = existingRelease.status === "published" ? "draft" : "published";

  const [updated] = await db
    .update(musicReleases)
    .set({ status: nextStatus as MusicReleaseInsert["status"], updatedAt: new Date() })
    .where(eq(musicReleases.id, id))
    .returning();

  return c.json({ release: updated, success: true });
});

// deleteMusicRelease — super admins delete any, writers only their own.
musicAdminRoutes.delete("/admin/music/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [existingRelease] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, id))
    .limit(1);

  if (!existingRelease) {
    throw notFound("Music release not found");
  }

  const isOwner = existingRelease.authorId === auth.userId;

  if (!isSuperAdmin(auth) && !isOwner) {
    throw forbidden("Unauthorized: You don't have permission to delete this music release");
  }

  await db.delete(musicReleases).where(eq(musicReleases.id, id));

  return c.json({ success: true });
});

// ---------------------------------------------------------------------------
// Venues
// ---------------------------------------------------------------------------

// admin/venues/page.tsx list query (no writer scoping in the source;
// default sort "name" ascending, like the page).
musicAdminRoutes.get("/admin/venues", async (c) => {
  requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "asc");

  const primary = sortColumn(
    c.req.query("sort"),
    {
      city: venues.city,
      createdAt: venues.createdAt,
      name: venues.name,
    },
    "name",
  );

  const [totalRows, pagedVenues] = await Promise.all([
    db.select({ total: count() }).from(venues),
    db
      .select()
      .from(venues)
      .orderBy(order === "asc" ? asc(primary) : desc(primary))
      .limit(limit)
      .offset(offset),
  ]);

  return c.json({
    total: Number(totalRows[0]?.total ?? 0),
    venues: pagedVenues.map((venue) => ({
      address: venue.address,
      bookingEmail: venue.bookingEmail,
      bookingRates: venue.bookingRates,
      capacity: venue.capacity,
      city: venue.city,
      createdAt: venue.createdAt.toISOString(),
      genres: venue.genres,
      id: venue.id,
      image: venue.image,
      name: venue.name,
      phone: venue.phone,
      slug: venue.slug,
      state: venue.state,
      website: venue.website,
      zip: venue.zip,
    })),
  });
});

// GET /admin/venues/:id — full row for the edit screen.
musicAdminRoutes.get("/admin/venues/:id", async (c) => {
  const id = idParam(c);
  requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  const [venue] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  if (!venue) {
    return c.json({ error: "Venue not found" }, 404);
  }
  return c.json({ venue });
});

// createVenue
musicAdminRoutes.post("/admin/venues", async (c) => {
  requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const validationResult = venueSchema.safeParse({
    address: (raw.address as string | null) || "",
    bookingEmail: (raw.bookingEmail as string | null) || "",
    bookingRates: (raw.bookingRates as string | null) || "",
    capacity: (raw.capacity as string | null) || "",
    city: (raw.city as string) || "Little Rock",
    description: (raw.description as string | null) || "",
    genres: (raw.genres as string | null) || "",
    image: (raw.image as string | null) || undefined,
    name: (raw.name as string) || "",
    phone: (raw.phone as string | null) || "",
    slug: (raw.slug as string | null) || "",
    state: (raw.state as string) || "AR",
    website: (raw.website as string | null) || undefined,
    zip: (raw.zip as string | null) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const baseSlug = validatedData.slug?.trim() || generateSlug(validatedData.name);
  const slug = await ensureUniqueSlug(db, baseSlug, undefined, "venues");

  try {
    const [venue] = await db
      .insert(venues)
      .values({
        address: validatedData.address || null,
        bookingEmail: validatedData.bookingEmail || null,
        bookingRates: validatedData.bookingRates || null,
        capacity: validatedData.capacity || null,
        city: validatedData.city,
        description: validatedData.description || null,
        genres: validatedData.genres || null,
        image: validatedData.image || null,
        name: validatedData.name,
        phone: validatedData.phone || null,
        slug,
        state: validatedData.state,
        website: validatedData.website || null,
        zip: validatedData.zip || null,
      })
      .returning();

    return c.json({ redirectUrl: "/admin/venues", venueId: venue?.id });
  } catch (error) {
    console.error("[api] create_venue:", error);
    throw error;
  }
});

// updateVenue
musicAdminRoutes.patch("/admin/venues/:id", async (c) => {
  const id = idParam(c);
  requireRole(c, MUSIC_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const [existingVenue] = await db.select().from(venues).where(eq(venues.id, id)).limit(1);

  if (!existingVenue) {
    throw notFound("Venue not found");
  }

  const validationResult = venueSchema.safeParse({
    address: (raw.address as string | null) || "",
    bookingEmail: (raw.bookingEmail as string | null) || "",
    bookingRates: (raw.bookingRates as string | null) || "",
    capacity: (raw.capacity as string | null) || "",
    city: (raw.city as string) || "Little Rock",
    description: (raw.description as string | null) || "",
    genres: (raw.genres as string | null) || "",
    image: (raw.image as string | null) || undefined,
    name: (raw.name as string) || "",
    phone: (raw.phone as string | null) || "",
    slug: (raw.slug as string | null) || "",
    state: (raw.state as string) || "AR",
    website: (raw.website as string | null) || undefined,
    zip: (raw.zip as string | null) || "",
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const baseSlug = validatedData.slug?.trim() || generateSlug(validatedData.name);
  const slug =
    baseSlug === existingVenue.slug
      ? existingVenue.slug
      : await ensureUniqueSlug(db, baseSlug, id, "venues");

  try {
    await db
      .update(venues)
      .set({
        address: validatedData.address || null,
        bookingEmail: validatedData.bookingEmail || null,
        bookingRates: validatedData.bookingRates || null,
        capacity: validatedData.capacity || null,
        city: validatedData.city,
        description: validatedData.description || null,
        genres: validatedData.genres || null,
        image: validatedData.image || null,
        name: validatedData.name,
        phone: validatedData.phone || null,
        slug,
        state: validatedData.state,
        updatedAt: new Date(),
        website: validatedData.website || null,
        zip: validatedData.zip || null,
      })
      .where(eq(venues.id, id));

    return c.json({ redirectUrl: "/admin/venues", venueId: id });
  } catch (error) {
    console.error("[api] update_venue:", error);
    throw error;
  }
});

// deleteVenue
musicAdminRoutes.delete("/admin/venues/:id", async (c) => {
  const id = idParam(c);
  const auth = requireRole(c, MUSIC_ADMIN_ROLES);
  const db = getDb(c.env);

  if (!isSuperAdmin(auth)) {
    throw forbidden("Unauthorized: Only super admins can delete venues");
  }

  try {
    await db.delete(venues).where(eq(venues.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("[api] delete_venue:", error);
    throw error;
  }
});

// ---------------------------------------------------------------------------
// Users (super_admin only — canManageUsers)
// ---------------------------------------------------------------------------

// admin/users/page.tsx local user list query: non-arts roles, optional
// search over email/first/last name.
musicAdminRoutes.get("/admin/users", async (c) => {
  requireRole(c, SUPER_ADMIN_ROLES);
  const db = getDb(c.env);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");
  const query = c.req.query("search")?.trim() || "";

  const userRoleCondition = notInArray(users.role, [...ARTS_ROLES]);
  const userSearchCondition = query
    ? or(
        ilike(users.email, `%${query}%`),
        ilike(users.firstName, `%${query}%`),
        ilike(users.lastName, `%${query}%`),
      )
    : undefined;
  const userConditions = userSearchCondition
    ? and(userRoleCondition, userSearchCondition)
    : userRoleCondition;

  const sort = c.req.query("sort");
  const primary = sortColumn(
    sort,
    {
      createdAt: users.createdAt,
      email: users.email,
      name: users.firstName,
      role: users.role,
    },
    "createdAt",
  );

  const [totalRows, localUsers] = await Promise.all([
    db.select({ total: count() }).from(users).where(userConditions),
    db
      .select({
        clerkId: users.clerkId,
        createdAt: users.createdAt,
        email: users.email,
        firstName: users.firstName,
        id: users.id,
        lastName: users.lastName,
        onboardingComplete: users.onboardingComplete,
        role: users.role,
      })
      .from(users)
      .where(userConditions)
      .orderBy(
        order === "asc" ? asc(primary) : desc(primary),
        sort === "name"
          ? order === "asc"
            ? asc(users.lastName)
            : desc(users.lastName)
          : desc(users.createdAt),
      )
      .limit(limit)
      .offset(offset),
  ]);

  return c.json({ total: Number(totalRows[0]?.total ?? 0), users: localUsers });
});

// Role updates — both source flows behind one endpoint, dispatched on the
// :id segment:
// - numeric id  → updateLocalUserRole (users-table row; Clerk metadata is
//   synced for real users, placeholders update the DB row only)
// - Clerk user id (e.g. "user_...") → update-role-action.ts → updateUserRole
//   (Clerk metadata + users-row sync via upsertUserAuthState)
musicAdminRoutes.post("/admin/users/:id/role", async (c) => {
  const idParamValue = c.req.param("id");
  requireRole(c, SUPER_ADMIN_ROLES);
  const raw = await readJsonBody(c);
  const db = getDb(c.env);

  const roleInput = typeof raw.role === "string" ? raw.role : "";

  if (/^\d+$/.test(idParamValue)) {
    // updateLocalUserRole — returns { error, success } bodies verbatim.
    const id = Number.parseInt(idParamValue, 10);
    const role = ["writer", "super_admin", "fan", "artist"].includes(roleInput)
      ? (roleInput as Roles)
      : null;

    if (!Number.isInteger(id) || id <= 0 || !role) {
      return c.json({ error: "Invalid role update payload", success: false });
    }

    const [profile] = await db
      .select({ clerkId: users.clerkId })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!profile) {
      return c.json({ error: "User profile not found", success: false });
    }

    const isPlaceholder =
      profile.clerkId.startsWith(LOCAL_PLACEHOLDER_PREFIX) ||
      profile.clerkId.startsWith(WP_PLACEHOLDER_PREFIX);

    if (!isPlaceholder) {
      try {
        const clerk = clerkClient(c.env);
        const clerkUser = await clerk.users.getUser(profile.clerkId);
        const currentMetadata = clerkUser.publicMetadata || {};
        await clerk.users.updateUserMetadata(profile.clerkId, {
          publicMetadata: {
            ...currentMetadata,
            onboardingComplete: role === "writer" || role === "super_admin",
            role,
          },
        });
      } catch (error) {
        console.error("Failed to sync role change to Clerk:", error);
        return c.json({
          error: "Failed to update role in Clerk (Identity Server).",
          success: false,
        });
      }
    }

    await db
      .update(users)
      .set({
        onboardingComplete: role === "writer" || role === "super_admin",
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return c.json({ success: true });
  }

  // updateRoleAction → updateUserRole — Clerk user id segment.
  const validRoles: Roles[] = ["artist", "fan", "super_admin", "writer"];
  if (!validRoles.includes(roleInput as Roles)) {
    throw invalid(`Invalid role: ${roleInput}`);
  }
  const role = roleInput as Roles;

  try {
    // Get current user metadata to preserve existing values
    const clerk = clerkClient(c.env);
    const user = await clerk.users.getUser(idParamValue);
    const currentMetadata = user.publicMetadata || {};

    // For super_admin/writer, onboarding is complete immediately.
    // For artist/fan, onboarding is reset and must be completed for the new role.
    const publicMetadata: Record<string, unknown> = {
      ...currentMetadata,
      onboardingComplete: role === "super_admin" || role === "writer",
      role,
    };

    await clerk.users.updateUserMetadata(idParamValue, {
      publicMetadata,
    });

    const primaryEmail = getPrimaryEmail(user);

    if (!primaryEmail) {
      throw new Error("User has no email address");
    }

    await upsertUserAuthState(db, {
      clerkId: user.id,
      email: primaryEmail,
      firstName: user.firstName,
      imageUrl: user.imageUrl,
      lastName: user.lastName,
      onboardingComplete: Boolean(publicMetadata.onboardingComplete),
      role,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("[api] update_user_role:", error);
    return c.json({
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to update user role"),
      success: false,
    });
  }
});

// ---------------------------------------------------------------------------
// Invitations (super_admin only — canManageUsers)
// ---------------------------------------------------------------------------

// inviteUser
musicAdminRoutes.post("/admin/invitations", async (c) => {
  requireRole(c, SUPER_ADMIN_ROLES);
  const raw = await readJsonBody(c);

  const validationResult = inviteUserSchema.safeParse({
    email: raw.email,
    role: raw.role,
  });

  if (!validationResult.success) {
    throw invalid(zodValidationMessage(validationResult.error));
  }

  const validatedData = validationResult.data;
  const clerk = clerkClient(c.env);
  const defaultRedirectUrl = getInviteRedirectUrl(validatedData.role);
  const redirectUrl = (raw.redirectUrl as string | undefined) || defaultRedirectUrl;

  try {
    // For super_admin and writer roles, set onboardingComplete to true
    // since they don't need to go through the onboarding flow
    const publicMetadata: Record<string, unknown> = {
      role: validatedData.role,
    };
    if (raw.localUserProfileId) {
      publicMetadata.localUserProfileId = String(raw.localUserProfileId);
    }

    if (validatedData.role === "super_admin" || validatedData.role === "writer") {
      publicMetadata.onboardingComplete = true;
    }

    await clerk.invitations.createInvitation({
      emailAddress: validatedData.email,
      publicMetadata,
      redirectUrl: buildInvitationRedirectUrl(c.env, redirectUrl),
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("[api] invite_user:", error);
    return c.json({
      error: getNestedErrorMessage(error) ?? getErrorMessage(error, "Failed to send invitation"),
      success: false,
    });
  }
});

// admin/users/page.tsx invitation list: Clerk invitations excluding arts
// roles, sorted (default createdAt desc) and paginated in memory.
musicAdminRoutes.get("/admin/invitations", async (c) => {
  requireRole(c, SUPER_ADMIN_ROLES);

  const { limit, offset } = listPagination(c);
  const order = parseOrder(c.req.query("order"), "desc");
  const sortRaw = c.req.query("sort");
  const sort: "createdAt" | "emailAddress" | "role" =
    sortRaw !== "emailAddress" && sortRaw !== "role" ? "createdAt" : sortRaw;

  const clerk = clerkClient(c.env);
  const response = await clerk.invitations.getInvitationList();

  const allInvitations = [...response.data]
    .filter((invitation) => !isArtsInvitationRole(invitation))
    .toSorted((left, right) => {
      let comparison = 0;

      if (sort === "emailAddress") {
        comparison = left.emailAddress.localeCompare(right.emailAddress);
      } else if (sort === "role") {
        comparison = getInvitationRole(left).localeCompare(getInvitationRole(right));
      } else {
        comparison = invitationCreatedAtMs(left) - invitationCreatedAtMs(right);
      }

      return order === "asc" ? comparison : comparison * -1;
    });

  const total = allInvitations.length;
  const pagedInvitations = allInvitations.slice(offset, offset + limit);

  return c.json({
    invitations: pagedInvitations.map((invitation) => ({
      createdAt: invitation.createdAt,
      emailAddress: invitation.emailAddress,
      id: invitation.id,
      role: getInvitationRole(invitation),
      status: invitation.status,
    })),
    total,
  });
});
