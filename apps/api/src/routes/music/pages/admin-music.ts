import { musicReleases } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, count, desc, eq } from "drizzle-orm";
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

const MUSIC_SORT_FIELDS = [
  "title",
  "artistName",
  "releaseType",
  "genre",
  "status",
  "releaseDate",
  "createdAt",
] as const;

type MusicSortField = (typeof MUSIC_SORT_FIELDS)[number];

export const loadAdminMusic = new Hono<AppEnv>().get(
  "/admin/music",
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

    const sort = parseSortParam<MusicSortField>(params.sort, MUSIC_SORT_FIELDS, "createdAt");

    const order = parseSortOrderParam(params.order, "desc");

    const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

    const whereClause = isSuperAdmin ? undefined : eq(musicReleases.authorId, userId);

    const totalQuery = db.select({ total: count() }).from(musicReleases);

    const rowsQuery = db.select().from(musicReleases);

    const pendingQuery = db
      .select({ count: count() })
      .from(musicReleases)
      .where(eq(musicReleases.submissionStatus, "pending"));

    const [totalRows, pagedReleases, pendingRows] = await Promise.all([
      whereClause ? totalQuery.where(whereClause) : totalQuery,
      (whereClause ? rowsQuery.where(whereClause) : rowsQuery)
        .orderBy(
          sort === "title"
            ? order === "asc"
              ? asc(musicReleases.title)
              : desc(musicReleases.title)
            : sort === "artistName"
              ? order === "asc"
                ? asc(musicReleases.artistName)
                : desc(musicReleases.artistName)
              : sort === "releaseType"
                ? order === "asc"
                  ? asc(musicReleases.releaseType)
                  : desc(musicReleases.releaseType)
                : sort === "genre"
                  ? order === "asc"
                    ? asc(musicReleases.genre)
                    : desc(musicReleases.genre)
                  : sort === "status"
                    ? order === "asc"
                      ? asc(musicReleases.status)
                      : desc(musicReleases.status)
                    : sort === "releaseDate"
                      ? order === "asc"
                        ? asc(musicReleases.releaseDate)
                        : desc(musicReleases.releaseDate)
                      : order === "asc"
                        ? asc(musicReleases.createdAt)
                        : desc(musicReleases.createdAt),
          desc(musicReleases.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset),
      pendingQuery,
    ]);

    const totalCount = Number(totalRows[0]?.total ?? 0);

    const pendingCount = Number(pendingRows[0]?.count ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );

    const releaseRows = pagedReleases.map((release) => ({
      artistName: release.artistName,
      authorId: release.authorId,
      coverArt: release.coverArt,
      createdAt: release.createdAt.toISOString(),
      featured: release.featured,
      genre: release.genre,
      id: release.id,
      releaseDate: release.releaseDate,
      releaseType: release.releaseType,
      slug: release.slug,
      status: release.status,
      title: release.title,
    }));
    const currentSearchParamsString = currentSearchParams.toString();
    return c.json({
      userId,
      isSuperAdmin,
      params,
      page,
      sort,
      order,
      totalCount,
      pendingCount,
      currentSearchParamsString,
      releaseRows,
    });
  },
);
