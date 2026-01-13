import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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

    // Transform to match existing Event interface
    const eventData = {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      image: event.image,
      venue: event.venue,
      location: event.location,
      date: event.date,
      time: event.time,
      ticket_link: event.ticketLink,
      price: event.price,
      genre: event.genre,
      created_at: event.createdAt.toISOString(),
      updated_at: event.updatedAt.toISOString(),
    };

    return NextResponse.json(eventData);
  } catch (error) {
    log.error(
      { error: sanitizeError(error), operation: "fetch_event", slug: (await params).slug },
      "Error fetching event"
    );
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
