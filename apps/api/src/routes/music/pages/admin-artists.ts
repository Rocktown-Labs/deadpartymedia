import { artists } from "@dpmedia/db/schema";
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

const ARTIST_SORT_FIELDS = ["name", "genre", "location", "claimed", "email", "createdAt"] as const;

type ArtistSortField = (typeof ARTIST_SORT_FIELDS)[number];

function normalizeDuplicateKey(name: string) {
  return name.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export const loadAdminArtists = new Hono<AppEnv>().get(
  "/admin/artists",
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

    const sort = parseSortParam<ArtistSortField>(params.sort, ARTIST_SORT_FIELDS, "createdAt");

    const order = parseSortOrderParam(params.order, "desc");

    const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

    const [totalRows, allArtists] = await Promise.all([
      db.select({ total: count() }).from(artists),
      db
        .select()
        .from(artists)
        .orderBy(
          sort === "name"
            ? order === "asc"
              ? asc(artists.name)
              : desc(artists.name)
            : sort === "genre"
              ? order === "asc"
                ? asc(artists.genre)
                : desc(artists.genre)
              : sort === "location"
                ? order === "asc"
                  ? asc(artists.location)
                  : desc(artists.location)
                : sort === "claimed"
                  ? order === "asc"
                    ? asc(artists.claimed)
                    : desc(artists.claimed)
                  : sort === "email"
                    ? order === "asc"
                      ? asc(artists.email)
                      : desc(artists.email)
                    : order === "asc"
                      ? asc(artists.createdAt)
                      : desc(artists.createdAt),
          desc(artists.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset),
    ]);

    const duplicateCandidates = await db
      .select({
        claimed: artists.claimed,
        createdAt: artists.createdAt,
        id: artists.id,
        name: artists.name,
      })
      .from(artists)
      .orderBy(asc(artists.name), asc(artists.createdAt));

    const totalCount = Number(totalRows[0]?.total ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );

    const duplicateGroups = duplicateCandidates.reduce<Record<string, typeof duplicateCandidates>>(
      (groups, artist) => {
        const key = normalizeDuplicateKey(artist.name);
        groups[key] = [...(groups[key] ?? []), artist];
        return groups;
      },
      {},
    );

    const duplicateOptionsByArtistId = new Map(
      duplicateCandidates.map((artist) => {
        const group = duplicateGroups[normalizeDuplicateKey(artist.name)] ?? [];
        return [artist.id, group.filter((candidate) => candidate.id !== artist.id)];
      }),
    );
    const currentSearchParamsString = currentSearchParams.toString();
    return c.json({
      isSuperAdmin,
      params,
      page,
      sort,
      order,
      allArtists,
      totalCount,
      currentSearchParamsString,
      duplicateOptionsByArtistId: Object.fromEntries(duplicateOptionsByArtistId),
    });
  },
);
