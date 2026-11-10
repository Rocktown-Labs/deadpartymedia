import { events } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { and, asc, count, desc, eq } from "drizzle-orm";
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

const EVENT_SORT_FIELDS = ["title", "venue", "date", "genre", "status", "createdAt"] as const;

type EventSortField = (typeof EVENT_SORT_FIELDS)[number];

export const loadAdminEvents = new Hono<AppEnv>().get(
  "/admin/events",
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

    const sort = parseSortParam<EventSortField>(params.sort, EVENT_SORT_FIELDS, "createdAt");

    const order = parseSortOrderParam(params.order, "desc");

    const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

    const whereClause = isSuperAdmin
      ? eq(events.vertical, "music")
      : and(eq(events.vertical, "music"), eq(events.createdById, userId));

    const totalQuery = db.select({ total: count() }).from(events).where(whereClause);

    const rowsQuery = db.select().from(events).where(whereClause);

    const [totalRows, filteredEvents] = await Promise.all([
      totalQuery,
      rowsQuery
        .orderBy(
          sort === "title"
            ? order === "asc"
              ? asc(events.title)
              : desc(events.title)
            : sort === "venue"
              ? order === "asc"
                ? asc(events.venue)
                : desc(events.venue)
              : sort === "date"
                ? order === "asc"
                  ? asc(events.date)
                  : desc(events.date)
                : sort === "genre"
                  ? order === "asc"
                    ? asc(events.genre)
                    : desc(events.genre)
                  : sort === "status"
                    ? order === "asc"
                      ? asc(events.status)
                      : desc(events.status)
                    : order === "asc"
                      ? asc(events.createdAt)
                      : desc(events.createdAt),
          desc(events.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset),
    ]);

    const totalCount = Number(totalRows[0]?.total ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );
    const currentSearchParamsString = currentSearchParams.toString();
    return c.json({
      isSuperAdmin,
      isWriter,
      params,
      page,
      sort,
      order,
      filteredEvents,
      totalCount,
      currentSearchParamsString,
    });
  },
);
