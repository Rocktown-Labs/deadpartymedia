import type { PlatformDatabase } from "@dpmedia/db/d1";
import { articleComments, userArticleReads, userArticleSaves } from "@dpmedia/db/schema";
import { sql } from "drizzle-orm";

/**
 * Ported from apps/web/src/lib/user/stats.ts, with the db instance passed
 * explicitly (no module singleton in a Worker). On the neon-http driver
 * `db.execute` returns a full query result whose `rows` carry the counts.
 */

export interface UserStats {
  articles_read_count: number;
  articles_saved_count: number;
  comments_count: number;
}

type UserStatsRow = {
  articles_read_count: number | string | null;
  articles_saved_count: number | string | null;
  comments_count: number | string | null;
};

export async function getUserStats(db: PlatformDatabase, userId: string): Promise<UserStats> {
  const result = await db.all<UserStatsRow>(sql`
    SELECT
      (
        SELECT COUNT(*)
        FROM ${userArticleReads}
        WHERE ${userArticleReads.clerkUserId} = ${userId}
      ) AS articles_read_count,
      (
        SELECT COUNT(*)
        FROM ${userArticleSaves}
        WHERE ${userArticleSaves.clerkUserId} = ${userId}
      ) AS articles_saved_count,
      (
        SELECT COUNT(*)
        FROM ${articleComments}
        WHERE ${articleComments.clerkUserId} = ${userId}
      ) AS comments_count
  `);

  const row = result[0];

  return {
    articles_read_count: Number(row?.articles_read_count ?? 0),
    articles_saved_count: Number(row?.articles_saved_count ?? 0),
    comments_count: Number(row?.comments_count ?? 0),
  };
}
