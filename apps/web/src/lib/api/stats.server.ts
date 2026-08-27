import { cacheLife, cacheTag } from "next/cache";
import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import type { MonthlyStats } from "@/lib/api/stats";
import { db } from "@/lib/db";
import { eventArtists, events, postArtists, posts } from "@/lib/db/schema";

export async function getMonthlyHomepageStats(now = new Date()): Promise<MonthlyStats> {
  "use cache";
  cacheLife({
    expire: 7200,
    revalidate: 1800,
    stale: 1800,
  });
  cacheTag("stats-monthly");

  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const monthStartTimestamp = new Date(Date.UTC(year, monthIndex, 1));
  const nextMonthStartTimestamp = new Date(Date.UTC(year, monthIndex + 1, 1));
  const monthStartDateOnly = monthStartTimestamp.toISOString().split("T")[0];
  const nextMonthStartDateOnly = nextMonthStartTimestamp.toISOString().split("T")[0];

  const [newArticlesResult, liveEventsResult, artistsFromPosts, artistsFromEvents] =
    await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(
          and(
            eq(posts.status, "published"),
            isNotNull(posts.publishedAt),
            gte(posts.publishedAt, monthStartTimestamp),
            lt(posts.publishedAt, nextMonthStartTimestamp),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(
          and(
            eq(events.status, "published"),
            gte(events.date, monthStartDateOnly),
            lt(events.date, nextMonthStartDateOnly),
          ),
        ),
      db
        .select({ artistId: postArtists.artistId })
        .from(postArtists)
        .innerJoin(posts, eq(postArtists.postId, posts.id))
        .where(
          and(
            eq(posts.status, "published"),
            isNotNull(posts.publishedAt),
            gte(posts.publishedAt, monthStartTimestamp),
            lt(posts.publishedAt, nextMonthStartTimestamp),
          ),
        ),
      db
        .select({ artistId: eventArtists.artistId })
        .from(eventArtists)
        .innerJoin(events, eq(eventArtists.eventId, events.id))
        .where(
          and(
            eq(events.status, "published"),
            gte(events.date, monthStartDateOnly),
            lt(events.date, nextMonthStartDateOnly),
          ),
        ),
    ]);

  const uniqueArtistIds = new Set<number>();
  for (const artist of artistsFromPosts) {
    uniqueArtistIds.add(artist.artistId);
  }
  for (const artist of artistsFromEvents) {
    uniqueArtistIds.add(artist.artistId);
  }

  return {
    featuredArtistsCount: uniqueArtistIds.size,
    liveEventsCount: liveEventsResult[0]?.count ?? 0,
    monthEnd: new Date(nextMonthStartTimestamp.getTime() - 1).toISOString().split("T")[0],
    monthStart: monthStartDateOnly,
    newArticlesCount: newArticlesResult[0]?.count ?? 0,
  };
}
