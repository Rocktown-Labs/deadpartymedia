"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { artistSchema } from "@/lib/validations/artist";

export async function createArtist(formData: FormData, inviteArtist: boolean) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create artists");
  }

  // Validate form data
  const rawData = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string | undefined,
    bio: formData.get("bio") as string,
    image: formData.get("image") as string | undefined,
    location: formData.get("location") as string,
    genre: formData.get("genre") as string,
    spotifyUrl: formData.get("spotifyUrl") as string | undefined,
    spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
    instagram: formData.get("instagram") as string | undefined,
    twitter: formData.get("twitter") as string | undefined,
    tiktok: formData.get("tiktok") as string | undefined,
    website: formData.get("website") as string | undefined,
    email: formData.get("email") as string | undefined,
  };

  const validationResult = artistSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.name),
    undefined,
    "artists",
  );

  // Insert artist into database
  const [artist] = await db
    .insert(artists)
    .values({
      name: validatedData.name,
      slug,
      bio: validatedData.bio,
      image: validatedData.image || null,
      location: validatedData.location,
      genre: validatedData.genre as any,
      spotifyUrl: validatedData.spotifyUrl || null,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      instagram: validatedData.instagram || null,
      twitter: validatedData.twitter || null,
      tiktok: validatedData.tiktok || null,
      website: validatedData.website || null,
      email: validatedData.email || null,
    })
    .returning();

  // If invitation is requested and email is provided, send invitation
  if (inviteArtist && validatedData.email) {
    const client = await clerkClient();
    try {
      await client.invitations.createInvitation({
        emailAddress: validatedData.email!,
        redirectUrl: `/sign-up?role=artist&artistId=${artist.id}`,
        publicMetadata: {
          role: "artist",
          artistId: artist.id.toString(),
        },
      });
    } catch (error) {
      console.error("Failed to send artist invitation:", error);
      // Continue even if invitation fails - artist is already created
    }
  }

  revalidatePath("/admin/artists");
  redirect("/admin/artists");
}

export async function updateArtist(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Get the artist to check if it exists
  const [artist] = await db.select().from(artists).where(eq(artists.id, id)).limit(1);

  if (!artist) {
    throw new Error("Artist not found");
  }

  // For artists, we allow any admin/writer to edit (no ownership check)
  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to edit artists");
  }

  // Validate form data
  const rawData = {
    name: formData.get("name") as string,
    slug: formData.get("slug") as string | undefined,
    bio: formData.get("bio") as string,
    image: formData.get("image") as string | undefined,
    location: formData.get("location") as string,
    genre: formData.get("genre") as string,
    spotifyUrl: formData.get("spotifyUrl") as string | undefined,
    spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
    instagram: formData.get("instagram") as string | undefined,
    twitter: formData.get("twitter") as string | undefined,
    tiktok: formData.get("tiktok") as string | undefined,
    website: formData.get("website") as string | undefined,
    email: formData.get("email") as string | undefined,
  };

  const validationResult = artistSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;

  const slug = await ensureUniqueSlug(slugInput || generateSlug(validatedData.name), id, "artists");

  await db
    .update(artists)
    .set({
      name: validatedData.name,
      slug,
      bio: validatedData.bio,
      image: validatedData.image || null,
      location: validatedData.location,
      genre: validatedData.genre as any,
      spotifyUrl: validatedData.spotifyUrl || null,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      instagram: validatedData.instagram || null,
      twitter: validatedData.twitter || null,
      tiktok: validatedData.tiktok || null,
      website: validatedData.website || null,
      email: validatedData.email || null,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, id));

  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${id}`);
  redirect("/admin/artists");
}

export async function inviteArtistToClaim(artistId: number, email: string) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to invite artists");
  }

  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);

  if (!artist) {
    throw new Error("Artist not found");
  }

  const client = await clerkClient();

  try {
    await client.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `/sign-up?role=artist&artistId=${artistId}`,
      publicMetadata: {
        role: "artist",
        artistId: artistId.toString(),
      },
    });

    // Update artist email if different
    if (email !== artist.email) {
      await db.update(artists).set({ email }).where(eq(artists.id, artistId));
    }

    revalidatePath("/admin/artists");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteArtist(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can delete artists");
  }

  await db.delete(artists).where(eq(artists.id, id));

  revalidatePath("/admin/artists");
}
