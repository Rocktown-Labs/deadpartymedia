import { posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";

const PLACEHOLDER_EMAIL_DOMAIN = "placeholder.deadpartymedia.local";

function isPlaceholderEmail(email: string) {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

function isInvitableRole(role: string) {
  return role === "writer" || role === "super_admin" || role === "artist";
}
export const loadAdminUsersId = new Hono<AppEnv>().get(
  "/admin/users/:id",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    if (!hasMusicRole(c, "super_admin")) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const { id } = c.req.param();

    const userId = Number.parseInt(id, 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const [profile] = await db
      .select({
        clerkId: users.clerkId,
        createdAt: users.createdAt,
        email: users.email,
        firstName: users.firstName,
        id: users.id,
        lastName: users.lastName,
        onboardingComplete: users.onboardingComplete,
        role: users.role,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!profile || ["arts_admin", "arts_writer", "artmaker"].includes(profile.role)) {
      throw new HTTPException(404, { message: "Not found" });
    }

    const [postCountRows, latestPosts] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)`.as("count") })
        .from(posts)
        .where(eq(posts.authorId, profile.clerkId)),
      db
        .select({
          id: posts.id,
          slug: posts.slug,
          status: posts.status,
          title: posts.title,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .where(eq(posts.authorId, profile.clerkId))
        .orderBy(desc(posts.updatedAt))
        .limit(5),
    ]);

    const postCount = postCountRows[0]?.count ?? 0;

    const placeholderIdentity = profile.clerkId.startsWith("local_placeholder:");

    const placeholderEmail = isPlaceholderEmail(profile.email);

    const canInvite = isInvitableRole(profile.role) && !placeholderEmail;
    return c.json({
      id,
      userId,
      profile,
      latestPosts,
      postCount,
      placeholderIdentity,
      placeholderEmail,
      canInvite,
    });
  },
);
