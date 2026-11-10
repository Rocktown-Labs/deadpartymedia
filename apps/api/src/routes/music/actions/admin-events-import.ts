import { eventSchema } from "@dpmedia/contracts";
import { artists, eventArtists, events } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { generateObject } from "ai";
import { and, eq, sql } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { hasMusicRole } from "../../../lib/music-access";
import {
  getImportedEventStatus,
  isPastEventDate,
} from "../../../lib/music/admin/event-flyer-import";
import { getWorkersAiModel } from "../../../lib/music/ai";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
export function AdminEventsImportActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

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

  type EventFlyerAnalysis = z.infer<typeof flyerAnalysisSchema> & {
    imageUrl: string;
    matchedArtists: { id: number; name: string; slug: string }[];
    unmatchedArtists: string[];
    possibleDuplicate: { id: number; title: string; date: string; venue: string } | null;
  };

  function normalizeName(value: string) {
    return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  }

  async function enrichEventAnalysis(
    analysis: z.infer<typeof flyerAnalysisSchema>,
    imageUrl: string,
  ): Promise<EventFlyerAnalysis> {
    const performerNames = [
      ...new Set(analysis.performingArtists.map((name) => name.trim())),
    ].filter(Boolean);
    const matchedArtists: EventFlyerAnalysis["matchedArtists"] = [];
    const unmatchedArtists: string[] = [];

    for (const name of performerNames) {
      const artist = (
        await db.select({ id: artists.id, name: artists.name, slug: artists.slug }).from(artists)
      ).find((candidate) => normalizeName(candidate.name) === normalizeName(name));

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

  async function analyzeEventFlyerAction(imageUrl: string): Promise<EventFlyerAnalysis> {
    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only event creators can analyze event flyers",
      });
    }
    const model = getWorkersAiModel(c.env);
    const currentYear = new Date().getFullYear();
    const { object } = await generateObject({
      model,
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
              image: imageUrl,
            },
          ],
        },
      ],
    });

    return enrichEventAnalysis(object, imageUrl);
  }

  async function createEventFromFlyerImportAction(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Unauthorized" });
    }
    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only event creators can create imported events",
      });
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
      db,
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
    if (!event) throw new HTTPException(500, { message: "Event could not be created" });

    const uniqueArtistIds = [...new Set(artistIds)];
    if (uniqueArtistIds.length > 0) {
      await db.insert(eventArtists).values(
        uniqueArtistIds.map((artistId) => ({
          artistId,
          eventId: event.id,
        })),
      );
    }

    return {
      eventId: event.id,
      slug: event.slug,
      status,
      eventIsPast: isPastEventDate(validated.date),
      success: true,
    };
  }

  async function createEventImportArtistStubAction(formData: FormData) {
    if (!hasMusicRole(c, "super_admin", "writer")) {
      throw new HTTPException(403, {
        message: "Unauthorized: Only event creators can create artist stubs",
      });
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

    const existingArtist = (
      await db
        .select({
          email: artists.email,
          genre: artists.genre,
          id: artists.id,
          location: artists.location,
          name: artists.name,
        })
        .from(artists)
    ).find((candidate) => normalizeName(candidate.name) === normalizeName(displayName));

    if (existingArtist) {
      return { artist: existingArtist, success: true };
    }

    const slug = await ensureUniqueSlug(db, generateSlug(displayName), undefined, "artists");
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

    return { artist, success: true };
  }
  return {
    analyzeEventFlyerAction,
    createEventFromFlyerImportAction,
    createEventImportArtistStubAction,
  };
}
export const adminEventsImportActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/events/import/analyzeEventFlyerAction",
    zValidator("json", z.object({ imageUrl: z.string() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminEventsImportActions(c).analyzeEventFlyerAction(input.imageUrl)) ?? null,
      );
    },
  )
  .post(
    "/admin/events/import/createEventFromFlyerImportAction",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminEventsImportActions(c).createEventFromFlyerImportAction(input.formData)) ??
          null,
      );
    },
  )
  .post(
    "/admin/events/import/createEventImportArtistStubAction",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json(
        (await AdminEventsImportActions(c).createEventImportArtistStubAction(input.formData)) ??
          null,
      );
    },
  );
