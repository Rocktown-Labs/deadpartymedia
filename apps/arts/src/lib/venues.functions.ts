import { db } from "@dpmedia/db";
import { venues } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { createSlug } from "#/lib/slug.ts";

export interface VenueListItem {
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

export const listArtsVenues = createServerFn({ method: "GET" }).handler(async () => {
  try {
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

    return rows satisfies VenueListItem[];
  } catch {
    return [] satisfies VenueListItem[];
  }
});

async function makeUniqueVenueSlug(name: string) {
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

export const createArtsVenue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      address: z.string().optional(),
      city: z.string().default("Little Rock"),
      name: z.string().min(1, "Venue name is required"),
      phone: z.string().optional(),
      state: z.string().default("AR"),
      website: z.string().optional(),
      zip: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const slug = await makeUniqueVenueSlug(data.name);

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

    return { success: true, venue: created };
  });

export const updateArtsVenue = createServerFn({ method: "POST" })
  .validator(
    z.object({
      address: z.string().optional(),
      city: z.string().min(1, "City is required"),
      id: z.number(),
      name: z.string().min(1, "Name is required"),
      phone: z.string().optional(),
      state: z.string().default("AR"),
      website: z.string().optional(),
      zip: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();
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

    return { success: true, venue: updated };
  });

export const deleteArtsVenue = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();
    await db.delete(venues).where(eq(venues.id, data.id));
    return { success: true };
  });
