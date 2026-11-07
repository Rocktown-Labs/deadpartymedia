import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks, events, posts, users } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import {
  getRolesFromMetadata,
  isArtsAdminRole,
  isArtsInvitation,
  mergeArtsRole,
} from "#/lib/roles.ts";

type ArtsApi = typeof import("#/lib/api-proxy.ts");

let artsApiPromise: Promise<ArtsApi> | null = null;

/**
 * Load the API proxy lazily. api-proxy.ts statically imports
 * `@tanstack/react-start/server`, which re-exports
 * `@tanstack/start-server-core`; its `#tanstack-*` subpath imports only
 * resolve under the full TanStack Start build plugin (disabled under
 * VITEST), so an eager top-level import would break unit tests that load
 * this module. Handlers never run in those tests.
 */
function loadArtsApi(): Promise<ArtsApi> {
  artsApiPromise ??= import("#/lib/api-proxy.ts");
  return artsApiPromise;
}

export { isArtsAdminRole };

export async function requireArtsAdmin() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized");
  }

  const client = clerkClient();
  const user = await client.users.getUser(userId);
  const roles = getRolesFromMetadata(user.publicMetadata);
  const isAdminRole = roles.some((role) => isArtsAdminRole(role));

  if (!isAdminRole) {
    throw new Error(
      "Unauthorized: Only arts admins or super admins can manage staff and invitations",
    );
  }

  return { role: user.publicMetadata.role as string, userId };
}

interface ApiRecentArtmaker {
  createdAt: string;
  id: number;
  name: string;
  slug: string;
  status: (typeof artmakers.$inferSelect)["status"];
}

interface ApiRecentArtwork {
  artmakerName: string;
  createdAt: string;
  id: number;
  slug: string;
  status: (typeof artworks.$inferSelect)["status"];
  title: string;
}

interface ApiRecentArticle {
  createdAt: string;
  id: number;
  slug: string;
  status: (typeof posts.$inferSelect)["status"];
  title: string;
}

interface ApiRecentEvent {
  createdAt: string;
  id: number;
  slug: string;
  status: (typeof events.$inferSelect)["status"];
  title: string;
}

interface ApiArtsAdminOverview {
  counts: { articles: number; artmakers: number; artworks: number; events: number };
  isDegraded: boolean;
  recentArtmakers: ApiRecentArtmaker[];
  recentArtworks: ApiRecentArtwork[];
  recentArticles: ApiRecentArticle[];
  recentEvents: ApiRecentEvent[];
}

interface ApiAdminArtmakerListItem {
  bio: string | null;
  city: string;
  createdAt: string;
  hidden: boolean;
  id: number;
  image: string | null;
  instagramUsername: string;
  medium: string[];
  name: string;
  slug: string;
  state: string;
  status: (typeof artmakers.$inferSelect)["status"];
}

function reviveAdminArtmaker(row: ApiAdminArtmakerListItem) {
  return { ...row, createdAt: new Date(row.createdAt) };
}

interface ApiArtsStaffUserRow {
  clerkId: string;
  email: string;
  firstName: string | null;
  id: number;
  lastName: string | null;
  role: (typeof users.$inferSelect)["role"];
  updatedAt: string;
}

function reviveStaffUser(row: ApiArtsStaffUserRow) {
  return { ...row, updatedAt: new Date(row.updatedAt) };
}

interface ApiUserRow extends Omit<typeof users.$inferSelect, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function reviveUserRow(row: ApiUserRow): typeof users.$inferSelect {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const getArtsAdminOverview = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/admin/overview");
      if (!response.ok) {
        return {
          counts: { articles: 0, artmakers: 0, artworks: 0, events: 0 },
          error: `Arts API request failed (API ${response.status})`,
          isDegraded: true,
          recentArticles: [],
          recentArtmakers: [],
          recentArtworks: [],
          recentEvents: [],
        };
      }
      // Revive the recents' Date fields the API serialized as ISO strings.
      // Returned as a fresh object literal so `isDegraded` keeps its `false`
      // literal in the handler's inferred union (the admin UI narrows on it).
      const overview = (await response.json()) as ApiArtsAdminOverview;
      return {
        counts: overview.counts,
        isDegraded: false,
        recentArticles: overview.recentArticles.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
        })),
        recentArtmakers: overview.recentArtmakers.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
        })),
        recentArtworks: overview.recentArtworks.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
        })),
        recentEvents: overview.recentEvents.map((row) => ({
          ...row,
          createdAt: new Date(row.createdAt),
        })),
      };
    } catch (error) {
      return {
        counts: { articles: 0, artmakers: 0, artworks: 0, events: 0 },
        error: error instanceof Error ? error.message : "Arts database query failed.",
        isDegraded: true,
        recentArticles: [],
        recentArtmakers: [],
        recentArtworks: [],
        recentEvents: [],
      };
    }
  }

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

  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/admin/artmakers");
      if (!response.ok) {
        return [];
      }
      const rows = (await response.json()) as ApiAdminArtmakerListItem[];
      return rows.map(reviveAdminArtmaker);
    } catch {
      return [];
    }
  }

  return db
    .select({
      bio: artmakers.bio,
      city: artmakers.city,
      createdAt: artmakers.createdAt,
      hidden: artmakers.hidden,
      id: artmakers.id,
      image: artmakers.image,
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

  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/admin/users");
      if (!response.ok) {
        return [];
      }
      const rows = (await response.json()) as ApiArtsStaffUserRow[];
      return rows.map(reviveStaffUser);
    } catch {
      return [];
    }
  }

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
    .where(inArray(users.role, ["arts_admin", "arts_writer", "super_admin", "artmaker"]))
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

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/users/${data.userId}/role`, {
        json: data,
        method: "POST",
      });
      if (response.status === 403) {
        throw new Error("Unauthorized: Only super admins can grant super_admin role");
      }
      if (response.status === 404) {
        throw new Error("User not found");
      }
      if (!response.ok) {
        throw new Error(`Failed to update user role (API ${response.status})`);
      }
      const result = (await response.json()) as { success: boolean; user: ApiUserRow };
      return { success: true, user: reviveUserRow(result.user) };
    }

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

    // Merge the new role into the user's role list. Replacing a staff role
    // keeps the user's audience role (artmaker/fan), and vice versa, so
    // promoting an artmaker to admin doesn't strip their artist access (#92).
    const existingRoles = getRolesFromMetadata(clerkUser.publicMetadata);
    const roles = mergeArtsRole(existingRoles, data.role);

    await client.users.updateUserMetadata(targetUser.clerkId, {
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

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/admin/invitations", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to invite user (API ${response.status})`);
      }
      return { success: true };
    }

    const client = clerkClient();
    // Dual-role model (#92): the invited person gets a single role in both
    // the legacy field and the roles array so role checks stay consistent.
    const publicMetadata = {
      onboardingComplete: true,
      role: data.role,
      roles: [data.role],
    };

    // PUBLIC_APP_URL is not set on the Vercel project, and the previous
    // fallback pointed at deadpartyarts.com, which does not resolve (#100).
    const redirectUrl = process.env.PUBLIC_APP_URL
      ? `${process.env.PUBLIC_APP_URL}/admin`
      : "https://arts.deadpartymedia.com/admin";

    await client.invitations.createInvitation({
      emailAddress: data.email,
      publicMetadata,
      redirectUrl,
    });

    return { success: true };
  });

export const listArtsInvitations = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsAdmin();

  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/admin/invitations");
      if (!response.ok) {
        return [];
      }
      // Clerk createdAt is a unix timestamp (number) — no Date revival needed.
      return (await response.json()) as {
        createdAt: number;
        emailAddress: string;
        id: string;
        role: string;
        status: string;
      }[];
    } catch {
      return [];
    }
  }

  try {
    const client = clerkClient();
    const response = await client.invitations.getInvitationList();
    return response.data
      .filter((inv) => isArtsInvitation(inv))
      .map((inv) => ({
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
