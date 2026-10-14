import { auth } from "@clerk/tanstack-react-start/server";
import { db } from "@dpmedia/db";
import { artmakers, artworks } from "@dpmedia/db/schema";
import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireArtsStaff } from "#/lib/artmakers.functions.ts";
import { MEDIUM_GROUPS } from "#/lib/mediums.ts";
import { createSlug } from "#/lib/slug.ts";
import { getPublicUploadUrl, normalizeStoredImageUrl } from "#/lib/upload.ts";

function withNormalizedImages<T extends { image: string | null }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, image: normalizeStoredImageUrl(row.image) }));
}

export interface ArtworkListItem {
  id: number;
  artmakerId: number;
  artmakerName: string;
  artmakerSlug: string;
  city: string;
  state: string;
  slug: string;
  title: string;
  image: string;
  description: string | null;
  medium: string | null;
  year: string | null;
  status: "draft" | "published" | "archived";
  forSale: boolean;
  priceCents: number | null;
  createdAt: Date;
}

export interface PaginatedArtworksResult {
  items: ArtworkListItem[];
  nextOffset: number | null;
  totalCount: number;
  /** Published artwork count per medium group slug. Sums to totalCount. */
  groupCounts: Record<string, number>;
}

const artworkInputSchema = z
  .object({
    description: z.string().max(700, "Description must stay under 700 characters").optional(),
    forSale: z.boolean(),
    image: z.string().optional(),
    imageKey: z.string().min(1, "Upload an image or provide an image URL").optional(),
    medium: z.string().max(80, "Medium must stay under 80 characters").optional(),
    price: z.string().optional(),
    status: z.enum(["draft", "published"]).default("published"),
    title: z
      .string()
      .trim()
      .min(1, "Title is required")
      .max(120, "Title must stay under 120 characters"),
    year: z.string().max(20, "Year must stay under 20 characters").optional(),
  })
  .refine((value) => Boolean(value.imageKey || value.image), {
    message: "Upload an image or provide an image URL",
    path: ["imageKey"],
  });

// No-arg callers always get a number: without allowMissing a missing artmaker
// redirects to onboarding instead of returning. Only `{ allowMissing: true }`
// callers can receive null.
function getCurrentArtmakerId(): Promise<number>;
function getCurrentArtmakerId(options: { allowMissing: true }): Promise<number | null>;
async function getCurrentArtmakerId(options?: { allowMissing?: boolean }): Promise<number | null> {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated || !userId) {
    throw redirect({ to: "/" });
  }

  const [artmaker] = await db
    .select({ id: artmakers.id })
    .from(artmakers)
    .where(eq(artmakers.clerkUserId, userId))
    .limit(1);

  if (!artmaker) {
    if (options?.allowMissing) {
      return null;
    }
    throw redirect({ to: "/onboarding" });
  }

  return artmaker.id;
}

async function makeUniqueArtworkSlug(title: string) {
  const baseSlug = createSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(eq(artworks.slug, candidate))
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function parsePriceCents(price?: string) {
  const trimmed = price?.trim();
  if (!trimmed) {
    return null;
  }

  const amount = Number(trimmed.replaceAll(/[^0-9.-]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function artworkSelect() {
  return {
    artmakerId: artworks.artmakerId,
    artmakerName: artmakers.name,
    artmakerSlug: artmakers.slug,
    city: artmakers.city,
    createdAt: artworks.createdAt,
    description: artworks.description,
    forSale: artworks.forSale,
    id: artworks.id,
    image: artworks.image,
    medium: artworks.medium,
    priceCents: artworks.priceCents,
    slug: artworks.slug,
    state: artmakers.state,
    status: artworks.status,
    title: artworks.title,
    year: artworks.year,
  };
}

export const listPublishedArtworks = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const rows = await db
      .select(artworkSelect())
      .from(artworks)
      .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
      .where(and(eq(artworks.status, "published"), eq(artmakers.status, "published")))
      .orderBy(desc(artworks.createdAt));

    return withNormalizedImages(rows) satisfies ArtworkListItem[];
  } catch {
    return [] satisfies ArtworkListItem[];
  }
});

// Assign every published artwork to exactly ONE medium group so the category
// counts add up to the total: groups are tested in MEDIUM_GROUPS order and the
// first keyword hit wins; anything unmatched (including a blank medium) lands
// in mixed-practice, which is also the card label fallback. Generated from the
// same MEDIUM_GROUPS table the JS-side getMediumGroupForMedium uses, so the
// counts and the filter can never drift apart.
function buildMediumGroupSql() {
  const cases = MEDIUM_GROUPS.map((group) => {
    const keywordMatches = group.mediums.map(
      (keyword) => sql`coalesce(${artworks.medium}, '') ilike ${`%${keyword}%`}`,
    );
    // Slugs come from our own MEDIUM_GROUPS constant; inline them as literals
    // so the CASE branches never rely on Postgres inferring parameter types.
    const slugLiteral = sql.raw(`'${group.slug}'`);
    return sql`when ${sql.join(keywordMatches, sql` or `)} then ${slugLiteral}`;
  });
  const fallback = MEDIUM_GROUPS.at(-1)?.slug ?? "mixed-practice";
  return sql`case ${sql.join(cases, sql` `)} else ${sql.raw(`'${fallback}'`)} end`;
}

const MEDIUM_GROUP_SQL = buildMediumGroupSql();

export const listPublishedArtworksPaginated = createServerFn({ method: "GET" })
  .validator(
    z.object({
      limit: z.number().int().min(1).max(100).default(24),
      medium: z.string().optional(),
      offset: z.number().int().min(0).default(0),
      sort: z.enum(["recent", "available", "title"]).default("recent"),
    }),
  )
  .handler(async ({ data }) => {
    try {
      const whereConditions = [eq(artworks.status, "published"), eq(artmakers.status, "published")];

      // Filter by the same exclusive group assignment the counts use, so a
      // category always shows exactly the artworks its count promises.
      if (data.medium) {
        whereConditions.push(sql`${MEDIUM_GROUP_SQL} = ${data.medium}`);
      }

      let orderClause: any[];
      if (data.sort === "available") {
        orderClause = [desc(artworks.forSale), desc(artworks.createdAt)];
      } else if (data.sort === "title") {
        orderClause = [asc(artworks.title), desc(artworks.createdAt)];
      } else {
        orderClause = [desc(artworks.createdAt)];
      }

      const [totalCountRows, itemsRows] = await Promise.all([
        db
          .select({ total: count() })
          .from(artworks)
          .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
          .where(and(...whereConditions)),
        db
          .select(artworkSelect())
          .from(artworks)
          .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
          .where(and(...whereConditions))
          .orderBy(...orderClause)
          .limit(data.limit)
          .offset(data.offset),
      ]);

      const totalCount = Number(totalCountRows[0]?.total ?? 0);
      const items = withNormalizedImages(itemsRows) satisfies ArtworkListItem[];
      const nextOffset =
        data.offset + itemsRows.length < totalCount ? data.offset + data.limit : null;

      // Counts per group for the filter pills. Every artwork lands in exactly
      // one group, so these sum to the unfiltered total. Kept isolated so a
      // problem here degrades the pill badges without losing the wall itself.
      let groupCounts: Record<string, number> = {};
      try {
        // Group by the output column position: Postgres does not match the
        // SELECT's CASE expression with a re-expanded copy in GROUP BY.
        const groupCountRows = await db
          .select({
            mediumGroup: sql<string>`${MEDIUM_GROUP_SQL}`.as("medium_group"),
            total: count(),
          })
          .from(artworks)
          .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
          .where(and(eq(artworks.status, "published"), eq(artmakers.status, "published")))
          .groupBy(sql.raw("1"));

        for (const row of groupCountRows) {
          if (row.mediumGroup) {
            groupCounts[row.mediumGroup] = Number(row.total);
          }
        }
      } catch (error) {
        console.error("[exhibitions] groupCounts query failed", error);
      }

      return {
        items,
        nextOffset,
        totalCount,
        groupCounts,
      } satisfies PaginatedArtworksResult;
    } catch (error) {
      console.error("[exhibitions] paged artwork query failed", error);
      return {
        items: [] satisfies ArtworkListItem[],
        nextOffset: null,
        totalCount: 0,
        groupCounts: {},
      } satisfies PaginatedArtworksResult;
    }
  });

export const getArtworkByIdOrSlug = createServerFn({ method: "GET" })
  .validator(z.object({ identifier: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const isNumeric = /^\d+$/.test(data.identifier);
      const condition = isNumeric
        ? eq(artworks.id, Number(data.identifier))
        : eq(artworks.slug, data.identifier);

      const [row] = await db
        .select(artworkSelect())
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(and(condition, eq(artworks.status, "published"), eq(artmakers.status, "published")))
        .limit(1);

      if (!row) {
        return null;
      }

      const [normalized] = withNormalizedImages([row]);
      return normalized satisfies ArtworkListItem;
    } catch {
      return null;
    }
  });

export const listMediumGroupArtworks = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Unknown slugs return nothing; valid slugs use the same exclusive group
    // assignment as the exhibitions page so every surface agrees on what
    // belongs to a category.
    const isValidGroup = MEDIUM_GROUPS.some((group) => group.slug === data.slug);

    if (!isValidGroup) {
      return [] satisfies ArtworkListItem[];
    }

    try {
      const rows = await db
        .select(artworkSelect())
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(
          and(
            eq(artworks.status, "published"),
            eq(artmakers.status, "published"),
            sql`${MEDIUM_GROUP_SQL} = ${data.slug}`,
          ),
        )
        .orderBy(desc(artworks.createdAt));

      return withNormalizedImages(rows) satisfies ArtworkListItem[];
    } catch {
      return [] satisfies ArtworkListItem[];
    }
  });

export const listPublishedArtworksByArtmakerSlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }) => {
    try {
      const rows = await db
        .select(artworkSelect())
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(
          and(
            eq(artmakers.slug, data.slug),
            eq(artworks.status, "published"),
            eq(artmakers.status, "published"),
          ),
        )
        .orderBy(desc(artworks.createdAt));

      return withNormalizedImages(rows) satisfies ArtworkListItem[];
    } catch {
      return [] satisfies ArtworkListItem[];
    }
  });

export const listCurrentArtworks = createServerFn({ method: "GET" }).handler(async () => {
  const artmakerId = await getCurrentArtmakerId({ allowMissing: true });

  if (!artmakerId) {
    return [] satisfies ArtworkListItem[];
  }

  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .where(eq(artworks.artmakerId, artmakerId))
    .orderBy(desc(artworks.createdAt));

  return withNormalizedImages(rows) satisfies ArtworkListItem[];
});

export const saveArtwork = createServerFn({ method: "POST" })
  .validator(artworkInputSchema)
  .handler(async ({ data }) => {
    const artmakerId = await getCurrentArtmakerId();
    const slug = await makeUniqueArtworkSlug(data.title);
    const [created] = await db
      .insert(artworks)
      .values({
        artmakerId,
        description: data.description?.trim() || null,
        forSale: data.forSale,
        image: data.imageKey ? getPublicUploadUrl(data.imageKey) : (data.image ?? ""),
        medium: data.medium?.trim() || null,
        priceCents: data.forSale ? parsePriceCents(data.price) : null,
        slug,
        status: data.status,
        title: data.title,
        year: data.year?.trim() || null,
      })
      .returning();

    return {
      artwork: { ...created, image: normalizeStoredImageUrl(created.image) },
      success: true,
    };
  });

export const deleteCurrentArtwork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    const artmakerId = await getCurrentArtmakerId();

    const [existing] = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(and(eq(artworks.id, data.id), eq(artworks.artmakerId, artmakerId)))
      .limit(1);

    if (!existing) {
      throw new Error("Artwork not found");
    }

    await db.delete(artworks).where(eq(artworks.id, data.id));

    return { success: true };
  });

export const updateCurrentArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      description: z.string().max(700, "Description must stay under 700 characters").optional(),
      forSale: z.boolean(),
      id: z.number(),
      medium: z.string().max(80, "Medium must stay under 80 characters").optional(),
      price: z.string().optional(),
      status: z.enum(["draft", "published"]),
      title: z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(120, "Title must stay under 120 characters"),
      year: z.string().max(20, "Year must stay under 20 characters").optional(),
    }),
  )
  .handler(async ({ data }) => {
    const artmakerId = await getCurrentArtmakerId();

    const [existing] = await db
      .select({ id: artworks.id, slug: artworks.slug, title: artworks.title })
      .from(artworks)
      .where(and(eq(artworks.id, data.id), eq(artworks.artmakerId, artmakerId)))
      .limit(1);

    if (!existing) {
      throw new Error("Artwork not found");
    }

    let slug = existing.slug;
    if (data.title !== existing.title) {
      slug = await makeUniqueArtworkSlug(data.title);
    }

    const [updated] = await db
      .update(artworks)
      .set({
        description: data.description?.trim() || null,
        forSale: data.forSale,
        medium: data.medium?.trim() || null,
        priceCents: data.forSale ? parsePriceCents(data.price) : null,
        slug,
        status: data.status,
        title: data.title,
        updatedAt: new Date(),
        year: data.year?.trim() || null,
      })
      .where(eq(artworks.id, data.id))
      .returning();

    return {
      artwork: { ...updated, image: normalizeStoredImageUrl(updated.image) },
      success: true,
    };
  });

export const listAdminArtworks = createServerFn({ method: "GET" }).handler(async () => {
  await requireArtsStaff();

  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .orderBy(desc(artworks.createdAt));

  return withNormalizedImages(rows) satisfies ArtworkListItem[];
});

export const createArtsArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      artmakerId: z.number(),
      description: z.string().optional(),
      forSale: z.boolean().default(false),
      image: z.string().min(1, "Image is required"),
      medium: z.string().optional(),
      priceCents: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]).default("published"),
      title: z.string().min(1, "Title is required"),
      year: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();

    const slug = await makeUniqueArtworkSlug(data.title);
    const [created] = await db
      .insert(artworks)
      .values({
        artmakerId: data.artmakerId,
        description: data.description || null,
        forSale: data.forSale,
        image: data.image,
        medium: data.medium || null,
        priceCents: data.priceCents || null,
        slug,
        status: data.status,
        title: data.title,
        year: data.year || null,
      })
      .returning();

    return {
      artwork: { ...created, image: normalizeStoredImageUrl(created.image) },
      success: true,
    };
  });

export const updateArtsArtwork = createServerFn({ method: "POST" })
  .validator(
    z.object({
      description: z.string().optional(),
      forSale: z.boolean().optional(),
      id: z.number(),
      image: z.string().min(1, "Image is required"),
      medium: z.string().optional(),
      priceCents: z.number().optional(),
      status: z.enum(["draft", "published", "archived"]),
      title: z.string().min(1, "Title is required"),
      year: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireArtsStaff();

    const [updated] = await db
      .update(artworks)
      .set({
        description: data.description || null,
        forSale: data.forSale ?? false,
        image: data.image,
        medium: data.medium || null,
        priceCents: data.priceCents || null,
        status: data.status,
        title: data.title,
        updatedAt: new Date(),
        year: data.year || null,
      })
      .where(eq(artworks.id, data.id))
      .returning();

    return {
      artwork: { ...updated, image: normalizeStoredImageUrl(updated.image) },
      success: true,
    };
  });

export const toggleArtsArtworkStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    const [existing] = await db.select().from(artworks).where(eq(artworks.id, data.id));
    if (!existing) {
      throw new Error("Artwork not found");
    }

    const nextStatus = existing.status === "published" ? "draft" : "published";

    const [updated] = await db
      .update(artworks)
      .set({
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(artworks.id, data.id))
      .returning();

    return {
      artwork: { ...updated, image: normalizeStoredImageUrl(updated.image) },
      success: true,
    };
  });

export const deleteArtsArtwork = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number() }))
  .handler(async ({ data }) => {
    await requireArtsStaff();

    await db.delete(artworks).where(eq(artworks.id, data.id));
    return { success: true };
  });
