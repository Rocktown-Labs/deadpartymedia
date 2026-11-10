import { getMusicApi } from "@/lib/api.server";
import { readResponse } from "@dpmedia/api-client";
import { createServerFn } from "@tanstack/react-start";
export const loadPage = createServerFn({ method: "GET" })
  .validator((input: { params: Record<string, string>; search: Record<string, string> }) => input)
  .handler(async ({ data: input }) =>
    readResponse(
      await getMusicApi().pages["artist-dashboard"]["releases"]["new"].$get({
        query: input.search,
      }),
    ),
  );

import { submitArtistRelease } from "../actions";
import { ArtistReleaseForm } from "./artist-release-form";

export default function NewArtistReleasePage({
  data,
}: {
  data: Awaited<ReturnType<typeof loadPage>>;
}) {
  const { artist } = data;
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-36 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black mb-2">Submit Music Release</h1>
            <p className="text-zinc-400 text-sm">
              Submit your new single, EP, or album to Dead Party Media for review, editorial
              feature, and playlist inclusion.
            </p>
          </div>

          <ArtistReleaseForm
            artistName={artist?.name || "Independent Artist"}
            artistGenre={artist?.genre || "HARDCORE & ROCK"}
            onSubmit={submitArtistRelease}
            cancelHref={"/artist-dashboard/releases"}
          />
        </div>
      </main>
    </div>
  );
}
