import { posts } from "@dpmedia/db/schema";
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

const POST_SORT_FIELDS = ["title", "status", "category", "isCoverStory", "createdAt"] as const;

type PostSortField = (typeof POST_SORT_FIELDS)[number];

export const loadAdminPosts = new Hono<AppEnv>().get(
  "/admin/posts",
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

    const sort = parseSortParam<PostSortField>(params.sort, POST_SORT_FIELDS, "createdAt");

    const order = parseSortOrderParam(params.order, "desc");

    const offset = getOffsetFromPage(page, ADMIN_PAGE_SIZE);

    const whereClause = isSuperAdmin
      ? eq(posts.vertical, "music")
      : and(eq(posts.vertical, "music"), eq(posts.authorId, userId));

    const totalQuery = db.select({ total: count() }).from(posts).where(whereClause);

    const rowsQuery = db.select().from(posts).where(whereClause);

    const [totalRows, pagedPosts] = await Promise.all([
      totalQuery,
      rowsQuery
        .orderBy(
          sort === "title"
            ? order === "asc"
              ? asc(posts.title)
              : desc(posts.title)
            : sort === "status"
              ? order === "asc"
                ? asc(posts.status)
                : desc(posts.status)
              : sort === "category"
                ? order === "asc"
                  ? asc(posts.category)
                  : desc(posts.category)
                : sort === "isCoverStory"
                  ? order === "asc"
                    ? asc(posts.isCoverStory)
                    : desc(posts.isCoverStory)
                  : order === "asc"
                    ? asc(posts.createdAt)
                    : desc(posts.createdAt),
          desc(posts.createdAt),
        )
        .limit(ADMIN_PAGE_SIZE)
        .offset(offset),
    ]);

    const totalCount = Number(totalRows[0]?.total ?? 0);

    const currentSearchParams = buildSearchParams(
      params as Record<string, string | string[] | undefined>,
    );

    const postRows = pagedPosts.map((post) => ({
      authorId: post.authorId,
      category: post.category,
      createdAt: post.createdAt.toISOString(),
      deleteRequested: post.deleteRequested,
      id: post.id,
      isCoverStory: post.isCoverStory,
      status: post.status,
      title: post.title,
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
      currentSearchParamsString,
      postRows,
    });
  },
);
