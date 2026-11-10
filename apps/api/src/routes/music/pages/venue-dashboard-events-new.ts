import { venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";

export const loadVenueDashboardEventsNew = new Hono<AppEnv>().get(
  "/venue-dashboard/events/new",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireAuth(c);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [userVenue] = await db
      .select()
      .from(venues)
      .where(eq(venues.claimedById, userId))
      .limit(1);

    const initialLocation = userVenue
      ? [userVenue.address, userVenue.city, `${userVenue.state} ${userVenue.zip || ""}`.trim()]
          .filter(Boolean)
          .join(", ")
      : "";
    return c.json({ userVenue, initialLocation });
  },
);
