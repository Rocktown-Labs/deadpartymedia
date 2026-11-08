import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "../lib/api";

interface EventListItem {
  artists: { id: number; image: string | null; name: string; slug: string }[];
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

interface LoaderData {
  error: string | null;
  past: EventListItem[];
  upcoming: EventListItem[];
}

/**
 * Ported from apps/web/src/app/events — the visual parity pass uses the
 * source's upcoming/past tab layout with event cards and the shows-table
 * date-first styling.
 */
export const Route = createFileRoute("/events/")({
  component: EventsPage,
  head: () => ({ meta: [{ title: "Events | Dead Party Media" }] }),
  loader: async (): Promise<LoaderData> => {
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
    <main className="mx-auto max-w-5xl px-6 pt-24 pb-20">
      <h1 className="mb-2 text-4xl font-black">Events</h1>
      <p className="mb-8 text-sm text-gray-400">Live music across Arkansas</p>

      <div className="mb-8 flex gap-2">
        {(["upcoming", "past"] as const).map((item) => (
          <button
            className={
              tab === item
                ? "rounded-full border border-[#7CFC00] bg-[#7CFC00]/10 px-4 py-1.5 text-sm font-medium text-[#7CFC00]"
                : "rounded-full border border-white/15 px-4 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-white/30"
            }
            key={item}
            onClick={() => {
              setTab(item);
            }}
            type="button"
          >
            {item === "upcoming" ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-4 py-3 text-red-400">{error}</p>
      ) : events.length === 0 ? (
        <p className="text-gray-400">
          {tab === "upcoming" ? "No upcoming shows right now." : "No past events."}
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                className="group flex items-start gap-4 rounded-lg border border-white/10 bg-zinc-950 p-4 transition-colors hover:border-[#7CFC00]/40"
                params={{ slug: event.slug }}
                to="/events/$slug"
              >
                <div className="flex w-20 shrink-0 flex-col items-center justify-center rounded-md bg-[#7CFC00]/10 py-2">
                  <Calendar className="h-4 w-4 text-[#7CFC00]" />
                  <span className="mt-1 font-mono text-xs font-bold text-[#7CFC00]">
                    {event.date}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold leading-tight group-hover:text-[#7CFC00]">
                    {event.title}
                  </h2>
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
                </div>
                <Badge className="shrink-0 bg-white/5 text-gray-400" variant="secondary">
                  {event.genre}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex items-center justify-center gap-4 border-t border-white/10 pt-8">
        <Link
          className="flex items-center gap-1 text-sm text-[#7CFC00] hover:underline"
          to="/venue-dashboard/events/new"
        >
          <ArrowRight className="h-3.5 w-3.5" /> Submit a show
        </Link>
      </div>
    </main>
  );
}
