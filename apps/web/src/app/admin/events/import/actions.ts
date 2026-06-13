"use server";

import { auth } from "@clerk/nextjs/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { canCreate } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { artists, eventArtists, events } from "@/lib/db/schema";
import { eventSchema } from "@/lib/validations/event";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { getImportedEventStatus, isPastEventDate } from "@/lib/admin/event-flyer-import";

const EVENT_GENRES = ["COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

const flyerAnalysisSchema = z.object({
  title: z.string(),
  description: z.string(),
  venue: z.string(),
  location: z.string(),
  date: z.string().describe("YYYY-MM-DD"),
  time: z.string().describe("24-hour HH:mm when visible, otherwise empty string"),
  ticketLink: z.string().optional().nullable(),
  price: z.string().optional().nullable(),
  genre: z.enum(EVENT_GENRES),
  performingArtists: z.array(z.string()),
  vendors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.object({
    title: z.number().min(0).max(1),
    date: z.number().min(0).max(1),
    venue: z.number().min(0).max(1),
    artists: z.number().min(0).max(1),
  }),
});

export type EventFlyerAnalysis = z.infer<typeof flyerAnalysisSchema> & {
  imageUrl: string;
  matchedArtists: { id: number; name: string; slug: string }[];
  unmatchedArtists: string[];
  possibleDuplicate: { id: number; title: string; date: string; venue: string } | null;
};

function requireAiKey() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing API key: configure GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or AI_GATEWAY_API_KEY.",
    );
  }
}

function normalizeName(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

async function enrichEventAnalysis(
  analysis: z.infer<typeof flyerAnalysisSchema>,
  imageUrl: string,
): Promise<EventFlyerAnalysis> {
  const performerNames = [...new Set(analysis.performingArtists.map((name) => name.trim()))].filter(
    Boolean,
  );
  const matchedArtists: EventFlyerAnalysis["matchedArtists"] = [];
  const unmatchedArtists: string[] = [];

  for (const name of performerNames) {
    const [artist] = await db
      .select({ id: artists.id, name: artists.name, slug: artists.slug })
      .from(artists)
      .where(
        sql`regexp_replace(lower(${artists.name}), '[^a-z0-9]', '', 'g') = ${normalizeName(name)}`,
      )
      .limit(1);

    if (artist) {
      matchedArtists.push(artist);
    } else {
      unmatchedArtists.push(name);
    }
  }

  const [possibleDuplicate] = await db
    .select({
      date: events.date,
      id: events.id,
      title: events.title,
      venue: events.venue,
    })
    .from(events)
    .where(
      and(
        eq(events.date, analysis.date),
        sql`lower(${events.title}) = ${analysis.title.toLowerCase()} OR lower(${events.venue}) = ${analysis.venue.toLowerCase()}`,
      ),
    )
    .limit(1);

  return {
    ...analysis,
    imageUrl,
    matchedArtists,
    unmatchedArtists,
    possibleDuplicate: possibleDuplicate
      ? {
          ...possibleDuplicate,
          date: possibleDuplicate.date,
        }
      : null,
  };
}

export async function analyzeEventFlyerAction(imageUrl: string): Promise<EventFlyerAnalysis> {
  if (!(await canCreate())) {
    throw new Error("Unauthorized: Only event creators can analyze event flyers");
  }
  requireAiKey();

  const currentYear = new Date().getFullYear();
  const { object } = await generateObject({
    model: google("gemini-3.5-flash"),
    schema: flyerAnalysisSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract a Dead Party Media event record from this event flyer.

Return only visible or strongly implied information. Use Arkansas/Little Rock context if the city is missing.
For ambiguous dates without a visible year, choose the most plausible year near ${currentYear}; include a warning.
Performing artists must be actual performers on the bill. Read stage names from lineups, names next to "with", "featuring", "and", stacked performer lists, and large billing text. Do not include venues, sponsors, vendors, presenters, record labels, age restrictions, prices, addresses, or social handles as artists.
If the flyer says "Dead Party presents", do not treat Dead Party as a performer unless it is explicitly listed as an artist.
If a name appears near a venue/address/date block only, treat it as a venue/vendor warning instead of a performer.
If multiple events are shown, extract the primary flyer event and add a warning.
Use date as YYYY-MM-DD and time as 24-hour HH:mm. Use an empty string for time if no time is visible.
Infer a concise title from the headliner/event name and venue when no formal title exists.
Use genre OTHER unless the flyer clearly indicates a music genre.`,
          },
          {
            type: "image",
            image: new URL(imageUrl),
          },
        ],
      },
    ],
  });

  return enrichEventAnalysis(object, imageUrl);
}

export async function createEventFromFlyerImportAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  if (!(await canCreate())) {
    throw new Error("Unauthorized: Only event creators can create imported events");
  }

  const rawDate = String(formData.get("date") ?? "");
  const status = getImportedEventStatus(rawDate);
  const rawData = {
    date: rawDate,
    description: String(formData.get("description") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    image: String(formData.get("image") ?? "") || undefined,
    location: String(formData.get("location") ?? ""),
    price: String(formData.get("price") ?? "") || undefined,
    slug: String(formData.get("slug") ?? ""),
    status,
    ticketLink: String(formData.get("ticketLink") ?? "") || undefined,
    time: String(formData.get("time") ?? "") || undefined,
    title: String(formData.get("title") ?? ""),
    venue: String(formData.get("venue") ?? ""),
  };
  const validationResult = eventSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((issue) => issue.message).join(", "));
  }

  const validated = validationResult.data;
  const [duplicate] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(
        eq(events.date, validated.date),
        sql`lower(${events.title}) = ${validated.title.toLowerCase()} AND lower(${events.venue}) = ${validated.venue.toLowerCase()}`,
      ),
    )
    .limit(1);
  if (duplicate) {
    throw new Error("A matching event already exists for this title, venue, and date");
  }

  const slug = await ensureUniqueSlug(
    validated.slug || generateSlug(validated.title),
    undefined,
    "events",
  );
  const artistIds = String(formData.get("artistIds") ?? "")
    .split(",")
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0);

  const [event] = await db
    .insert(events)
    .values({
      createdById: userId,
      date: validated.date,
      description: validated.description,
      genre: validated.genre,
      image: validated.image || null,
      location: validated.location,
      price: validated.price || null,
      slug,
      status,
      ticketLink: validated.ticketLink || null,
      time: validated.time || null,
      title: validated.title,
      venue: validated.venue,
    })
    .returning({ id: events.id, slug: events.slug });

  const uniqueArtistIds = [...new Set(artistIds)];
  if (uniqueArtistIds.length > 0) {
    await db.insert(eventArtists).values(
      uniqueArtistIds.map((artistId) => ({
        artistId,
        eventId: event.id,
      })),
    );
  }

  revalidateTag("events", "max");
  revalidateTag("stats-monthly", "max");
  if (uniqueArtistIds.length > 0) {
    revalidateTag("artists", "max");
  }
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath(`/events/${event.slug}`);

  return {
    eventId: event.id,
    slug: event.slug,
    status,
    eventIsPast: isPastEventDate(validated.date),
    success: true,
  };
}

export async function createEventImportArtistStubAction(formData: FormData) {
  if (!(await canCreate())) {
    throw new Error("Unauthorized: Only event creators can create artist stubs");
  }

  const displayName = String(formData.get("displayName") ?? "")
    .trim()
    .replaceAll(/\s+/g, " ")
    .slice(0, 150);
  if (!displayName) {
    return { error: "Artist name is required", success: false };
  }

  const genreRaw = String(formData.get("genre") ?? "OTHER");
  const genre = EVENT_GENRES.includes(genreRaw as (typeof EVENT_GENRES)[number])
    ? (genreRaw as (typeof EVENT_GENRES)[number])
    : "OTHER";
  const location =
    String(formData.get("location") ?? "")
      .trim()
      .replaceAll(/\s+/g, " ")
      .slice(0, 150) || "Arkansas";
  const spotifyArtistId =
    String(formData.get("spotifyArtistId") ?? "")
      .trim()
      .slice(0, 150) || null;
  const spotifyUrl =
    String(formData.get("spotifyUrl") ?? "")
      .trim()
      .slice(0, 500) || null;
  const image =
    String(formData.get("image") ?? "")
      .trim()
      .slice(0, 1000) || null;

  const [existingArtist] = await db
    .select({
      email: artists.email,
      genre: artists.genre,
      id: artists.id,
      location: artists.location,
      name: artists.name,
    })
    .from(artists)
    .where(
      sql`regexp_replace(lower(${artists.name}), '[^a-z0-9]', '', 'g') = ${normalizeName(displayName)}`,
    )
    .limit(1);

  if (existingArtist) {
    return { artist: existingArtist, success: true };
  }

  const slug = await ensureUniqueSlug(generateSlug(displayName), undefined, "artists");
  const [artist] = await db
    .insert(artists)
    .values({
      bio: "Profile pending update.",
      claimed: false,
      claimedById: null,
      email: null,
      genre,
      image,
      instagram: null,
      location,
      name: displayName,
      phoneNumber: null,
      slug,
      spotifyArtistId,
      spotifyUrl,
      tiktok: null,
      twitter: null,
      website: null,
    })
    .returning({
      email: artists.email,
      genre: artists.genre,
      id: artists.id,
      location: artists.location,
      name: artists.name,
    });

  revalidateTag("artists", "max");
  revalidatePath("/admin/events/import");
  revalidatePath("/artists");

  return { artist, success: true };
}
