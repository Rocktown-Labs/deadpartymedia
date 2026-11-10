import { artists, musicReleases } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";

export const loadArtistDashboardReleases = new Hono<AppEnv>().get(
  "/artist-dashboard/releases",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireAuth(c);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Find the artist profile claimed by this user
    const [artist] = await db
      .select()
      .from(artists)
      .where(eq(artists.claimedById, userId))
      .limit(1);

    // Fetch all releases for this artist
    const artistReleases = await db
      .select()
      .from(musicReleases)
      .where(artist ? eq(musicReleases.artistId, artist.id) : eq(musicReleases.authorId, userId))
      .orderBy(desc(musicReleases.createdAt));
    return c.json({ artistReleases });
  },
);
