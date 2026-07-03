import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtsEvents } from "#/lib/content.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () =>
    createSeoMeta({
      description:
        "Find Arkansas visual art events, gallery nights, pop-ups, markets, workshops, and creative gatherings from Dead Party Arts.",
      path: "/events",
      title: "Events",
    }),
  loader: () => listArtsEvents(),
});

function isUpcomingEvent(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) >= today;
}

function formatEventDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EventsPage() {
  const events = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { pastEvents, upcomingEvents } = useMemo(
    () => ({
      pastEvents: events.filter((event) => !isUpcomingEvent(event.date)),
      upcomingEvents: events.filter((event) => isUpcomingEvent(event.date)),
    }),
    [events],
  );

  const displayEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

  return (
    <main className="px-6 pt-[calc(var(--navbar-offset)+2rem)] pb-20">
      <div className="container mx-auto">
        <Link
          to="/"
          className="mb-8 inline-flex items-center text-[#7CFC00] no-underline transition-transform duration-300 hover:scale-105 hover:text-[#7CFC00]/80"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Home
        </Link>

        <PageTitleHeader
          title="EVENTS"
          description="Gallery openings, pop-ups, markets, workshops, and Arkansas art nights worth leaving the house for."
        />

        <div className="mb-8 flex gap-4 border-gray-800 border-b">
          {(["upcoming", "past"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-bold capitalize transition-colors ${
                activeTab === tab
                  ? "border-[#7CFC00] border-b-2 text-[#7CFC00]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab} ({tab === "upcoming" ? upcomingEvents.length : pastEvents.length})
            </button>
          ))}
        </div>

        {displayEvents.length > 0 ? (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayEvents.map((event) => (
              <article
                key={event.id}
                className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-800 bg-[#111111] transition-all duration-300 hover:border-[#7CFC00]"
              >
                <div className="relative grid h-72 place-items-center overflow-hidden bg-black">
                  {event.image ? (
                    <Image
                      src={event.image}
                      alt={event.title}
                      width={640}
                      height={576}
                      className="h-full w-full object-contain transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <CalendarDays className="size-16 text-gray-700" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h2 className="mb-2 font-black text-xl transition-colors hover:text-[#7CFC00]">
                    {event.title}
                  </h2>
                  <p className="mb-4 line-clamp-3 text-gray-400 text-sm leading-6">
                    {event.description}
                  </p>
                  <div className="space-y-2 text-gray-400 text-sm">
                    <p className="flex items-center">
                      <MapPin className="mr-2 size-4" />
                      {event.venue}, {event.location}
                    </p>
                    <p className="flex items-center">
                      <Clock className="mr-2 size-4" />
                      {formatEventDate(event.date)}
                      {event.time ? ` at ${event.time}` : ""}
                    </p>
                    {event.price ? (
                      <p className="flex items-center">
                        <Ticket className="mr-2 size-4" />
                        {event.price}
                      </p>
                    ) : null}
                  </div>
                  {event.ticketLink ? (
                    <a
                      href={event.ticketLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-flex h-11 w-fit items-center rounded-lg border border-gray-800 px-4 font-black text-white text-xs uppercase tracking-[0.18em] no-underline transition-colors hover:border-[#7CFC00] hover:text-[#7CFC00]"
                    >
                      Event Link
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-800 bg-[#111111] px-6 py-12 text-center">
            <p className="text-gray-400 text-lg">
              No {activeTab === "upcoming" ? "upcoming" : "past"} arts events are published yet.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
