import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts, events, postArtists, eventArtists } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, isNotNull } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { cacheTag } from "next/cache";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    cacheTag("stats-monthly");
    // Calculate current month boundaries (UTC)
    const now = new Date();
    const year = now.getUTCFullYear();
    const monthIndex = now.getUTCMonth();

    // For timestamp columns (posts.publishedAt): use Date objects
    const monthStartTimestamp = new Date(Date.UTC(year, monthIndex, 1));
    const nextMonthStartTimestamp = new Date(Date.UTC(year, monthIndex + 1, 1));

    // For date columns (events.date): use date-only strings (YYYY-MM-DD)
    const monthStartDateOnly = monthStartTimestamp.toISOString().split("T")[0];
    const nextMonthStartDateOnly = nextMonthStartTimestamp
      .toISOString()
      .split("T")[0];

    // New Articles: published posts with publishedAt in this month
    // publishedAt is a timestamp column, so use Date objects
    const newArticlesResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(
        and(
          eq(posts.status, "published"),
          isNotNull(posts.publishedAt),
          gte(posts.publishedAt, monthStartTimestamp),
          lt(posts.publishedAt, nextMonthStartTimestamp)
        )
      );

    const newArticlesCount = newArticlesResult[0]?.count ?? 0;

    // Live Events: published events with date in this month
    // Use date-only strings for date column comparison
    const liveEventsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(events)
      .where(
        and(
          eq(events.status, "published"),
          gte(events.date, monthStartDateOnly),
          lt(events.date, nextMonthStartDateOnly)
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
          gte(posts.publishedAt, monthStartTimestamp),
          lt(posts.publishedAt, nextMonthStartTimestamp)
        )
      );

    const artistsFromEvents = await db
      .select({ artistId: eventArtists.artistId })
      .from(eventArtists)
      .innerJoin(events, eq(eventArtists.eventId, events.id))
      .where(
        and(
          eq(events.status, "published"),
          gte(events.date, monthStartDateOnly),
          lt(events.date, nextMonthStartDateOnly)
        )
      );

    // Count unique artist IDs across both sources
    const uniqueArtistIds = new Set<number>();
    artistsFromPosts.forEach((a) => uniqueArtistIds.add(a.artistId));
    artistsFromEvents.forEach((a) => uniqueArtistIds.add(a.artistId));
    const featuredArtistsCount = uniqueArtistIds.size;

    return NextResponse.json(
      {
        monthStart: monthStartDateOnly,
        monthEnd: new Date(nextMonthStartTimestamp.getTime() - 1)
          .toISOString()
          .split("T")[0],
        featuredArtistsCount,
        liveEventsCount,
        newArticlesCount,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_monthly_stats" },
      "Error fetching monthly stats"
    );
    return NextResponse.json(
      { error: "Failed to fetch monthly stats" },
      { status: 500 }
    );
  }
}
