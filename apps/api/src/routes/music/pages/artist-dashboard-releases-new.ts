import { artists } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";

export const loadArtistDashboardReleasesNew = new Hono<AppEnv>().get(
  "/artist-dashboard/releases/new",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireAuth(c);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.claimedById, userId))
      .limit(1);
    return c.json({ artist });
  },
);
