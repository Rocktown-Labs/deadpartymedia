import { eventArtists, events } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { canEditMusic } from "../../../lib/music-access";

export const loadAdminEventsId = new Hono<AppEnv>().get(
  "/admin/events/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { id } = c.req.param();

    const eventId = Number.parseInt(id, 10);

    if (Number.isNaN(eventId)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);

    if (!event) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!canEditMusic(c, event.createdById)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Load artist relations for this event
    const eventArtistRelations = await db
      .select({ artistId: eventArtists.artistId })
      .from(eventArtists)
      .where(eq(eventArtists.eventId, eventId));

    const artistIds = eventArtistRelations.map((rel) => rel.artistId);
    return c.json({ eventId, event, artistIds });
  },
);
