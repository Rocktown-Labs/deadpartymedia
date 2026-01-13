"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts, postArtists } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { postSchema } from "@/lib/validations/post";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function createPost(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  logger.info({ userId, operation: "create_post" }, "Starting post creation");

  if (!(await canCreate())) {
    logger.warn(
      { userId, operation: "create_post" },
      "Unauthorized post creation attempt"
    );
    throw new Error("Unauthorized: You don't have permission to create posts");
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    title: (formData.get("title") as string) || "",
    slug: (formData.get("slug") as string) || "",
    category: (formData.get("category") as string) || "",
    excerpt: (formData.get("excerpt") as string) || "",
    content: (formData.get("content") as string) || "",
    coverImage: (formData.get("coverImage") as string | null) || undefined,
    status: (formData.get("status") as string) || "",
    isCoverStory:
      formData.get("isCoverStory") === "true" ||
      formData.get("isCoverStory") === "on",
  };

  const validationResult = postSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.title),
    undefined,
    "posts"
  );

  // If setting as cover story, unset previous cover story
  if (validatedData.isCoverStory) {
    await db
      .update(posts)
      .set({ isCoverStory: false })
      .where(eq(posts.isCoverStory, true));
  }

  const publishedAt = validatedData.status === "published" ? new Date() : null;

  let post;
  try {
    [post] = await db
      .insert(posts)
      .values({
        title: validatedData.title,
        slug,
        category: validatedData.category as any,
        excerpt: validatedData.excerpt,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        authorId: userId,
        status: validatedData.status as any,
        isCoverStory: validatedData.isCoverStory,
        publishedAt,
      })
      .returning();

    logger.info(
      { userId, operation: "create_post", postId: post.id, slug: post.slug },
      "Post created successfully"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "create_post",
        title: validatedData.title,
      },
      "Failed to create post"
    );
    throw error;
  }

  // Handle artist relations
  const artistIdsStr = formData.get("artistIds");
  if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
    const artistIds = artistIdsStr
      .split(",")
      .map((id) => Number.parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id) && id > 0);

    if (artistIds.length > 0) {
      try {
        await db.insert(postArtists).values(
          artistIds.map((artistId) => ({
            postId: post.id,
            artistId,
          }))
        );
        logger.debug(
          { userId, operation: "create_post", postId: post.id, artistIds },
          "Post artist relations created"
        );
      } catch (error) {
        logger.error(
          {
            error: sanitizeError(error),
            userId,
            operation: "create_post",
            postId: post.id,
            artistIds,
          },
          "Failed to create post artist relations"
        );
        // Don't throw - post is already created, relations can be added later
      }
    }
  }

  revalidatePath("/admin/posts");
  revalidatePath(`/article/${post.slug}`);
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  logger.info(
    { userId, operation: "update_post", postId: id },
    "Starting post update"
  );

  // Get the post to check ownership
  let post;
  try {
    [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "update_post",
        postId: id,
      },
      "Failed to fetch post for update"
    );
    throw error;
  }

  if (!post) {
    logger.warn(
      { userId, operation: "update_post", postId: id },
      "Post not found"
    );
    throw new Error("Post not found");
  }

  if (!(await canEdit(post.authorId))) {
    logger.warn(
      { userId, operation: "update_post", postId: id, authorId: post.authorId },
      "Unauthorized post update attempt"
    );
    throw new Error(
      "Unauthorized: You don't have permission to edit this post"
    );
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    title: (formData.get("title") as string) || "",
    slug: (formData.get("slug") as string) || "",
    category: (formData.get("category") as string) || "",
    excerpt: (formData.get("excerpt") as string) || "",
    content: (formData.get("content") as string) || "",
    coverImage: (formData.get("coverImage") as string | null) || undefined,
    status: (formData.get("status") as string) || "",
    isCoverStory:
      formData.get("isCoverStory") === "true" ||
      formData.get("isCoverStory") === "on",
  };

  const validationResult = postSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.title),
    id,
    "posts"
  );

  // If setting as cover story, unset previous cover story
  if (validatedData.isCoverStory && !post.isCoverStory) {
    await db
      .update(posts)
      .set({ isCoverStory: false })
      .where(and(eq(posts.isCoverStory, true), ne(posts.id, id)));
  }

  const publishedAt =
    validatedData.status === "published" && !post.publishedAt
      ? new Date()
      : post.publishedAt;

  try {
    await db
      .update(posts)
      .set({
        title: validatedData.title,
        slug,
        category: validatedData.category as any,
        excerpt: validatedData.excerpt,
        content: validatedData.content,
        coverImage: validatedData.coverImage || null,
        status: validatedData.status as any,
        isCoverStory: validatedData.isCoverStory,
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    logger.info(
      { userId, operation: "update_post", postId: id, slug },
      "Post updated successfully"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "update_post",
        postId: id,
      },
      "Failed to update post"
    );
    throw error;
  }

  // Handle artist relations - delete existing and insert new
  try {
    await db.delete(postArtists).where(eq(postArtists.postId, id));

    const artistIdsStr = formData.get("artistIds");
    if (
      artistIdsStr &&
      typeof artistIdsStr === "string" &&
      artistIdsStr.trim()
    ) {
      const artistIds = artistIdsStr
        .split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id) && id > 0);

      if (artistIds.length > 0) {
        await db.insert(postArtists).values(
          artistIds.map((artistId) => ({
            postId: id,
            artistId,
          }))
        );
        logger.debug(
          { userId, operation: "update_post", postId: id, artistIds },
          "Post artist relations updated"
        );
      }
    }
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "update_post",
        postId: id,
      },
      "Failed to update post artist relations"
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
    redirect("/sign-in");
  }

  logger.info(
    { userId, operation: "request_delete_post", postId: id },
    "Starting delete request"
  );

  // Get the post to check ownership
  let post;
  try {
    [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "request_delete_post",
        postId: id,
      },
      "Failed to fetch post for delete request"
    );
    throw error;
  }

  if (!post) {
    logger.warn(
      { userId, operation: "request_delete_post", postId: id },
      "Post not found"
    );
    throw new Error("Post not found");
  }

  // Writers can only request deletion of their own posts
  if (!(await canEdit(post.authorId))) {
    logger.warn(
      {
        userId,
        operation: "request_delete_post",
        postId: id,
        authorId: post.authorId,
      },
      "Unauthorized delete request attempt"
    );
    throw new Error(
      "Unauthorized: You can only request deletion of your own posts"
    );
  }

  // Check if user is super_admin - they can delete directly
  const isSuperAdmin = await canDelete();
  if (isSuperAdmin) {
    // Super admins can delete directly
    try {
      await db.delete(posts).where(eq(posts.id, id));
      logger.info(
        { userId, operation: "request_delete_post", postId: id },
        "Post deleted directly by super admin"
      );
    } catch (error) {
      logger.error(
        {
          error: sanitizeError(error),
          userId,
          operation: "request_delete_post",
          postId: id,
        },
        "Failed to delete post"
      );
      throw error;
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
      { userId, operation: "request_delete_post", postId: id },
      "Delete request submitted"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "request_delete_post",
        postId: id,
      },
      "Failed to submit delete request"
    );
    throw error;
  }

  revalidatePath("/admin/posts");
}

export async function approveDeletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  logger.info(
    { userId, operation: "approve_delete_post", postId: id },
    "Approving post deletion"
  );

  if (!(await canDelete())) {
    logger.warn(
      { userId, operation: "approve_delete_post", postId: id },
      "Unauthorized approve delete attempt"
    );
    throw new Error(
      "Unauthorized: Only super admins can approve post deletions"
    );
  }

  try {
    await db.delete(posts).where(eq(posts.id, id));
    logger.info(
      { userId, operation: "approve_delete_post", postId: id },
      "Post deletion approved"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "approve_delete_post",
        postId: id,
      },
      "Failed to approve post deletion"
    );
    throw error;
  }

  revalidatePath("/admin/posts");
}

export async function denyDeletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  logger.info(
    { userId, operation: "deny_delete_post", postId: id },
    "Denying post deletion"
  );

  if (!(await canDelete())) {
    logger.warn(
      { userId, operation: "deny_delete_post", postId: id },
      "Unauthorized deny delete attempt"
    );
    throw new Error(
      "Unauthorized: Only super admins can deny post deletion requests"
    );
  }

  try {
    await db
      .update(posts)
      .set({
        deleteRequested: false,
        deleteRequestedAt: null,
      })
      .where(eq(posts.id, id));
    logger.info(
      { userId, operation: "deny_delete_post", postId: id },
      "Post deletion denied"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "deny_delete_post",
        postId: id,
      },
      "Failed to deny post deletion"
    );
    throw error;
  }

  revalidatePath("/admin/posts");
}

export async function deletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  logger.info(
    { userId, operation: "delete_post", postId: id },
    "Deleting post"
  );

  if (!(await canDelete())) {
    logger.warn(
      { userId, operation: "delete_post", postId: id },
      "Unauthorized delete attempt"
    );
    throw new Error("Unauthorized: Only super admins can delete posts");
  }

  try {
    await db.delete(posts).where(eq(posts.id, id));
    logger.info(
      { userId, operation: "delete_post", postId: id },
      "Post deleted successfully"
    );
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "delete_post",
        postId: id,
      },
      "Failed to delete post"
    );
    throw error;
  }

  revalidatePath("/admin/posts");
}
