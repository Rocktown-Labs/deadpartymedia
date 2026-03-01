import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { artists, eventArtists, events } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    // First get the artist by slug
    const [artist] = await db.select().from(artists).where(eq(artists.slug, slug)).limit(1);

    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    // Query events joined with eventArtists where artist matches and event is published
    const results = await db
      .select({
        created_at: events.createdAt,
        date: events.date,
        description: events.description,
        genre: events.genre,
        id: events.id,
        image: events.image,
        location: events.location,
        price: events.price,
        slug: events.slug,
        ticket_link: events.ticketLink,
        time: events.time,
        title: events.title,
        venue: events.venue,
      })
      .from(events)
      .innerJoin(eventArtists, eq(events.id, eventArtists.eventId))
      .where(and(eq(eventArtists.artistId, artist.id), eq(events.status, "published")))
      .orderBy(desc(events.date));

    // Transform to match existing EventList interface
    const eventList = results.map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      image: event.image,
      venue: event.venue,
      location: event.location,
      date: event.date,
      time: event.time,
      ticket_link: event.ticket_link,
      price: event.price,
      genre: event.genre,
      artists: [], // Would need to join to get all artists for this event
      created_at: event.created_at.toISOString(),
    }));

    return NextResponse.json(eventList);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_artist_events", slug: (await params).slug },
      "Error fetching artist events",
    );
    return NextResponse.json({ error: "Failed to fetch artist events" }, { status: 500 });
  }
}
