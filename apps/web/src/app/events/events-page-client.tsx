"use client";

import { useState } from "react";
import { ArrowLeft, MapPin, Clock, Table as TableIcon, LayoutGrid, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEvents } from "@/lib/api/events";
import { isActiveEventDate, isPastEventDateKey } from "@/lib/events/date-state";
import { PageTitleHeader } from "@/components/page-title-header";
import { ShowsTable } from "@/components/events/shows-table";
import { SubmitShowModal } from "@/components/events/submit-show-modal";
import { cn } from "@/lib/utils";

export default function EventsPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [gridTab, setGridTab] = useState<"upcoming" | "past">("upcoming");
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const { data: events, isLoading } = useEvents();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl font-mono text-zinc-400">Loading Arkansas Shows...</div>
      </div>
    );
  }

  const allEvents = events || [];
  const upcomingEvents = allEvents.filter((event) => isActiveEventDate(event.date));
  const pastEvents = allEvents.filter((event) => isPastEventDateKey(event.date));
  const gridDisplayEvents = gridTab === "upcoming" ? upcomingEvents : pastEvents;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20">
        <div className="container mx-auto px-6">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8 transition-all duration-300 transform hover:scale-110"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <PageTitleHeader
              title="LIVE SHOWS & CONCERTS"
              description="Discover upcoming shows, house gigs, and past archives across Arkansas"
            />

            <div className="flex items-center gap-3 shrink-0">
              {/* View Mode Toggle */}
              <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
                <button
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer",
                    viewMode === "table"
                      ? "bg-[#7CFC00] text-black"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  Table View
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer",
                    viewMode === "grid"
                      ? "bg-[#7CFC00] text-black"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Flyer Grid
                </button>
              </div>

              {/* Submit a Show Button */}
              <button
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold uppercase tracking-wider text-xs rounded-lg transition-colors shadow-lg cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Submit a Show
              </button>
            </div>
          </div>

          {/* Table View (TanStack Table) */}
          {viewMode === "table" && (
            <div className="space-y-4">
              <ShowsTable
                events={allEvents}
                compact={false}
                showFilters={true}
                onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
              />
              <p className="text-xs text-zinc-500 font-mono text-center">
                Shows are ordered recent to least. Past dates remain accessible and are struck through.
              </p>
            </div>
          )}

          {/* Flyer Grid View */}
          {viewMode === "grid" && (
            <div>
              {/* Tabs for Grid */}
              <div className="flex gap-4 mb-8 border-b border-zinc-800">
                <button
                  onClick={() => setGridTab("upcoming")}
                  className={cn(
                    "px-6 py-3 font-bold transition-colors cursor-pointer",
                    gridTab === "upcoming"
                      ? "border-b-2 border-[#7CFC00] text-[#7CFC00]"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Upcoming ({upcomingEvents.length})
                </button>
                <button
                  onClick={() => setGridTab("past")}
                  className={cn(
                    "px-6 py-3 font-bold transition-colors cursor-pointer",
                    gridTab === "past"
                      ? "border-b-2 border-[#7CFC00] text-[#7CFC00]"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Past Archive ({pastEvents.length})
                </button>
              </div>

              {gridDisplayEvents.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {gridDisplayEvents.map((event) => (
                    <Link key={event.id} href={`/events/${event.slug}`}>
                      <article className="bg-[#111111] border border-zinc-800 rounded-xl overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer h-full flex flex-col group">
                        <div className="relative h-72 overflow-hidden bg-black">
                          <Image
                            src={event.image || "/placeholder.svg"}
                            alt={event.title}
                            fill
                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#7CFC00] mb-2 block">
                            {event.genre}
                          </span>
                          <h3 className="text-xl font-black mb-3 line-clamp-2 group-hover:text-[#7CFC00] transition-colors">
                            {event.title}
                          </h3>
                          <div className="space-y-2 mb-4 text-sm text-zinc-400">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-2 text-zinc-500" />
                              {event.venue}, {event.location}
                            </div>
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2 text-zinc-500" />
                              {new Date(event.date).toLocaleDateString()} at {event.time}
                            </div>
                          </div>
                          {event.artists && event.artists.length > 0 && (
                            <div className="mt-auto pt-4 border-t border-zinc-800">
                              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                                Featuring
                              </p>
                              <p className="text-sm text-zinc-300 line-clamp-2 font-medium">
                                {event.artists.map((artist) => artist.name).join(", ")}
                              </p>
                            </div>
                          )}
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 bg-zinc-950 rounded-xl border border-zinc-800 p-8 space-y-4">
                  <p className="text-zinc-400 text-base">
                    No upcoming shows in the flyer view right now.
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => setViewMode("table")}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-white hover:border-[#7CFC00] rounded-lg text-xs font-bold uppercase tracking-wider"
                    >
                      Switch to Table View
                    </button>
                    <button
                      onClick={() => setIsSubmitModalOpen(true)}
                      className="px-4 py-2 bg-[#7CFC00] text-black font-bold uppercase tracking-wider rounded-lg text-xs"
                    >
                      Submit a Show
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Show Modal */}
          <SubmitShowModal
            isOpen={isSubmitModalOpen}
            onClose={() => setIsSubmitModalOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}
