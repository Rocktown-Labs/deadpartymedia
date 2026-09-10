"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { events, eventArtists, venues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validations/event";
import { logger } from "@/lib/logger";

type EventInsert = typeof events.$inferInsert;

export async function createVenueEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  // Find the venue claimed by this user
  const [userVenue] = await db.select().from(venues).where(eq(venues.claimedById, userId)).limit(1);

  const rawData = {
    date: (formData.get("date") as string) || "",
    description: (formData.get("description") as string) || "",
    genre: (formData.get("genre") as string) || "OTHER",
    image: (formData.get("image") as string | null) || undefined,
    location:
      (formData.get("location") as string) ||
      (userVenue?.address
        ? `${userVenue.address}, ${userVenue.city}, ${userVenue.state}`
        : userVenue?.city || "Little Rock, AR"),
    price: (formData.get("price") as string | null) || undefined,
    slug: (formData.get("slug") as string) || "",
    status: (formData.get("status") as string) || "published",
    ticketLink: (formData.get("ticketLink") as string | null) || undefined,
    time: (formData.get("time") as string | null) || undefined,
    title: (formData.get("title") as string) || "",
    venue: userVenue?.name || (formData.get("venue") as string) || "",
  };

  const validationResult = eventSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;
  const slug = await ensureUniqueSlug(
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
        venueId: userVenue?.id || null,
      })
      .returning();

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

    revalidatePath("/events");
    revalidatePath("/venue-dashboard");
    revalidatePath("/admin/events");

    return { redirectUrl: "/venue-dashboard" as Route, eventId: event.id };
  } catch (error) {
    logger.error(
      { error, operation: "create_venue_event", userId },
      "Failed to create venue event",
    );
    throw error;
  }
}
