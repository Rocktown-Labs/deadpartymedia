"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { eventSchema } from "@/lib/validations/event";

export async function createEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create events");
  }

  // Validate form data
  const rawData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    description: formData.get("description") as string,
    image: formData.get("image") as string | undefined,
    venue: formData.get("venue") as string,
    location: formData.get("location") as string,
    date: formData.get("date") as string,
    time: formData.get("time") as string | undefined,
    ticketLink: formData.get("ticketLink") as string | undefined,
    price: formData.get("price") as string | undefined,
    genre: formData.get("genre") as string,
    status: formData.get("status") as string,
  };

  const validationResult = eventSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.title),
    undefined,
    "events"
  );

  await db.insert(events).values({
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
  });

  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function updateEvent(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get the event to check ownership
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    throw new Error("Event not found");
  }

  if (!(await canEdit(event.createdById))) {
    throw new Error(
      "Unauthorized: You don't have permission to edit this event"
    );
  }

  // Validate form data
  const rawData = {
    title: formData.get("title") as string,
    slug: formData.get("slug") as string,
    description: formData.get("description") as string,
    image: formData.get("image") as string | undefined,
    venue: formData.get("venue") as string,
    location: formData.get("location") as string,
    date: formData.get("date") as string,
    time: formData.get("time") as string | undefined,
    ticketLink: formData.get("ticketLink") as string | undefined,
    price: formData.get("price") as string | undefined,
    genre: formData.get("genre") as string,
    status: formData.get("status") as string,
  };

  const validationResult = eventSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(
      validationResult.error.issues.map((e) => e.message).join(", ")
    );
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.title),
    id,
    "events"
  );

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

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${id}`);
  redirect("/admin/events");
}

export async function deleteEvent(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can delete events");
  }

  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/admin/events");
}
