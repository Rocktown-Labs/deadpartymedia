import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { ArtmakerDashboardShell } from "#/components/artmaker-dashboard-shell.tsx";
import { requireArtmakerDashboardUser } from "#/lib/artmakers.functions.ts";
import {
  listTaggedEventsForCurrentArtmaker,
  type TaggedEventListItem,
} from "#/lib/content.functions.ts";

export const Route = createFileRoute("/dashboard/events")({
  beforeLoad: () => requireArtmakerDashboardUser(),
  component: DashboardEvents,
  loader: () => listTaggedEventsForCurrentArtmaker(),
});

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDateParts(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return {
    day: day ? String(day) : "",
    month: month ? MONTHS[month - 1] : "",
    year: year ? String(year) : "",
  };
}

function TaggedEventCard({ event }: { event: TaggedEventListItem }) {
  const { day, month, year } = formatDateParts(event.date);

  return (
    <article className="flex gap-4 rounded-xl border border-gray-800 bg-[#111111] p-4 sm:items-center">
      <div className="grid w-16 shrink-0 place-items-center rounded-lg border border-[#7CFC00]/30 bg-[#0A0A0A] px-2 py-3 text-center">
        <span className="font-black text-[#7CFC00] text-lg leading-none">{day}</span>
        <span className="mt-1 text-gray-400 text-xs uppercase tracking-wider">{month}</span>
        <span className="text-gray-600 text-[10px]">{year}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-white">{event.title}</h3>
        <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-gray-400 text-sm">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" />
            {event.venue}
          </span>
          {event.time ? <span>{event.time}</span> : null}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            to="/events"
            className="text-[#7CFC00] text-xs font-bold uppercase tracking-wider no-underline hover:underline"
          >
            View event
          </Link>
          {event.ticketLink ? (
            <a
              href={event.ticketLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gray-400 text-xs font-bold uppercase tracking-wider no-underline hover:text-[#7CFC00]"
            >
              <Ticket className="size-3.5" />
              Tickets
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function DashboardEvents() {
  const events = Route.useLoaderData();
  const upcoming = events.filter((event) => event.upcoming);
  const past = events.filter((event) => !event.upcoming).reverse();

  return (
    <ArtmakerDashboardShell>
      <div className="mb-8">
        <h1 className="font-black text-4xl tracking-tight">Events</h1>
        <p className="mt-3 max-w-2xl text-gray-400">
          Where your work is showing up — gallery nights, pop-ups, and markets that feature you.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-gray-800 bg-[#111111] p-10 text-center">
          <CalendarDays className="mx-auto size-12 text-[#7CFC00]" />
          <h2 className="mt-5 font-black text-2xl">Nothing on the calendar yet</h2>
          <p className="mx-auto mt-3 max-w-md text-gray-400">
            When we publish an event that includes you, it appears here automatically. In the
            meantime, keep making — we'll spread the word.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 font-bold text-sm text-gray-400 uppercase tracking-wider">
              Upcoming ({upcoming.length})
            </h2>
            {upcoming.length === 0 ? (
              <p className="rounded-xl border border-gray-800 bg-[#111111] p-5 text-gray-500">
                No upcoming shows right now — past appearances are listed below.
              </p>
            ) : (
              <div className="grid gap-3">
                {upcoming.map((event) => (
                  <TaggedEventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
          {past.length > 0 ? (
            <section>
              <h2 className="mb-3 font-bold text-sm text-gray-400 uppercase tracking-wider">
                Past ({past.length})
              </h2>
              <div className="grid gap-3">
                {past.map((event) => (
                  <TaggedEventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </ArtmakerDashboardShell>
  );
}
