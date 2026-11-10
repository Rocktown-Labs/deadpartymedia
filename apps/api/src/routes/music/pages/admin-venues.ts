import { venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, count, desc } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";
import {
  ADMIN_PAGE_SIZE,
  buildSearchParams,
  getOffsetFromPage,
  parsePageParam,
  parseSortOrderParam,
  parseSortParam,
} from "../../../lib/music/admin/table-state";

const VENUE_SORT_FIELDS = ["name", "city", "createdAt"] as const;

type VenueSortField = (typeof VENUE_SORT_FIELDS)[number];

export const loadAdminVenues = new Hono<AppEnv>().get(
  "/admin/venues",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    const { userId } = requireAuth(c);

    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const isSuperAdmin = hasMusicRole(c, "super_admin");

    const isWriter = hasMusicRole(c, "writer");

    if (!isSuperAdmin && !isWriter) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const params = c.req.query();

    const page = parsePageParam(params.page);

    const sort = parseSortParam<VenueSortField>(params.sort, VENUE_SORT_FIELDS, "name");

    const order = parseSortOrderParam(params.order, "asc");

    const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

    const totalQuery = db.select({ total: count() }).from(venues);

    const rowsQuery = db.select().from(venues);

    const [totalRows, pagedVenues] = await Promise.all([
      totalQuery,
      rowsQuery
        .orderBy(
          sort === "name"
            ? order === "asc"
              ? asc(venues.name)
              : desc(venues.name)
            : sort === "city"
              ? order === "asc"
                ? asc(venues.city)
                : desc(venues.city)
              : order === "asc"
                ? asc(venues.createdAt)
                : desc(venues.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset),
    ]);

    const totalCount = Number(totalRows[0]?.total ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );

    const venueRows = pagedVenues.map((v) => ({
      address: v.address,
      bookingEmail: v.bookingEmail,
      bookingRates: v.bookingRates,
      capacity: v.capacity,
      city: v.city,
      createdAt: v.createdAt.toISOString(),
      genres: v.genres,
      id: v.id,
      image: v.image,
      name: v.name,
      phone: v.phone,
      slug: v.slug,
      state: v.state,
      website: v.website,
      zip: v.zip,
    }));
    const currentSearchParamsString = currentSearchParams.toString();
    return c.json({
      isSuperAdmin,
      params,
      page,
      sort,
      order,
      totalCount,
      currentSearchParamsString,
      venueRows,
    });
  },
);
