import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "../lib/api";

interface MusicRelease {
  artistName: string;
  artistSlug: string | null;
  bandcampUrl: string | null;
  coverArt: string | null;
  createdAt: string;
  excerpt: string;
  featured: boolean;
  genre: string;
  id: number;
  releaseDate: string | null;
  releaseType: "Album" | "Single" | "EP";
  slug: string;
  spotifyUrl: string | null;
  title: string;
}

interface ReleasesLoaderData {
  error: string | null;
  releases: MusicRelease[];
}

const TYPES = ["ALL", "Album", "Single", "EP"] as const;

/**
 * Ported from apps/web/src/app/music/page.tsx: the loader reads the platform
 * API (GET /music/releases — the renamed /api/music resource) and the type
 * filter is client-side.
 */
export const Route = createFileRoute("/music/")({
  component: MusicPage,
  head: () => ({
    meta: [{ title: "Music | Dead Party Media" }],
  }),
  loader: async (): Promise<ReleasesLoaderData> => {
    try {
      const releases = await apiFetch<MusicRelease[]>("/music/releases?limit=100");
      return { error: null, releases };
    } catch {
      return { error: "Failed to load music releases", releases: [] };
    }
  },
});

function MusicPage() {
  const { error, releases } = Route.useLoaderData();
  const [type, setType] = useState<"ALL" | (typeof TYPES)[number]>("ALL");

  const filtered = type === "ALL" ? releases : releases.filter((item) => item.releaseType === type);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Music</h1>
      <p className="mb-8 text-sm text-gray-400">Served by the platform API (GET /music/releases)</p>

      <div className="mb-8 flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <button
            className={
              type === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 hover:border-white/30"
            }
            key={item}
            onClick={() => {
              setType(item);
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
        <p className="text-gray-400">No releases found.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filtered.map((release) => (
            <li className="rounded-md border border-white/10 p-4" key={release.id}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">{release.title}</h2>
                <span className="text-xs text-[#7CFC00]">{release.releaseType}</span>
              </div>
              <p className="text-sm text-gray-400">{release.artistName}</p>
              {release.releaseDate ? (
                <p className="text-xs text-gray-500">Released {release.releaseDate}</p>
              ) : null}
              {release.spotifyUrl ? (
                <a
                  className="mt-1 text-xs text-[#7CFC00] underline"
                  href={release.spotifyUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Listen on Spotify
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
