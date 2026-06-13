import { redirect } from "next/navigation";
import type { Route } from "next";
import { auth } from "@clerk/nextjs/server";
import { asc } from "drizzle-orm";
import { checkRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { createImportedArtistAction } from "./actions";
import { ArtistListImportClient } from "./artist-list-import-client";

export default async function ArtistListImportPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in" as Route);
  }

  if (!(await checkRole("super_admin"))) {
    redirect("/admin/artists" as Route);
  }

  const existingArtists = await db
    .select({
      genre: artists.genre,
      hidden: artists.hidden,
      id: artists.id,
      image: artists.image,
      location: artists.location,
      name: artists.name,
      slug: artists.slug,
      spotifyUrl: artists.spotifyUrl,
      website: artists.website,
    })
    .from(artists)
    .orderBy(asc(artists.name));

  return (
    <ArtistListImportClient
      existingArtists={existingArtists}
      onCreateArtist={createImportedArtistAction}
    />
  );
}
