import { ArtistForm } from "@/components/admin/artist-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { updateArtist } from "../actions";
import { InviteArtistButton } from "./invite-artist-button";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["artists"][":id"].$get({
        param: { id: input.params.id },
        query: input.search,
      }),
    ),
  );

export default function EditArtistPage({ data }: { data: Awaited<ReturnType<typeof loadPage>> }) {
  const { artistId, artist } = data;
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
        cancelHref={"/admin/artists"}
      />
    </div>
  );
}
