import { users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";
import { findDefaultBackfillAuthorId } from "../../../lib/music/admin/wordpress-backfill";

export const loadAdminPostsNew = new Hono<AppEnv>().get(
  "/admin/posts/new",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!hasMusicRole(c, "super_admin", "writer")) {
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

    const defaultAuthorId = findDefaultBackfillAuthorId(authorOptions, userId);
    return c.json({ isSuperAdmin, authorOptions, defaultAuthorId });
  },
);
