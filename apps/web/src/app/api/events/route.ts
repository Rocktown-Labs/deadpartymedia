import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventArtists, artists } from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const status = searchParams.get("status"); // "upcoming" or "past"
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // Build where conditions
    const conditions = [eq(events.status, "published")];
    if (genre) {
      conditions.push(eq(events.genre, genre as any));
    }

    const results = await db
      .select()
      .from(events)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(offset);

    // Filter by date if status is specified
    const now = new Date();
    let filteredResults = results;
    if (status === "upcoming") {
      filteredResults = results.filter((event) => new Date(event.date) >= now);
    } else if (status === "past") {
      filteredResults = results.filter((event) => new Date(event.date) < now);
    }

    // Get artist relations for all events
    const eventIds = filteredResults.map((event) => event.id);
    const artistRelations: Record<
      number,
      {
        eventId: number;
        artistId: number;
        artistSlug: string;
        artistName: string;
        artistImage: string | null;
      }[]
    > = {};

    if (eventIds.length > 0) {
      const relations = await db
        .select({
          artistId: artists.id,
          artistImage: artists.image,
          artistName: artists.name,
          artistSlug: artists.slug,
          eventId: eventArtists.eventId,
        })
        .from(eventArtists)
        .innerJoin(artists, eq(eventArtists.artistId, artists.id))
        .where(inArray(eventArtists.eventId, eventIds));

      // Group by eventId
      for (const rel of relations) {
        if (!artistRelations[rel.eventId]) {
          artistRelations[rel.eventId] = [];
        }
        artistRelations[rel.eventId].push(rel);
      }
    }

    // Transform to match existing EventList interface
    const eventList = filteredResults.map((event) => {
      const eventArtistsData = artistRelations[event.id] || [];
      return {
        artists: eventArtistsData.map((a) => ({
          id: a.artistId,
          image: a.artistImage,
          name: a.artistName,
          slug: a.artistSlug,
        })),
        created_at: event.createdAt.toISOString(),
        date: event.date,
        description: event.description,
        genre: event.genre,
        id: event.id,
        image: event.image,
        location: event.location,
        price: event.price,
        slug: event.slug,
        ticket_link: event.ticketLink,
        time: event.time,
        title: event.title,
        venue: event.venue,
      };
    });

    return NextResponse.json(
      {
        count: eventList.length,
        results: eventList,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    log.error({ error: sanitizeError(error), operation: "fetch_events" }, "Error fetching events");
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}
