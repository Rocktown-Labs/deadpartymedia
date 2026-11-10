import { artists } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdminArtistsImport = new Hono<AppEnv>().get(
  "/admin/artists/import",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const existingArtists = await db
      .select({
        genre: artists.genre,
        hidden: artists.hidden,
        id: artists.id,
        image: artists.image,
        location: artists.location,
        name: artists.name,
        slug: artists.slug,
        spotifyUrl: artists.spotifyUrl,
        website: artists.website,
      })
      .from(artists)
      .orderBy(asc(artists.name));
    return c.json({ existingArtists });
  },
);
