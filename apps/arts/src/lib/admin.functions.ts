import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks, events, posts, users } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";

export function isArtsAdminRole(role: unknown) {
  return role === "admin" || role === "super_admin" || role === "arts_admin";
}

async function requireArtsAdmin() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized");
  }

  const client = clerkClient();
  const user = await client.users.getUser(userId);

  if (!isArtsAdminRole(user.publicMetadata.role)) {
    throw new Error(
      "Unauthorized: Only arts admins or super admins can manage staff and invitations",
    );
  }

  return { role: user.publicMetadata.role as string, userId };
}

export const getArtsAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

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

    return {
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
    };
  } catch (error) {
    return {
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
    };
  }
});

export const listAdminArtmakers = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  return db
    .select({
      bio: artmakers.bio,
      city: artmakers.city,
      createdAt: artmakers.createdAt,
      hidden: artmakers.hidden,
      id: artmakers.id,
      instagramUsername: artmakers.instagramUsername,
      medium: artmakers.medium,
      name: artmakers.name,
      slug: artmakers.slug,
      state: artmakers.state,
      status: artmakers.status,
    })
    .from(artmakers)
    .orderBy(desc(artmakers.createdAt))
    .catch(() => []);
});

export const listArtsStaffUsers = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  return db
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
    .where(inArray(users.role, ["arts_admin", "arts_writer", "super_admin", "fan", "artmaker"]))
    .orderBy(desc(users.updatedAt))
    .catch(() => []);
});

export const updateArtsUserRole = createServerFn({ method: "POST" })
  .validator(
    z.object({
      role: z.enum([
        "artist",
        "artmaker",
        "arts_admin",
        "arts_writer",
        "fan",
        "super_admin",
        "writer",
      ]),
      userId: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const caller = await requireArtsAdmin();

    if (caller.role === "arts_admin" && data.role === "super_admin") {
      throw new Error("Unauthorized: Only super admins can grant super_admin role");
    }

    const [targetUser] = await db
      .select({
        clerkId: users.clerkId,
      })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (!targetUser) {
      throw new Error("User not found");
    }

    const client = clerkClient();
    const clerkUser = await client.users.getUser(targetUser.clerkId);
    const onboardingComplete =
      data.role === "arts_admin" ||
      data.role === "arts_writer" ||
      data.role === "super_admin" ||
      data.role === "writer";

    await client.users.updateUserMetadata(targetUser.clerkId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        onboardingComplete,
        role: data.role,
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

    return { success: true, user: updated };
  });

export const inviteArtsUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email("Valid email is required"),
      role: z.enum(["arts_admin", "arts_writer", "artmaker", "fan"]),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsAdmin();

    const client = clerkClient();
    const publicMetadata = {
      onboardingComplete: true,
      role: data.role,
    };

    const redirectUrl = process.env.PUBLIC_APP_URL
      ? `${process.env.PUBLIC_APP_URL}/admin`
      : "https://deadpartyarts.com/admin";

    await client.invitations.createInvitation({
      emailAddress: data.email,
      publicMetadata,
      redirectUrl,
    });

    return { success: true };
  });

export const listArtsInvitations = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsAdmin();
  try {
    const client = clerkClient();
    const response = await client.invitations.getInvitationList();
    return response.data.map((inv) => ({
      createdAt: inv.createdAt,
      emailAddress: inv.emailAddress,
      id: inv.id,
      role: ((inv.publicMetadata as Record<string, unknown>)?.role as string) ?? "fan",
      status: inv.status,
    }));
  } catch {
    return [];
  }
});
