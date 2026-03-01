import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { articleComments, userArticleReads, userArticleSaves } from "@/lib/db/schema";

export interface UserStats {
  articles_read_count: number;
  articles_saved_count: number;
  comments_count: number;
}

export async function getUserStats(userId: string): Promise<UserStats> {
  const result = (await db.execute(sql`
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
  `)) as {
    rows?: {
      articles_read_count: number | string | null;
      articles_saved_count: number | string | null;
      comments_count: number | string | null;
    }[];
  };

  const row = result.rows?.[0];

  return {
    articles_read_count: Number(row?.articles_read_count ?? 0),
    articles_saved_count: Number(row?.articles_saved_count ?? 0),
    comments_count: Number(row?.comments_count ?? 0),
  };
}
