import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { google } from "@ai-sdk/google";
import { db } from "@dpmedia/db";
import { artmakers, eventArtmakers, events } from "@dpmedia/db/schema";
import { createServerFn } from "@tanstack/react-start";
import { generateObject } from "ai";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { createSlug } from "#/lib/slug.ts";

const flyerAnalysisSchema = z.object({
  artmakers: z.array(z.string()).default([]),
  confidence: z.object({
    date: z.number().min(0).max(1),
    title: z.number().min(0).max(1),
    venue: z.number().min(0).max(1),
  }),
  date: z.string().describe("YYYY-MM-DD"),
  description: z.string(),
  location: z.string(),
  price: z.string().optional().nullable(),
  ticketLink: z.string().optional().nullable(),
  time: z.string().describe("24-hour HH:mm when visible, otherwise empty string"),
  title: z.string(),
  venue: z.string(),
  warnings: z.array(z.string()).default([]),
});

const analyzeFlyerInputSchema = z
  .object({
    imageKey: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine((value) => Boolean(value.imageKey || value.imageUrl), {
    message: "Upload a flyer image before analyzing.",
    path: ["imageKey"],
  });

const createImportedEventSchema = z.object({
  artmakerIds: z.array(z.number().int().positive()).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  description: z.string().min(1).max(2000),
  image: z.string().optional(),
  location: z.string().min(1).max(200),
  price: z.string().max(100).optional(),
  ticketLink: z.string().max(500).optional(),
  time: z.string().max(20).optional(),
  title: z.string().min(1).max(200),
  venue: z.string().min(1).max(200),
});

export type ArtsFlyerAnalysis = z.infer<typeof flyerAnalysisSchema> & {
  imageUrl: string;
  matchedArtmakers: { id: number; name: string; slug: string }[];
  unmatchedArtmakers: string[];
  possibleDuplicate: { date: string; id: number; title: string; venue: string } | null;
};

function isArtsStaffRole(role: unknown) {
  return (
    role === "admin" || role === "arts_admin" || role === "arts_writer" || role === "super_admin"
  );
}

async function requireArtsEventCreator() {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    throw new Error("Unauthorized");
  }

  const user = await clerkClient().users.getUser(userId);
  if (!isArtsStaffRole(user.publicMetadata.role)) {
    throw new Error("Unauthorized: only arts staff can import events.");
  }

  return userId;
}

function requireAiKey() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing AI key. Configure GOOGLE_GENERATIVE_AI_API_KEY, GEMINI_API_KEY, or AI_GATEWAY_API_KEY.",
    );
  }
}

function normalizeName(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

async function makeUniqueEventSlug(title: string, currentId?: number) {
  const baseSlug = createSlug(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await db
      .select({ id: events.id })
      .from(events)
      .where(
        currentId
          ? and(eq(events.slug, candidate), ne(events.id, currentId))
          : eq(events.slug, candidate),
      )
      .limit(1);

    if (existing.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function getImportedEventStatus(date: string) {
  const today = new Date().toISOString().slice(0, 10);
  return date < today ? "past" : "published";
}

function getPublicImageUrl(input: { imageKey?: string; imageUrl?: string }) {
  if (input.imageUrl) {
    return input.imageUrl;
  }

  const publicBaseUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!publicBaseUrl || !input.imageKey) {
    throw new Error("CLOUDFLARE_R2_PUBLIC_URL is required to analyze uploaded flyers.");
  }

  return `${publicBaseUrl}/${input.imageKey.replace(/^\//, "")}`;
}

async function enrichAnalysis(
  analysis: z.infer<typeof flyerAnalysisSchema>,
  imageUrl: string,
): Promise<ArtsFlyerAnalysis> {
  const names = [...new Set(analysis.artmakers.map((name) => name.trim()))].filter(Boolean);
  const matchedArtmakers: ArtsFlyerAnalysis["matchedArtmakers"] = [];
  const unmatchedArtmakers: string[] = [];

  for (const name of names) {
    const [match] = await db
      .select({ id: artmakers.id, name: artmakers.name, slug: artmakers.slug })
      .from(artmakers)
      .where(
        sql`regexp_replace(lower(${artmakers.name}), '[^a-z0-9]', '', 'g') = ${normalizeName(name)}`,
      )
      .limit(1);

    if (match) {
      matchedArtmakers.push(match);
    } else {
      unmatchedArtmakers.push(name);
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
        eq(events.vertical, "arts"),
        eq(events.date, analysis.date),
        sql`lower(${events.title}) = ${analysis.title.toLowerCase()} OR lower(${events.venue}) = ${analysis.venue.toLowerCase()}`,
      ),
    )
    .limit(1);

  return {
    ...analysis,
    imageUrl,
    matchedArtmakers,
    possibleDuplicate: possibleDuplicate ?? null,
    unmatchedArtmakers,
  };
}

export const analyzeArtsEventFlyer = createServerFn({ method: "POST" })
  .validator(analyzeFlyerInputSchema)
  .handler(async ({ data }) => {
    await requireArtsEventCreator();
    requireAiKey();

    const imageUrl = getPublicImageUrl(data);
    const currentYear = new Date().getFullYear();
    const { object } = await generateObject({
      messages: [
        {
          content: [
            {
              text: `Extract a Dead Party Arts event record from this flyer.

Return only visible or strongly implied information. Use Arkansas context if city or state is missing.
For ambiguous dates without a visible year, choose the most plausible year near ${currentYear}; include a warning.
Artmakers should be visual artists, vendors, exhibitors, muralists, tattooers, designers, or workshop leaders shown on the flyer.
Do not treat venue names, sponsors, brands, age restrictions, prices, or social handles as artmakers.
If the flyer advertises multiple events, extract the primary event and add a warning.
Use date as YYYY-MM-DD and time as 24-hour HH:mm. Use an empty string for time if no time is visible.
Infer a concise title from the visible event name and venue when no formal title exists.`,
              type: "text",
            },
            {
              image: new URL(imageUrl),
              type: "image",
            },
          ],
          role: "user",
        },
      ],
      model: google("gemini-3.5-flash"),
      schema: flyerAnalysisSchema,
    });

    return enrichAnalysis(object, imageUrl);
  });

export const createArtsEventFromFlyer = createServerFn({ method: "POST" })
  .validator(createImportedEventSchema)
  .handler(async ({ data }) => {
    const userId = await requireArtsEventCreator();

    const [duplicate] = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.vertical, "arts"),
          eq(events.date, data.date),
          sql`lower(${events.title}) = ${data.title.toLowerCase()} AND lower(${events.venue}) = ${data.venue.toLowerCase()}`,
        ),
      )
      .limit(1);

    if (duplicate) {
      throw new Error("A matching arts event already exists for this title, venue, and date.");
    }

    const slug = await makeUniqueEventSlug(data.title);
    const [event] = await db
      .insert(events)
      .values({
        createdById: userId,
        date: data.date,
        description: data.description,
        genre: "OTHER",
        image: data.image || null,
        location: data.location,
        price: data.price || null,
        slug,
        status: getImportedEventStatus(data.date),
        ticketLink: data.ticketLink || null,
        time: data.time || null,
        title: data.title,
        venue: data.venue,
        vertical: "arts",
      })
      .returning({ id: events.id, slug: events.slug, status: events.status });

    const uniqueArtmakerIds = [...new Set(data.artmakerIds)];
    if (uniqueArtmakerIds.length > 0) {
      await db.insert(eventArtmakers).values(
        uniqueArtmakerIds.map((artmakerId) => ({
          artmakerId,
          eventId: event.id,
        })),
      );
    }

    return {
      eventId: event.id,
      slug: event.slug,
      status: event.status,
      success: true,
    };
  });
