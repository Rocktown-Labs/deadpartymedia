import { postImportSources, posts, users } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { asc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { hasMusicRole } from "../../../lib/music-access";
import { getOffsetFromPage, parsePageParam } from "../../../lib/music/admin/table-state";
import {
  normalizeImportSourceUrl,
  normalizeImportTitle,
} from "../../../lib/music/admin/wordpress-backfill";

interface WordPressRestPost {
  ID: number;
  title: string;
  URL: string;
  excerpt: string;
  content: string;
  date: string;
  modified: string;
  author: {
    name: string;
    nice_name: string;
  };
  featured_image?: string;
  categories?: Record<string, any>;
  tags?: Record<string, any>;
}

export const loadAdminPostsWordpress = new Hono<AppEnv>().get(
  "/admin/posts/wordpress",
  zValidator("query", z.record(z.string(), z.string())),
  async (c) => {
    const db = getMusicDb(c.env);
    requireRole(c, ["super_admin", "writer"]);

    // 1. Role verification
    const isSuperAdmin = hasMusicRole(c, "super_admin");

    if (!isSuperAdmin) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    const params = c.req.query();

    const wpPage = parsePageParam(params.wp_page);

    const limit = 40;

    const offset = getOffsetFromPage(wpPage, limit);

    // 2. Fetch WordPress posts from WordPress REST API
    let wordpressPosts: any[] = [];

    let totalPosts = 0;

    try {
      const response = await fetch(
        `https://public-api.wordpress.com/rest/v1.1/sites/deadpartymedia.wordpress.com/posts?number=${limit}&offset=${offset}`,
        { cache: "no-store" },
      );

      if (response.ok) {
        const data = (await response.json()) as { found?: number; posts?: WordPressRestPost[] };
        totalPosts = data.found || 0;
        if (data && Array.isArray(data.posts)) {
          wordpressPosts = data.posts.map((post: WordPressRestPost) => {
            const coverImage = post.featured_image || null;
            const rawCategories = Object.keys(post.categories || {});
            const rawTags = Object.keys(post.tags || {});

            return {
              authorName: post.author?.name || "Petty Vandalism",
              authorSlug: post.author?.nice_name || "pettyvandalism",
              content: post.content,
              coverImage,
              date: post.date,
              excerpt: post.excerpt,
              id: post.ID,
              // to be populated
              importedPostId: null,
              localStatus: null,
              modified: post.modified,
              rawCategories,
              rawTags,
              title: post.title,
              url: post.URL,
            };
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch WordPress articles feed:", error);
    }

    // 3. Query already backfilled sources to match url status and local status (draft vs published)
    let importedUrlMap = new Map<string, { postId: number; status: string }>();

    let importedTitleMap = new Map<string, { postId: number; status: string }>();

    try {
      const importedSources = await db
        .select({
          postId: postImportSources.postId,
          sourceUrl: postImportSources.sourceUrl,
          status: posts.status,
          title: posts.title,
        })
        .from(postImportSources)
        .leftJoin(posts, eq(postImportSources.postId, posts.id));

      importedUrlMap = new Map(
        importedSources.map((row) => [
          normalizeImportSourceUrl(row.sourceUrl),
          { postId: row.postId, status: row.status || "draft" },
        ]),
      );
      importedTitleMap = new Map(
        importedSources
          .filter((row) => row.title)
          .map((row) => [
            normalizeImportTitle(row.title),
            { postId: row.postId, status: row.status || "draft" },
          ]),
      );
    } catch (error) {
      console.error("Failed to query import sources:", error);
    }

    // Map database post IDs and statuses to WordPress feed posts
    for (const post of wordpressPosts) {
      const importInfo =
        importedUrlMap.get(normalizeImportSourceUrl(post.url)) ??
        importedTitleMap.get(normalizeImportTitle(post.title));
      post.importedPostId = importInfo ? importInfo.postId : null;
      post.localStatus = importInfo ? importInfo.status : null;
    }

    // 4. Fetch author options
    let authorOptions: { clerkId: string; name: string; role: string }[] = [];

    try {
      authorOptions = await db
        .select({
          clerkId: users.clerkId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
        })
        .from(users)
        .where(inArray(users.role, ["writer", "super_admin"]))
        .orderBy(asc(users.firstName), asc(users.lastName))
        .then((rows) =>
          rows.map((row) => ({
            clerkId: row.clerkId,
            name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.email,
            role: row.role,
          })),
        );
    } catch (error) {
      console.error("Failed to query author options:", error);
    }
    return c.json({ wpPage, limit, wordpressPosts, totalPosts, authorOptions });
  },
);
