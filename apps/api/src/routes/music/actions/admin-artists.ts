import { artistSchema } from "@dpmedia/contracts";
import { artists, eventArtists, musicReleases, postArtists } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq, inArray, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { sendInvitation } from "../../../lib/invitations";
import { hasMusicRole } from "../../../lib/music-access";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";

function AdminArtistsActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type ArtistGenre = (typeof artists.$inferInsert)["genre"];

  async function createArtist(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to create artists",
      });
    }

    // Validate form data
    const rawData = {
      bio: formData.get("bio") as string,
      email: formData.get("email") as string | undefined,
      genre: formData.get("genre") as string,
      image: formData.get("image") as string | undefined,
      instagram: formData.get("instagram") as string | undefined,
      location: formData.get("location") as string,
      name: formData.get("name") as string,
      phoneNumber: formData.get("phoneNumber") as string | undefined,
      slug: formData.get("slug") as string | undefined,
      spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
      spotifyUrl: formData.get("spotifyUrl") as string | undefined,
      tiktok: formData.get("tiktok") as string | undefined,
      twitter: formData.get("twitter") as string | undefined,
      website: formData.get("website") as string | undefined,
    };

    const validationResult = artistSchema.safeParse(rawData);

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;
    const inviteArtist = formData.get("inviteArtist") === "true";

    const slug = await ensureUniqueSlug(
      db,
      slugInput || generateSlug(validatedData.name),
      undefined,
      "artists",
    );

    // Insert artist into database
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
      .returning()
      .then((rows) => {
        if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
        return [rows[0]] as const;
      });

    // If invitation is requested and email is provided, send invitation
    if (inviteArtist && validatedData.email) {
      await sendInvitation(c.env, {
        app: "music",
        email: validatedData.email,
        role: "artist",
        artistId: artist.id,
        invitedBy: requireAuth(c).userId,
      });
    }

    return { redirectUrl: "/admin/artists" };
  }

  async function updateArtist(id: number, formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Get the artist to check if it exists
    const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

    if (!artist) {
      throw new HTTPException(404, { message: "Artist not found" });
    }

    // For artists, we allow any admin/writer to edit (no ownership check)
    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to edit artists",
      });
    }

    // Validate form data
    const rawData = {
      bio: formData.get("bio") as string,
      email: formData.get("email") as string | undefined,
      genre: formData.get("genre") as string,
      image: formData.get("image") as string | undefined,
      instagram: formData.get("instagram") as string | undefined,
      location: formData.get("location") as string,
      name: formData.get("name") as string,
      phoneNumber: formData.get("phoneNumber") as string | undefined,
      slug: formData.get("slug") as string | undefined,
      spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
      spotifyUrl: formData.get("spotifyUrl") as string | undefined,
      tiktok: formData.get("tiktok") as string | undefined,
      twitter: formData.get("twitter") as string | undefined,
      website: formData.get("website") as string | undefined,
    };

    const validationResult = artistSchema.safeParse(rawData);

    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;

    const slug = await ensureUniqueSlug(
      db,
      slugInput || generateSlug(validatedData.name),
      id,
      "artists",
    );

    await db
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
      .where(eq(artists.id, id));

    return { redirectUrl: "/admin/artists" };
  }

  async function inviteArtistToClaim(artistId: number, email: string) {
    const caller = requireRole(c, ["super_admin", "writer"]);
    const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);
    if (!artist || artist.claimed)
      throw new HTTPException(400, { message: "An unclaimed artist is required" });
    const parsedEmail = z.string().email().parse(email);
    await sendInvitation(c.env, {
      app: "music",
      email: parsedEmail,
      role: "artist",
      artistId,
      invitedBy: caller.userId,
    });
    await db.update(artists).set({ email: parsedEmail }).where(eq(artists.id, artistId));
    return { success: true as const };
  }

  async function deleteArtist(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can delete artists",
      });
    }

    await db.delete(artists).where(eq(artists.id, id));
  }

  async function setArtistHidden(id: number, hidden: boolean) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can change artist visibility",
      });
    }

    await db.update(artists).set({ hidden, updatedAt: new Date() }).where(eq(artists.id, id));
  }

  async function mergeArtistRecords(sourceArtistId: number, formData: FormData) {
    requireRole(c, ["super_admin"]);
    const targetArtistId = z.coerce.number().int().positive().parse(formData.get("targetArtistId"));
    if (targetArtistId === sourceArtistId)
      throw new HTTPException(400, { message: "Choose a different artist" });
    const records = await db
      .select()
      .from(artists)
      .where(inArray(artists.id, [sourceArtistId, targetArtistId]));
    const source = records.find((row) => row.id === sourceArtistId),
      target = records.find((row) => row.id === targetArtistId);
    if (!source || !target) throw new HTTPException(404, { message: "Artist not found" });
    if (source.claimedById && target.claimedById && source.claimedById !== target.claimedById)
      throw new HTTPException(409, {
        message: "Profiles claimed by different people cannot be merged",
      });
    // D1 batches commit every relation move and the source removal atomically.
    const fields = [
      "email",
      "image",
      "instagram",
      "phoneNumber",
      "spotifyArtistId",
      "spotifyUrl",
      "tiktok",
      "twitter",
      "website",
    ] as const;
    const inherited = Object.fromEntries(fields.map((key) => [key, target[key] || source[key]]));
    await db.batch([
      db
        .insert(postArtists)
        .select(
          sql`SELECT ${targetArtistId}, post_id FROM ${postArtists} WHERE artist_id = ${sourceArtistId}`,
        )
        .onConflictDoNothing(),
      db
        .insert(eventArtists)
        .select(
          sql`SELECT ${targetArtistId}, event_id FROM ${eventArtists} WHERE artist_id = ${sourceArtistId}`,
        )
        .onConflictDoNothing(),
      db
        .update(musicReleases)
        .set({ artistId: targetArtistId })
        .where(eq(musicReleases.artistId, sourceArtistId)),
      db
        .update(artists)
        .set({
          ...inherited,
          bio: target.bio && target.bio !== "Profile pending update." ? target.bio : source.bio,
          claimed: target.claimed || source.claimed,
          claimedById: target.claimedById || source.claimedById,
          hidden: target.hidden && source.hidden,
          profileViews: sql`${artists.profileViews} + ${source.profileViews}`,
          updatedAt: new Date(),
        })
        .where(eq(artists.id, targetArtistId)),
      db.delete(postArtists).where(eq(postArtists.artistId, sourceArtistId)),
      db.delete(eventArtists).where(eq(eventArtists.artistId, sourceArtistId)),
      db.delete(artists).where(eq(artists.id, sourceArtistId)),
    ]);
    return { success: true as const };
  }
  return {
    createArtist,
    updateArtist,
    inviteArtistToClaim,
    deleteArtist,
    setArtistHidden,
    mergeArtistRecords,
  };
}
export const adminArtistsActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/artists/createArtist",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminArtistsActions(c).createArtist(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/artists/updateArtist",
    zValidator("json", z.object({ id: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminArtistsActions(c).updateArtist(input.id, input.formData)) ?? null);
    },
  )
  .post(
    "/admin/artists/inviteArtistToClaim",
    zValidator("json", z.object({ artistId: z.number().int(), email: z.string() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminArtistsActions(c).inviteArtistToClaim(input.artistId, input.email)) ?? null,
      );
    },
  )
  .post(
    "/admin/artists/deleteArtist",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminArtistsActions(c).deleteArtist(input.id)) ?? null);
    },
  )
  .post(
    "/admin/artists/setArtistHidden",
    zValidator("json", z.object({ id: z.number().int(), hidden: z.boolean() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminArtistsActions(c).setArtistHidden(input.id, input.hidden)) ?? null);
    },
  )
  .post(
    "/admin/artists/mergeArtistRecords",
    zValidator("json", z.object({ sourceArtistId: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminArtistsActions(c).mergeArtistRecords(input.sourceArtistId, input.formData)) ??
          null,
      );
    },
  );
