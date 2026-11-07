import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { Hono } from "hono";
import { artists, eventArtists, events } from "@dpmedia/db/schema";
import { getAuth } from "../../auth";
import { getDb } from "../../db";
import { getLocalDateKey } from "../../lib/date-state";
import { ensureUniqueSlug, generateSlug } from "../../lib/slug";
import { clampInt, safeHttpUrl, truncateText } from "../../lib/security";
import type { AppEnv } from "../../bindings";

/**
 * Ported from apps/web/src/app/api/events/route.ts and
 * apps/web/src/app/api/events/[slug]/route.ts.
 * Response shapes are identical to the Next.js routes so the web app's
 * react-query hooks keep working.
 */
export const musicEventsRoutes = new Hono<AppEnv>();

const EVENT_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type EventGenre = (typeof EVENT_GENRES)[number];

function isEventGenre(value: string | undefined): value is EventGenre {
  return EVENT_GENRES.includes(value as EventGenre);
}

musicEventsRoutes.get("/", async (c) => {
  try {
    const genre = c.req.query("genre");
    const status = c.req.query("status");
    const venue = c.req.query("venue");
    const limit = clampInt(c.req.query("limit"), 100, 1, 100);
    const offset = clampInt(c.req.query("offset"), 0, 0, 100_000);

    const db = getDb(c.env);

    // Build where conditions
    const conditions = [eq(events.status, "published")];
    if (genre && isEventGenre(genre)) {
      conditions.push(eq(events.genre, genre));
    }
    if (venue) {
      // Venue-dashboard filter: exact venue-name match (the web app's
      // venue dashboard queries events for the signed-in venue).
      conditions.push(eq(events.venue, venue));
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
        const existing = artistRelations[rel.eventId];
        if (existing) {
          existing.push(rel);
        } else {
          artistRelations[rel.eventId] = [rel];
        }
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

    return c.json(
      {
        count: eventList.length,
        results: eventList,
      },
      200,
      {
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=300",
      },
    );
  } catch (error) {
    console.error("[api] fetch_events:", error);
    return c.json({ error: "Failed to fetch events" }, 500);
  }
});

musicEventsRoutes.post("/", async (c) => {
  const auth = getAuth(c);
  if (!auth) {
    return c.json({ error: "Authentication required" }, 401);
  }
  const userId = auth.userId;
  try {
    const db = getDb(c.env);
    const body = (await c.req.json()) as {
      title?: string;
      description?: string;
      venue?: string;
      location?: string;
      date?: string;
      time?: string;
      genre?: string;
      ticketLink?: string;
      ticket_link?: string;
      flyerUrl?: string;
      image?: string;
      price?: string;
      artists?: string;
      socialLink?: string;
      notes?: string;
    };
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
      return c.json({ error: "Title, date, and venue are required fields" }, 400);
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
      return c.json({ error: "Invalid title, date, or venue" }, 400);
    }

    const safeTicketLink = safeHttpUrl(ticketLink || ticket_link);
    if ((ticketLink || ticket_link) && !safeTicketLink) {
      return c.json({ error: "Ticket link must be a valid http(s) URL" }, 400);
    }
    const safeImage = safeHttpUrl(image || flyerUrl);
    if ((image || flyerUrl) && !(image || flyerUrl || "").startsWith("/") && !safeImage) {
      return c.json({ error: "Image must be a valid http(s) URL" }, 400);
    }

    const slug = await ensureUniqueSlug(db, generateSlug(title), undefined, "events");

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

    return c.json({ event: newEvent, success: true }, 201);
  } catch (error) {
    console.error("[api] create_event:", error);
    return c.json({ error: "Failed to create event" }, 500);
  }
});

musicEventsRoutes.get("/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");
    const db = getDb(c.env);

    const [event] = await db
      .select()
      .from(events)
      .where(and(eq(events.slug, slug), eq(events.status, "published")))
      .limit(1);

    if (!event) {
      return c.json({ error: "Event not found" }, 404);
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

    return c.json(eventData);
  } catch (error) {
    console.error("[api] fetch_event:", error);
    return c.json({ error: "Failed to fetch event" }, 500);
  }
});
