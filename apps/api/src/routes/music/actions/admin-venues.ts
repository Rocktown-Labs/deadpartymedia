import { venueSchema } from "@dpmedia/contracts";
import { venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { hasMusicRole } from "../../../lib/music-access";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function AdminVenuesActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  async function createVenue(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");
    const isWriter = hasMusicRole(c, "writer");
    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, {
        message: "Unauthorized: You do not have permission to create venues",
      });
    }

    const rawData = {
      address: (formData.get("address") as string | null) || "",
      bookingEmail: (formData.get("bookingEmail") as string | null) || "",
      bookingRates: (formData.get("bookingRates") as string | null) || "",
      capacity: (formData.get("capacity") as string | null) || "",
      city: (formData.get("city") as string) || "Little Rock",
      description: (formData.get("description") as string | null) || "",
      genres: (formData.get("genres") as string | null) || "",
      image: (formData.get("image") as string | null) || undefined,
      name: (formData.get("name") as string) || "",
      phone: (formData.get("phone") as string | null) || "",
      slug: (formData.get("slug") as string | null) || "",
      state: (formData.get("state") as string) || "AR",
      website: (formData.get("website") as string | null) || undefined,
      zip: (formData.get("zip") as string | null) || "",
    };

    const validationResult = venueSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
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
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      return { redirectUrl: "/admin/venues", venueId: venue.id };
    } catch (error) {
      console.error({ error, operation: "create_venue" }, "Failed to create venue");
      throw error;
    }
  }

  async function updateVenue(venueId: number, formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");
    const isWriter = hasMusicRole(c, "writer");
    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, {
        message: "Unauthorized: You do not have permission to edit venues",
      });
    }

    const [existingVenue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);

    if (!existingVenue) {
      throw new HTTPException(404, { message: "Venue not found" });
    }

    const rawData = {
      address: (formData.get("address") as string | null) || "",
      bookingEmail: (formData.get("bookingEmail") as string | null) || "",
      bookingRates: (formData.get("bookingRates") as string | null) || "",
      capacity: (formData.get("capacity") as string | null) || "",
      city: (formData.get("city") as string) || "Little Rock",
      description: (formData.get("description") as string | null) || "",
      genres: (formData.get("genres") as string | null) || "",
      image: (formData.get("image") as string | null) || undefined,
      name: (formData.get("name") as string) || "",
      phone: (formData.get("phone") as string | null) || "",
      slug: (formData.get("slug") as string | null) || "",
      state: (formData.get("state") as string) || "AR",
      website: (formData.get("website") as string | null) || undefined,
      zip: (formData.get("zip") as string | null) || "",
    };

    const validationResult = venueSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const baseSlug = validatedData.slug?.trim() || generateSlug(validatedData.name);
    const slug =
      baseSlug === existingVenue.slug
        ? existingVenue.slug
        : await ensureUniqueSlug(db, baseSlug, venueId, "venues");

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
        .where(eq(venues.id, venueId));

      return { redirectUrl: "/admin/venues", venueId };
    } catch (error) {
      console.error({ error, operation: "update_venue" }, "Failed to update venue");
      throw error;
    }
  }

  async function deleteVenue(venueId: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");
    if (!isSuperAdmin) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can delete venues",
      });
    }

    try {
      await db.delete(venues).where(eq(venues.id, venueId));

      return { success: true };
    } catch (error) {
      console.error({ error, operation: "delete_venue" }, "Failed to delete venue");
      throw error;
    }
  }
  return { createVenue, updateVenue, deleteVenue };
}
export const adminVenuesActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/venues/createVenue",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminVenuesActions(c).createVenue(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/venues/updateVenue",
    zValidator("json", z.object({ venueId: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminVenuesActions(c).updateVenue(input.venueId, input.formData)) ?? null,
      );
    },
  )
  .post(
    "/admin/venues/deleteVenue",
    zValidator("json", z.object({ venueId: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminVenuesActions(c).deleteVenue(input.venueId)) ?? null);
    },
  );
