import { createFileRoute } from "@tanstack/react-router";
import { apiFetch } from "../lib/api";

interface VenueEvent {
  date: string;
  id: number;
  slug: string;
  time: string | null;
  title: string;
  venue: string;
}

interface EventsLoaderData {
  error: string | null;
  events: VenueEvent[];
}

/**
 * Ported from apps/web/src/app/venue-dashboard/page.tsx: the venue's event
 * listings via the API's venue filter (GET /music/events?venue=<name>).
 */
export const Route = createFileRoute("/venue-dashboard/")({
  component: VenueDashboardIndex,
  head: () => ({ meta: [{ title: "Venue Dashboard | Dead Party Media" }] }),
  loader: async ({ context }): Promise<EventsLoaderData> => {
    const venue = context.venue as { name: string } | null;
    if (!venue) {
      return { error: null, events: [] };
    }
    try {
      const data = await apiFetch<{ results: VenueEvent[] }>(
        `/music/events?venue=${encodeURIComponent(venue.name)}&limit=100`,
      );
      return { error: null, events: data.results };
    } catch {
      return { error: "Failed to load venue events", events: [] };
    }
  },
});

function VenueDashboardIndex() {
  const { error, events } = Route.useLoaderData();
  const { venue } = Route.useRouteContext();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((event) => event.date >= today);
  const past = events.filter((event) => event.date < today);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-1 text-3xl font-black">
        {venue ? `${venue.name} Dashboard` : "Venue Dashboard"}
      </h1>
      <p className="mb-8 text-sm text-gray-400">
        Served by the platform API (GET /music/events?venue=…)
      </p>

      {!venue ? (
        <p className="rounded-md border border-yellow-500/40 px-4 py-3 text-sm text-yellow-400">
          No venue is linked to this account yet.
        </p>
      ) : error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xl font-bold">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing scheduled.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((event) => (
                  <li
                    className="rounded-md border border-white/10 px-4 py-2 text-sm"
                    key={event.id}
                  >
                    <span className="text-[#7CFC00]">{event.date}</span> — {event.title}
                    {event.time ? ` (${event.time})` : ""}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 text-xl font-bold">Past ({past.length})</h2>
            {past.length === 0 ? (
              <p className="text-sm text-gray-400">No past events.</p>
            ) : (
              <ul className="space-y-2">
                {past.map((event) => (
                  <li
                    className="rounded-md border border-white/10 px-4 py-2 text-sm"
                    key={event.id}
                  >
                    <span className="text-gray-500">{event.date}</span> — {event.title}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
