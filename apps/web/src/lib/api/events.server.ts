import { cacheLife, cacheTag } from "next/cache";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import type { EventList } from "@/lib/api/events";
import { db } from "@/lib/db";
import { artists, eventArtists, events } from "@/lib/db/schema";
import { getLocalDateKey } from "@/lib/events/date-state";

const EVENT_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

type EventGenre = (typeof EVENT_GENRES)[number];
type EventStatusFilter = "upcoming" | "past";

interface ListPublishedEventsOptions {
  genre?: string | null;
  limit?: number;
  offset?: number;
  status?: EventStatusFilter | null;
}

function isEventGenre(value: string): value is EventGenre {
  return EVENT_GENRES.includes(value as EventGenre);
}

function normalizeLimit(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) < 1) {
    return fallback;
  }

  return Math.min(Math.trunc(value ?? fallback), 100);
}

function normalizeOffset(value: number | undefined) {
  if (!Number.isFinite(value ?? Number.NaN) || (value ?? 0) < 0) {
    return 0;
  }

  return Math.trunc(value ?? 0);
}

export async function listPublishedEvents({
  genre,
  limit,
  offset,
  status,
}: ListPublishedEventsOptions = {}): Promise<EventList[]> {
  "use cache";
  cacheLife({
    expire: 3600,
    revalidate: 300,
    stale: 300,
  });
  cacheTag("events");

  const normalizedLimit = normalizeLimit(limit, 100);
  const normalizedOffset = normalizeOffset(offset);
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
    .limit(normalizedLimit)
    .offset(normalizedOffset);

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

    for (const rel of relations) {
      if (!artistRelations[rel.eventId]) {
        artistRelations[rel.eventId] = [];
      }
      artistRelations[rel.eventId].push(rel);
    }
  }

  return results.map((event) => {
    const eventArtistsData = artistRelations[event.id] || [];
    return {
      artists: eventArtistsData.map((artist) => ({
        id: artist.artistId,
        image: artist.artistImage,
        name: artist.artistName,
        slug: artist.artistSlug,
      })),
      created_at: event.createdAt.toISOString(),
      date: event.date,
      description: event.description,
      genre: event.genre,
      id: event.id,
      image: event.image ?? "",
      location: event.location,
      price: event.price,
      slug: event.slug,
      ticket_link: event.ticketLink,
      time: event.time ?? "",
      title: event.title,
      venue: event.venue,
    };
  });
}

export function parseEventLimit(value: string | null) {
  return normalizeLimit(value ? Number.parseInt(value, 10) : undefined, 100);
}

export function parseEventOffset(value: string | null) {
  return normalizeOffset(value ? Number.parseInt(value, 10) : undefined);
}

export function parseEventStatus(value: string | null): EventStatusFilter | null {
  if (value === "upcoming" || value === "past") {
    return value;
  }

  return null;
}
