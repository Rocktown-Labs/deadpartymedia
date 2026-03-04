import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventArtists, artists } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const log = getRequestLogger(request);
  try {
    const { slug } = await params;

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Get artist relations for this event
    const eventArtistsData = await db
      .select({
        id: artists.id,
        image: artists.image,
        name: artists.name,
        slug: artists.slug,
      })
      .from(eventArtists)
      .innerJoin(artists, eq(eventArtists.artistId, artists.id))
      .where(eq(eventArtists.eventId, event.id));

    // Transform to match existing Event interface
    const eventData = {
      artists: eventArtistsData,
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
      updated_at: event.updatedAt.toISOString(),
      venue: event.venue,
    };

    return NextResponse.json(eventData);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_event", slug: (await params).slug },
      "Error fetching event",
    );
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
