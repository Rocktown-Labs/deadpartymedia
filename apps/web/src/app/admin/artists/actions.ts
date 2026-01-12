"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate, canEdit, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";

export async function createArtist(
  formData: FormData,
  inviteArtist: boolean
) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create artists");
  }

  const name = formData.get("name") as string;
  const slugInput = formData.get("slug") as string;
  const bio = formData.get("bio") as string;
  const image = formData.get("image") as string;
  const location = formData.get("location") as string;
  const genre = formData.get("genre") as string;
  const spotifyUrl = formData.get("spotifyUrl") as string;
  const spotifyArtistId = formData.get("spotifyArtistId") as string;
  const instagram = formData.get("instagram") as string;
  const twitter = formData.get("twitter") as string;
  const tiktok = formData.get("tiktok") as string;
  const website = formData.get("website") as string;
  const email = formData.get("email") as string;

  const slug = await ensureUniqueSlug(slugInput || generateSlug(name));

  // Insert artist into database
  const [artist] = await db
    .insert(artists)
    .values({
      name,
      slug,
      bio,
      image: image || null,
      location,
      genre: genre as any,
      spotifyUrl: spotifyUrl || null,
      spotifyArtistId: spotifyArtistId || null,
      instagram: instagram || null,
      twitter: twitter || null,
      tiktok: tiktok || null,
      website: website || null,
      email: email || null,
    })
    .returning();

  // If invitation is requested and email is provided, send invitation
  if (inviteArtist && email) {
    const client = await clerkClient();
    try {
      await client.invitations.createInvitation({
        emailAddress: email,
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
  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);

  if (!artist) {
    throw new Error("Artist not found");
  }

  // For artists, we allow any admin/writer to edit (no ownership check)
  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to edit artists");
  }

  const name = formData.get("name") as string;
  const slugInput = formData.get("slug") as string;
  const bio = formData.get("bio") as string;
  const image = formData.get("image") as string;
  const location = formData.get("location") as string;
  const genre = formData.get("genre") as string;
  const spotifyUrl = formData.get("spotifyUrl") as string;
  const spotifyArtistId = formData.get("spotifyArtistId") as string;
  const instagram = formData.get("instagram") as string;
  const twitter = formData.get("twitter") as string;
  const tiktok = formData.get("tiktok") as string;
  const website = formData.get("website") as string;
  const email = formData.get("email") as string;

  const slug = await ensureUniqueSlug(slugInput || generateSlug(name), id);

  await db
    .update(artists)
    .set({
      name,
      slug,
      bio,
      image: image || null,
      location,
      genre: genre as any,
      spotifyUrl: spotifyUrl || null,
      spotifyArtistId: spotifyArtistId || null,
      instagram: instagram || null,
      twitter: twitter || null,
      tiktok: tiktok || null,
      website: website || null,
      email: email || null,
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

  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);

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
      await db
        .update(artists)
        .set({ email })
        .where(eq(artists.id, artistId));
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
