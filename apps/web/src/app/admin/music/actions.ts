"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { musicReleases } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { checkRole } from "@/lib/auth/roles";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath, revalidateTag } from "next/cache";
import { musicReleaseSchema } from "@/lib/validations/music";
import { logger } from "@/lib/logger";

type MusicReleaseInsert = typeof musicReleases.$inferInsert;

export async function createMusicRelease(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create music releases");
  }

  const authorIdInput = formData.get("authorId") as string | null;
  const isSuperAdmin = await checkRole("super_admin");
  const authorId = isSuperAdmin && authorIdInput ? authorIdInput : userId;

  const rawData = {
    appleMusicUrl: (formData.get("appleMusicUrl") as string | null) || undefined,
    artistId: formData.get("artistId") ? Number(formData.get("artistId")) : undefined,
    artistName: (formData.get("artistName") as string) || "",
    bandcampUrl: (formData.get("bandcampUrl") as string | null) || undefined,
    content: (formData.get("content") as string) || "",
    coverArt: (formData.get("coverArt") as string | null) || undefined,
    excerpt: (formData.get("excerpt") as string) || "",
    featured: formData.get("featured") === "true" || formData.get("featured") === "on",
    genre: (formData.get("genre") as string) || "OTHER",
    releaseDate: (formData.get("releaseDate") as string) || "",
    releaseType: (formData.get("releaseType") as string) || "Single",
    slug: (formData.get("slug") as string) || "",
    spotifyUrl: (formData.get("spotifyUrl") as string | null) || undefined,
    status: (formData.get("status") as string) || "published",
    title: (formData.get("title") as string) || "",
    youtubeUrl: (formData.get("youtubeUrl") as string | null) || undefined,
  };

  const validationResult = musicReleaseSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const baseSlug =
    validatedData.slug?.trim() ||
    generateSlug(`${validatedData.artistName}-${validatedData.title}`);
  const slug = await ensureUniqueSlug(baseSlug, undefined, "musicReleases");

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

    revalidatePath("/music");
    revalidatePath("/admin/music");
    revalidatePath("/");
    revalidateTag("music_releases", "max");

    return { redirectUrl: `/admin/music` as Route, releaseId: release.id };
  } catch (error) {
    logger.error({ error, operation: "create_music_release" }, "Failed to create music release");
    throw error;
  }
}

export async function updateMusicRelease(releaseId: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [existingRelease] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, releaseId))
    .limit(1);

  if (!existingRelease) {
    throw new Error("Music release not found");
  }

  if (!(await canEdit(existingRelease.authorId))) {
    throw new Error("Unauthorized: You don't have permission to edit this music release");
  }

  const rawData = {
    appleMusicUrl: (formData.get("appleMusicUrl") as string | null) || undefined,
    artistId: formData.get("artistId") ? Number(formData.get("artistId")) : undefined,
    artistName: (formData.get("artistName") as string) || "",
    bandcampUrl: (formData.get("bandcampUrl") as string | null) || undefined,
    content: (formData.get("content") as string) || "",
    coverArt: (formData.get("coverArt") as string | null) || undefined,
    excerpt: (formData.get("excerpt") as string) || "",
    featured: formData.get("featured") === "true" || formData.get("featured") === "on",
    genre: (formData.get("genre") as string) || "OTHER",
    releaseDate: (formData.get("releaseDate") as string) || "",
    releaseType: (formData.get("releaseType") as string) || "Single",
    slug: (formData.get("slug") as string) || "",
    spotifyUrl: (formData.get("spotifyUrl") as string | null) || undefined,
    status: (formData.get("status") as string) || "published",
    title: (formData.get("title") as string) || "",
    youtubeUrl: (formData.get("youtubeUrl") as string | null) || undefined,
  };

  const validationResult = musicReleaseSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const baseSlug =
    validatedData.slug?.trim() ||
    generateSlug(`${validatedData.artistName}-${validatedData.title}`);
  const slug = await ensureUniqueSlug(baseSlug, releaseId, "musicReleases");

  const authorIdInput = formData.get("authorId") as string | null;
  const isSuperAdmin = await checkRole("super_admin");
  const authorId = isSuperAdmin && authorIdInput ? authorIdInput : existingRelease.authorId;

  try {
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
      .where(eq(musicReleases.id, releaseId));

    revalidatePath("/music");
    revalidatePath(`/music/${slug}`);
    revalidatePath("/admin/music");
    revalidatePath("/");
    revalidateTag("music_releases", "max");

    return { redirectUrl: `/admin/music` as Route };
  } catch (error) {
    logger.error({ error, operation: "update_music_release" }, "Failed to update music release");
    throw error;
  }
}

export async function deleteMusicRelease(releaseId: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const [existingRelease] = await db
    .select()
    .from(musicReleases)
    .where(eq(musicReleases.id, releaseId))
    .limit(1);

  if (!existingRelease) {
    throw new Error("Music release not found");
  }

  const isSuperAdmin = await canDelete();
  const isOwner = existingRelease.authorId === userId;

  if (!isSuperAdmin && !isOwner) {
    throw new Error("Unauthorized: You don't have permission to delete this music release");
  }

  try {
    await db.delete(musicReleases).where(eq(musicReleases.id, releaseId));

    revalidatePath("/music");
    revalidatePath("/admin/music");
    revalidatePath("/");
    revalidateTag("music_releases", "max");

    return { success: true };
  } catch (error) {
    logger.error({ error, operation: "delete_music_release" }, "Failed to delete music release");
    throw error;
  }
}

export async function bulkUpdateMusicReleaseStatus(
  releaseIds: number[],
  status: "draft" | "published" | "archived",
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (releaseIds.length === 0) {
    return { count: 0 };
  }

  const isSuperAdmin = await canDelete();

  try {
    const whereClause = isSuperAdmin
      ? inArray(musicReleases.id, releaseIds)
      : inArray(musicReleases.id, releaseIds); // writers can update their own in future or super admin

    await db.update(musicReleases).set({ status, updatedAt: new Date() }).where(whereClause);

    revalidatePath("/music");
    revalidatePath("/admin/music");
    revalidatePath("/");
    revalidateTag("music_releases", "max");

    return { count: releaseIds.length };
  } catch (error) {
    logger.error(
      { error, operation: "bulk_update_music_release_status" },
      "Failed to bulk update status",
    );
    throw error;
  }
}

export async function approveMusicSubmission(releaseId: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized");
  }

  await db
    .update(musicReleases)
    .set({
      submissionStatus: "approved",
      status: "published",
      updatedAt: new Date(),
    })
    .where(eq(musicReleases.id, releaseId));

  revalidatePath("/music");
  revalidatePath("/admin/music");
  revalidatePath("/admin/music/submissions");
  revalidatePath("/");
  revalidateTag("music_releases", "max");

  return { success: true };
}

export async function declineMusicSubmission(releaseId: number, declineReason?: string) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized");
  }

  await db
    .update(musicReleases)
    .set({
      submissionStatus: "declined",
      declineReason: declineReason || null,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(musicReleases.id, releaseId));

  revalidatePath("/admin/music");
  revalidatePath("/admin/music/submissions");

  return { success: true };
}
