import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface LoaderData {
  artists: ArtistListItem[];
  error: string | null;
}

const GENRES = ["ALL", "COUNTRY", "EDM", "HARDCORE & ROCK", "HIP-HOP & R&B", "OTHER"] as const;

/**
 * Ported from apps/web/src/app/artists/artists-page-client.tsx — the visual
 * parity pass uses the shadcn card grid with genre filter pills and
 * artist profile cards with cover images.
 */
export const Route = createFileRoute("/artists/")({
  component: ArtistsPage,
  head: () => ({ meta: [{ title: "Artists | Dead Party Media" }] }),
  loader: async (): Promise<LoaderData> => {
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
  const [genre, setGenre] = useState<(typeof GENRES)[number]>("ALL");

  const filtered = genre === "ALL" ? artists : artists.filter((artist) => artist.genre === genre);

  return (
    <main className="mx-auto max-w-5xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Artists</h1>
      <p className="mb-8 text-sm text-gray-400">
        The Arkansas music directory — every genre, every artist
      </p>

      <div className="mb-8 flex flex-wrap gap-2">
        {GENRES.map((item) => (
          <button
            className={
              genre === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm font-medium text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/30"
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
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((artist) => (
            <li key={artist.id}>
              <Card className="h-full overflow-hidden border-white/10 bg-zinc-950 transition-colors hover:border-[#7CFC00]/40">
                {artist.image ? (
                  <div className="aspect-square overflow-hidden">
                    <img
                      alt={artist.name}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      src={artist.image}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <span className="text-4xl font-black text-white/10">
                      {artist.name.charAt(0)}
                    </span>
                  </div>
                )}
                <CardContent className="p-4">
                  <Badge className="mb-2 bg-[#7CFC00]/10 text-[#7CFC00]" variant="secondary">
                    {artist.genre}
                  </Badge>
                  <h2 className="mb-1 font-bold leading-tight">{artist.name}</h2>
                  {artist.location ? (
                    <p className="text-xs text-gray-500">{artist.location}</p>
                  ) : null}
                  {artist.bio ? (
                    <p className="mt-2 line-clamp-2 text-xs text-gray-400">{artist.bio}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-gray-600">
                    {artist.article_count} articles | {artist.event_count} events
                    {artist.claimed ? " | ✓ claimed" : ""}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
