import { venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
export const loadVenues = new Hono<AppEnv>().get(
  "/venues",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);

    let dbVenues: (typeof venues.$inferSelect)[] = [];

    try {
      dbVenues = await db.select().from(venues).orderBy(asc(venues.name));
    } catch {
      dbVenues = [];
    }

    const initialVenues = dbVenues.map((v) => ({
      address: v.address || undefined,
      capacity: v.capacity || undefined,
      city: v.city,
      genres: v.genres || undefined,
      id: String(v.id),
      name: v.name,
      phone: v.phone || undefined,
      website: v.website || undefined,
    }));
    return c.json({ initialVenues });
  },
);
