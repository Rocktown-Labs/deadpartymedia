import { events, musicReleases, posts } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

export const loadAdmin = new Hono<AppEnv>().get(
  "/admin",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const isSuperAdmin = hasMusicRole(c, "super_admin");

    const isWriter = hasMusicRole(c, "writer");

    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Get stats
    const [postsCount] = await db
      .select({ count: count() })
      .from(posts)
      .where(and(eq(posts.vertical, "music"), eq(posts.status, "published")));

    const [musicCount] = await db
      .select({ count: count() })
      .from(musicReleases)
      .where(eq(musicReleases.status, "published"));

    const [eventsCount] = await db
      .select({ count: count() })
      .from(events)
      .where(and(eq(events.vertical, "music"), eq(events.status, "published")));

    // Get recent posts
    const recentPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.vertical, "music"))
      .orderBy(desc(posts.createdAt))
      .limit(5);

    // Get recent events
    const recentEvents = await db
      .select()
      .from(events)
      .where(eq(events.vertical, "music"))
      .orderBy(desc(events.createdAt))
      .limit(5);
    return c.json({ postsCount, musicCount, eventsCount, recentPosts, recentEvents });
  },
);
