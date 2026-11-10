import { postSchema } from "@dpmedia/contracts";
import { postArtists, posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { canEditMusic, hasMusicRole } from "../../../lib/music-access";
import { sanitizeAndTruncateExcerpt } from "../../../lib/music/admin/wordpress-backfill";
import { sanitizeError } from "../../../lib/music/logger/sanitize";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function AdminPostsActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type PostInsert = typeof posts.$inferInsert;

  function normalizeArtistIds(ids: number[]) {
    return [...new Set(ids)].toSorted((a, b) => a - b);
  }

  async function resolveAuthorIdForPost(
    formData: FormData,
    fallbackAuthorId: string,
  ): Promise<string> {
    const selectedAuthorId = formData.get("authorId");
    if (typeof selectedAuthorId !== "string" || selectedAuthorId.trim().length === 0) {
      return fallbackAuthorId;
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");
    if (!isSuperAdmin) {
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

  async function createPost(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ operation: "create_post", userId }, "Starting post creation");

    if (!hasMusicRole(c, "super_admin", "writer")) {
      console.warn({ operation: "create_post", userId }, "Unauthorized post creation attempt");
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to create posts",
      });
    }

    // Validate form data - convert null to empty string for required fields
    const rawExcerpt = (formData.get("excerpt") as string) || "";
    const normalizedExcerpt =
      rawExcerpt.length > 500 ? sanitizeAndTruncateExcerpt(rawExcerpt, 500) : rawExcerpt.trim();

    const rawData = {
      category: (formData.get("category") as string) || "",
      content: (formData.get("content") as string) || "",
      coverImage: (formData.get("coverImage") as string | null) || undefined,
      excerpt: normalizedExcerpt,
      isCoverStory:
        formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
      slug: (formData.get("slug") as string) || "",
      status: (formData.get("status") as string) || "",
      title: (formData.get("title") as string) || "",
    };

    const validationResult = postSchema.safeParse(rawData);

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;
    const resolvedAuthorId = await resolveAuthorIdForPost(formData, userId);

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

    let post;
    try {
      [post] = await db
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
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      console.info(
        { operation: "create_post", postId: post.id, slug: post.slug, userId },
        "Post created successfully",
      );
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "create_post",
          title: validatedData.title,
          userId,
        },
        "Failed to create post",
      );
      throw error;
    }

    // Handle artist relations
    let artistIds: number[] = [];
    const artistIdsStr = formData.get("artistIds");
    if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
      artistIds = normalizeArtistIds(
        artistIdsStr
          .split(",")
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id) && id > 0),
      );

      if (artistIds.length > 0) {
        try {
          await db.insert(postArtists).values(
            artistIds.map((artistId) => ({
              artistId,
              postId: post.id,
            })),
          );
          console.debug(
            { artistIds, operation: "create_post", postId: post.id, userId },
            "Post artist relations created",
          );
        } catch (error) {
          console.error(
            {
              artistIds,
              error: sanitizeError(error),
              operation: "create_post",
              postId: post.id,
              userId,
            },
            "Failed to create post artist relations",
          );
          // Don't throw - post is already created, relations can be added later
        }
      }
    }

    return { redirectUrl: "/admin/posts" };
  }

  async function updatePost(id: number, formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ operation: "update_post", postId: id, userId }, "Starting post update");

    // Get the post to check ownership
    let post;
    try {
      [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
        .limit(1);
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "update_post",
          postId: id,
          userId,
        },
        "Failed to fetch post for update",
      );
      throw error;
    }

    if (!post) {
      console.warn({ operation: "update_post", postId: id, userId }, "Post not found");
      throw new HTTPException(404, { message: "Post not found" });
    }

    if (!canEditMusic(c, post.authorId)) {
      console.warn(
        { authorId: post.authorId, operation: "update_post", postId: id, userId },
        "Unauthorized post update attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to edit this post",
      });
    }

    // Validate form data - convert null to empty string for required fields
    const rawExcerpt = (formData.get("excerpt") as string) || "";
    const normalizedExcerpt =
      rawExcerpt.length > 500 ? sanitizeAndTruncateExcerpt(rawExcerpt, 500) : rawExcerpt.trim();

    const rawData = {
      category: (formData.get("category") as string) || "",
      content: (formData.get("content") as string) || "",
      coverImage: (formData.get("coverImage") as string | null) || undefined,
      excerpt: normalizedExcerpt,
      isCoverStory:
        formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
      slug: (formData.get("slug") as string) || "",
      status: (formData.get("status") as string) || "",
      title: (formData.get("title") as string) || "",
    };

    const validationResult = postSchema.safeParse(rawData);

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;
    const resolvedAuthorId = await resolveAuthorIdForPost(formData, post.authorId);

    const slug = await ensureUniqueSlug(
      db,
      slugInput || generateSlug(validatedData.title),
      id,
      "posts",
    );

    // If setting as cover story, unset previous cover story
    if (validatedData.isCoverStory && !post.isCoverStory) {
      await db
        .update(posts)
        .set({ isCoverStory: false })
        .where(and(eq(posts.isCoverStory, true), ne(posts.id, id)));
    }

    const publishedAt =
      validatedData.status === "published" && !post.publishedAt ? new Date() : post.publishedAt;

    try {
      await db
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
        .where(and(eq(posts.id, id), eq(posts.vertical, "music")));

      console.info(
        { operation: "update_post", postId: id, slug, userId },
        "Post updated successfully",
      );
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "update_post",
          postId: id,
          userId,
        },
        "Failed to update post",
      );
      throw error;
    }

    // Handle artist relations - delete existing and insert new
    try {
      await db.delete(postArtists).where(eq(postArtists.postId, id));

      let newArtistIds: number[] = [];
      const artistIdsStr = formData.get("artistIds");
      if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
        newArtistIds = normalizeArtistIds(
          artistIdsStr
            .split(",")
            .map((id) => Number.parseInt(id.trim(), 10))
            .filter((id) => !Number.isNaN(id) && id > 0),
        );

        if (newArtistIds.length > 0) {
          await db.insert(postArtists).values(
            newArtistIds.map((artistId) => ({
              artistId,
              postId: id,
            })),
          );
          console.debug(
            { artistIds: newArtistIds, operation: "update_post", postId: id, userId },
            "Post artist relations updated",
          );
        }
      }
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "update_post",
          postId: id,
          userId,
        },
        "Failed to update post artist relations",
      );
      // Don't throw - post is already updated, relations can be fixed later
    }

    return { redirectUrl: "/admin/posts" };
  }

  async function bulkUpdatePostStatus(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const statusInput = formData.get("status");
    if (statusInput !== "draft" && statusInput !== "published" && statusInput !== "archived") {
      throw new Error("Invalid post status");
    }

    const postIdsInput = formData.get("postIds");
    const postIds =
      typeof postIdsInput === "string"
        ? [
            ...new Set(
              postIdsInput
                .split(",")
                .map((id) => Number.parseInt(id.trim(), 10))
                .filter((id) => Number.isInteger(id) && id > 0),
            ),
          ]
        : [];

    if (postIds.length === 0) {
      throw new Error("Select at least one post");
    }

    console.info(
      { count: postIds.length, operation: "bulk_update_post_status", status: statusInput, userId },
      "Starting bulk post status update",
    );

    const selectedPosts = await db
      .select({
        authorId: posts.authorId,
        id: posts.id,
        publishedAt: posts.publishedAt,
        slug: posts.slug,
        status: posts.status,
      })
      .from(posts)
      .where(and(inArray(posts.id, postIds), eq(posts.vertical, "music")));

    if (selectedPosts.length !== postIds.length) {
      throw new Error("One or more selected posts could not be found");
    }

    for (const post of selectedPosts) {
      if (!canEditMusic(c, post.authorId)) {
        console.warn(
          {
            authorId: post.authorId,
            operation: "bulk_update_post_status",
            postId: post.id,
            userId,
          },
          "Unauthorized bulk post status update attempt",
        );
        throw new HTTPException(403, {
          message: "Unauthorized: You don't have permission to edit one or more posts",
        });
      }
    }

    await db
      .update(posts)
      .set({
        publishedAt:
          statusInput === "published"
            ? sql`coalesce(${posts.publishedAt}, ${Date.now()})`
            : undefined,
        status: statusInput,
        updatedAt: new Date(),
      })
      .where(and(inArray(posts.id, postIds), eq(posts.vertical, "music")));
  }

  async function requestDeletePost(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info(
      { operation: "request_delete_post", postId: id, userId },
      "Starting delete request",
    );

    // Get the post to check ownership
    let post;
    try {
      [post] = await db
        .select()
        .from(posts)
        .where(and(eq(posts.id, id), eq(posts.vertical, "music")))
        .limit(1);
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "request_delete_post",
          postId: id,
          userId,
        },
        "Failed to fetch post for delete request",
      );
      throw error;
    }

    if (!post) {
      console.warn({ operation: "request_delete_post", postId: id, userId }, "Post not found");
      throw new HTTPException(404, { message: "Post not found" });
    }

    // Writers can only request deletion of their own posts
    if (!canEditMusic(c, post.authorId)) {
      console.warn(
        {
          authorId: post.authorId,
          operation: "request_delete_post",
          postId: id,
          userId,
        },
        "Unauthorized delete request attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: You can only request deletion of your own posts",
      });
    }

    // Check if user is super_admin - they can delete directly
    const isSuperAdmin = hasMusicRole(c, "super_admin");
    if (isSuperAdmin) {
      // Super admins can delete directly
      try {
        await db.delete(posts).where(and(eq(posts.id, id), eq(posts.vertical, "music")));
        console.info(
          { operation: "request_delete_post", postId: id, userId },
          "Post deleted directly by super admin",
        );
      } catch (error) {
        console.error(
          {
            error: sanitizeError(error),
            operation: "request_delete_post",
            postId: id,
            userId,
          },
          "Failed to delete post",
        );
        throw error;
      }

      return;
    }

    // Writers request deletion
    try {
      await db
        .update(posts)
        .set({
          deleteRequested: true,
          deleteRequestedAt: new Date(),
        })
        .where(eq(posts.id, id));
      console.info(
        { operation: "request_delete_post", postId: id, userId },
        "Delete request submitted",
      );
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "request_delete_post",
          postId: id,
          userId,
        },
        "Failed to submit delete request",
      );
      throw error;
    }
  }

  async function approveDeletePost(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info(
      { operation: "approve_delete_post", postId: id, userId },
      "Approving post deletion",
    );

    if (!hasMusicRole(c, "super_admin")) {
      console.warn(
        { operation: "approve_delete_post", postId: id, userId },
        "Unauthorized approve delete attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can approve post deletions",
      });
    }

    try {
      await db.delete(posts).where(and(eq(posts.id, id), eq(posts.vertical, "music")));
      console.info(
        { operation: "approve_delete_post", postId: id, userId },
        "Post deletion approved",
      );
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "approve_delete_post",
          postId: id,
          userId,
        },
        "Failed to approve post deletion",
      );
      throw error;
    }
  }

  async function denyDeletePost(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ operation: "deny_delete_post", postId: id, userId }, "Denying post deletion");

    if (!hasMusicRole(c, "super_admin")) {
      console.warn(
        { operation: "deny_delete_post", postId: id, userId },
        "Unauthorized deny delete attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can deny post deletion requests",
      });
    }

    try {
      await db
        .update(posts)
        .set({
          deleteRequested: false,
          deleteRequestedAt: null,
        })
        .where(and(eq(posts.id, id), eq(posts.vertical, "music")));
      console.info({ operation: "deny_delete_post", postId: id, userId }, "Post deletion denied");
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "deny_delete_post",
          postId: id,
          userId,
        },
        "Failed to deny post deletion",
      );
      throw error;
    }
  }

  async function deletePost(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ operation: "delete_post", postId: id, userId }, "Deleting post");

    if (!hasMusicRole(c, "super_admin")) {
      console.warn({ operation: "delete_post", postId: id, userId }, "Unauthorized delete attempt");
      throw new HTTPException(403, { message: "Unauthorized: Only super admins can delete posts" });
    }

    try {
      await db.delete(posts).where(and(eq(posts.id, id), eq(posts.vertical, "music")));
      console.info({ operation: "delete_post", postId: id, userId }, "Post deleted successfully");
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "delete_post",
          postId: id,
          userId,
        },
        "Failed to delete post",
      );
      throw error;
    }
  }
  return {
    createPost,
    updatePost,
    bulkUpdatePostStatus,
    requestDeletePost,
    approveDeletePost,
    denyDeletePost,
    deletePost,
  };
}
export const adminPostsActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/posts/createPost",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).createPost(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/posts/updatePost",
    zValidator("json", z.object({ id: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).updatePost(input.id, input.formData)) ?? null);
    },
  )
  .post(
    "/admin/posts/bulkUpdatePostStatus",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).bulkUpdatePostStatus(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/posts/requestDeletePost",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).requestDeletePost(input.id)) ?? null);
    },
  )
  .post(
    "/admin/posts/approveDeletePost",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).approveDeletePost(input.id)) ?? null);
    },
  )
  .post(
    "/admin/posts/denyDeletePost",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).denyDeletePost(input.id)) ?? null);
    },
  )
  .post(
    "/admin/posts/deletePost",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminPostsActions(c).deletePost(input.id)) ?? null);
    },
  );
