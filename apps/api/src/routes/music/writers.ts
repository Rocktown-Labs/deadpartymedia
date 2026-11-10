import { zValidator } from "@hono/zod-validator";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { Hono } from "hono";

import { posts, users } from "@dpmedia/db/schema";

import { getMusicDb as getDb } from "../../db";

import type { AppEnv } from "../../bindings";

export const musicWritersRoutes = new Hono<AppEnv>()
  .get("/", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const db = getDb(c.env);
    const writers = await db
      .select({
        articleCount: sql<number>`count(${posts.id})`.as("articleCount"),
        firstName: users.firstName,
        id: users.id,
        imageUrl: users.imageUrl,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .leftJoin(posts, and(eq(posts.authorId, users.clerkId), eq(posts.status, "published")))
      .groupBy(users.id, users.firstName, users.lastName, users.imageUrl, users.role)
      .where(inArray(users.role, ["writer", "super_admin"]));

    return c.json(
      writers.map((writer) => ({
        articleCount: writer.articleCount ?? 0,
        bio: "",
        id: writer.id,
        image: writer.imageUrl ?? null,
        instagram: null,
        name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
        role: writer.role,
        twitter: null,
      })),
    );
  })
  .get("/:id", zValidator("query", z.record(z.string(), z.string())), async (c) => {
    const id = c.req.param("id");
    const parsedId = Number.parseInt(id, 10);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return c.json({ error: "Invalid writer id" }, 400);
    }

    const db = getDb(c.env);
    const [writer] = await db
      .select({
        articleCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${posts}
        WHERE ${posts.authorId} = ${users.clerkId}
        AND ${posts.status} = 'published'
      )`.as("articleCount"),
        firstName: users.firstName,
        id: users.id,
        imageUrl: users.imageUrl,
        lastName: users.lastName,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.id, parsedId), inArray(users.role, ["writer", "super_admin"])))
      .limit(1);

    if (!writer) {
      return c.json({ error: "Writer not found" }, 404);
    }

    return c.json({
      articleCount: writer.articleCount ?? 0,
      bio: "",
      id: writer.id,
      image: writer.imageUrl ?? null,
      instagram: null,
      name: [writer.firstName, writer.lastName].filter(Boolean).join(" ").trim() || "Writer",
      role: writer.role,
      twitter: null,
    });
  });
