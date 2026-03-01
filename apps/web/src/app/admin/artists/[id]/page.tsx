import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { canCreate } from "@/lib/auth/access";
import { ArtistForm } from "@/components/admin/artist-form";
import { updateArtist } from "../actions";
import { InviteArtistButton } from "./invite-artist-button";
import type { Route } from "next";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artistId = Number.parseInt(id, 10);

  if (Number.isNaN(artistId)) {
    redirect("/admin/artists");
  }

  if (!(await canCreate())) {
    redirect("/admin/artists");
  }

  const [artist] = await db.select().from(artists).where(eq(artists.id, artistId)).limit(1);

  if (!artist) {
    redirect("/admin/artists");
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black">Edit Artist</h1>
        {!artist.claimed && artist.email && (
          <InviteArtistButton artistId={artist.id} email={artist.email} />
        )}
      </div>
      <ArtistForm
        initialData={{
          bio: artist.bio,
          email: artist.email || undefined,
          genre: artist.genre,
          image: artist.image || undefined,
          instagram: artist.instagram || undefined,
          location: artist.location,
          name: artist.name,
          phoneNumber: artist.phoneNumber || undefined,
          slug: artist.slug,
          spotifyArtistId: artist.spotifyArtistId || undefined,
          spotifyUrl: artist.spotifyUrl || undefined,
          tiktok: artist.tiktok || undefined,
          twitter: artist.twitter || undefined,
          website: artist.website || undefined,
        }}
        onSubmit={updateArtist.bind(null, artistId)}
        cancelHref={"/admin/artists" as Route}
      />
    </div>
  );
}
