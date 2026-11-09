import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks, roleEnum, users } from "@dpmedia/db/schema";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import {
  artmakerOnboardingSchema,
  fanOnboardingSchema,
  normalizeInstagramUsername,
} from "#/lib/artmakers.ts";
import type { ArtmakerListItem } from "#/lib/artmakers.ts";
import {
  getRolesFromMetadata,
  hasArtsStaffRole,
  isArtsStaffRole,
  mergeArtsRole,
  shouldRedirectStaffFromArtmakerDashboard,
} from "#/lib/roles.ts";
import { createSlug } from "#/lib/slug.ts";
import { getPublicUploadUrl, normalizeStoredImageUrl } from "#/lib/upload.ts";

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

// Re-exported for existing role unit tests and call sites.
export {
  getRolesFromMetadata,
  hasArtsStaffRole,
  isArtsStaffRole,
  mergeArtsRole,
  shouldRedirectStaffFromArtmakerDashboard,
} from "#/lib/roles.ts";

type DbUserRole = (typeof roleEnum.enumValues)[number];

/**
 * Map a Clerk role to the shared DB role enum. "admin" is a legacy web-app
 * role with no value in the enum; super_admin is the equivalent superuser.
 */
function toDbUserRole(role: string): DbUserRole {
  if (role === "admin") {
    return "super_admin";
  }

  return (roleEnum.enumValues as readonly string[]).includes(role) ? (role as DbUserRole) : "fan";
}

const slugInputSchema = z.object({
  slug: z.string().min(1),
});

function getSerializableRole(role: unknown) {
  return typeof role === "string" ? role : null;
}

function getPrimaryRole(metadata: { role?: unknown } | undefined) {
  return getSerializableRole(metadata?.role);
}

function assertClerkServerConfigured() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for protected arts routes.");
  }
}

export const requireUser = createServerFn({ method: "GET" }).handler(async () => {
  assertClerkServerConfigured();

  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  return { userId };
});

export const requireArtmakerDashboardUser = createServerFn({ method: "GET" }).handler(async () => {
  assertClerkServerConfigured();

  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  const client = clerkClient();
  const user = await client.users.getUser(userId);
  const roles = getRolesFromMetadata(user.publicMetadata);

  // Staff-only users belong in the admin desk. Users who are both staff and
  // artmakers get access to both areas (issue #92).
  // super_admin has omni-access across all dashboards (issue #123).
  if (shouldRedirectStaffFromArtmakerDashboard(roles)) {
    throw redirect({ to: "/admin" });
  }

  return { roles, role: getPrimaryRole(user.publicMetadata), userId };
});

export const requireArtsStaff = createServerFn({ method: "GET" }).handler(async () => {
  assertClerkServerConfigured();

  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  const client = clerkClient();
  const user = await client.users.getUser(userId);
  const roles = getRolesFromMetadata(user.publicMetadata);

  if (!hasArtsStaffRole(roles)) {
    throw redirect({ to: "/dashboard" });
  }

  return {
    roles,
    role: getPrimaryRole(user.publicMetadata),
    userId,
  };
});

async function makeUniqueArtmakerSlug(name: string, currentId?: number) {
  const baseSlug = createSlug(name);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: artmakers.id })
      .from(artmakers)
      .where(
        currentId
          ? and(eq(artmakers.slug, candidate), ne(artmakers.id, currentId))
          : eq(artmakers.slug, candidate),
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

interface ApiArtmakerRow extends Omit<typeof artmakers.$inferSelect, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

/** Revive Date fields the API serializes as ISO strings. */
function reviveArtmakerRow(row: ApiArtmakerRow): typeof artmakers.$inferSelect {
  return {
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const listArtmakers = createServerFn({ method: "GET" }).handler(async () => {
  // Phase 1 flip: proxy to the platform API when configured.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    try {
      const response = await artsApiFetch("/arts/artmakers");
      if (!response.ok) {
        return [] satisfies ArtmakerListItem[];
      }
      // ArtmakerListItem has no Date fields — no revival needed.
      return (await response.json()) as ArtmakerListItem[];
    } catch {
      return [] satisfies ArtmakerListItem[];
    }
  }

  try {
    const rows = await db
      .select({
        artworkCount: sql<number>`(
          select count(*)::int
          from ${artworks}
          where ${artworks.artmakerId} = ${artmakers.id}
          and ${artworks.status} = 'published'
        )`,
        bio: artmakers.bio,
        city: artmakers.city,
        id: artmakers.id,
        image: artmakers.image,
        instagramUrl: artmakers.instagramUrl,
        instagramUsername: artmakers.instagramUsername,
        medium: artmakers.medium,
        name: artmakers.name,
        pronouns: artmakers.pronouns,
        showPronouns: artmakers.showPronouns,
        slug: artmakers.slug,
        state: artmakers.state,
      })
      .from(artmakers)
      .where(eq(artmakers.status, "published"))
      .orderBy(artmakers.name);

    return rows.map((row) => ({
      ...row,
      image: normalizeStoredImageUrl(row.image),
    })) satisfies ArtmakerListItem[];
  } catch {
    return [] satisfies ArtmakerListItem[];
  }
});

export const getArtmakerBySlug = createServerFn({ method: "GET" })
  .validator(slugInputSchema)
  .handler(async ({ data }) => {
    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      try {
        const response = await artsApiFetch(`/arts/artmakers/${encodeURIComponent(data.slug)}`);
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as ArtmakerListItem | null;
      } catch {
        return null;
      }
    }

    try {
      const [artmaker] = await db
        .select({
          artworkCount: sql<number>`(
          select count(*)::int
          from ${artworks}
          where ${artworks.artmakerId} = ${artmakers.id}
          and ${artworks.status} = 'published'
        )`,
          bio: artmakers.bio,
          city: artmakers.city,
          id: artmakers.id,
          image: artmakers.image,
          instagramUrl: artmakers.instagramUrl,
          instagramUsername: artmakers.instagramUsername,
          medium: artmakers.medium,
          name: artmakers.name,
          pronouns: artmakers.pronouns,
          showPronouns: artmakers.showPronouns,
          slug: artmakers.slug,
          state: artmakers.state,
        })
        .from(artmakers)
        .where(and(eq(artmakers.slug, data.slug), eq(artmakers.status, "published")))
        .limit(1);

      return artmaker ? { ...artmaker, image: normalizeStoredImageUrl(artmaker.image) } : null;
    } catch {
      return null;
    }
  });

export const getCurrentArtmaker = createServerFn({ method: "GET" }).handler(async () => {
  // Phase 1 flip: proxy to the platform API when configured. The API
  // returns null for anonymous callers, same as the source.
  const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
  if (artsApiConfigured()) {
    const response = await artsApiFetch("/arts/dashboard/artmaker");
    if (!response.ok) {
      throw new Error(`Failed to load artmaker profile (API ${response.status})`);
    }
    const artmaker = (await response.json()) as ApiArtmakerRow | null;
    return artmaker ? reviveArtmakerRow(artmaker) : null;
  }

  assertClerkServerConfigured();

  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    return null;
  }

  const [artmaker] = await db
    .select()
    .from(artmakers)
    .where(eq(artmakers.clerkUserId, userId))
    .limit(1);

  return artmaker ? { ...artmaker, image: normalizeStoredImageUrl(artmaker.image) } : null;
});

export const saveArtmakerOnboarding = createServerFn({ method: "POST" })
  .validator(artmakerOnboardingSchema)
  .handler(async ({ data }) => {
    assertClerkServerConfigured();

    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/" });
    }

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/artmakers/onboarding/artmaker", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to save artmaker onboarding (API ${response.status})`);
      }
      const result = (await response.json()) as { artmaker: ApiArtmakerRow; success: boolean };
      return { artmaker: reviveArtmakerRow(result.artmaker), success: true };
    }

    const [existing] = await db
      .select({ id: artmakers.id, image: artmakers.image })
      .from(artmakers)
      .where(eq(artmakers.clerkUserId, userId))
      .limit(1);

    const customMedium = data.customMedium?.trim();
    const medium = [...new Set([...data.medium, ...(customMedium ? [customMedium] : [])])];
    const slug = await makeUniqueArtmakerSlug(data.name, existing?.id);
    const instagramUsername = normalizeInstagramUsername(data.instagramUsername);

    const client = clerkClient();
    const clerkUser = await client.users.getUser(userId);

    const payload = {
      bio: data.bio?.trim() || null,
      city: data.city,
      clerkUserId: userId,
      instagramUrl: `https://instagram.com/${instagramUsername}`,
      instagramUsername,
      image: data.imageKey
        ? getPublicUploadUrl(data.imageKey)
        : data.image?.trim() || existing?.image || clerkUser.imageUrl || null,
      medium,
      name: data.name,
      phoneNumber: data.phoneNumber,
      pronouns: data.pronouns?.trim() || null,
      showPronouns: data.showPronouns,
      slug,
      state: data.state,
      status: "published" as const,
      updatedAt: new Date(),
    };

    const primaryEmail =
      clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    // Staff members onboarding as artmakers keep their staff role as the
    // primary role so admin tooling and legacy checks stay intact (#92).
    const existingRoles = getRolesFromMetadata(clerkUser.publicMetadata);
    const roles = mergeArtsRole(existingRoles, "artmaker");
    const primaryRole = existingRoles.find((role) => isArtsStaffRole(role)) ?? "artmaker";

    if (primaryEmail) {
      await db
        .insert(users)
        .values({
          clerkId: userId,
          email: primaryEmail,
          firstName: data.name,
          imageUrl: clerkUser.imageUrl,
          lastName: clerkUser.lastName,
          onboardingComplete: true,
          role: toDbUserRole(primaryRole),
        })
        .onConflictDoUpdate({
          set: {
            email: primaryEmail,
            firstName: data.name,
            imageUrl: clerkUser.imageUrl,
            lastName: clerkUser.lastName,
            onboardingComplete: true,
            role: toDbUserRole(primaryRole),
            updatedAt: new Date(),
          },
          target: users.clerkId,
        });
    }

    if (existing) {
      const [updated] = await db
        .update(artmakers)
        .set(payload)
        .where(eq(artmakers.id, existing.id))
        .returning();

      await client.users.updateUserMetadata(userId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          artmakerId: updated.id,
          onboardingComplete: true,
          role: primaryRole,
          roles,
        },
      });

      return { artmaker: updated, success: true };
    }

    const [created] = await db.insert(artmakers).values(payload).returning();

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        artmakerId: created.id,
        onboardingComplete: true,
        role: primaryRole,
        roles,
      },
    });

    return { artmaker: created, success: true };
  });

export const saveFanOnboarding = createServerFn({ method: "POST" })
  .validator(fanOnboardingSchema)
  .handler(async ({ data }) => {
    assertClerkServerConfigured();

    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/" });
    }

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/artmakers/onboarding/fan", {
        json: data,
        method: "POST",
      });
      if (response.status === 400) {
        // The API surfaces the source's verified-email guard as a 400.
        throw new Error("A verified email is required to finish onboarding.");
      }
      if (!response.ok) {
        throw new Error(`Failed to save fan onboarding (API ${response.status})`);
      }
      return { success: true };
    }

    const client = clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

    if (!primaryEmail) {
      throw new Error("A verified email is required to finish onboarding.");
    }

    const existingRoles = getRolesFromMetadata(clerkUser.publicMetadata);
    const roles = mergeArtsRole(existingRoles, "fan");
    const primaryRole = existingRoles.find((role) => isArtsStaffRole(role)) ?? "fan";

    await db
      .insert(users)
      .values({
        clerkId: userId,
        email: primaryEmail,
        firstName: data.name,
        imageUrl: clerkUser.imageUrl,
        lastName: clerkUser.lastName,
        onboardingComplete: true,
        role: toDbUserRole(primaryRole),
      })
      .onConflictDoUpdate({
        set: {
          email: primaryEmail,
          firstName: data.name,
          imageUrl: clerkUser.imageUrl,
          lastName: clerkUser.lastName,
          onboardingComplete: true,
          role: toDbUserRole(primaryRole),
          updatedAt: new Date(),
        },
        target: users.clerkId,
      });

    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        onboardingComplete: true,
        role: primaryRole,
        roles,
      },
    });

    return { success: true };
  });

export const createArtsArtmakerStub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1, "Name is required"),
      city: z.string().optional(),
      image: z.string().optional(),
      instagramUsername: z.string().optional(),
      medium: z.array(z.string()).optional(),
      state: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch("/arts/admin/artmakers", {
        json: data,
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Failed to create artmaker stub (API ${response.status})`);
      }
      return (await response.json()) as {
        artmaker: { id: number; name: string; slug: string };
        success: boolean;
      };
    }

    const slug = await makeUniqueArtmakerSlug(data.name);
    const instagramUsername = normalizeInstagramUsername(data.instagramUsername);
    const [created] = await db
      .insert(artmakers)
      .values({
        name: data.name,
        slug,
        city: data.city || "Little Rock",
        state: data.state || "AR",
        bio: "",
        clerkUserId: `local_artmaker:${slug}`,
        claimed: false,
        image: data.image?.trim() || null,
        instagramUrl: instagramUsername ? `https://instagram.com/${instagramUsername}` : "",
        instagramUsername,
        medium: data.medium?.length ? data.medium : ["Visual Art"],
        phoneNumber: "+10000000000",
      })
      .returning();

    return {
      artmaker: {
        id: created.id,
        name: created.name,
        slug: created.slug,
      },
      success: true,
    };
  });

export const updateArtsArtmaker = createServerFn({ method: "POST" })
  .validator(
    z.object({
      bio: z.string().optional(),
      city: z.string().min(1, "City is required"),
      hidden: z.boolean().optional(),
      id: z.number(),
      image: z.string().optional(),
      instagramUsername: z.string().optional(),
      medium: z.array(z.string()).optional(),
      name: z.string().min(1, "Name is required"),
      state: z.string().default("AR"),
      status: z.enum(["draft", "published", "hidden"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/artmakers/${data.id}`, {
        json: data,
        method: "PATCH",
      });
      if (response.status === 404) {
        throw new Error("Artmaker not found");
      }
      if (!response.ok) {
        throw new Error(`Failed to update artmaker (API ${response.status})`);
      }
      const result = (await response.json()) as { artmaker: ApiArtmakerRow; success: boolean };
      return { artmaker: reviveArtmakerRow(result.artmaker), success: true };
    }

    const [existing] = await db
      .select({
        hidden: artmakers.hidden,
        status: artmakers.status,
      })
      .from(artmakers)
      .where(eq(artmakers.id, data.id))
      .limit(1);

    if (!existing) {
      throw new Error("Artmaker not found");
    }

    const [updated] = await db
      .update(artmakers)
      .set({
        bio: data.bio || null,
        city: data.city,
        hidden: data.hidden ?? existing.hidden,
        image: data.image?.trim() || null,
        instagramUsername: data.instagramUsername || "",
        medium: data.medium || [],
        name: data.name,
        state: data.state,
        status: data.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(artmakers.id, data.id))
      .returning();

    return { artmaker: updated, success: true };
  });

export const toggleArtsArtmakerVisibility = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/artmakers/${data.id}/visibility`, {
        method: "POST",
      });
      if (response.status === 404) {
        throw new Error("Artmaker not found");
      }
      if (!response.ok) {
        throw new Error(`Failed to toggle artmaker visibility (API ${response.status})`);
      }
      const result = (await response.json()) as { artmaker: ApiArtmakerRow; success: boolean };
      return { artmaker: reviveArtmakerRow(result.artmaker), success: true };
    }

    const [existing] = await db.select().from(artmakers).where(eq(artmakers.id, data.id));
    if (!existing) {
      throw new Error("Artmaker not found");
    }

    const nextHidden = !existing.hidden;
    const [updated] = await db
      .update(artmakers)
      .set({
        hidden: nextHidden,
        updatedAt: new Date(),
      })
      .where(eq(artmakers.id, data.id))
      .returning();

    return { artmaker: updated, success: true };
  });

export const deleteArtsArtmaker = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      const response = await artsApiFetch(`/arts/admin/artmakers/${data.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete artmaker (API ${response.status})`);
      }
      return { success: true };
    }

    await db.delete(artmakers).where(eq(artmakers.id, data.id));
    return { success: true };
  });

// Records a profile view for the given artmaker. Called from the public
// profile page once per browser session, so router prefetches and crawlers
// don't inflate the count (issue #141).
export const recordArtmakerProfileView = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Phase 1 flip: proxy to the platform API when configured.
    const { artsApiConfigured, artsApiFetch } = await loadArtsApi();
    if (artsApiConfigured()) {
      try {
        const response = await artsApiFetch(
          `/arts/artmakers/${encodeURIComponent(data.slug)}/profile-view`,
          { method: "POST" },
        );
        if (!response.ok) {
          return { success: false, profileViews: null };
        }
        return (await response.json()) as { success: boolean; profileViews: number | null };
      } catch {
        return { success: false, profileViews: null };
      }
    }

    try {
      const [updated] = await db
        .update(artmakers)
        .set({ profileViews: sql`${artmakers.profileViews} + 1` })
        .where(eq(artmakers.slug, data.slug))
        .returning({ profileViews: artmakers.profileViews });

      return { success: true, profileViews: updated?.profileViews ?? null };
    } catch {
      return { success: false, profileViews: null };
    }
  });
