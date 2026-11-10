import { eventSchema } from "@dpmedia/contracts";
import { eventArtists, events } from "@dpmedia/db/schema";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../auth";
import type { AppEnv } from "../../../bindings";
import { getMusicDb } from "../../../db";
import { formFields } from "../../../lib/form-fields";
import { canEditMusic, hasMusicRole } from "../../../lib/music-access";
import { sanitizeError } from "../../../lib/music/logger/sanitize";
import { ensureUniqueSlug, generateSlug } from "../../../lib/slug";
function AdminEventsActions(c: Context<AppEnv>) {
  const db = getMusicDb(c.env);

  type EventInsert = typeof events.$inferInsert;

  function normalizeArtistIds(ids: number[]) {
    return [...new Set(ids)].toSorted((a, b) => a - b);
  }

  async function createEvent(formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ operation: "create_event", userId }, "Starting event creation");

    if (!hasMusicRole(c, "super_admin", "writer")) {
      console.warn({ operation: "create_event", userId }, "Unauthorized event creation attempt");
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to create events",
      });
    }

    // Validate form data - convert null to empty string for required fields
    const rawData = {
      date: (formData.get("date") as string) || "",
      description: (formData.get("description") as string) || "",
      genre: (formData.get("genre") as string) || "",
      image: (formData.get("image") as string | null) || undefined,
      location: (formData.get("location") as string) || "",
      price: (formData.get("price") as string | null) || undefined,
      slug: (formData.get("slug") as string) || "",
      status: (formData.get("status") as string) || "",
      ticketLink: (formData.get("ticketLink") as string | null) || undefined,
      time: (formData.get("time") as string | null) || undefined,
      title: (formData.get("title") as string) || "",
      venue: (formData.get("venue") as string) || "",
    };

    const validationResult = eventSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.warn(
        { errors: validationResult.error.issues, operation: "create_event", userId },
        "Event validation failed",
      );
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

    const venueIdRaw = formData.get("venueId");
    const venueId = venueIdRaw && !Number.isNaN(Number(venueIdRaw)) ? Number(venueIdRaw) : null;

    let event;
    try {
      [event] = await db
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
          venueId,
        })
        .returning()
        .then((rows) => {
          if (!rows[0]) throw new HTTPException(500, { message: "Write returned no row" });
          return [rows[0]] as const;
        });

      console.info(
        { eventId: event.id, operation: "create_event", slug: event.slug, userId },
        "Event created successfully",
      );
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          operation: "create_event",
          title: validatedData.title,
          userId,
        },
        "Failed to create event",
      );
      throw error;
    }

    // Handle artist relations (optional for events)
    let artistIds: number[] = [];
    const artistIdsStr = formData.get("artistIds");
    if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
      artistIds = normalizeArtistIds(
        artistIdsStr
          .split(",")
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id) && id > 0),
      );

      if (artistIds.length > 0) {
        try {
          await db.insert(eventArtists).values(
            artistIds.map((artistId) => ({
              artistId,
              eventId: event.id,
            })),
          );
          console.debug(
            { artistIds, eventId: event.id, operation: "create_event", userId },
            "Event artist relations created",
          );
        } catch (error) {
          console.error(
            {
              artistIds,
              error: sanitizeError(error),
              eventId: event.id,
              operation: "create_event",
              userId,
            },
            "Failed to create event artist relations",
          );
          // Don't throw - event is already created, relations can be added later
        }
      }
    }

    return { redirectUrl: "/admin/events" };
  }

  async function updateEvent(id: number, formData: FormData) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ eventId: id, operation: "update_event", userId }, "Starting event update");

    // Get the event to check ownership
    let event;
    try {
      [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
    } catch (error) {
      console.error(
        { error: sanitizeError(error), eventId: id, operation: "update_event", userId },
        "Failed to fetch event for update",
      );
      throw error;
    }

    if (!event) {
      console.warn({ eventId: id, operation: "update_event", userId }, "Event not found");
      throw new HTTPException(404, { message: "Event not found" });
    }

    if (!canEditMusic(c, event.createdById)) {
      console.warn(
        { createdById: event.createdById, eventId: id, operation: "update_event", userId },
        "Unauthorized event update attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: You don't have permission to edit this event",
      });
    }

    // Validate form data - convert null to empty string for required fields
    const rawData = {
      date: (formData.get("date") as string) || "",
      description: (formData.get("description") as string) || "",
      genre: (formData.get("genre") as string) || "",
      image: (formData.get("image") as string | null) || undefined,
      location: (formData.get("location") as string) || "",
      price: (formData.get("price") as string | null) || undefined,
      slug: (formData.get("slug") as string) || "",
      status: (formData.get("status") as string) || "",
      ticketLink: (formData.get("ticketLink") as string | null) || undefined,
      time: (formData.get("time") as string | null) || undefined,
      title: (formData.get("title") as string) || "",
      venue: (formData.get("venue") as string) || "",
    };

    const validationResult = eventSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.warn(
        { errors: validationResult.error.issues, eventId: id, operation: "update_event", userId },
        "Event validation failed",
      );
      throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
    }

    const validatedData = validationResult.data;
    const slugInput = validatedData.slug;

    const slug = await ensureUniqueSlug(
      db,
      slugInput || generateSlug(validatedData.title),
      id,
      "events",
    );

    const venueIdRaw = formData.get("venueId");
    const venueId = venueIdRaw && !Number.isNaN(Number(venueIdRaw)) ? Number(venueIdRaw) : null;

    try {
      await db
        .update(events)
        .set({
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
          updatedAt: new Date(),
          venue: validatedData.venue,
          venueId,
        })
        .where(eq(events.id, id));

      console.info(
        { eventId: id, operation: "update_event", slug, userId },
        "Event updated successfully",
      );
    } catch (error) {
      console.error(
        { error: sanitizeError(error), eventId: id, operation: "update_event", userId },
        "Failed to update event",
      );
      throw error;
    }

    // Handle artist relations - delete existing and insert new
    try {
      await db.delete(eventArtists).where(eq(eventArtists.eventId, id));

      let newArtistIds: number[] = [];
      const artistIdsStr = formData.get("artistIds");
      if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
        newArtistIds = normalizeArtistIds(
          artistIdsStr
            .split(",")
            .map((id) => Number.parseInt(id.trim(), 10))
            .filter((id) => !Number.isNaN(id) && id > 0),
        );

        if (newArtistIds.length > 0) {
          await db.insert(eventArtists).values(
            newArtistIds.map((artistId) => ({
              artistId,
              eventId: id,
            })),
          );
          console.debug(
            { artistIds: newArtistIds, eventId: id, operation: "update_event", userId },
            "Event artist relations updated",
          );
        }
      }
    } catch (error) {
      console.error(
        {
          error: sanitizeError(error),
          eventId: id,
          operation: "update_event",
          userId,
        },
        "Failed to update event artist relations",
      );
      // Don't throw - event is already updated, relations can be fixed later
    }

    return { redirectUrl: "/admin/events" };
  }

  async function deleteEvent(id: number) {
    const { userId } = requireAuth(c);
    if (!userId) {
      throw new HTTPException(403, { message: "Access denied" });
    }

    console.info({ eventId: id, operation: "delete_event", userId }, "Deleting event");

    if (!hasMusicRole(c, "super_admin")) {
      console.warn(
        { eventId: id, operation: "delete_event", userId },
        "Unauthorized delete attempt",
      );
      throw new HTTPException(403, {
        message: "Unauthorized: Only super admins can delete events",
      });
    }

    try {
      await db.delete(events).where(eq(events.id, id));
      console.info(
        { eventId: id, operation: "delete_event", userId },
        "Event deleted successfully",
      );
    } catch (error) {
      console.error(
        { error: sanitizeError(error), eventId: id, operation: "delete_event", userId },
        "Failed to delete event",
      );
      throw error;
    }
  }
  return { createEvent, updateEvent, deleteEvent };
}
export const adminEventsActionsRoutes = new Hono<AppEnv>()
  .post(
    "/admin/events/createEvent",
    zValidator("json", z.object({ formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminEventsActions(c).createEvent(input.formData)) ?? null);
    },
  )
  .post(
    "/admin/events/updateEvent",
    zValidator("json", z.object({ id: z.number().int(), formData: formFields })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminEventsActions(c).updateEvent(input.id, input.formData)) ?? null);
    },
  )
  .post(
    "/admin/events/deleteEvent",
    zValidator("json", z.object({ id: z.number().int() })),
    async (c) => {
      requireRole(c, ["super_admin", "writer"]);
      const input = c.req.valid("json");
      return c.json((await AdminEventsActions(c).deleteEvent(input.id)) ?? null);
    },
  );
