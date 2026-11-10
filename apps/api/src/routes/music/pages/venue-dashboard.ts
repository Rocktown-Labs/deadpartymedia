import { events, venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";

export const loadVenueDashboard = new Hono<AppEnv>().get(
  "/venue-dashboard",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireAuth(c);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [venue] = await db.select().from(venues).where(eq(venues.claimedById, userId)).limit(1);

    const venueEvents = await db
      .select()
      .from(events)
      .where(eq(events.venueId, venue?.id ?? 0))
      .orderBy(desc(events.date))
      .limit(20);
    return c.json({ venue, venueEvents });
  },
);
