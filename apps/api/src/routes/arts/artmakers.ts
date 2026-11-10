import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, sql } from "drizzle-orm";

import { Hono } from "hono";

import { artmakers, artworks, users } from "@dpmedia/db/d1/schema";

import {
  getAuth,
  getIdentity,
  getMembershipRoles,
  requireAuth,
  requireRole,
  setMembershipRoles,
} from "../../auth";

import type { AppEnv } from "../../bindings";

import { getDb } from "../../db";

import {
  ARTS_STAFF_ROLES,
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
  parseJsonBodyWithParam,
  parseParam,
} from "../../lib/arts-errors";

import { makeUniqueArtmakerSlug } from "../../lib/arts-slug";

/** Shared artmaker select used by the public list + profile endpoints. */
function artmakerPublicSelect() {
  return {
    artworkCount: sql<number>`(
          select count(*)
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

export const artsArtmakersRoutes = new Hono<AppEnv>()
  .get("/artmakers", async (c) => {
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
  })
  .get("/artmakers/:slug", async (c) => {
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
  })
  .post("/artmakers/:slug/profile-view", async (c) => {
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
  })
  .get("/dashboard/artmaker", async (c) => {
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
  })
  .post(
    "/artmakers/onboarding/artmaker",
    zValidator("json", artmakerOnboardingSchema),
    async (c) => {
      const auth = requireAuth(c);
      const data = c.req.valid("json");
      const db = getDb(c.env);

      const [existing] = await db
        .select({ id: artmakers.id, image: artmakers.image })
        .from(artmakers)
        .where(eq(artmakers.clerkUserId, auth.userId))
        .limit(1);

      const customMedium = data.customMedium?.trim();
      const medium = [...new Set([...data.medium, ...(customMedium ? [customMedium] : [])])];
      const slug = await makeUniqueArtmakerSlug(db, data.name, existing?.id);
      const instagramUsername = normalizeInstagramUsername(data.instagramUsername);

      const identity = await getIdentity(c.env, auth.userId);

      const payload = {
        bio: data.bio?.trim() || null,
        city: data.city,
        clerkUserId: auth.userId,
        instagramUrl: `https://instagram.com/${instagramUsername}`,
        instagramUsername,
        image: data.imageKey
          ? getPublicUploadUrl(c.env, data.imageKey)
          : data.image?.trim() || existing?.image || identity.image || null,
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

      const primaryEmail = identity.email;

      // Staff members onboarding as artmakers keep their staff role as the
      // primary role so admin tooling and legacy checks stay intact (#92).
      const existingRoles = await getMembershipRoles(c.env, auth.userId, "arts");
      const roles = mergeArtsRole(existingRoles, "artmaker");
      const primaryRole = existingRoles.find((role) => isArtsStaffRole(role)) ?? "artmaker";

      if (primaryEmail) {
        await db
          .insert(users)
          .values({
            clerkId: auth.userId,
            email: primaryEmail,
            firstName: data.name,
            imageUrl: identity.image,
            lastName: null,
            onboardingComplete: true,
            role: toDbUserRole(primaryRole),
          })
          .onConflictDoUpdate({
            set: {
              email: primaryEmail,
              firstName: data.name,
              imageUrl: identity.image,
              lastName: null,
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

        await setMembershipRoles(c.env, auth.userId, "arts", roles);

        return c.json({ artmaker: updated, success: true });
      }

      const [created] = await db.insert(artmakers).values(payload).returning();
      if (!created) {
        throw new Error("Failed to save artmaker profile");
      }

      await setMembershipRoles(c.env, auth.userId, "arts", roles);

      return c.json({ artmaker: created, success: true });
    },
  )
  .post("/artmakers/onboarding/fan", zValidator("json", fanOnboardingSchema), async (c) => {
    const auth = requireAuth(c);
    const data = c.req.valid("json");
    const db = getDb(c.env);

    const identity = await getIdentity(c.env, auth.userId);
    const primaryEmail = identity.email;

    if (!primaryEmail) {
      // Thrown Error in the source; surfaced as 400 so the client sees the
      // message ("A verified email is required...") instead of a 500.
      throw invalid("A verified email is required to finish onboarding.");
    }

    const existingRoles = await getMembershipRoles(c.env, auth.userId, "arts");
    const roles = mergeArtsRole(existingRoles, "fan");
    const primaryRole = existingRoles.find((role) => isArtsStaffRole(role)) ?? "fan";

    await db
      .insert(users)
      .values({
        clerkId: auth.userId,
        email: primaryEmail,
        firstName: data.name,
        imageUrl: identity.image,
        lastName: null,
        onboardingComplete: true,
        role: toDbUserRole(primaryRole),
      })
      .onConflictDoUpdate({
        set: {
          email: primaryEmail,
          firstName: data.name,
          imageUrl: identity.image,
          lastName: null,
          onboardingComplete: true,
          role: toDbUserRole(primaryRole),
          updatedAt: new Date(),
        },
        target: users.clerkId,
      });

    await setMembershipRoles(c.env, auth.userId, "arts", roles);

    return c.json({ success: true });
  })
  .get("/admin/artmakers", async (c) => {
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
  })
  .post("/admin/artmakers", zValidator("json", artmakerStubSchema), async (c) => {
    requireRole(c, ARTS_STAFF_ROLES);
    const data = c.req.valid("json");
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
  })
  .patch(
    "/admin/artmakers/:id",
    zValidator("json", artmakerAdminUpdateSchema.omit({ id: true })),
    async (c) => {
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
    },
  )
  .post("/admin/artmakers/:id/visibility", async (c) => {
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
  })
  .delete("/admin/artmakers/:id", async (c) => {
    requireRole(c, ARTS_STAFF_ROLES);
    const id = idFromParam(c);
    const db = getDb(c.env);

    await db.delete(artmakers).where(eq(artmakers.id, id));
    return c.json({ success: true });
  });
