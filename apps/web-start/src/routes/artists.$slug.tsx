import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { apiFetch, apiUrl } from "../lib/api";
import { getAbsoluteUrl, sanitizeDescription, toHeadParts } from "../lib/seo";

interface ArtistDetail {
  bio: string | null;
  genre: string;
  id: number;
  image: string | null;
  location: string | null;
  name: string;
  slug: string;
  spotifyUrl: string | null;
  [key: string]: unknown;
}

interface ArtistArticle {
  excerpt: string;
  id: number;
  published_at: string | null;
  slug: string;
  title: string;
}

interface ArtistEvent {
  date: string;
  id: number;
  slug: string;
  title: string;
  venue: string;
}

/**
 * Ported from apps/web/src/app/artists/[slug]/page.tsx: generateMetadata ->
 * head() from loader data; the page client's data (profile + related
 * articles/events) is loaded in one parallel batch from the platform API.
 */
export const Route = createFileRoute("/artists/$slug")({
  component: ArtistDetailPage,
  loader: async ({ params }) => {
    const [artist, articles, events] = await Promise.all([
      apiFetch<ArtistDetail>(`/music/artists/${params.slug}`).catch(() => null),
      apiFetch<{ results: ArtistArticle[] }>(
        `/music/artists/${params.slug}/articles?limit=10`,
      ).catch(() => ({ results: [] as ArtistArticle[] })),
      apiFetch<{ results: ArtistEvent[] }>(`/music/artists/${params.slug}/events?limit=10`).catch(
        () => ({ results: [] as ArtistEvent[] }),
      ),
    ]);
    if (!artist) {
      throw notFound();
    }
    return { artist, articles: articles.results, events: events.results };
  },
  head: ({ loaderData }) => {
    const artist = loaderData?.artist;
    if (!artist) {
      return { meta: [{ title: "Artist Not Found | Dead Party Media" }] };
    }
    const description = sanitizeDescription(
      artist.bio,
      `Learn more about ${artist.name} on Dead Party Media`,
    );
    return toHeadParts({
      canonical: getAbsoluteUrl(`/artists/${artist.slug}`),
      description,
      ogDescription: description,
      ogFallbackImage: artist.image ?? undefined,
      ogImage: `${apiUrl()}/music/og/artist/${artist.slug}`,
      ogTitle: `${artist.name} | Dead Party Media`,
      ogType: "profile",
      ogUrl: getAbsoluteUrl(`/artists/${artist.slug}`),
      title: artist.name,
    });
  },
});

function ArtistDetailPage() {
  const { artist, articles, events } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      {artist.image ? (
        <img
          alt={artist.name}
          className="mb-6 h-40 w-40 rounded-full border border-[#7CFC00]/30 object-cover"
          src={artist.image}
        />
      ) : null}
      <p className="mb-1 text-sm text-[#7CFC00]">{artist.genre}</p>
      <h1 className="mb-2 text-4xl font-black">{artist.name}</h1>
      {artist.location ? <p className="mb-4 text-gray-400">{artist.location}</p> : null}
      {artist.bio ? <p className="mb-6 max-w-2xl text-gray-300">{artist.bio}</p> : null}
      {artist.spotifyUrl ? (
        <a
          className="mb-10 inline-block text-sm text-[#7CFC00] underline"
          href={artist.spotifyUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Listen on Spotify
        </a>
      ) : null}

      {events.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-bold">Upcoming & recent events</h2>
          <ul className="space-y-2">
            {events.map((event) => (
              <li className="text-sm text-gray-300" key={event.id}>
                <span className="text-[#7CFC00]">{event.date}</span> — {event.title} @ {event.venue}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section>
          <h2 className="mb-4 text-xl font-bold">Articles</h2>
          <ul className="space-y-3">
            {articles.map((article) => (
              <li key={article.id}>
                <Link
                  className="font-semibold hover:text-[#7CFC00]"
                  params={{ slug: article.slug }}
                  to="/article/$slug"
                >
                  {article.title}
                </Link>
                <p className="line-clamp-1 text-sm text-gray-500">{article.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
