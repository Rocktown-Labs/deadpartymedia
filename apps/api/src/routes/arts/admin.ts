import { zValidator } from "@hono/zod-validator";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { Hono } from "hono";

import { artmakers, artworks, events, posts, users } from "@dpmedia/db/d1/schema";

import { getMembershipRoles, requireRole, setMembershipRoles } from "../../auth";

import { getDb } from "../../db";

import { firstIssueMessage, invalid, notFound } from "../../lib/arts-errors";

import { ARTS_ADMIN_ROLES, ARTS_STAFF_ROLES, mergeArtsRole } from "../../lib/arts-roles";

import { artsUserRoleSchema } from "../../lib/arts-schemas";

import type { AppEnv } from "../../bindings";

export const artsAdminRoutes = new Hono<AppEnv>()
  .get("/admin/overview", async (c) => {
    requireRole(c, ARTS_STAFF_ROLES);

    const db = getDb(c.env);
    try {
      const [artmakerCount] = await db
        .select({ count: count() })
        .from(artmakers)
        .where(eq(artmakers.status, "published"));
      const [artworkCount] = await db
        .select({ count: count() })
        .from(artworks)
        .where(eq(artworks.status, "published"));
      const [articleCount] = await db
        .select({ count: count() })
        .from(posts)
        .where(and(eq(posts.vertical, "arts"), eq(posts.status, "published")));
      const [eventCount] = await db
        .select({ count: count() })
        .from(events)
        .where(and(eq(events.vertical, "arts"), eq(events.status, "published")));

      const [recentArtmakers, recentArtworks, recentArticles, recentEvents] = await Promise.all([
        db
          .select({
            createdAt: artmakers.createdAt,
            id: artmakers.id,
            name: artmakers.name,
            slug: artmakers.slug,
            status: artmakers.status,
          })
          .from(artmakers)
          .orderBy(desc(artmakers.createdAt))
          .limit(5),
        db
          .select({
            artmakerName: artmakers.name,
            createdAt: artworks.createdAt,
            id: artworks.id,
            slug: artworks.slug,
            status: artworks.status,
            title: artworks.title,
          })
          .from(artworks)
          .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
          .orderBy(desc(artworks.createdAt))
          .limit(5),
        db
          .select({
            createdAt: posts.createdAt,
            id: posts.id,
            slug: posts.slug,
            status: posts.status,
            title: posts.title,
          })
          .from(posts)
          .where(eq(posts.vertical, "arts"))
          .orderBy(desc(posts.createdAt))
          .limit(5),
        db
          .select({
            createdAt: events.createdAt,
            id: events.id,
            slug: events.slug,
            status: events.status,
            title: events.title,
          })
          .from(events)
          .where(eq(events.vertical, "arts"))
          .orderBy(desc(events.createdAt))
          .limit(5),
      ]);

      return c.json({
        counts: {
          articles: Number(articleCount?.count ?? 0),
          artmakers: Number(artmakerCount?.count ?? 0),
          artworks: Number(artworkCount?.count ?? 0),
          events: Number(eventCount?.count ?? 0),
        },
        isDegraded: false,
        recentArticles,
        recentArtmakers,
        recentArtworks,
        recentEvents,
      });
    } catch (error) {
      return c.json({
        counts: {
          articles: 0,
          artmakers: 0,
          artworks: 0,
          events: 0,
        },
        error: error instanceof Error ? error.message : "Arts database query failed.",
        isDegraded: true,
        recentArticles: [],
        recentArtmakers: [],
        recentArtworks: [],
        recentEvents: [],
      });
    }
  })
  .get("/admin/users", async (c) => {
    requireRole(c, ARTS_STAFF_ROLES);

    const db = getDb(c.env);
    return c.json(
      await db
        .select({
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          id: users.id,
          lastName: users.lastName,
          role: users.role,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(inArray(users.role, ["arts_admin", "arts_writer", "super_admin", "artmaker"]))
        .orderBy(desc(users.updatedAt))
        .catch(() => []),
    );
  })
  .post(
    "/admin/users/:id/role",
    zValidator("json", artsUserRoleSchema.omit({ userId: true })),
    async (c) => {
      let raw: unknown;
      try {
        raw = await c.req.json();
      } catch {
        throw invalid("Invalid JSON body");
      }
      const base = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const parsed = artsUserRoleSchema.safeParse({ ...base, userId: Number(c.req.param("id")) });
      if (!parsed.success) {
        throw invalid(firstIssueMessage(parsed.error));
      }
      const data = parsed.data;

      const caller = requireRole(c, ARTS_ADMIN_ROLES);

      if (!caller.roles.includes("super_admin") && data.role === "super_admin") {
        throw new HTTPException(403, {
          res: Response.json({
            error: "Unauthorized: Only super admins can grant super_admin role",
          }),
        });
      }

      const db = getDb(c.env);
      const [targetUser] = await db
        .select({
          clerkId: users.clerkId,
        })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);

      if (!targetUser) {
        throw notFound("User not found");
      }

      const onboardingComplete =
        data.role === "arts_admin" || data.role === "arts_writer" || data.role === "super_admin";

      // Merge the new role into the user's role list. Replacing a staff role
      // keeps the user's audience role (artmaker/fan), and vice versa, so
      // promoting an artmaker to admin doesn't strip their artist access (#92).
      const existingRoles = await getMembershipRoles(c.env, targetUser.clerkId, "arts");
      if (existingRoles.includes("super_admin") && !caller.roles.includes("super_admin"))
        throw new HTTPException(403, {
          message: "Only super admins can change a super admin role",
        });
      const roles = mergeArtsRole(existingRoles, data.role);

      await setMembershipRoles(c.env, targetUser.clerkId, "arts", roles);

      const [updated] = await db
        .update(users)
        .set({
          onboardingComplete,
          role: data.role,
          updatedAt: new Date(),
        })
        .where(eq(users.id, data.userId))
        .returning();

      return c.json({ success: true, user: updated });
    },
  );
