import { Link, createFileRoute } from "@tanstack/react-router";
import { apiFetchWithAuth } from "../lib/api";

interface MyArtist {
  bio: string | null;
  genre: string;
  id: number;
  image: string | null;
  instagram: string | null;
  location: string | null;
  name: string;
  slug: string;
}

interface MyArticle {
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
}

interface MyEvent {
  date: string;
  id: number;
  slug: string;
  title: string;
  venue: string;
}

/**
 * Ported from apps/web/src/app/artist-dashboard/page.tsx: the artist's
 * profile, their articles, and their events in one loader (parallel).
 */
export const Route = createFileRoute("/artist-dashboard/")({
  component: ArtistDashboardIndex,
  head: () => ({ meta: [{ title: "Artist Dashboard | Dead Party Media" }] }),
  loader: async ({ context }) => {
    const artist = context.artist as MyArtist | null;
    if (!artist) {
      return { articles: [] as MyArticle[], artist: null, events: [] as MyEvent[] };
    }
    const [articles, events] = await Promise.all([
      apiFetchWithAuth<{ results: MyArticle[] }>(
        `/music/artists/${encodeURIComponent(artist.slug)}/articles?limit=5`,
      ).catch(() => ({ results: [] as MyArticle[] })),
      apiFetchWithAuth<{ results: MyEvent[] }>(
        `/music/artists/${encodeURIComponent(artist.slug)}/events?limit=5`,
      ).catch(() => ({ results: [] as MyEvent[] })),
    ]);
    return { articles: articles.results, artist, events: events.results };
  },
});

function ArtistDashboardIndex() {
  const { articles, artist, events } = Route.useLoaderData();

  if (!artist) {
    return (
      <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
        <h1 className="mb-2 text-3xl font-black">Artist Dashboard</h1>
        <p className="text-gray-400">
          Super admin preview — no claimed artist profile on this account.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <div className="mb-8 flex items-center gap-4">
        {artist.image ? (
          <img
            alt={artist.name}
            className="h-16 w-16 rounded-full border border-[#7CFC00]/30 object-cover"
            src={artist.image}
          />
        ) : null}
        <div>
          <h1 className="text-3xl font-black">{artist.name}</h1>
          <p className="text-sm text-gray-400">
            {artist.genre}
            {artist.location ? ` | ${artist.location}` : ""}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xl font-bold">Your events</h2>
          {events.length === 0 ? (
            <p className="text-sm text-gray-400">No events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => (
                <li className="rounded-md border border-white/10 px-4 py-2 text-sm" key={event.id}>
                  <span className="text-[#7CFC00]">{event.date}</span> — {event.title} @{" "}
                  {event.venue}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">Articles about you</h2>
          {articles.length === 0 ? (
            <p className="text-sm text-gray-400">No coverage yet.</p>
          ) : (
            <ul className="space-y-2">
              {articles.map((article) => (
                <li key={article.id}>
                  <Link
                    className="font-semibold hover:text-[#7CFC00]"
                    params={{ slug: article.slug }}
                    to="/article/$slug"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
