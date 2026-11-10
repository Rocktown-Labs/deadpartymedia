import { zValidator } from "@hono/zod-validator";
import { asc } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { venues } from "@dpmedia/db/schema";

import { getMusicDb as getDb } from "../../db";

import type { AppEnv } from "../../bindings";

export const musicVenuesRoutes = new Hono<AppEnv>().get(
  "/",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
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
  },
);
