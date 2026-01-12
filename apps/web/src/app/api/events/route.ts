import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq, and, desc, gte, lt } from "drizzle-orm";

export async function GET(request: Request) {
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
      filteredResults = results.filter(
        (event) => new Date(event.date) >= now
      );
    } else if (status === "past") {
      filteredResults = results.filter(
        (event) => new Date(event.date) < now
      );
    }

    // Transform to match existing EventList interface
    const eventList = filteredResults.map((event) => ({
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
    }));

    return NextResponse.json({
      count: eventList.length,
      results: eventList,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
