import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { venues } from "@dpmedia/db/schema";
import { getDb } from "../../db";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/venues/route.ts.
 * Response shape is identical to the Next.js route so the web app's
 * react-query hooks keep working.
 */
export const musicVenuesRoutes = new Hono<AppEnv>();

musicVenuesRoutes.get("/", async (c) => {
  try {
    const db = getDb(c.env);
    const allVenues = await db
      .select({
        address: venues.address,
        capacity: venues.capacity,
        city: venues.city,
        createdAt: venues.createdAt,
        description: venues.description,
        genres: venues.genres,
        id: venues.id,
        image: venues.image,
        name: venues.name,
        phone: venues.phone,
        slug: venues.slug,
        state: venues.state,
        website: venues.website,
        zip: venues.zip,
      })
      .from(venues)
      .orderBy(asc(venues.name));

    return c.json(allVenues);
  } catch {
    return c.json({ error: "Failed to fetch venues" }, 500);
  }
});
