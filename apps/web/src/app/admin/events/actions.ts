"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { events, eventArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath, revalidateTag } from "next/cache";
import { eventSchema } from "@/lib/validations/event";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

function normalizeArtistIds(ids: number[]) {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function haveDifferentArtistIds(a: number[], b: number[]) {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

export async function createEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ userId, operation: "create_event" }, "Starting event creation");

  if (!(await canCreate())) {
    logger.warn({ userId, operation: "create_event" }, "Unauthorized event creation attempt");
    throw new Error("Unauthorized: You don't have permission to create events");
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    title: (formData.get("title") as string) || "",
    slug: (formData.get("slug") as string) || "",
    description: (formData.get("description") as string) || "",
    image: (formData.get("image") as string | null) || undefined,
    venue: (formData.get("venue") as string) || "",
    location: (formData.get("location") as string) || "",
    date: (formData.get("date") as string) || "",
    time: (formData.get("time") as string | null) || undefined,
    ticketLink: (formData.get("ticketLink") as string | null) || undefined,
    price: (formData.get("price") as string | null) || undefined,
    genre: (formData.get("genre") as string) || "",
    status: (formData.get("status") as string) || "",
  };

  const validationResult = eventSchema.safeParse(rawData);

  if (!validationResult.success) {
    logger.warn(
      { userId, operation: "create_event", errors: validationResult.error.issues },
      "Event validation failed"
    );
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.title),
    undefined,
    "events",
  );

  let event;
  try {
    [event] = await db
      .insert(events)
      .values({
        title: validatedData.title,
        slug,
        description: validatedData.description,
        image: validatedData.image || null,
        venue: validatedData.venue,
        location: validatedData.location,
        date: validatedData.date as any, // Pass date string directly for PostgreSQL date type
        time: validatedData.time || null,
        ticketLink: validatedData.ticketLink || null,
        price: validatedData.price || null,
        genre: validatedData.genre as any,
        status: validatedData.status as any,
        createdById: userId,
      })
      .returning();

    logger.info(
      { userId, operation: "create_event", eventId: event.id, slug: event.slug },
      "Event created successfully"
    );
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), userId, operation: "create_event", title: validatedData.title },
      "Failed to create event"
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
        .filter((id) => !Number.isNaN(id) && id > 0)
    );

    if (artistIds.length > 0) {
      try {
        await db.insert(eventArtists).values(
          artistIds.map((artistId) => ({
            eventId: event.id,
            artistId,
          }))
        );
        logger.debug(
          { userId, operation: "create_event", eventId: event.id, artistIds },
          "Event artist relations created"
        );
      } catch (error) {
        logger.error(
          {
            error: sanitizeError(error),
            userId,
            operation: "create_event",
            eventId: event.id,
            artistIds,
          },
          "Failed to create event artist relations"
        );
        // Don't throw - event is already created, relations can be added later
      }
    }
  }

  const isPublished = validatedData.status === "published";
  if (isPublished) {
    revalidateTag("events", "max");
    revalidateTag("stats-monthly", "max");
    if (artistIds.length > 0) {
      revalidateTag("artists", "max");
    }
  }

  revalidatePath("/admin/events");
  revalidatePath(`/events/${event.slug}`);
  redirect("/admin/events");
}

export async function updateEvent(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ userId, operation: "update_event", eventId: id }, "Starting event update");

  // Get the event to check ownership
  let event;
  try {
    [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), userId, operation: "update_event", eventId: id },
      "Failed to fetch event for update"
    );
    throw error;
  }

  if (!event) {
    logger.warn({ userId, operation: "update_event", eventId: id }, "Event not found");
    throw new Error("Event not found");
  }

  if (!(await canEdit(event.createdById))) {
    logger.warn(
      { userId, operation: "update_event", eventId: id, createdById: event.createdById },
      "Unauthorized event update attempt"
    );
    throw new Error("Unauthorized: You don't have permission to edit this event");
  }

  // Validate form data - convert null to empty string for required fields
  const rawData = {
    title: (formData.get("title") as string) || "",
    slug: (formData.get("slug") as string) || "",
    description: (formData.get("description") as string) || "",
    image: (formData.get("image") as string | null) || undefined,
    venue: (formData.get("venue") as string) || "",
    location: (formData.get("location") as string) || "",
    date: (formData.get("date") as string) || "",
    time: (formData.get("time") as string | null) || undefined,
    ticketLink: (formData.get("ticketLink") as string | null) || undefined,
    price: (formData.get("price") as string | null) || undefined,
    genre: (formData.get("genre") as string) || "",
    status: (formData.get("status") as string) || "",
  };

  const validationResult = eventSchema.safeParse(rawData);

  if (!validationResult.success) {
    logger.warn(
      { userId, operation: "update_event", eventId: id, errors: validationResult.error.issues },
      "Event validation failed"
    );
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(slugInput || generateSlug(validatedData.title), id, "events");

  try {
    await db
      .update(events)
      .set({
        title: validatedData.title,
        slug,
        description: validatedData.description,
        image: validatedData.image || null,
        venue: validatedData.venue,
        location: validatedData.location,
        date: validatedData.date as any, // Pass date string directly for PostgreSQL date type
        time: validatedData.time || null,
        ticketLink: validatedData.ticketLink || null,
        price: validatedData.price || null,
        genre: validatedData.genre as any,
        status: validatedData.status as any,
        updatedAt: new Date(),
      })
      .where(eq(events.id, id));

    logger.info(
      { userId, operation: "update_event", eventId: id, slug },
      "Event updated successfully"
    );
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), userId, operation: "update_event", eventId: id },
      "Failed to update event"
    );
    throw error;
  }

  // Handle artist relations - delete existing and insert new
  try {
    const existingArtistRelations = await db
      .select({ artistId: eventArtists.artistId })
      .from(eventArtists)
      .where(eq(eventArtists.eventId, id));
    const existingArtistIds = normalizeArtistIds(
      existingArtistRelations.map((rel) => rel.artistId)
    );

    await db.delete(eventArtists).where(eq(eventArtists.eventId, id));

    let newArtistIds: number[] = [];
    const artistIdsStr = formData.get("artistIds");
    if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
      newArtistIds = normalizeArtistIds(
        artistIdsStr
          .split(",")
          .map((id) => Number.parseInt(id.trim(), 10))
          .filter((id) => !Number.isNaN(id) && id > 0)
      );

      if (newArtistIds.length > 0) {
        await db.insert(eventArtists).values(
          newArtistIds.map((artistId) => ({
            eventId: id,
            artistId,
          }))
        );
        logger.debug(
          { userId, operation: "update_event", eventId: id, artistIds: newArtistIds },
          "Event artist relations updated"
        );
      }
    }

    const wasPublished = event.status === "published";
    const isPublished = validatedData.status === "published";
    const artistIdsChanged = haveDifferentArtistIds(
      existingArtistIds,
      newArtistIds
    );
    const publicationChanged = wasPublished !== isPublished;
    const hasAnyArtistIds =
      existingArtistIds.length > 0 || newArtistIds.length > 0;
    if (wasPublished || isPublished) {
      revalidateTag("events", "max");
      revalidateTag("stats-monthly", "max");
      if (artistIdsChanged || (publicationChanged && hasAnyArtistIds)) {
        revalidateTag("artists", "max");
      }
    }
  } catch (error) {
    logger.error(
      {
        error: sanitizeError(error),
        userId,
        operation: "update_event",
        eventId: id,
      },
      "Failed to update event artist relations"
    );
    // Don't throw - event is already updated, relations can be fixed later
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  revalidatePath(`/events/${slug}`);
  redirect("/admin/events");
}

export async function deleteEvent(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  logger.info({ userId, operation: "delete_event", eventId: id }, "Deleting event");

  if (!(await canDelete())) {
    logger.warn({ userId, operation: "delete_event", eventId: id }, "Unauthorized delete attempt");
    throw new Error("Unauthorized: Only super admins can delete events");
  }

  try {
    const [event] = await db
      .select({ status: events.status })
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    const existingArtistRelations = await db
      .select({ artistId: eventArtists.artistId })
      .from(eventArtists)
      .where(eq(eventArtists.eventId, id));

    await db.delete(events).where(eq(events.id, id));
    logger.info({ userId, operation: "delete_event", eventId: id }, "Event deleted successfully");
    if (event?.status === "published") {
      revalidateTag("events", "max");
      revalidateTag("stats-monthly", "max");
      if (existingArtistRelations.length > 0) {
        revalidateTag("artists", "max");
      }
    }
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), userId, operation: "delete_event", eventId: id },
      "Failed to delete event"
    );
    throw error;
  }

  revalidatePath("/admin/events");
}
