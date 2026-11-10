import { artists } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdminArtistsId = new Hono<AppEnv>().get(
  "/admin/artists/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { id } = c.req.param();

    const artistId = Number.parseInt(id, 10);

    if (Number.isNaN(artistId)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);

    if (!artist) {
      throw new HTTPException(403, { message: "Access denied" });
    }
    return c.json({ id, artistId, artist });
  },
);
