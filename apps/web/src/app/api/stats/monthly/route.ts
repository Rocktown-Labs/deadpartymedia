import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, events, postArtists, eventArtists } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, isNotNull } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    // Calculate current month boundaries (UTC)
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(year, monthIndex, 1));
    const nextMonthStart = new Date(Date.UTC(year, monthIndex + 1, 1));

    // New Articles: published posts with publishedAt in this month
    const newArticlesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(
        and(
          eq(posts.status, "published"),
          isNotNull(posts.publishedAt),
          gte(posts.publishedAt, monthStart),
          lt(posts.publishedAt, nextMonthStart)
        )
      );

    const newArticlesCount = newArticlesResult[0]?.count ?? 0;

    // Live Events: published events with date in this month
    const liveEventsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          gte(events.date, monthStart.toISOString().split("T")[0]),
          lt(events.date, nextMonthStart.toISOString().split("T")[0])
        )
      );

    const liveEventsCount = liveEventsResult[0]?.count ?? 0;

    // Featured Artists: unique artists from posts OR events published this month
    // Fetch artist IDs from both sources and count unique
    const artistsFromPosts = await db
      .select({ artistId: postArtists.artistId })
      .from(postArtists)
      .innerJoin(posts, eq(postArtists.postId, posts.id))
      .where(
        and(
          eq(posts.status, "published"),
          isNotNull(posts.publishedAt),
          gte(posts.publishedAt, monthStart),
          lt(posts.publishedAt, nextMonthStart)
        )
      );

    const artistsFromEvents = await db
      .select({ artistId: eventArtists.artistId })
      .from(eventArtists)
      .innerJoin(events, eq(eventArtists.eventId, events.id))
      .where(
        and(
          eq(events.status, "published"),
          gte(events.date, monthStart.toISOString().split("T")[0]),
          lt(events.date, nextMonthStart.toISOString().split("T")[0])
        )
      );

    // Count unique artist IDs across both sources
    const uniqueArtistIds = new Set<number>();
    artistsFromPosts.forEach((a) => uniqueArtistIds.add(a.artistId));
    artistsFromEvents.forEach((a) => uniqueArtistIds.add(a.artistId));
    const featuredArtistsCount = uniqueArtistIds.size;

    return NextResponse.json({
      monthStart: monthStart.toISOString().split("T")[0],
      monthEnd: new Date(nextMonthStart.getTime() - 1).toISOString().split("T")[0],
      featuredArtistsCount,
      liveEventsCount,
      newArticlesCount,
    });
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_monthly_stats" },
      "Error fetching monthly stats"
    );
    return NextResponse.json({ error: "Failed to fetch monthly stats" }, { status: 500 });
  }
}
