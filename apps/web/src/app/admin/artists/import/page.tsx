import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["admin"]["artists"]["import"].$get({ query: input.search }),
    ),
  );

import { createImportedArtistAction } from "./actions";
import { ArtistListImportClient } from "./artist-list-import-client";

export default function ArtistListImportPage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { existingArtists } = data;
  return (
    <ArtistListImportClient
      existingArtists={existingArtists}
      onCreateArtist={createImportedArtistAction}
    />
  );
}
