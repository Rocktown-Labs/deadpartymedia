import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowLeft, CalendarDays, Clock, MapPin, Sparkles, Ticket } from "lucide-react";
import { useMemo } from "react";
import {
  EventFilterBar,
  type EventSortOption,
  type EventTabOption,
} from "#/components/events/event-filter-bar.tsx";
import { PageTitleHeader } from "#/components/page-title-header.tsx";
import { listArtsEvents } from "#/lib/content.functions.ts";
import { createSeoMeta } from "#/lib/seo.ts";

export interface EventsSearch {
  q?: string;
  sort?: EventSortOption;
  tab?: EventTabOption;
}

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
  validateSearch: (search: Record<string, unknown>): EventsSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    sort:
      typeof search.sort === "string" && ["date_asc", "date_desc"].includes(search.sort)
        ? (search.sort as EventSortOption)
        : undefined,
    tab:
      typeof search.tab === "string" && ["upcoming", "weekend", "all", "past"].includes(search.tab)
        ? (search.tab as EventTabOption)
        : undefined,
  }),
});

function isUpcomingEvent(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${date}T00:00:00`) >= today;
}

function isThisWeekend(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday

  // Calculate Friday of current/upcoming weekend
  const friday = new Date(now);
  const daysUntilFriday = (5 - day + 7) % 7;
  friday.setDate(now.getDate() + (day === 5 || day === 6 || day === 0 ? 0 : daysUntilFriday));

  // Calculate Sunday night of that weekend
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + (day === 6 ? 1 : day === 0 ? 0 : 2));
  sunday.setHours(23, 59, 59, 999);

  return d >= friday && d <= sunday;
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
  const { q, sort, tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const activeTab: EventTabOption = tab ?? "upcoming";
  const activeSort: EventSortOption = sort ?? "date_asc";
  const searchQuery = q ?? "";

  const { allCount, pastCount, upcomingCount, weekendCount } = useMemo(() => {
    let upcoming = 0;
    let weekend = 0;
    let past = 0;

    for (const e of events) {
      if (isUpcomingEvent(e.date)) {
        upcoming += 1;
        if (isThisWeekend(e.date)) {
          weekend += 1;
        }
      } else {
        past += 1;
      }
    }

    return {
      allCount: events.length,
      pastCount: past,
      upcomingCount: upcoming,
      weekendCount: weekend,
    };
  }, [events]);

  const displayEvents = useMemo(() => {
    let filtered = events.filter((event) => {
      if (activeTab === "upcoming") {
        return isUpcomingEvent(event.date);
      }
      if (activeTab === "weekend") {
        return isUpcomingEvent(event.date) && isThisWeekend(event.date);
      }
      if (activeTab === "past") {
        return !isUpcomingEvent(event.date);
      }
      return true; // "all"
    });

    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.venue.toLowerCase().includes(term) ||
          e.location.toLowerCase().includes(term) ||
          e.description.toLowerCase().includes(term),
      );
    }

    filtered.sort((a, b) => {
      const timeA = new Date(`${a.date}T00:00:00`).getTime();
      const timeB = new Date(`${b.date}T00:00:00`).getTime();
      return activeSort === "date_asc" ? timeA - timeB : timeB - timeA;
    });

    return filtered;
  }, [events, activeTab, searchQuery, activeSort]);

  const handleSelectTab = (nextTab: EventTabOption) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: nextTab === "upcoming" ? undefined : nextTab,
      }),
    });
  };

  const handleSearchChange = (query: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        q: query.trim() ? query : undefined,
      }),
    });
  };

  const handleSelectSort = (nextSort: EventSortOption) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        sort: nextSort === "date_asc" ? undefined : nextSort,
      }),
    });
  };

  return (
    <main className="px-4 pb-24 pt-[calc(var(--navbar-offset)+1.5rem)] sm:px-6">
      <div className="container mx-auto max-w-7xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center text-[#7CFC00] text-xs font-black uppercase tracking-[0.2em] no-underline transition-transform duration-200 hover:text-[#a5ff43]"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Home
        </Link>

        <PageTitleHeader
          title="EVENTS"
          description="Gallery openings, pop-ups, markets, workshops, and Arkansas art nights worth leaving the house for."
        />

        {/* Cohesive Event Filter Bar */}
        <EventFilterBar
          activeTab={activeTab}
          searchQuery={searchQuery}
          activeSort={activeSort}
          totalCount={displayEvents.length}
          upcomingCount={upcomingCount}
          weekendCount={weekendCount}
          allCount={allCount}
          pastCount={pastCount}
          onSelectTab={handleSelectTab}
          onSearchChange={handleSearchChange}
          onSelectSort={handleSelectSort}
        />

        {displayEvents.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayEvents.map((event) => {
              const upcoming = isUpcomingEvent(event.date);
              return (
                <article
                  key={event.id}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-[#111111] transition-all duration-200 hover:border-[#7CFC00]"
                >
                  <div className="relative grid h-64 place-items-center overflow-hidden bg-black">
                    {event.image ? (
                      <Image
                        src={event.image}
                        alt={event.title}
                        width={640}
                        height={576}
                        className="size-full object-contain transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <CalendarDays className="size-16 text-neutral-700" />
                    )}
                    <div className="absolute right-3 top-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                          upcoming
                            ? "border border-[#7CFC00]/60 bg-black/80 text-[#7CFC00]"
                            : "border border-neutral-700 bg-neutral-900/90 text-neutral-400"
                        }`}
                      >
                        {upcoming ? "Upcoming" : "Past Event"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="mb-2 font-black text-xl text-white transition-colors hover:text-[#7CFC00]">
                      {event.title}
                    </h2>
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-neutral-400">
                      {event.description}
                    </p>

                    <div className="space-y-2 text-xs text-neutral-400">
                      <p className="flex items-center">
                        <MapPin className="mr-2 size-3.5 text-[#7CFC00]" />
                        {event.venue}, {event.location}
                      </p>
                      <p className="flex items-center">
                        <Clock className="mr-2 size-3.5 text-[#7CFC00]" />
                        {formatEventDate(event.date)}
                        {event.time ? ` at ${event.time}` : ""}
                      </p>
                      {event.price ? (
                        <p className="flex items-center">
                          <Ticket className="mr-2 size-3.5 text-[#7CFC00]" />
                          {event.price}
                        </p>
                      ) : null}
                    </div>

                    {event.ticketLink ? (
                      <a
                        href={event.ticketLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-6 inline-flex h-10 w-fit items-center rounded-lg border border-neutral-800 bg-[#161616] px-4 font-black text-white text-xs uppercase tracking-[0.16em] no-underline transition-all hover:border-[#7CFC00] hover:text-[#7CFC00] active:scale-95"
                      >
                        Event Link
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-[#101010]/90 px-6 py-16 text-center">
            <Sparkles className="mx-auto size-8 text-[#7CFC00]/60" />
            <h3 className="mt-4 font-black text-lg text-white">No Events Found</h3>
            <p className="mt-2 text-sm text-neutral-400">
              {searchQuery
                ? `No events match "${searchQuery}". Try a different keyword.`
                : `No ${activeTab === "past" ? "past archive" : activeTab === "weekend" ? "weekend" : "upcoming"} arts events are scheduled yet.`}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
