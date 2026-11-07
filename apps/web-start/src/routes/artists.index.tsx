import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "../lib/api";

interface ArtistListItem {
  article_count: number;
  bio: string | null;
  claimed: boolean;
  event_count: number;
  genre: string;
  id: number;
  image: string | null;
  location: string | null;
  name: string;
  slug: string;
}

interface ArtistsLoaderData {
  artists: ArtistListItem[];
  error: string | null;
}

const GENRES = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

/**
 * Ported from apps/web/src/app/artists/page.tsx: the Next page passes API
 * data to a client component; here the loader reads the platform API
 * (GET /music/artists) and genre filtering is client-side.
 */
export const Route = createFileRoute("/artists/")({
  component: ArtistsPage,
  head: () => ({
    meta: [{ title: "Artists | Dead Party Media" }],
  }),
  loader: async (): Promise<ArtistsLoaderData> => {
    try {
      const artists = await apiFetch<ArtistListItem[]>(
        "/music/artists?limit=48&sort=name&order=asc",
      );
      return { artists, error: null };
    } catch {
      return { artists: [], error: "Failed to load artists" };
    }
  },
});

function ArtistsPage() {
  const { artists, error } = Route.useLoaderData();
  const [genre, setGenre] = useState<"ALL" | (typeof GENRES)[number]>("ALL");

  const filtered = genre === "ALL" ? artists : artists.filter((artist) => artist.genre === genre);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Artists</h1>
      <p className="mb-8 text-sm text-gray-400">Served by the platform API (GET /music/artists)</p>

      <div className="mb-8 flex flex-wrap gap-2">
        {GENRES.map((item) => (
          <button
            className={
              genre === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 hover:border-white/30"
            }
            key={item}
            onClick={() => {
              setGenre(item);
            }}
            type="button"
          >
            {item}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400">No artists found.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((artist) => (
            <li className="rounded-md border border-white/10 p-4" key={artist.id}>
              <h2 className="font-bold">{artist.name}</h2>
              <p className="text-xs text-[#7CFC00]">{artist.genre}</p>
              {artist.location ? <p className="text-sm text-gray-400">{artist.location}</p> : null}
              <p className="mt-2 text-xs text-gray-500">
                {artist.article_count} articles | {artist.event_count} events
                {artist.claimed ? " | claimed" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
