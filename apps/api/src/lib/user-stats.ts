import { sql } from "drizzle-orm";
import { articleComments, userArticleReads, userArticleSaves } from "@dpmedia/db/schema";
import type { NeonHttpDb } from "@dpmedia/db/http";

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

export async function getUserStats(db: NeonHttpDb, userId: string): Promise<UserStats> {
  const result = await db.execute<UserStatsRow>(sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM ${userArticleReads}
        WHERE ${userArticleReads.clerkUserId} = ${userId}
      ) AS articles_read_count,
      (
        SELECT COUNT(*)::int
        FROM ${userArticleSaves}
        WHERE ${userArticleSaves.clerkUserId} = ${userId}
      ) AS articles_saved_count,
      (
        SELECT COUNT(*)::int
        FROM ${articleComments}
        WHERE ${articleComments.clerkUserId} = ${userId}
      ) AS comments_count
  `);

  const row = result.rows[0];

  return {
    articles_read_count: Number(row?.articles_read_count ?? 0),
    articles_saved_count: Number(row?.articles_saved_count ?? 0),
    comments_count: Number(row?.comments_count ?? 0),
  };
}
