import { and, desc, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { artmakers, artworks, users } from "@dpmedia/db/schema";
import { clerkClient, getAuth, requireAuth, requireRole } from "../../auth";
import type { AppEnv } from "../../bindings";
import { getDb } from "../../db";
import {
  ARTS_STAFF_ROLES,
  getRolesFromMetadata,
  isArtsStaffRole,
  mergeArtsRole,
  toDbUserRole,
} from "../../lib/arts-roles";
import { normalizeInstagramUsername } from "../../lib/arts-schemas";
import {
  artmakerAdminUpdateSchema,
  artmakerOnboardingSchema,
  artmakerStubSchema,
  fanOnboardingSchema,
  slugParamSchema,
} from "../../lib/arts-schemas";
import type { ArtmakerListItem } from "../../lib/arts-schemas";
import { getPublicUploadUrl, normalizeStoredImageUrl } from "../../lib/arts-images";
import {
  idFromParam,
  invalid,
  notFound,
  parseJsonBody,
  parseJsonBodyWithParam,
  parseParam,
} from "../../lib/arts-errors";
import { makeUniqueArtmakerSlug } from "../../lib/arts-slug";

/**
 * /arts/artmakers* — ported from apps/arts/src/lib/artmakers.functions.ts
 * (plus listAdminArtmakers from admin.functions.ts).
 *
 * Response shapes are identical to the TanStack server-function returns so
 * the arts frontend can swap its useServerFn callers for thin HTTP calls.
 * Guards that threw redirect() in TanStack now return 401/403 JSON — the
 * frontend handles HTTP statuses instead of following redirects.
 *
 * NOTE: the source guarded the admin artmaker CRUD with requireArtsStaff
 * (which includes arts_writer); per the migration task spec these endpoints
 * sit behind ARTS_STAFF_ROLES (arts staff), matching the source's
 * requireArtsStaff guard.
 */
export const artsArtmakersRoutes = new Hono<AppEnv>();

/** Shared artmaker select used by the public list + profile endpoints. */
function artmakerPublicSelect() {
  return {
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
  };
}

// --- Public ---

// listArtmakers
artsArtmakersRoutes.get("/artmakers", async (c) => {
  try {
    const db = getDb(c.env);
    const rows = await db
      .select(artmakerPublicSelect())
      .from(artmakers)
      .where(eq(artmakers.status, "published"))
      .orderBy(artmakers.name);

    return c.json(
      rows.map((row) => ({
        ...row,
        image: normalizeStoredImageUrl(c.env, row.image),
      })) satisfies ArtmakerListItem[],
    );
  } catch {
    return c.json([] satisfies ArtmakerListItem[]);
  }
});

// getArtmakerBySlug. The artmaker's artworks come from
// GET /artworks?artmaker=<slug> (paginated) and
// GET /artworks/by-artmaker/<slug> (full list).
artsArtmakersRoutes.get("/artmakers/:slug", async (c) => {
  const { slug } = parseParam(c, slugParamSchema);
  try {
    const db = getDb(c.env);
    const [artmaker] = await db
      .select(artmakerPublicSelect())
      .from(artmakers)
      .where(and(eq(artmakers.slug, slug), eq(artmakers.status, "published")))
      .limit(1);

    return c.json(
      artmaker ? { ...artmaker, image: normalizeStoredImageUrl(c.env, artmaker.image) } : null,
    );
  } catch {
    return c.json(null);
  }
});

// recordArtmakerProfileView — called once per browser session from the
// public profile page so prefetches and crawlers don't inflate the count
// (issue #141). Always 200: DB failures return {success: false} like the
// source; a malformed param is a 400 before the DB is touched.
artsArtmakersRoutes.post("/artmakers/:slug/profile-view", async (c) => {
  const { slug } = parseParam(c, slugParamSchema);
  try {
    const db = getDb(c.env);
    const [updated] = await db
      .update(artmakers)
      .set({ profileViews: sql`${artmakers.profileViews} + 1` })
      .where(eq(artmakers.slug, slug))
      .returning({ profileViews: artmakers.profileViews });

    return c.json({ success: true, profileViews: updated?.profileViews ?? null });
  } catch {
    return c.json({ success: false, profileViews: null });
  }
});

// --- Dashboard (artmaker) ---

// getCurrentArtmaker — anonymous users get null (the source fn returned
// null instead of redirecting), authenticated users get their artmaker row.
artsArtmakersRoutes.get("/dashboard/artmaker", async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json(null);
  }

  const db = getDb(c.env);
  const [artmaker] = await db
    .select()
    .from(artmakers)
    .where(eq(artmakers.clerkUserId, auth.userId))
    .limit(1);

  return c.json(
    artmaker ? { ...artmaker, image: normalizeStoredImageUrl(c.env, artmaker.image) } : null,
  );
});

// saveArtmakerOnboarding — auth + DB upsert + Clerk metadata write.
// The TanStack redirect({to: "/"}) for anonymous callers is now 401 JSON.
artsArtmakersRoutes.post("/artmakers/onboarding/artmaker", async (c) => {
  const auth = requireAuth(c);
  const data = await parseJsonBody(c, artmakerOnboardingSchema);
  const db = getDb(c.env);
  const clerk = clerkClient(c.env);

  const [existing] = await db
    .select({ id: artmakers.id, image: artmakers.image })
    .from(artmakers)
    .where(eq(artmakers.clerkUserId, auth.userId))
    .limit(1);

  const customMedium = data.customMedium?.trim();
  const medium = [...new Set([...data.medium, ...(customMedium ? [customMedium] : [])])];
  const slug = await makeUniqueArtmakerSlug(db, data.name, existing?.id);
  const instagramUsername = normalizeInstagramUsername(data.instagramUsername);

  const clerkUser = await clerk.users.getUser(auth.userId);

  const payload = {
    bio: data.bio?.trim() || null,
    city: data.city,
    clerkUserId: auth.userId,
    instagramUrl: `https://instagram.com/${instagramUsername}`,
    instagramUsername,
    image: data.imageKey
      ? getPublicUploadUrl(c.env, data.imageKey)
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
        clerkId: auth.userId,
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

    if (!updated) {
      throw new Error("Failed to save artmaker profile");
    }

    await clerk.users.updateUserMetadata(auth.userId, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        artmakerId: updated.id,
        onboardingComplete: true,
        role: primaryRole,
        roles,
      },
    });

    return c.json({ artmaker: updated, success: true });
  }

  const [created] = await db.insert(artmakers).values(payload).returning();
  if (!created) {
    throw new Error("Failed to save artmaker profile");
  }

  await clerk.users.updateUserMetadata(auth.userId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      artmakerId: created.id,
      onboardingComplete: true,
      role: primaryRole,
      roles,
    },
  });

  return c.json({ artmaker: created, success: true });
});

// saveFanOnboarding — auth + users upsert + Clerk metadata write.
artsArtmakersRoutes.post("/artmakers/onboarding/fan", async (c) => {
  const auth = requireAuth(c);
  const data = await parseJsonBody(c, fanOnboardingSchema);
  const db = getDb(c.env);
  const clerk = clerkClient(c.env);

  const clerkUser = await clerk.users.getUser(auth.userId);
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

  if (!primaryEmail) {
    // Thrown Error in the source; surfaced as 400 so the client sees the
    // message ("A verified email is required...") instead of a 500.
    throw invalid("A verified email is required to finish onboarding.");
  }

  const existingRoles = getRolesFromMetadata(clerkUser.publicMetadata);
  const roles = mergeArtsRole(existingRoles, "fan");
  const primaryRole = existingRoles.find((role) => isArtsStaffRole(role)) ?? "fan";

  await db
    .insert(users)
    .values({
      clerkId: auth.userId,
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

  await clerk.users.updateUserMetadata(auth.userId, {
    publicMetadata: {
      ...clerkUser.publicMetadata,
      onboardingComplete: true,
      role: primaryRole,
      roles,
    },
  });

  return c.json({ success: true });
});

// --- Admin (arts admin roles) ---

// listAdminArtmakers (ported from admin.functions.ts). No image
// normalization here — the admin table shows the stored URL.
artsArtmakersRoutes.get("/admin/artmakers", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const db = getDb(c.env);

  const rows = await db
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

  return c.json(rows);
});

// createArtsArtmakerStub — stub rows for artmakers who have not claimed
// their profile yet (clerkUserId "local_artmaker:<slug>", claimed: false).
artsArtmakersRoutes.post("/admin/artmakers", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const data = await parseJsonBody(c, artmakerStubSchema);
  const db = getDb(c.env);

  const slug = await makeUniqueArtmakerSlug(db, data.name);
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

  if (!created) {
    throw new Error("Failed to create artmaker stub");
  }

  return c.json({
    artmaker: {
      id: created.id,
      name: created.name,
      slug: created.slug,
    },
    success: true,
  });
});

// updateArtsArtmaker — `id` comes from the URL, merged into the body
// before the same schema the server fn used runs.
artsArtmakersRoutes.patch("/admin/artmakers/:id", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const data = await parseJsonBodyWithParam(c, artmakerAdminUpdateSchema, "id");
  const db = getDb(c.env);

  const [existing] = await db
    .select({
      hidden: artmakers.hidden,
      status: artmakers.status,
    })
    .from(artmakers)
    .where(eq(artmakers.id, data.id))
    .limit(1);

  if (!existing) {
    throw notFound("Artmaker not found");
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

  if (!updated) {
    throw new Error("Failed to update artmaker");
  }

  return c.json({ artmaker: updated, success: true });
});

// toggleArtsArtmakerVisibility — flips `hidden` (POST = action subresource).
artsArtmakersRoutes.post("/admin/artmakers/:id/visibility", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const id = idFromParam(c);
  const db = getDb(c.env);

  const [existing] = await db.select().from(artmakers).where(eq(artmakers.id, id));
  if (!existing) {
    throw notFound("Artmaker not found");
  }

  const nextHidden = !existing.hidden;
  const [updated] = await db
    .update(artmakers)
    .set({
      hidden: nextHidden,
      updatedAt: new Date(),
    })
    .where(eq(artmakers.id, id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update artmaker");
  }

  return c.json({ artmaker: updated, success: true });
});

// deleteArtsArtmaker
artsArtmakersRoutes.delete("/admin/artmakers/:id", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const id = idFromParam(c);
  const db = getDb(c.env);

  await db.delete(artmakers).where(eq(artmakers.id, id));
  return c.json({ success: true });
});
