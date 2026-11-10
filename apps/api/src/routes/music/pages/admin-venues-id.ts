import { venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdminVenuesId = new Hono<AppEnv>().get(
  "/admin/venues/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { id } = c.req.param();

    const venueId = Number.parseInt(id, 10);

    if (Number.isNaN(venueId)) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");

    const isWriter = hasMusicRole(c, "writer");

    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [venue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);

    if (!venue) {
      throw new HTTPException(404, { message: "Not found" });
    }
    return c.json({ id, venueId, venue });
  },
);
