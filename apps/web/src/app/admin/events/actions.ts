"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events, eventArtists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validations/event";
import { logger } from "@/lib/logger";
import { sanitizeError } from "@/lib/logger/sanitize";

export async function createEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
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
  const artistIdsStr = formData.get("artistIds");
  if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
    const artistIds = artistIdsStr
      .split(",")
      .map((id) => Number.parseInt(id.trim(), 10))
      .filter((id) => !Number.isNaN(id) && id > 0);

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

  revalidatePath("/admin/events");
  revalidatePath(`/events/${event.slug}`);
  redirect("/admin/events");
}

export async function updateEvent(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
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
    await db.delete(eventArtists).where(eq(eventArtists.eventId, id));

    const artistIdsStr = formData.get("artistIds");
    if (artistIdsStr && typeof artistIdsStr === "string" && artistIdsStr.trim()) {
      const artistIds = artistIdsStr
        .split(",")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id) && id > 0);

      if (artistIds.length > 0) {
        await db.insert(eventArtists).values(
          artistIds.map((artistId) => ({
            eventId: id,
            artistId,
          }))
        );
        logger.debug(
          { userId, operation: "update_event", eventId: id, artistIds },
          "Event artist relations updated"
        );
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
    redirect("/sign-in");
  }

  logger.info({ userId, operation: "delete_event", eventId: id }, "Deleting event");

  if (!(await canDelete())) {
    logger.warn({ userId, operation: "delete_event", eventId: id }, "Unauthorized delete attempt");
    throw new Error("Unauthorized: Only super admins can delete events");
  }

  try {
    await db.delete(events).where(eq(events.id, id));
    logger.info({ userId, operation: "delete_event", eventId: id }, "Event deleted successfully");
  } catch (error) {
    logger.error(
      { error: sanitizeError(error), userId, operation: "delete_event", eventId: id },
      "Failed to delete event"
    );
    throw error;
  }

  revalidatePath("/admin/events");
}
