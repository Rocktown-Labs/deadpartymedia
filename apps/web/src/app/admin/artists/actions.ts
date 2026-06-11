"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { db } from "@/lib/db";
import { artists, eventArtists, postArtists } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { canCreate, canDelete } from "@/lib/auth/access";
import { generateSlug, ensureUniqueSlug } from "@/lib/utils/slug";
import { revalidatePath, revalidateTag } from "next/cache";
import { artistSchema } from "@/lib/validations/artist";
import { logger } from "@/lib/logger";
import { withUserContext, withOperationContext } from "@/lib/logger/context";
import { sanitizeError } from "@/lib/logger/sanitize";
import { getErrorMessage } from "@/lib/utils/error";
import { buildInvitationRedirectUrl } from "@/lib/auth/invitations";

type ArtistGenre = (typeof artists.$inferInsert)["genre"];

export async function createArtist(formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }
  const log = withUserContext(logger, userId);

  if (!(await canCreate())) {
    throw new Error("Unauthorized: You don't have permission to create artists");
  }

  // Validate form data
  const rawData = {
    bio: formData.get("bio") as string,
    email: formData.get("email") as string | undefined,
    genre: formData.get("genre") as string,
    image: formData.get("image") as string | undefined,
    instagram: formData.get("instagram") as string | undefined,
    location: formData.get("location") as string,
    name: formData.get("name") as string,
    phoneNumber: formData.get("phoneNumber") as string | undefined,
    slug: formData.get("slug") as string | undefined,
    spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
    spotifyUrl: formData.get("spotifyUrl") as string | undefined,
    tiktok: formData.get("tiktok") as string | undefined,
    twitter: formData.get("twitter") as string | undefined,
    website: formData.get("website") as string | undefined,
  };

  const validationResult = artistSchema.safeParse(rawData);

  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((e) => e.message).join(", "));
  }

  const validatedData = validationResult.data;
  const slugInput = validatedData.slug;
  const inviteArtist = formData.get("inviteArtist") === "true";

  const slug = await ensureUniqueSlug(
    slugInput || generateSlug(validatedData.name),
    undefined,
    "artists",
  );

  // Insert artist into database
  const [artist] = await db
    .insert(artists)
    .values({
      bio: validatedData.bio,
      email: validatedData.email || null,
      genre: validatedData.genre as ArtistGenre,
      image: validatedData.image || null,
      instagram: validatedData.instagram || null,
      location: validatedData.location,
      name: validatedData.name,
      phoneNumber: validatedData.phoneNumber || null,
      slug,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      spotifyUrl: validatedData.spotifyUrl || null,
      tiktok: validatedData.tiktok || null,
      twitter: validatedData.twitter || null,
      website: validatedData.website || null,
    })
    .returning();

  // If invitation is requested and email is provided, send invitation
  if (inviteArtist && validatedData.email) {
    const client = await clerkClient();
    try {
      await client.invitations.createInvitation({
        emailAddress: validatedData.email,
        publicMetadata: {
          artistId: artist.id.toString(),
          role: "artist",
        },
        redirectUrl: buildInvitationRedirectUrl(`/sign-up?role=artist&artistId=${artist.id}`),
      });
    } catch (error) {
      withOperationContext(log, "send_artist_invitation", "artist", artist.id).error(
        { artistId: artist.id, error: sanitizeError(error) },
        "Failed to send artist invitation",
      );
      // Continue even if invitation fails - artist is already created
    }
  }

  revalidateTag("artists", "max");
  revalidatePath("/admin/artists");
  redirect("/admin/artists");
}

export async function updateArtist(id: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
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
    bio: formData.get("bio") as string,
    email: formData.get("email") as string | undefined,
    genre: formData.get("genre") as string,
    image: formData.get("image") as string | undefined,
    instagram: formData.get("instagram") as string | undefined,
    location: formData.get("location") as string,
    name: formData.get("name") as string,
    phoneNumber: formData.get("phoneNumber") as string | undefined,
    slug: formData.get("slug") as string | undefined,
    spotifyArtistId: formData.get("spotifyArtistId") as string | undefined,
    spotifyUrl: formData.get("spotifyUrl") as string | undefined,
    tiktok: formData.get("tiktok") as string | undefined,
    twitter: formData.get("twitter") as string | undefined,
    website: formData.get("website") as string | undefined,
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
      bio: validatedData.bio,
      email: validatedData.email || null,
      genre: validatedData.genre as ArtistGenre,
      image: validatedData.image || null,
      instagram: validatedData.instagram || null,
      location: validatedData.location,
      name: validatedData.name,
      phoneNumber: validatedData.phoneNumber || null,
      slug,
      spotifyArtistId: validatedData.spotifyArtistId || null,
      spotifyUrl: validatedData.spotifyUrl || null,
      tiktok: validatedData.tiktok || null,
      twitter: validatedData.twitter || null,
      updatedAt: new Date(),
      website: validatedData.website || null,
    })
    .where(eq(artists.id, id));

  revalidateTag("artists", "max");
  revalidatePath("/admin/artists");
  revalidatePath(`/admin/artists/${id}`);
  redirect("/admin/artists");
}

export async function inviteArtistToClaim(artistId: number, email: string) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
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
      publicMetadata: {
        artistId: artistId.toString(),
        role: "artist",
      },
      redirectUrl: buildInvitationRedirectUrl(`/sign-up?role=artist&artistId=${artistId}`),
    });

    // Update artist email if different
    if (email !== artist.email) {
      await db.update(artists).set({ email }).where(eq(artists.id, artistId));
    }

    revalidateTag("artists", "max");
    revalidatePath("/admin/artists");
    return { success: true };
  } catch (error) {
    return { error: getErrorMessage(error, "Failed to send artist invitation"), success: false };
  }
}

export async function deleteArtist(id: number) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can delete artists");
  }

  await db.delete(artists).where(eq(artists.id, id));

  revalidateTag("artists", "max");
  revalidatePath("/admin/artists");
}

export async function mergeArtistRecords(sourceArtistId: number, formData: FormData) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await canDelete())) {
    throw new Error("Unauthorized: Only super admins can merge artists");
  }

  const targetArtistId = Number.parseInt(String(formData.get("targetArtistId") ?? ""), 10);
  if (!Number.isInteger(targetArtistId) || targetArtistId <= 0) {
    throw new Error("Choose a valid artist to merge into");
  }
  if (sourceArtistId === targetArtistId) {
    throw new Error("Choose a different artist to merge into");
  }

  await db.transaction(async (tx) => {
    const records = await tx
      .select()
      .from(artists)
      .where(inArray(artists.id, [sourceArtistId, targetArtistId]));
    const sourceArtist = records.find((artist) => artist.id === sourceArtistId);
    const targetArtist = records.find((artist) => artist.id === targetArtistId);

    if (!sourceArtist || !targetArtist) {
      throw new Error("One or both artists could not be found");
    }

    const [sourcePostRelations, targetPostRelations, sourceEventRelations, targetEventRelations] =
      await Promise.all([
        tx
          .select({ postId: postArtists.postId })
          .from(postArtists)
          .where(eq(postArtists.artistId, sourceArtistId)),
        tx
          .select({ postId: postArtists.postId })
          .from(postArtists)
          .where(eq(postArtists.artistId, targetArtistId)),
        tx
          .select({ eventId: eventArtists.eventId })
          .from(eventArtists)
          .where(eq(eventArtists.artistId, sourceArtistId)),
        tx
          .select({ eventId: eventArtists.eventId })
          .from(eventArtists)
          .where(eq(eventArtists.artistId, targetArtistId)),
      ]);

    const targetPostIds = new Set(targetPostRelations.map((relation) => relation.postId));
    const missingPostRelations = sourcePostRelations
      .filter((relation) => !targetPostIds.has(relation.postId))
      .map((relation) => ({ artistId: targetArtistId, postId: relation.postId }));
    if (missingPostRelations.length > 0) {
      await tx.insert(postArtists).values(missingPostRelations);
    }

    const targetEventIds = new Set(targetEventRelations.map((relation) => relation.eventId));
    const missingEventRelations = sourceEventRelations
      .filter((relation) => !targetEventIds.has(relation.eventId))
      .map((relation) => ({ artistId: targetArtistId, eventId: relation.eventId }));
    if (missingEventRelations.length > 0) {
      await tx.insert(eventArtists).values(missingEventRelations);
    }

    await tx.delete(postArtists).where(eq(postArtists.artistId, sourceArtistId));
    await tx.delete(eventArtists).where(eq(eventArtists.artistId, sourceArtistId));

    await tx
      .update(artists)
      .set({
        bio:
          targetArtist.bio && targetArtist.bio !== "Profile pending update."
            ? targetArtist.bio
            : sourceArtist.bio,
        claimed: targetArtist.claimed || sourceArtist.claimed,
        claimedById: targetArtist.claimedById || sourceArtist.claimedById,
        email: targetArtist.email || sourceArtist.email,
        image: targetArtist.image || sourceArtist.image,
        instagram: targetArtist.instagram || sourceArtist.instagram,
        phoneNumber: targetArtist.phoneNumber || sourceArtist.phoneNumber,
        profileViews: targetArtist.profileViews + sourceArtist.profileViews,
        spotifyArtistId: targetArtist.spotifyArtistId || sourceArtist.spotifyArtistId,
        spotifyUrl: targetArtist.spotifyUrl || sourceArtist.spotifyUrl,
        tiktok: targetArtist.tiktok || sourceArtist.tiktok,
        twitter: targetArtist.twitter || sourceArtist.twitter,
        updatedAt: new Date(),
        website: targetArtist.website || sourceArtist.website,
      })
      .where(eq(artists.id, targetArtistId));

    await tx.delete(artists).where(eq(artists.id, sourceArtistId));
  });

  revalidateTag("artists", "max");
  revalidateTag("posts", "max");
  revalidatePath("/admin/artists");
}
