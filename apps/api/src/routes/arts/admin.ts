import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { artmakers, artworks, events, posts, users } from "@dpmedia/db/schema";
import { clerkClient, requireRole } from "../../auth";
import { getDb } from "../../db";
import { firstIssueMessage, invalid, notFound, parseJsonBody } from "../../lib/arts-errors";
import {
  ARTS_ADMIN_ROLES,
  ARTS_STAFF_ROLES,
  getRolesFromMetadata as getArtsRolesFromMetadata,
  mergeArtsRole,
} from "../../lib/arts-roles";
import { artsInvitationSchema, artsUserRoleSchema } from "../../lib/arts-schemas";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/arts/src/lib/admin.functions.ts — arts admin desk:
 * overview counts/recents, staff user list, role updates, Clerk invitations.
 *
 * fn → endpoint mapping:
 *   getArtsAdminOverview  → GET  /admin/overview
 *   listArtsStaffUsers    → GET  /admin/users
 *   updateArtsUserRole    → POST /admin/users/:id/role
 *   inviteArtsUser        → POST /admin/invitations
 *   listArtsInvitations   → GET  /admin/invitations
 *
 * Guards mirror the source exactly: overview/staff-users use
 * requireRole(c, ARTS_STAFF_ROLES) (staff incl. arts_writer) and the
 * role/invitation mutations use requireRole(c, ARTS_ADMIN_ROLES).
 * Clerk writes go through clerkClient(c.env) with
 * the source's metadata merge and DB users-row sync preserved.
 */
export const artsAdminRoutes = new Hono<AppEnv>();

// arts-roles.ts doesn't export the invitation filter (it lives in the arts
// roles module but wasn't needed by the artmakers slice), so it stays local
// here — ported verbatim from apps/arts/src/lib/roles.ts.
const ARTS_INVITATION_ROLES = ["arts_admin", "arts_writer", "artmaker"] as const;

function isArtsInvitation(invitation: {
  publicMetadata?: unknown;
  redirectUrl?: string | null;
}): boolean {
  const role = ((invitation.publicMetadata as Record<string, unknown>)?.role as string) ?? "";
  if ((ARTS_INVITATION_ROLES as readonly string[]).includes(role)) {
    return true;
  }
  if (
    role === "fan" &&
    typeof invitation.redirectUrl === "string" &&
    /arts/i.test(invitation.redirectUrl)
  ) {
    return true;
  }
  return false;
}

/** Primary role from Clerk session claims (claims.metadata.role). */
function getPrimaryRole(claims: Record<string, unknown>): string | null {
  const metadata = claims.metadata as { role?: unknown } | undefined;
  return typeof metadata?.role === "string" ? metadata.role : null;
}

// getArtsAdminOverview — source guard: requireArtsStaff (staff incl. arts_writer)
artsAdminRoutes.get("/admin/overview", async (c) => {
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
});

// listArtsStaffUsers — source guard: requireArtsStaff
artsAdminRoutes.get("/admin/users", async (c) => {
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
});

// updateArtsUserRole — merges the new role into the target's Clerk
// publicMetadata (keeping their audience/staff counterpart) and syncs the
// DB users row.
artsAdminRoutes.post("/admin/users/:id/role", async (c) => {
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

  if (getPrimaryRole(caller.claims) === "arts_admin" && data.role === "super_admin") {
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

  const clerk = clerkClient(c.env);
  const clerkUser = await clerk.users.getUser(targetUser.clerkId);
  const onboardingComplete =
    data.role === "arts_admin" ||
    data.role === "arts_writer" ||
    data.role === "super_admin" ||
    data.role === "writer";

  // Merge the new role into the user's role list. Replacing a staff role
  // keeps the user's audience role (artmaker/fan), and vice versa, so
  // promoting an artmaker to admin doesn't strip their artist access (#92).
  const existingRoles = getArtsRolesFromMetadata(clerkUser.publicMetadata);
  const roles = mergeArtsRole(existingRoles, data.role);

  await clerk.users.updateUserMetadata(targetUser.clerkId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      onboardingComplete,
      role: data.role,
      roles,
    },
  });

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
});

// inviteArtsUser — invited person gets a single role in both the legacy
// field and the roles array so role checks stay consistent (#92).
artsAdminRoutes.post("/admin/invitations", async (c) => {
  const data = await parseJsonBody(c, artsInvitationSchema);

  requireRole(c, ARTS_ADMIN_ROLES);

  const clerk = clerkClient(c.env);
  const publicMetadata = {
    onboardingComplete: true,
    role: data.role,
    roles: [data.role],
  };

  // PUBLIC_APP_URL in the source maps to the ARTS_APP_URL binding here;
  // the hardcoded fallback is preserved verbatim.
  const redirectUrl = c.env.ARTS_APP_URL
    ? `${c.env.ARTS_APP_URL}/admin`
    : "https://arts.deadpartymedia.com/admin";

  await clerk.invitations.createInvitation({
    emailAddress: data.email,
    publicMetadata,
    redirectUrl,
  });

  return c.json({ success: true });
});

// listArtsInvitations
artsAdminRoutes.get("/admin/invitations", async (c) => {
  requireRole(c, ARTS_ADMIN_ROLES);

  try {
    const clerk = clerkClient(c.env);
    const response = await clerk.invitations.getInvitationList();
    return c.json(
      response.data
        .filter((inv) => isArtsInvitation(inv))
        .map((inv) => ({
          createdAt: inv.createdAt,
          emailAddress: inv.emailAddress,
          id: inv.id,
          role: ((inv.publicMetadata as Record<string, unknown>)?.role as string) ?? "fan",
          status: inv.status,
        })),
    );
  } catch {
    return c.json([]);
  }
});
