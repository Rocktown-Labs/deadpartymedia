"use client";

import { useState } from "react";
import { ArrowLeft, MapPin, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEvents } from "@/lib/api/events";
import { isActiveEventDate, isPastEventDateKey } from "@/lib/events/date-state";
import { PageTitleHeader } from "@/components/page-title-header";

export default function EventsPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const { data: events, isLoading } = useEvents();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const upcomingEvents = (events || []).filter((event) => isActiveEventDate(event.date));
  const pastEvents = (events || []).filter((event) => isPastEventDateKey(event.date));

  const displayEvents = activeTab === "upcoming" ? upcomingEvents : pastEvents;

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

          <PageTitleHeader title="EVENTS" description="Discover upcoming shows and past events" />

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-800">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-6 py-3 font-bold transition-colors ${
                activeTab === "upcoming"
                  ? "border-b-2 border-[#7CFC00] text-[#7CFC00]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Upcoming ({upcomingEvents.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`px-6 py-3 font-bold transition-colors ${
                activeTab === "past"
                  ? "border-b-2 border-[#7CFC00] text-[#7CFC00]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Past ({pastEvents.length})
            </button>
          </div>

          {/* Events Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.slug}`}>
                <article className="bg-[#111111] border border-gray-800 rounded-lg overflow-hidden hover:border-[#7CFC00] transition-all duration-300 cursor-pointer h-full flex flex-col">
                  <div className="relative h-72 overflow-hidden bg-black">
                    <Image
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      fill
                      className="object-contain transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-black mb-2 line-clamp-2 hover:text-[#7CFC00] transition-colors">
                      {event.title}
                    </h3>
                    <div className="space-y-2 mb-4 text-sm text-gray-400">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {event.venue}, {event.location}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(event.date).toLocaleDateString()} at {event.time}
                      </div>
                    </div>
                    {event.artists && event.artists.length > 0 && (
                      <div className="mt-auto pt-4 border-t border-gray-800">
                        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
                          Featuring
                        </p>
                        <p className="min-h-[2.5rem] text-sm leading-5 text-gray-300 line-clamp-2">
                          {event.artists.map((artist) => artist.name).join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>

          {displayEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">
                No {activeTab === "upcoming" ? "upcoming" : "past"} events found.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
