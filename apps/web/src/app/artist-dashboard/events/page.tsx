"use client"

import { useCurrentUserArtist, useArtistEvents } from "@/lib/api/artists"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty"
import { Calendar, MapPin, ExternalLink } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"

export default function ArtistEventsPage() {
  const { data: artist, isLoading: artistLoading } = useCurrentUserArtist()
  const { data: events, isLoading: eventsLoading } = useArtistEvents(artist?.slug || "")

  const isLoading = artistLoading || eventsLoading

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <Skeleton className="h-10 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">My Events</h1>
              <p className="text-gray-400">Events featuring your artist profile</p>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Calendar className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>No artist profile found</EmptyTitle>
                <EmptyDescription>
                  You need to claim or create an artist profile first.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </main>
      </div>
    )
  }

  const eventsArray = Array.isArray(events) ? events : []

  if (eventsArray.length === 0) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <main className="pt-40 pb-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="mb-8">
              <h1 className="text-4xl font-black mb-2">My Events</h1>
              <p className="text-gray-400">Events featuring {artist.name}</p>
            </div>
            <Empty>
              <EmptyHeader>
                <EmptyMedia>
                  <Calendar className="w-12 h-12 text-gray-400" />
                </EmptyMedia>
                <EmptyTitle>No events yet</EmptyTitle>
                <EmptyDescription>
                  Events featuring your artist profile will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <main className="pt-40 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black mb-2">My Events</h1>
            <p className="text-gray-400">Events featuring {artist.name} ({eventsArray.length})</p>
          </div>

          <div className="space-y-4">
            {eventsArray.map((event) => (
              <div
                key={event.id}
                className="bg-[#111111] border border-gray-800 rounded-lg p-6 hover:border-[#7CFC00] transition-colors"
              >
                <div className="flex gap-4">
                  {event.image && (
                    <div className="relative w-32 h-32 shrink-0 rounded-lg overflow-hidden">
                      <Image
                        src={event.image}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <Link href={`/events/${event.slug}`}>
                        <h3 className="text-xl font-semibold text-white hover:text-[#7CFC00] transition-colors line-clamp-2">
                          {event.title}
                        </h3>
                      </Link>
                    </div>
                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {format(new Date(event.date), "PPP")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{event.venue} - {event.location}</span>
                      </div>
                      {event.ticket_link && (
                        <a
                          href={event.ticket_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[#7CFC00] hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Get Tickets</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

