import { musicReleaseSchema } from "@dpmedia/contracts";
import { musicReleases } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { canEditMusic, hasMusicRole } from "../../../lib/music-access";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function AdminMusicActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type MusicReleaseInsert = typeof musicReleases.$inferInsert;

  async function createMusicRelease(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to create music releases",
      });
    }

    const authorIdInput = formData.get("authorId") as string | null;
    const isSuperAdmin = hasMusicRole(c, "super_admin");
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
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      return { redirectUrl: `/admin/music`, releaseId: release.id };
    } catch (error) {
      console.error({ error, operation: "create_music_release" }, "Failed to create music release");
      throw error;
    }
  }

  async function updateMusicRelease(releaseId: number, formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Admin surface is for writers/super_admins. Owners with fan/artist roles
    // must go through the artist-dashboard submission flow instead.
    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to edit music releases",
      });
    }

    const [existingRelease] = await db
      .select()
      .from(musicReleases)
      .where(eq(musicReleases.id, releaseId))
      .limit(1);

    if (!existingRelease) {
      throw new HTTPException(404, { message: "Music release not found" });
    }

    if (!canEditMusic(c, existingRelease.authorId)) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to edit this music release",
      });
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
    const slug = await ensureUniqueSlug(db, baseSlug, releaseId, "musicReleases");

    const authorIdInput = formData.get("authorId") as string | null;
    const isSuperAdmin = hasMusicRole(c, "super_admin");
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

      return { redirectUrl: `/admin/music` };
    } catch (error) {
      console.error({ error, operation: "update_music_release" }, "Failed to update music release");
      throw error;
    }
  }

  async function deleteMusicRelease(releaseId: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to delete music releases",
      });
    }

    const [existingRelease] = await db
      .select()
      .from(musicReleases)
      .where(eq(musicReleases.id, releaseId))
      .limit(1);

    if (!existingRelease) {
      throw new HTTPException(404, { message: "Music release not found" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");
    const isOwner = existingRelease.authorId === userId;

    if (!isSuperAdmin && !isOwner) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to delete this music release",
      });
    }

    try {
      await db.delete(musicReleases).where(eq(musicReleases.id, releaseId));

      return { success: true };
    } catch (error) {
      console.error({ error, operation: "delete_music_release" }, "Failed to delete music release");
      throw error;
    }
  }

  async function bulkUpdateMusicReleaseStatus(
    releaseIds: number[],
    status: "draft" | "published" | "archived",
  ) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!["draft", "published", "archived"].includes(status)) {
      throw new Error("Invalid status");
    }

    const sanitizedIds = [
      ...new Set(releaseIds.filter((id) => Number.isInteger(id) && id > 0)),
    ].slice(0, 100);
    if (sanitizedIds.length === 0) {
      return { count: 0 };
    }

    // Writers may only bulk-update their own rows; super_admins may update any.
    const isSuperAdmin = hasMusicRole(c, "super_admin");
    if (!isSuperAdmin) {
      if (!hasMusicRole(c, "super_admin", "writer")) {
        throw new HTTPException(403, {
          message: "Unauthorized: You don't have permission to bulk-update music releases",
        });
      }
      // Verify every requested ID exists and is owned by the caller (IDOR guard).
      const rows = await db
        .select({ authorId: musicReleases.authorId, id: musicReleases.id })
        .from(musicReleases)
        .where(inArray(musicReleases.id, sanitizedIds));
      if (rows.length !== sanitizedIds.length || rows.some((row) => row.authorId !== userId)) {
        throw new HTTPException(403, {
          message: "Unauthorized: You can only bulk-update your own music releases",
        });
      }
    }

    try {
      const whereClause = isSuperAdmin
        ? inArray(musicReleases.id, sanitizedIds)
        : inArray(musicReleases.id, sanitizedIds);

      const updated = await db
        .update(musicReleases)
        .set({ status, updatedAt: new Date() })
        .where(whereClause)
        .returning({ id: musicReleases.id });

      return { count: updated.length };
    } catch (error) {
      console.error(
        { error, operation: "bulk_update_music_release_status" },
        "Failed to bulk update status",
      );
      throw error;
    }
  }

  async function approveMusicSubmission(releaseId: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, { message: "Unauthorized" });
    }

    if (!Number.isInteger(releaseId) || releaseId <= 0) {
      throw new Error("Invalid release ID");
    }

    const [existing] = await db
      .select({ id: musicReleases.id, submissionStatus: musicReleases.submissionStatus })
      .from(musicReleases)
      .where(eq(musicReleases.id, releaseId))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Music release not found" });
    }
    if (existing.submissionStatus !== "pending") {
      throw new Error("Only pending submissions can be approved");
    }

    await db
      .update(musicReleases)
      .set({
        submissionStatus: "approved",
        status: "published",
        updatedAt: new Date(),
      })
      .where(eq(musicReleases.id, releaseId));

    return { success: true };
  }

  async function declineMusicSubmission(releaseId: number, declineReason?: string) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, { message: "Unauthorized" });
    }

    if (!Number.isInteger(releaseId) || releaseId <= 0) {
      throw new Error("Invalid release ID");
    }

    const [existing] = await db
      .select({ id: musicReleases.id, submissionStatus: musicReleases.submissionStatus })
      .from(musicReleases)
      .where(eq(musicReleases.id, releaseId))
      .limit(1);
    if (!existing) {
      throw new HTTPException(404, { message: "Music release not found" });
    }
    if (existing.submissionStatus !== "pending") {
      throw new Error("Only pending submissions can be declined");
    }

    await db
      .update(musicReleases)
      .set({
        submissionStatus: "declined",
        declineReason: declineReason?.slice(0, 1000) || null,
        status: "draft",
        updatedAt: new Date(),
      })
      .where(eq(musicReleases.id, releaseId));

    return { success: true };
  }
  return {
    createMusicRelease,
    updateMusicRelease,
    deleteMusicRelease,
    bulkUpdateMusicReleaseStatus,
    approveMusicSubmission,
    declineMusicSubmission,
  };
}
export const adminMusicActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/music/createMusicRelease",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminMusicActions(c).createMusicRelease(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/music/updateMusicRelease",
    zValidator("json", z.object({ releaseId: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminMusicActions(c).updateMusicRelease(input.releaseId, input.formData)) ?? null,
      );
    },
  )
  .post(
    "/admin/music/deleteMusicRelease",
    zValidator("json", z.object({ releaseId: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminMusicActions(c).deleteMusicRelease(input.releaseId)) ?? null);
    },
  )
  .post(
    "/admin/music/bulkUpdateMusicReleaseStatus",
    zValidator(
      "json",
      z.object({
        releaseIds: z.array(z.number().int()),
        status: z.union([z.literal("draft"), z.literal("published"), z.literal("archived")]),
      }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminMusicActions(c).bulkUpdateMusicReleaseStatus(input.releaseIds, input.status)) ??
          null,
      );
    },
  )
  .post(
    "/admin/music/approveMusicSubmission",
    zValidator("json", z.object({ releaseId: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminMusicActions(c).approveMusicSubmission(input.releaseId)) ?? null);
    },
  )
  .post(
    "/admin/music/declineMusicSubmission",
    zValidator(
      "json",
      z.object({ releaseId: z.number().int(), declineReason: z.string().optional() }),
    ),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminMusicActions(c).declineMusicSubmission(input.releaseId, input.declineReason)) ??
          null,
      );
    },
  );
