import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Hono } from "hono";
import { artmakers, artworks } from "@dpmedia/db/schema";
import { requireAuth, requireRole } from "../../auth";
import type { AppEnv, AuthContext, Bindings } from "../../bindings";
import { getDb } from "../../db";
import { ARTS_STAFF_ROLES } from "../../lib/arts-roles";
import { MEDIUM_GROUP_SQL } from "../../lib/mediums";
import {
  adminArtworkCreateSchema,
  adminArtworkUpdateSchema,
  artworkDashboardUpdateSchema,
  artworkInputSchema,
  artworkListQuerySchema,
  identifierParamSchema,
  slugParamSchema,
} from "../../lib/arts-schemas";
import type { ArtworkListItem, PaginatedArtworksResult } from "../../lib/arts-schemas";
import { getPublicUploadUrl, normalizeStoredImageUrl } from "../../lib/arts-images";
import {
  firstIssueMessage,
  forbidden,
  idFromParam,
  invalid,
  notFound,
  parseJsonBody,
  parseJsonBodyWithParam,
  parseParam,
  parseQuery,
} from "../../lib/arts-errors";
import { makeUniqueArtworkSlug } from "../../lib/arts-slug";

/**
 * /arts/artworks* — ported from apps/arts/src/lib/artworks.functions.ts.
 *
 * Response shapes are identical to the TanStack server-function returns
 * (paginated lists return {items, nextOffset, totalCount, groupCounts}
 * exactly). Guards that threw redirect() in TanStack now return 401/403
 * JSON — the frontend handles HTTP statuses instead of following redirects.
 *
 * Dashboard (artmaker-scoped) endpoints resolve the caller's artmakerId
 * from the Clerk session claims (metadata.artmakerId, written during
 * onboarding) instead of the source's per-request DB lookup; a caller
 * without an artmaker profile (fans, staff-only users) gets 403 where the
 * source redirected to /onboarding.
 *
 * NOTE: the source guarded the admin artwork CRUD with requireArtsStaff
 * (which includes arts_writer); per the migration task spec these endpoints
 * sit behind ARTS_STAFF_ROLES (arts staff), matching the source's
 * requireArtsStaff guard.
 */
export const artsArtworksRoutes = new Hono<AppEnv>();

function withNormalizedImages<T extends { image: string | null }>(env: Bindings, rows: T[]): T[] {
  return rows.map((row) => ({ ...row, image: normalizeStoredImageUrl(env, row.image) }));
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

/**
 * Artmaker scoping for dashboard endpoints. Mirrors the source's
 * getCurrentArtmakerId(): authenticated caller (401 otherwise) with an
 * artmaker profile. Fans/staff-only users hold no artmakerId claim → 403
 * (the source redirected them to /onboarding).
 */
function requireCurrentArtmakerId(c: { get(key: "auth"): AuthContext | null }): number {
  const auth = requireAuth(c);
  const metadata = auth.claims.metadata as { artmakerId?: number } | undefined;
  const artmakerId = metadata?.artmakerId;
  if (typeof artmakerId !== "number" || !Number.isInteger(artmakerId) || artmakerId <= 0) {
    throw forbidden();
  }
  return artmakerId;
}

function currentArtmakerIdOrNull(c: { get(key: "auth"): AuthContext | null }): number | null {
  const auth = requireAuth(c);
  const metadata = auth.claims.metadata as { artmakerId?: number } | undefined;
  const artmakerId = metadata?.artmakerId;
  return typeof artmakerId === "number" && Number.isInteger(artmakerId) && artmakerId > 0
    ? artmakerId
    : null;
}

// --- Public ---

// listPublishedArtworksPaginated — the exhibitions wall + artmaker profile
// gallery. `medium` filters by the exclusive group assignment the counts
// use, so a category always shows exactly the artworks its count promises.
artsArtworksRoutes.get("/artworks", async (c) => {
  const data = parseQuery(c, artworkListQuerySchema);

  try {
    const db = getDb(c.env);
    const whereConditions: SQL[] = [
      eq(artworks.status, "published"),
      eq(artmakers.status, "published"),
    ];

    if (data.artmaker) {
      whereConditions.push(eq(artmakers.slug, data.artmaker));
    }

    // Filter by the same exclusive group assignment the counts use, so a
    // category always shows exactly the artworks its count promises.
    if (data.medium) {
      whereConditions.push(sql`${MEDIUM_GROUP_SQL} = ${data.medium}`);
    }

    let orderClause: SQL[];
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
    const items = withNormalizedImages(c.env, itemsRows) satisfies ArtworkListItem[];
    const nextOffset =
      data.offset + itemsRows.length < totalCount ? data.offset + data.limit : null;

    // Counts per group for the filter pills. Every artwork lands in exactly
    // one group, so these sum to the unfiltered total. Kept isolated so a
    // problem here degrades the pill badges without losing the wall itself.
    let groupCounts: Record<string, number> = {};
    try {
      const groupCountConditions = [
        eq(artworks.status, "published"),
        eq(artmakers.status, "published"),
      ];
      if (data.artmaker) {
        groupCountConditions.push(eq(artmakers.slug, data.artmaker));
      }

      // Group by the output column position: Postgres does not match the
      // SELECT's CASE expression with a re-expanded copy in GROUP BY.
      const groupCountRows = await db
        .select({
          mediumGroup: sql<string>`${MEDIUM_GROUP_SQL}`.as("medium_group"),
          total: count(),
        })
        .from(artworks)
        .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
        .where(and(...groupCountConditions))
        .groupBy(sql.raw("1"));

      for (const row of groupCountRows) {
        if (row.mediumGroup) {
          groupCounts[row.mediumGroup] = Number(row.total);
        }
      }
    } catch (error) {
      console.error("[exhibitions] groupCounts query failed", error);
    }

    return c.json({
      items,
      nextOffset,
      totalCount,
      groupCounts,
    } satisfies PaginatedArtworksResult);
  } catch (error) {
    console.error("[exhibitions] paged artwork query failed", error);
    return c.json({
      items: [] satisfies ArtworkListItem[],
      nextOffset: null,
      totalCount: 0,
      groupCounts: {},
    } satisfies PaginatedArtworksResult);
  }
});

// listPublishedArtworksByArtmakerSlug — full published list for the
// artmaker gallery page. Registered before /artworks/:id so the literal
// segment wins.
artsArtworksRoutes.get("/artworks/by-artmaker/:slug", async (c) => {
  const { slug } = parseParam(c, slugParamSchema);

  try {
    const db = getDb(c.env);
    const rows = await db
      .select(artworkSelect())
      .from(artworks)
      .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
      .where(
        and(
          eq(artmakers.slug, slug),
          eq(artworks.status, "published"),
          eq(artmakers.status, "published"),
        ),
      )
      .orderBy(desc(artworks.createdAt));

    return c.json(withNormalizedImages(c.env, rows) satisfies ArtworkListItem[]);
  } catch {
    return c.json([] satisfies ArtworkListItem[]);
  }
});

// getArtworkByIdOrSlug — :id accepts a numeric id or a slug. The route
// param name (`id`) differs from the source validator's key
// (`identifier`), so map it into the same schema before validating.
artsArtworksRoutes.get("/artworks/:id", async (c) => {
  const parsed = identifierParamSchema.safeParse({ identifier: c.req.param("id") });
  if (!parsed.success) {
    throw invalid(firstIssueMessage(parsed.error));
  }
  const { identifier } = parsed.data;

  try {
    const db = getDb(c.env);
    const isNumeric = /^\d+$/.test(identifier);
    const condition = isNumeric
      ? eq(artworks.id, Number(identifier))
      : eq(artworks.slug, identifier);

    const [row] = await db
      .select(artworkSelect())
      .from(artworks)
      .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
      .where(and(condition, eq(artworks.status, "published"), eq(artmakers.status, "published")))
      .limit(1);

    if (!row) {
      return c.json(null);
    }

    const [normalized] = withNormalizedImages(c.env, [row]);
    return c.json(normalized ?? null);
  } catch {
    return c.json(null);
  }
});

// --- Dashboard (artmaker-scoped) ---

// listCurrentArtworks — every artwork (any status) belonging to the
// caller's artmaker profile. Authenticated caller required (401 otherwise);
// no artmaker profile → empty list (the source used allowMissing and
// returned []).
artsArtworksRoutes.get("/dashboard/artworks", async (c) => {
  const artmakerId = currentArtmakerIdOrNull(c);
  if (!artmakerId) {
    return c.json([] satisfies ArtworkListItem[]);
  }

  const db = getDb(c.env);
  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .where(eq(artworks.artmakerId, artmakerId))
    .orderBy(desc(artworks.createdAt));

  return c.json(withNormalizedImages(c.env, rows) satisfies ArtworkListItem[]);
});

// saveArtwork — dashboard upload. Publish state comes from the body's
// status field (draft|published), exactly like the source fn.
artsArtworksRoutes.post("/dashboard/artworks", async (c) => {
  const artmakerId = requireCurrentArtmakerId(c);
  const data = await parseJsonBody(c, artworkInputSchema);
  const db = getDb(c.env);

  const slug = await makeUniqueArtworkSlug(db, data.title);
  const [created] = await db
    .insert(artworks)
    .values({
      artmakerId,
      description: data.description?.trim() || null,
      forSale: data.forSale,
      image: data.imageKey ? getPublicUploadUrl(c.env, data.imageKey) : (data.image ?? ""),
      medium: data.medium?.trim() || null,
      priceCents: data.forSale ? parsePriceCents(data.price) : null,
      slug,
      status: data.status,
      title: data.title,
      year: data.year?.trim() || null,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to save artwork");
  }

  return c.json({
    artwork: { ...created, image: normalizeStoredImageUrl(c.env, created.image) },
    success: true,
  });
});

// updateCurrentArtwork — dashboard edit; the body's status field is the
// publish toggle (the source had no separate dashboard toggle fn).
artsArtworksRoutes.patch("/dashboard/artworks/:id", async (c) => {
  const artmakerId = requireCurrentArtmakerId(c);
  const data = await parseJsonBodyWithParam(c, artworkDashboardUpdateSchema, "id");
  const db = getDb(c.env);

  const [existing] = await db
    .select({ id: artworks.id, slug: artworks.slug, title: artworks.title })
    .from(artworks)
    .where(and(eq(artworks.id, data.id), eq(artworks.artmakerId, artmakerId)))
    .limit(1);

  if (!existing) {
    throw notFound("Artwork not found");
  }

  let slug = existing.slug;
  if (data.title !== existing.title) {
    slug = await makeUniqueArtworkSlug(db, data.title);
  }

  await db
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
    .where(eq(artworks.id, data.id));

  // Re-select with the artmaker join so callers get a full ArtworkListItem
  // (name/slug/city/state), matching what listCurrentArtworks returns.
  const [enriched] = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .where(eq(artworks.id, data.id))
    .limit(1);

  if (!enriched) {
    throw notFound("Artwork not found");
  }

  const [normalized] = withNormalizedImages(c.env, [enriched]);
  if (!normalized) {
    throw new Error("Failed to update artwork");
  }

  return c.json({
    artwork: normalized satisfies ArtworkListItem,
    success: true,
  });
});

// deleteCurrentArtwork — scoped to the caller's artmaker profile.
artsArtworksRoutes.delete("/dashboard/artworks/:id", async (c) => {
  const artmakerId = requireCurrentArtmakerId(c);
  const id = idFromParam(c);
  const db = getDb(c.env);

  const [existing] = await db
    .select({ id: artworks.id })
    .from(artworks)
    .where(and(eq(artworks.id, id), eq(artworks.artmakerId, artmakerId)))
    .limit(1);

  if (!existing) {
    throw notFound("Artwork not found");
  }

  await db.delete(artworks).where(eq(artworks.id, id));

  return c.json({ success: true });
});

// --- Admin (arts admin roles) ---

// listAdminArtworks — every artwork, any status, newest first.
artsArtworksRoutes.get("/admin/artworks", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const db = getDb(c.env);

  const rows = await db
    .select(artworkSelect())
    .from(artworks)
    .innerJoin(artmakers, eq(artworks.artmakerId, artmakers.id))
    .orderBy(desc(artworks.createdAt));

  return c.json(withNormalizedImages(c.env, rows) satisfies ArtworkListItem[]);
});

// createArtsArtwork — admin creation against an explicit artmakerId.
artsArtworksRoutes.post("/admin/artworks", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const data = await parseJsonBody(c, adminArtworkCreateSchema);
  const db = getDb(c.env);

  const slug = await makeUniqueArtworkSlug(db, data.title);
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

  if (!created) {
    throw new Error("Failed to create artwork");
  }

  return c.json({
    artwork: { ...created, image: normalizeStoredImageUrl(c.env, created.image) },
    success: true,
  });
});

// updateArtsArtwork — `id` comes from the URL, merged into the body before
// the same schema the server fn used runs.
artsArtworksRoutes.patch("/admin/artworks/:id", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const data = await parseJsonBodyWithParam(c, adminArtworkUpdateSchema, "id");
  const db = getDb(c.env);

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

  if (!updated) {
    throw notFound("Artwork not found");
  }

  return c.json({
    artwork: { ...updated, image: normalizeStoredImageUrl(c.env, updated.image) },
    success: true,
  });
});

// toggleArtsArtworkStatus — flips published ⇄ draft (POST = action
// subresource).
artsArtworksRoutes.post("/admin/artworks/:id/status", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const id = idFromParam(c);
  const db = getDb(c.env);

  const [existing] = await db.select().from(artworks).where(eq(artworks.id, id));
  if (!existing) {
    throw notFound("Artwork not found");
  }

  const nextStatus = existing.status === "published" ? "draft" : "published";

  const [updated] = await db
    .update(artworks)
    .set({
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(artworks.id, id))
    .returning();

  if (!updated) {
    throw new Error("Failed to update artwork");
  }

  return c.json({
    artwork: { ...updated, image: normalizeStoredImageUrl(c.env, updated.image) },
    success: true,
  });
});

// deleteArtsArtwork
artsArtworksRoutes.delete("/admin/artworks/:id", async (c) => {
  requireRole(c, ARTS_STAFF_ROLES);
  const id = idFromParam(c);
  const db = getDb(c.env);

  await db.delete(artworks).where(eq(artworks.id, id));
  return c.json({ success: true });
});
