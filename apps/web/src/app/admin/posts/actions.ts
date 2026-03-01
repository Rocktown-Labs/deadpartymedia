"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { posts, postArtists, users } from "@/lib/db/schema";
import { eq, and, ne, inArray } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath, revalidateTag } from "next/cache";
import { postSchema } from "@/lib/validations/post";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

function normalizeArtistIds(ids: number[]) {
  return [...new Set(ids)].toSorted((a, b) => a - b);
}

function haveDifferentArtistIds(a: number[], b: number[]) {
  if (a.length !== b.length) {return true;}
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {return true;}
  }
  return false;
}

async function resolveAuthorIdForPost(
  formData: FormData,
  fallbackAuthorId: string,
): Promise<string> {
  const selectedAuthorId = formData.get("authorId");
  if (typeof selectedAuthorId !== "string" || selectedAuthorId.trim().length === 0) {
    return fallbackAuthorId;
  }

  const isSuperAdmin = await canDelete();
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

export async function createPost(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "create_post", userId }, "Starting post creation");

  if (!(await canCreate())) {
    logger.warn({ operation: "create_post", userId }, "Unauthorized post creation attempt");
    throw new Error("Unauthorized: You don't have permission to create posts");
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    category: (formData.get("category") as string) || "",
    content: (formData.get("content") as string) || "",
    coverImage: (formData.get("coverImage") as string | null) || undefined,
    excerpt: (formData.get("excerpt") as string) || "",
    isCoverStory: formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
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
        category: validatedData.category as any,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        excerpt: validatedData.excerpt,
        isCoverStory: validatedData.isCoverStory,
        publishedAt,
        slug,
        status: validatedData.status as any,
        title: validatedData.title,
      })
      .returning();

    logger.info(
      { operation: "create_post", postId: post.id, slug: post.slug, userId },
      "Post created successfully",
    );
  } catch (error) {
    logger.error(
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
        logger.debug(
          { artistIds, operation: "create_post", postId: post.id, userId },
          "Post artist relations created",
        );
      } catch (error) {
        logger.error(
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

  const isPublished = validatedData.status === "published";
  if (isPublished) {
    revalidateTag("posts", "max");
    revalidateTag("stats-monthly", "max");
    if (artistIds.length > 0) {
      revalidateTag("artists", "max");
    }
  }

  revalidatePath("/admin/posts");
  revalidatePath(`/article/${post.slug}`);
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "update_post", postId: id, userId }, "Starting post update");

  // Get the post to check ownership
  let post;
  try {
    [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  } catch (error) {
    logger.error(
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
    logger.warn({ operation: "update_post", postId: id, userId }, "Post not found");
    throw new Error("Post not found");
  }

  if (!(await canEdit(post.authorId))) {
    logger.warn(
      { authorId: post.authorId, operation: "update_post", postId: id, userId },
      "Unauthorized post update attempt",
    );
    throw new Error("Unauthorized: You don't have permission to edit this post");
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    category: (formData.get("category") as string) || "",
    content: (formData.get("content") as string) || "",
    coverImage: (formData.get("coverImage") as string | null) || undefined,
    excerpt: (formData.get("excerpt") as string) || "",
    isCoverStory: formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
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

  const slug = await ensureUniqueSlug(slugInput || generateSlug(validatedData.title), id, "posts");

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
        category: validatedData.category as any,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        excerpt: validatedData.excerpt,
        isCoverStory: validatedData.isCoverStory,
        publishedAt,
        slug,
        status: validatedData.status as any,
        title: validatedData.title,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    logger.info(
      { operation: "update_post", postId: id, slug, userId },
      "Post updated successfully",
    );
  } catch (error) {
    logger.error(
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
    const existingArtistRelations = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .where(eq(postArtists.postId, id));
    const existingArtistIds = normalizeArtistIds(
      existingArtistRelations.map((rel) => rel.artistId),
    );

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
        logger.debug(
          { artistIds: newArtistIds, operation: "update_post", postId: id, userId },
          "Post artist relations updated",
        );
      }
    }

    const wasPublished = post.status === "published";
    const isPublished = validatedData.status === "published";
    const artistIdsChanged = haveDifferentArtistIds(existingArtistIds, newArtistIds);
    const publicationChanged = wasPublished !== isPublished;
    const hasAnyArtistIds = existingArtistIds.length > 0 || newArtistIds.length > 0;
    if (wasPublished || isPublished) {
      revalidateTag("posts", "max");
      revalidateTag("stats-monthly", "max");
      if (artistIdsChanged || (publicationChanged && hasAnyArtistIds)) {
        revalidateTag("artists", "max");
      }
    }
  } catch (error) {
    logger.error(
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

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  revalidatePath(`/article/${slug}`);
  redirect("/admin/posts");
}

export async function requestDeletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "request_delete_post", postId: id, userId }, "Starting delete request");

  // Get the post to check ownership
  let post;
  try {
    [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  } catch (error) {
    logger.error(
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
    logger.warn({ operation: "request_delete_post", postId: id, userId }, "Post not found");
    throw new Error("Post not found");
  }

  // Writers can only request deletion of their own posts
  if (!(await canEdit(post.authorId))) {
    logger.warn(
      {
        authorId: post.authorId,
        operation: "request_delete_post",
        postId: id,
        userId,
      },
      "Unauthorized delete request attempt",
    );
    throw new Error("Unauthorized: You can only request deletion of your own posts");
  }

  // Check if user is super_admin - they can delete directly
  const isSuperAdmin = await canDelete();
  if (isSuperAdmin) {
    // Super admins can delete directly
    try {
      await db.delete(posts).where(eq(posts.id, id));
      logger.info(
        { operation: "request_delete_post", postId: id, userId },
        "Post deleted directly by super admin",
      );
    } catch (error) {
      logger.error(
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
    const existingArtistRelations = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .where(eq(postArtists.postId, id));
    if (post.status === "published") {
      revalidateTag("posts", "max");
      revalidateTag("stats-monthly", "max");
      if (existingArtistRelations.length > 0) {
        revalidateTag("artists", "max");
      }
    }
    revalidatePath("/admin/posts");
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
    logger.info(
      { operation: "request_delete_post", postId: id, userId },
      "Delete request submitted",
    );
  } catch (error) {
    logger.error(
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

  revalidatePath("/admin/posts");
}

export async function approveDeletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "approve_delete_post", postId: id, userId }, "Approving post deletion");

  if (!(await canDelete())) {
    logger.warn(
      { operation: "approve_delete_post", postId: id, userId },
      "Unauthorized approve delete attempt",
    );
    throw new Error("Unauthorized: Only super admins can approve post deletions");
  }

  try {
    const [post] = await db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    const existingArtistRelations = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .where(eq(postArtists.postId, id));

    await db.delete(posts).where(eq(posts.id, id));
    logger.info({ operation: "approve_delete_post", postId: id, userId }, "Post deletion approved");
    if (post?.status === "published") {
      revalidateTag("posts", "max");
      revalidateTag("stats-monthly", "max");
      if (existingArtistRelations.length > 0) {
        revalidateTag("artists", "max");
      }
    }
  } catch (error) {
    logger.error(
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

  revalidatePath("/admin/posts");
}

export async function denyDeletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "deny_delete_post", postId: id, userId }, "Denying post deletion");

  if (!(await canDelete())) {
    logger.warn(
      { operation: "deny_delete_post", postId: id, userId },
      "Unauthorized deny delete attempt",
    );
    throw new Error("Unauthorized: Only super admins can deny post deletion requests");
  }

  try {
    await db
      .update(posts)
      .set({
        deleteRequested: false,
        deleteRequestedAt: null,
      })
      .where(eq(posts.id, id));
    logger.info({ operation: "deny_delete_post", postId: id, userId }, "Post deletion denied");
  } catch (error) {
    logger.error(
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

  revalidatePath("/admin/posts");
}

export async function deletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ operation: "delete_post", postId: id, userId }, "Deleting post");

  if (!(await canDelete())) {
    logger.warn({ operation: "delete_post", postId: id, userId }, "Unauthorized delete attempt");
    throw new Error("Unauthorized: Only super admins can delete posts");
  }

  try {
    const [post] = await db
      .select({ status: posts.status })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);
    const existingArtistRelations = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .where(eq(postArtists.postId, id));

    await db.delete(posts).where(eq(posts.id, id));
    logger.info({ operation: "delete_post", postId: id, userId }, "Post deleted successfully");
    if (post?.status === "published") {
      revalidateTag("posts", "max");
      revalidateTag("stats-monthly", "max");
      if (existingArtistRelations.length > 0) {
        revalidateTag("artists", "max");
      }
    }
  } catch (error) {
    logger.error(
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

  revalidatePath("/admin/posts");
}
