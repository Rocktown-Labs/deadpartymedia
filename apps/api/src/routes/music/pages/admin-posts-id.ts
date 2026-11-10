import { postArtists, posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { canEditMusic, hasMusicRole } from "../../../lib/music-access";

export const loadAdminPostsId = new Hono<AppEnv>().get(
  "/admin/posts/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { id } = c.req.param();

    const postId = Number.parseInt(id, 10);

    if (Number.isNaN(postId)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

    if (!post) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    if (!canEditMusic(c, post.authorId)) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Load artist relations for this post
    const postArtistRelations = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .where(eq(postArtists.postId, postId));

    const artistIds = postArtistRelations.map((rel) => rel.artistId);

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
    return c.json({ postId, post, artistIds, isSuperAdmin, authorOptions });
  },
);
