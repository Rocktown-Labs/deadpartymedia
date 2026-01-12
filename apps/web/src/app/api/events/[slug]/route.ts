import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
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
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 });
  }
}
