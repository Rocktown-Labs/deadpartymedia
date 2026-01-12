"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create posts");
  }

  const title = formData.get("title") as string;
  const slugInput = formData.get("slug") as string;
  const category = formData.get("category") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const coverImage = formData.get("coverImage") as string;
  const status = formData.get("status") as "draft" | "published" | "archived";
  const isCoverStory = formData.get("isCoverStory") === "true";

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(title)
  );

  // If setting as cover story, unset previous cover story
  if (isCoverStory) {
    await db
      .update(posts)
      .set({ isCoverStory: false })
      .where(eq(posts.isCoverStory, true));
  }

  const publishedAt =
    status === "published" ? new Date() : null;

  await db.insert(posts).values({
    title,
    slug,
    category: category as any,
    excerpt,
    content,
    coverImage: coverImage || null,
    authorId: userId,
    status: status as any,
    isCoverStory,
    publishedAt,
  });

  revalidatePath("/admin/posts");
  redirect("/admin/posts");
}

export async function updatePost(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get the post to check ownership
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!post) {
    throw new Error("Post not found");
  }

  if (!(await canEdit(post.authorId))) {
    throw new Error("Unauthorized: You don't have permission to edit this post");
  }

  const title = formData.get("title") as string;
  const slugInput = formData.get("slug") as string;
  const category = formData.get("category") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const coverImage = formData.get("coverImage") as string;
  const status = formData.get("status") as "draft" | "published" | "archived";
  const isCoverStory = formData.get("isCoverStory") === "true";

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(title),
    id
  );

  // If setting as cover story, unset previous cover story
  if (isCoverStory && !post.isCoverStory) {
    await db
      .update(posts)
      .set({ isCoverStory: false })
      .where(and(eq(posts.isCoverStory, true), ne(posts.id, id)));
  }

  const publishedAt =
    status === "published" && !post.publishedAt
      ? new Date()
      : post.publishedAt;

  await db
    .update(posts)
    .set({
      title,
      slug,
      category: category as any,
      excerpt,
      content,
      coverImage: coverImage || null,
      status: status as any,
      isCoverStory,
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  revalidatePath("/admin/posts");
  revalidatePath(`/admin/posts/${id}`);
  redirect("/admin/posts");
}

export async function deletePost(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can delete posts");
  }

  await db.delete(posts).where(eq(posts.id, id));

  revalidatePath("/admin/posts");
}
