import { ArtistForm } from "@/components/admin/artist-form";
import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
import { createArtist } from "../actions";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["artists"]["new"].$get({ query: input.search }),
    ),
  );

export default function NewArtistPage(_props: { data: Awaited<ReturnType<typeof loadPage>> }) {
  return (
    <div>
      <h1 className="text-3xl font-black mb-8">Create New Artist</h1>
      <ArtistForm onSubmit={createArtist} cancelHref={"/admin/artists"} />
    </div>
  );
}
