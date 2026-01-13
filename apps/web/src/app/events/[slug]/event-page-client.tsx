"use client";

import { ArrowLeft, MapPin, Clock, Calendar, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEvent } from "@/lib/api/events";
import { EventStructuredData } from "@/components/seo/structured-data";
import posthog from "posthog-js";

interface EventPageClientProps {
  slug: string;
}

export function EventPageClient({ slug }: EventPageClientProps) {
  const { data: event, isLoading } = useEvent(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events" className="text-[#7CFC00] hover:text-[#7CFC00]/80">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();

  return (
    <>
      <EventStructuredData event={event} />
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20">
          <div className="container mx-auto px-6 max-w-6xl">
            {/* Back Button */}
            <Link
              href="/events"
              className="inline-flex items-center text-[#7CFC00] hover:text-[#7CFC00]/80 mb-8"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Link>

            {/* Event Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-[#7CFC00] text-black text-sm font-medium rounded">
                  {event.genre}
                </span>
                {isPastEvent && (
                  <span className="px-3 py-1 bg-gray-800 text-gray-300 text-sm font-medium rounded">
                    Past Event
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-4">{event.title}</h1>
            </div>

            {/* Event Image */}
            {event.image && (
              <div className="relative h-96 md:h-[500px] rounded-lg overflow-hidden mb-8">
                <Image src={event.image} alt={event.title} fill className="object-cover" />
              </div>
            )}

            {/* Event Details Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {/* Main Content */}
              <div className="md:col-span-2">
                <div className="bg-[#111111] border border-gray-800 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-4">About This Event</h2>
                  <div
                    className="prose prose-invert max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: String(event.description || "") }}
                  />
                </div>

                {/* Featured Artists */}
                {event.artists && event.artists.length > 0 && (
                  <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
                    <h2 className="text-2xl font-bold mb-4">Featured Artists</h2>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {event.artists.map((artist) => (
                        <Link
                          key={artist.id}
                          href={`/artists/${artist.slug}`}
                          className="flex items-center gap-4 p-4 bg-[#0A0A0A] border border-gray-800 rounded-lg hover:border-[#7CFC00] transition-colors"
                        >
                          {artist.image && (
                            <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={artist.image}
                                alt={artist.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold hover:text-[#7CFC00] transition-colors">
                              {artist.name}
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Event Info Card */}
                <div className="bg-[#111111] border border-gray-800 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Event Details</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#7CFC00] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">
                          {eventDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-[#7CFC00] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{event.time}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#7CFC00] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{event.venue}</p>
                        <p className="text-sm text-gray-400">{event.location}</p>
                      </div>
                    </div>

                    {event.price && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Price</p>
                        <p className="font-medium text-[#7CFC00]">{event.price}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Link */}
                {event.ticket_link && (
                  <a
                    href={event.ticket_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-[#7CFC00] hover:bg-[#7CFC00]/90 text-black font-bold text-center py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    onClick={() => {
                      // Track event ticket clicked (conversion event)
                      posthog.capture("event_ticket_clicked", {
                        event_id: event.id,
                        event_slug: event.slug,
                        event_title: event.title,
                        event_date: event.date,
                        event_venue: event.venue,
                        event_location: event.location,
                        event_genre: event.genre,
                        event_price: event.price,
                        ticket_link: event.ticket_link,
                      });
                    }}
                  >
                    Get Tickets
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

