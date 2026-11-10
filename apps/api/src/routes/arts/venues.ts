import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";

import { Hono } from "hono";

import { venues } from "@dpmedia/db/d1/schema";

import type { PlatformDatabase } from "@dpmedia/db/d1";

import { requireRole } from "../../auth";

import { getDb } from "../../db";

import { idFromParam, parseJsonBodyWithParam } from "../../lib/arts-errors";

import { ARTS_STAFF_ROLES } from "../../lib/arts-roles";

import { venueCreateSchema, venueUpdateSchema } from "../../lib/arts-schemas";

import { createSlug } from "../../lib/arts-slug";

import type { AppEnv } from "../../bindings";

interface VenueListItem {
  id: number;
  name: string;
  slug: string;
  address: string | null;
  city: string;
  state: string;
  zip: string | null;
  website: string | null;
  phone: string | null;
  createdAt: Date;
}

async function makeUniqueVenueSlug(db: PlatformDatabase, name: string) {
  const baseSlug = createSlug(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export const artsVenuesRoutes = new Hono<AppEnv>()
  .get("/venues", async (c) => {
    try {
      const db = getDb(c.env);
      const rows = await db
        .select({
          address: venues.address,
          city: venues.city,
          createdAt: venues.createdAt,
          id: venues.id,
          name: venues.name,
          phone: venues.phone,
          slug: venues.slug,
          state: venues.state,
          website: venues.website,
          zip: venues.zip,
        })
        .from(venues)
        .orderBy(venues.name);

      return c.json(rows satisfies VenueListItem[]);
    } catch {
      return c.json([] satisfies VenueListItem[]);
    }
  })
  .post("/admin/venues", zValidator("json", venueCreateSchema), async (c) => {
    const data = c.req.valid("json");

    requireRole(c, ARTS_STAFF_ROLES);
    const db = getDb(c.env);
    const slug = await makeUniqueVenueSlug(db, data.name);

    const [created] = await db
      .insert(venues)
      .values({
        address: data.address || null,
        city: data.city,
        name: data.name,
        phone: data.phone || null,
        slug,
        state: data.state,
        website: data.website || null,
        zip: data.zip || null,
      })
      .returning();

    return c.json({ success: true, venue: created });
  })
  .patch(
    "/admin/venues/:id",
    zValidator("json", venueUpdateSchema.omit({ id: true })),
    async (c) => {
      const data = await parseJsonBodyWithParam(c, venueUpdateSchema, "id");

      requireRole(c, ARTS_STAFF_ROLES);
      const db = getDb(c.env);
      const [updated] = await db
        .update(venues)
        .set({
          address: data.address || null,
          city: data.city,
          name: data.name,
          phone: data.phone || null,
          state: data.state,
          updatedAt: new Date(),
          website: data.website || null,
          zip: data.zip || null,
        })
        .where(eq(venues.id, data.id))
        .returning();

      return c.json({ success: true, venue: updated });
    },
  )
  .delete("/admin/venues/:id", async (c) => {
    const id = idFromParam(c);

    requireRole(c, ARTS_STAFF_ROLES);
    const db = getDb(c.env);
    await db.delete(venues).where(eq(venues.id, id));
    return c.json({ success: true });
  });
