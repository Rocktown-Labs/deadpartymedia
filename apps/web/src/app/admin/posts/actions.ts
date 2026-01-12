"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { postSchema } from "@/lib/validations/post";

export async function createPost(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create posts");
  }

  // Validate form data
  const rawData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    category: formData.get("category") as string,
    excerpt: formData.get("excerpt") as string,
    content: formData.get("content") as string,
    coverImage: formData.get("coverImage") as string | undefined,
    status: formData.get("status") as string,
    isCoverStory: formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
  };

  const validationResult = postSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
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

  const publishedAt =
    validatedData.status === "published" ? new Date() : null;

  await db.insert(posts).values({
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

  // Validate form data
  const rawData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    category: formData.get("category") as string,
    excerpt: formData.get("excerpt") as string,
    content: formData.get("content") as string,
    coverImage: formData.get("coverImage") as string | undefined,
    status: formData.get("status") as string,
    isCoverStory: formData.get("isCoverStory") === "true" || formData.get("isCoverStory") === "on",
  };

  const validationResult = postSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
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
