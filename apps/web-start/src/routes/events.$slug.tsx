import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { apiFetch, apiUrl } from "../lib/api";
import { getAbsoluteUrl, sanitizeDescription, toHeadParts } from "../lib/seo";

interface EventDetail {
  artists: { id: number; name: string; slug: string }[];
  date: string;
  description: string;
  genre: string;
  id: number;
  image: string | null;
  location: string;
  price: string | null;
  slug: string;
  ticket_link: string | null;
  time: string | null;
  title: string;
  venue: string;
}

/**
 * Ported from apps/web/src/app/events/[slug]/page.tsx.
 */
export const Route = createFileRoute("/events/$slug")({
  component: EventDetailPage,
  loader: async ({ params }) => {
    const event = await apiFetch<EventDetail>(`/music/events/${params.slug}`).catch(() => null);
    if (!event) {
      throw notFound();
    }
    return { event };
  },
  head: ({ loaderData }) => {
    const event = loaderData?.event;
    if (!event) {
      return { meta: [{ title: "Event Not Found | Dead Party Media" }] };
    }
    const eventDate = event.date ? new Date(event.date).toLocaleDateString() : "";
    const description = sanitizeDescription(
      event.description,
      `${event.title} - ${event.venue}, ${event.location}${eventDate ? ` on ${eventDate}` : ""}`,
    );
    return toHeadParts({
      canonical: getAbsoluteUrl(`/events/${event.slug}`),
      description,
      ogDescription: description,
      ogFallbackImage: event.image ?? undefined,
      ogImage: `${apiUrl()}/music/og/event/${event.slug}`,
      ogTitle: `${event.title} | Dead Party Media`,
      ogType: "article",
      ogUrl: getAbsoluteUrl(`/events/${event.slug}`),
      title: event.title,
    });
  },
});

function EventDetailPage() {
  const { event } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-3xl px-6 pt-24 pb-20">
      {event.image ? (
        <img
          alt={event.title}
          className="mb-6 w-full rounded-md border border-white/10"
          src={event.image}
        />
      ) : null}
      <p className="mb-1 text-sm text-[#7CFC00]">{event.date}</p>
      <h1 className="mb-2 text-4xl font-black">{event.title}</h1>
      <p className="mb-6 text-gray-400">
        {event.venue} | {event.location}
        {event.time ? ` | ${event.time}` : ""}
        {event.price ? ` | ${event.price}` : ""}
      </p>

      {event.artists.length > 0 ? (
        <p className="mb-6 text-gray-300">
          Lineup:{" "}
          {event.artists.map((artist, index) => (
            <span key={artist.id}>
              {index > 0 ? ", " : ""}
              <Link
                className="text-[#7CFC00] hover:underline"
                params={{ slug: artist.slug }}
                to="/artists/$slug"
              >
                {artist.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <div
        className="prose-invert max-w-none text-gray-200"
        dangerouslySetInnerHTML={{ __html: event.description }}
      />

      {event.ticket_link ? (
        <a
          className="mt-8 inline-block rounded-md border border-[#7CFC00]/40 px-4 py-2 text-[#7CFC00] hover:bg-[#7CFC00]/10"
          href={event.ticket_link}
          rel="noopener noreferrer"
          target="_blank"
        >
          Get tickets
        </a>
      ) : null}
    </main>
  );
}
