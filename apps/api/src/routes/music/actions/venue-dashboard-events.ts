import { eventSchema } from "@dpmedia/contracts";
import { eventArtists, events, venues } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function VenueDashboardEventsActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type EventInsert = typeof events.$inferInsert;

  async function createVenueEvent(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    // Find the venue claimed by this user
    const [userVenue] = await db
      .select()
      .from(venues)
      .where(eq(venues.claimedById, userId))
      .limit(1);

    // Only onboarded venues may publish events. Unclaimed users cannot mint
    // arbitrary-venue events (spam / impersonation guard).
    if (!userVenue) {
      throw new HTTPException(403, {
        message: "Unauthorized: Claim a venue before creating events",
      });
    }

    const rawData = {
      date: (formData.get("date") as string) || "",
      description: (formData.get("description") as string) || "",
      genre: (formData.get("genre") as string) || "OTHER",
      image: (formData.get("image") as string | null) || undefined,
      location:
        (formData.get("location") as string) ||
        (userVenue.address
          ? `${userVenue.address}, ${userVenue.city}, ${userVenue.state}`
          : userVenue.city || "Little Rock, AR"),
      price: (formData.get("price") as string | null) || undefined,
      slug: (formData.get("slug") as string) || "",
      status: (formData.get("status") as string) || "draft",
      ticketLink: (formData.get("ticketLink") as string | null) || undefined,
      time: (formData.get("time") as string | null) || undefined,
      title: (formData.get("title") as string) || "",
      venue: userVenue.name || (formData.get("venue") as string) || "",
    };

    const validationResult = eventSchema.safeParse(rawData);
    if (!validationResult.success) {
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;
    const slug = await ensureUniqueSlug(
      db,
      slugInput || generateSlug(validatedData.title),
      undefined,
      "events",
    );

    try {
      const [event] = await db
        .insert(events)
        .values({
          createdById: userId,
          date: validatedData.date as EventInsert["date"],
          description: validatedData.description,
          genre: validatedData.genre as EventInsert["genre"],
          image: validatedData.image || null,
          location: validatedData.location,
          price: validatedData.price || null,
          slug,
          status: validatedData.status as EventInsert["status"],
          ticketLink: validatedData.ticketLink || null,
          time: validatedData.time || null,
          title: validatedData.title,
          venue: validatedData.venue,
          venueId: userVenue.id,
        })
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      // Link artists if provided
      const artistIdsRaw = formData.get("artistIds") as string | null;
      if (artistIdsRaw) {
        const artistIds = artistIdsRaw
          .split(",")
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id));

        if (artistIds.length > 0) {
          await db.insert(eventArtists).values(
            artistIds.map((artistId) => ({
              artistId,
              eventId: event.id,
            })),
          );
        }
      }

      return { redirectUrl: "/venue-dashboard", eventId: event.id };
    } catch (error) {
      console.error(
        { error, operation: "create_venue_event", userId },
        "Failed to create venue event",
      );
      throw error;
    }
  }
  return { createVenueEvent };
}
export const venueDashboardEventsActionsRoutes = new Hono<AppEnv>().post(
  "/venue-dashboard/events/createVenueEvent",
  zValidator("json", z.object({ formData: formFields })),
  async (c) => {
    requireAuth(c);
    const input = c.req.valid("json");
    return c.json((await VenueDashboardEventsActions(c).createVenueEvent(input.formData)) ?? null);
  },
);
