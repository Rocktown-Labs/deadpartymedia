import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events, eventArtists, artists } from "@/lib/db/schema";
import { eq, and, desc, inArray, gte, lt } from "drizzle-orm";
import { getLocalDateKey } from "@/lib/events/date-state";
import { getRequestLogger } from "@/lib/logger/middleware";
import { sanitizeError } from "@/lib/logger/sanitize";
import { clampInt, safeHttpUrl, truncateText } from "@/lib/security";

const EVENT_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type EventGenre = (typeof EVENT_GENRES)[number];

function isEventGenre(value: string): value is EventGenre {
  return EVENT_GENRES.includes(value as EventGenre);
}

export async function GET(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");
    const limit = clampInt(searchParams.get("limit"), 100, 1, 100);
    const offset = clampInt(searchParams.get("offset"), 0, 0, 100_000);

    // Build where conditions
    const conditions = [eq(events.status, "published")];
    if (genre && isEventGenre(genre)) {
      conditions.push(eq(events.genre, genre));
    }
    const today = getLocalDateKey();
    if (status === "upcoming") {
      conditions.push(gte(events.date, today));
    } else if (status === "past") {
      conditions.push(lt(events.date, today));
    }

    const results = await db
      .select()
      .from(events)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(events.date))
      .limit(limit)
      .offset(offset);

    // Get artist relations for all events
    const eventIds = results.map((event) => event.id);
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
    const eventList = results.map((event) => {
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

export async function POST(request: NextRequest) {
  const log = getRequestLogger(request);
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      venue,
      location,
      date,
      time,
      genre,
      ticketLink,
      ticket_link,
      flyerUrl,
      image,
      price,
      artists,
      socialLink,
      notes,
    } = body;

    if (!title || !date || !venue) {
      return NextResponse.json(
        { error: "Title, date, and venue are required fields" },
        { status: 400 },
      );
    }

    if (
      typeof title !== "string" ||
      typeof venue !== "string" ||
      typeof date !== "string" ||
      title.trim().length === 0 ||
      title.trim().length > 255 ||
      venue.trim().length === 0 ||
      venue.trim().length > 255 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return NextResponse.json({ error: "Invalid title, date, or venue" }, { status: 400 });
    }

    const safeTicketLink = safeHttpUrl(ticketLink || ticket_link);
    if ((ticketLink || ticket_link) && !safeTicketLink) {
      return NextResponse.json({ error: "Ticket link must be a valid http(s) URL" }, { status: 400 });
    }
    const safeImage = safeHttpUrl(image || flyerUrl);
    if ((image || flyerUrl) && !(image || flyerUrl || "").startsWith("/") && !safeImage) {
      return NextResponse.json({ error: "Image must be a valid http(s) URL" }, { status: 400 });
    }

    const { generateSlug, ensureUniqueSlug } = await import("@/lib/utils/slug");
    const slug = await ensureUniqueSlug(generateSlug(title), undefined, "events");

    const fullDescription = [
      description,
      artists ? `Lineup / Artists: ${artists}` : null,
      socialLink ? `Social / Info Link: ${socialLink}` : null,
      notes ? `Notes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const [newEvent] = await db
      .insert(events)
      .values({
        createdById: userId,
        date,
        description: truncateText(fullDescription || `Live show at ${venue}`, 2000),
        genre: isEventGenre(genre) ? genre : "OTHER",
        image: safeImage || "/placeholder.svg",
        location: truncateText(typeof location === "string" ? location : "Little Rock, AR", 255),
        price: typeof price === "string" ? truncateText(price, 50) : null,
        slug,
        status: "draft",
        ticketLink: safeTicketLink,
        time: typeof time === "string" ? truncateText(time, 50) : "7:00 PM",
        title: truncateText(String(title).trim(), 255),
        venue: truncateText(String(venue).trim(), 255),
      })
      .returning();

    log.info({ eventId: newEvent.id, title: newEvent.title, userId }, "Event created successfully");

    return NextResponse.json({ event: newEvent, success: true }, { status: 201 });
  } catch (error) {
    log.error({ error: sanitizeError(error), operation: "create_event" }, "Error creating event");
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
