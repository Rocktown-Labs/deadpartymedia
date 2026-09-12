"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { venues } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { venueSchema } from "@/lib/validations/venue";
import { logger } from "@/lib/logger";

export async function createVenue(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");
  if (!isSuperAdmin && !isWriter) {
    throw new Error("Unauthorized: You do not have permission to create venues");
  }

  const rawData = {
    address: (formData.get("address") as string | null) || "",
    bookingEmail: (formData.get("bookingEmail") as string | null) || "",
    bookingRates: (formData.get("bookingRates") as string | null) || "",
    capacity: (formData.get("capacity") as string | null) || "",
    city: (formData.get("city") as string) || "Little Rock",
    description: (formData.get("description") as string | null) || "",
    genres: (formData.get("genres") as string | null) || "",
    image: (formData.get("image") as string | null) || undefined,
    name: (formData.get("name") as string) || "",
    phone: (formData.get("phone") as string | null) || "",
    slug: (formData.get("slug") as string | null) || "",
    state: (formData.get("state") as string) || "AR",
    website: (formData.get("website") as string | null) || undefined,
    zip: (formData.get("zip") as string | null) || "",
  };

  const validationResult = venueSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const baseSlug = validatedData.slug?.trim() || generateSlug(validatedData.name);
  const slug = await ensureUniqueSlug(baseSlug, undefined, "venues");

  try {
    const [venue] = await db
      .insert(venues)
      .values({
        address: validatedData.address || null,
        bookingEmail: validatedData.bookingEmail || null,
        bookingRates: validatedData.bookingRates || null,
        capacity: validatedData.capacity || null,
        city: validatedData.city,
        description: validatedData.description || null,
        image: validatedData.image || null,
        name: validatedData.name,
        phone: validatedData.phone || null,
        slug,
        state: validatedData.state,
        website: validatedData.website || null,
        zip: validatedData.zip || null,
      })
      .returning();

    revalidatePath("/venues");
    revalidatePath("/admin/venues");
    return { redirectUrl: "/admin/venues" as Route, venueId: venue.id };
  } catch (error) {
    logger.error({ error, operation: "create_venue" }, "Failed to create venue");
    throw error;
  }
}

export async function updateVenue(venueId: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  const isWriter = await checkRole("writer");
  if (!isSuperAdmin && !isWriter) {
    throw new Error("Unauthorized: You do not have permission to edit venues");
  }

  const [existingVenue] = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);

  if (!existingVenue) {
    throw new Error("Venue not found");
  }

  const rawData = {
    address: (formData.get("address") as string | null) || "",
    bookingEmail: (formData.get("bookingEmail") as string | null) || "",
    bookingRates: (formData.get("bookingRates") as string | null) || "",
    capacity: (formData.get("capacity") as string | null) || "",
    city: (formData.get("city") as string) || "Little Rock",
    description: (formData.get("description") as string | null) || "",
    genres: (formData.get("genres") as string | null) || "",
    image: (formData.get("image") as string | null) || undefined,
    name: (formData.get("name") as string) || "",
    phone: (formData.get("phone") as string | null) || "",
    slug: (formData.get("slug") as string | null) || "",
    state: (formData.get("state") as string) || "AR",
    website: (formData.get("website") as string | null) || undefined,
    zip: (formData.get("zip") as string | null) || "",
  };

  const validationResult = venueSchema.safeParse(rawData);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const baseSlug = validatedData.slug?.trim() || generateSlug(validatedData.name);
  const slug =
    baseSlug === existingVenue.slug
      ? existingVenue.slug
      : await ensureUniqueSlug(baseSlug, venueId, "venues");

  try {
    await db
      .update(venues)
      .set({
        address: validatedData.address || null,
        bookingEmail: validatedData.bookingEmail || null,
        bookingRates: validatedData.bookingRates || null,
        capacity: validatedData.capacity || null,
        city: validatedData.city,
        description: validatedData.description || null,
        image: validatedData.image || null,
        name: validatedData.name,
        phone: validatedData.phone || null,
        slug,
        state: validatedData.state,
        updatedAt: new Date(),
        website: validatedData.website || null,
        zip: validatedData.zip || null,
      })
      .where(eq(venues.id, venueId));

    revalidatePath("/venues");
    revalidatePath("/admin/venues");
    return { redirectUrl: "/admin/venues" as Route, venueId };
  } catch (error) {
    logger.error({ error, operation: "update_venue" }, "Failed to update venue");
    throw error;
  }
}

export async function deleteVenue(venueId: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  const isSuperAdmin = await checkRole("super_admin");
  if (!isSuperAdmin) {
    throw new Error("Unauthorized: Only super admins can delete venues");
  }

  try {
    await db.delete(venues).where(eq(venues.id, venueId));
    revalidatePath("/venues");
    revalidatePath("/admin/venues");
    return { success: true };
  } catch (error) {
    logger.error({ error, operation: "delete_venue" }, "Failed to delete venue");
    throw error;
  }
}
