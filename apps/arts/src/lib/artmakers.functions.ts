import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks, users } from "@dpmedia/db/schema";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { artmakerOnboardingSchema, normalizeInstagramUsername } from "#/lib/artmakers.ts";
import type { ArtmakerListItem } from "#/lib/artmakers.ts";
import { createSlug } from "#/lib/slug.ts";

const slugInputSchema = z.object({
  slug: z.string().min(1),
});

function isArtsStaffRole(role: unknown) {
  return (
    role === "admin" || role === "arts_admin" || role === "arts_writer" || role === "super_admin"
  );
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
  const role = user.publicMetadata.role;

  if (isArtsStaffRole(role)) {
    throw redirect({ to: "/admin" });
  }

  return { role, userId };
});

export const requireArtsStaff = createServerFn({ method: "GET" }).handler(async () => {
  assertClerkServerConfigured();

  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  const client = clerkClient();
  const user = await client.users.getUser(userId);
  const role = user.publicMetadata.role;

  if (!isArtsStaffRole(role)) {
    throw redirect({ to: "/dashboard" });
  }

  return {
    role,
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

export const listArtmakers = createServerFn({ method: "GET" }).handler(async () => {
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

    return rows satisfies ArtmakerListItem[];
  } catch {
    return [] satisfies ArtmakerListItem[];
  }
});

export const getArtmakerBySlug = createServerFn({ method: "GET" })
  .validator(slugInputSchema)
  .handler(async ({ data }) => {
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

      return artmaker ?? null;
    } catch {
      return null;
    }
  });

export const getCurrentArtmaker = createServerFn({ method: "GET" }).handler(async () => {
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

  return artmaker ?? null;
});

export const saveArtmakerOnboarding = createServerFn({ method: "POST" })
  .validator(artmakerOnboardingSchema)
  .handler(async ({ data }) => {
    assertClerkServerConfigured();

    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated || !userId) {
      throw redirect({ to: "/" });
    }

    const [existing] = await db
      .select({ id: artmakers.id })
      .from(artmakers)
      .where(eq(artmakers.clerkUserId, userId))
      .limit(1);

    const customMedium = data.customMedium?.trim();
    const medium = [...new Set([...data.medium, ...(customMedium ? [customMedium] : [])])];
    const slug = await makeUniqueArtmakerSlug(data.name, existing?.id);
    const instagramUsername = normalizeInstagramUsername(data.instagramUsername);

    const payload = {
      bio: data.bio?.trim() || null,
      city: data.city,
      clerkUserId: userId,
      instagramUrl: `https://instagram.com/${instagramUsername}`,
      instagramUsername,
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

    const client = clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses.find(
        (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

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
          role: "artmaker",
        })
        .onConflictDoUpdate({
          set: {
            email: primaryEmail,
            firstName: data.name,
            imageUrl: clerkUser.imageUrl,
            lastName: clerkUser.lastName,
            onboardingComplete: true,
            role: "artmaker",
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
          role: "artmaker",
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
        role: "artmaker",
      },
    });

    return { artmaker: created, success: true };
  });

export const createArtsArtmakerStub = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(1, "Name is required"),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const slug = await makeUniqueArtmakerSlug(data.name);
    const [created] = await db
      .insert(artmakers)
      .values({
        name: data.name,
        slug,
        city: data.city || "Little Rock",
        state: data.state || "AR",
        bio: "",
        medium: ["Visual Art"],
        approvalStatus: "APPROVED",
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
      instagramUsername: z.string().optional(),
      medium: z.array(z.string()).optional(),
      name: z.string().min(1, "Name is required"),
      state: z.string().default("AR"),
      status: z.enum(["draft", "published", "hidden"]).default("published"),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();
    const [updated] = await db
      .update(artmakers)
      .set({
        bio: data.bio || null,
        city: data.city,
        hidden: data.hidden ?? false,
        instagramUsername: data.instagramUsername || "",
        medium: data.medium || [],
        name: data.name,
        state: data.state,
        status: data.status,
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
    await db.delete(artmakers).where(eq(artmakers.id, data.id));
    return { success: true };
  });
