import { db } from "@dpmedia/db";
import { venues } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { artsApiConfigured, artsApiFetch } from "#/lib/api-proxy.ts";
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

interface ApiVenueListItem extends Omit<VenueListItem, "createdAt"> {
  createdAt: string;
}

/** Revive Date fields the API serializes as ISO strings. */
function reviveVenue<T extends { createdAt: string }>(venue: T): T & { createdAt: Date } {
  return { ...venue, createdAt: new Date(venue.createdAt) };
}

export const listArtsVenues = createServerFn({ method: "GET" }).handler(async () => {
  // Phase 1 flip: proxy to the platform API when configured.
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/venues");
      if (!response.ok) {
        return [] satisfies VenueListItem[];
      }
      const rows = (await response.json()) as ApiVenueListItem[];
      return rows.map(reviveVenue) satisfies VenueListItem[];
    } catch {
      return [] satisfies VenueListItem[];
    }
  }

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

    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/admin/venues", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to create venue (API ${response.status})`);
      }
      const result = (await response.json()) as { venue?: ApiVenueListItem };
      // Preserve the original return type: `venue: VenueListItem` — the
      // source returned the drizzle row (or undefined on empty returning())
      // under the same non-optional type.
      return {
        success: true,
        venue: result.venue ? reviveVenue(result.venue) : undefined,
      } as { success: boolean; venue: VenueListItem };
    }

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

    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/venues/${data.id}`, {
        json: data,
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(`Failed to update venue (API ${response.status})`);
      }
      const result = (await response.json()) as { venue?: ApiVenueListItem };
      // Preserve the original return type: `venue: VenueListItem` — the
      // source returned the drizzle row (or undefined on a missing id)
      // under the same non-optional type.
      return {
        success: true,
        venue: result.venue ? reviveVenue(result.venue) : undefined,
      } as { success: boolean; venue: VenueListItem };
    }

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

    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/venues/${data.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete venue (API ${response.status})`);
      }
      return { success: true };
    }

    await db.delete(venues).where(eq(venues.id, data.id));
    return { success: true };
  });
