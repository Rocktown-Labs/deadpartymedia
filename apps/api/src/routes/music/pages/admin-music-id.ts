import { musicReleases, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { canEditMusic, hasMusicRole } from "../../../lib/music-access";

export const loadAdminMusicId = new Hono<AppEnv>().get(
  "/admin/music/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { id } = c.req.param();

    const releaseId = Number.parseInt(id, 10);

    if (Number.isNaN(releaseId)) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const [release] = await db
      .select()
      .from(musicReleases)
      .where(eq(musicReleases.id, releaseId))
      .limit(1);

    if (!release) {
      throw new HTTPException(404, { message: "Not found" });
    }

    if (!canEditMusic(c, release.authorId)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");

    const authorOptions = isSuperAdmin
      ? await db
          .select({
            clerkId: users.clerkId,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
          })
          .from(users)
          .where(inArray(users.role, ["writer", "super_admin"]))
          .orderBy(asc(users.firstName), asc(users.lastName))
          .then((rows) =>
            rows.map((row) => ({
              clerkId: row.clerkId,
              name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
              role: row.role,
            })),
          )
      : [];
    return c.json({ id, releaseId, release, isSuperAdmin, authorOptions });
  },
);
