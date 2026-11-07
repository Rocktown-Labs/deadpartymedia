import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { apiFetch } from "../lib/api";

interface EventListItem {
  artists: { id: number; image: string | null; name: string; slug: string }[];
  created_at: string;
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

interface EventsLoaderData {
  error: string | null;
  past: EventListItem[];
  upcoming: EventListItem[];
}

/**
 * Ported from apps/web/src/app/events/page.tsx: the loader reads both tabs'
 * data from the platform API (GET /music/events?status=upcoming|past) and
 * the tab switch is client-side.
 */
export const Route = createFileRoute("/events/")({
  component: EventsPage,
  head: () => ({
    meta: [{ title: "Events | Dead Party Media" }],
  }),
  loader: async (): Promise<EventsLoaderData> => {
    try {
      const [upcoming, past] = await Promise.all([
        apiFetch<{ results: EventListItem[] }>("/music/events?status=upcoming&limit=100"),
        apiFetch<{ results: EventListItem[] }>("/music/events?status=past&limit=100"),
      ]);
      return { error: null, past: past.results, upcoming: upcoming.results };
    } catch {
      return { error: "Failed to load events", past: [], upcoming: [] };
    }
  },
});

function EventsPage() {
  const { error, past, upcoming } = Route.useLoaderData();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const events = tab === "upcoming" ? upcoming : past;

  return (
    <main className="mx-auto max-w-4xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Events</h1>
      <p className="mb-8 text-sm text-gray-400">Served by the platform API (GET /music/events)</p>

      <div className="mb-8 flex gap-2">
        {(["upcoming", "past"] as const).map((item) => (
          <button
            className={
              tab === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-300 hover:border-white/30"
            }
            key={item}
            onClick={() => {
              setTab(item);
            }}
            type="button"
          >
            {item === "upcoming" ? "Upcoming" : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-gray-400">No events found.</p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li className="rounded-md border border-white/10 p-4" key={event.id}>
              <div className="flex items-baseline justify-between">
                <h2 className="font-bold">{event.title}</h2>
                <span className="text-sm text-[#7CFC00]">{event.date}</span>
              </div>
              <p className="text-sm text-gray-400">
                {event.venue} | {event.location}
                {event.time ? ` | ${event.time}` : ""}
                {event.price ? ` | ${event.price}` : ""}
              </p>
              {event.artists.length > 0 ? (
                <p className="mt-1 text-xs text-gray-500">
                  {event.artists.map((artist) => artist.name).join(", ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
