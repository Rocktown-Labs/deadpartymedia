"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create events");
  }

  const title = formData.get("title") as string;
  const slugInput = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const image = formData.get("image") as string;
  const venue = formData.get("venue") as string;
  const location = formData.get("location") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const ticketLink = formData.get("ticketLink") as string;
  const price = formData.get("price") as string;
  const genre = formData.get("genre") as string;
  const status = formData.get("status") as "draft" | "published" | "past";

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(title)
  );

  await db.insert(events).values({
    title,
    slug,
    description,
    image: image || null,
    venue,
    location,
    date,
    time: time || null,
    ticketLink: ticketLink || null,
    price: price || null,
    genre: genre as any,
    status: status as any,
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
    throw new Error("Unauthorized: You don't have permission to edit this event");
  }

  const title = formData.get("title") as string;
  const slugInput = formData.get("slug") as string;
  const description = formData.get("description") as string;
  const image = formData.get("image") as string;
  const venue = formData.get("venue") as string;
  const location = formData.get("location") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const ticketLink = formData.get("ticketLink") as string;
  const price = formData.get("price") as string;
  const genre = formData.get("genre") as string;
  const status = formData.get("status") as "draft" | "published" | "past";

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(title),
    id
  );

  await db
    .update(events)
    .set({
      title,
      slug,
      description,
      image: image || null,
      venue,
      location,
      date,
      time: time || null,
      ticketLink: ticketLink || null,
      price: price || null,
      genre: genre as any,
      status: status as any,
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
