"use client"
import { getProducts } from "@/lib/fourthwall"
import HomepageClient from "@/components/homepage-client"
import { useArticles } from "@/lib/api/articles"
import { useEvents } from "@/lib/api/events"

export default function DeadPartyMedia() {
  const { data: articles } = useArticles()
  const { data: events } = useEvents()

  // This will be handled in the client component
  // We'll fetch products on the client side or pass a promise
  const featuredArticles = articles?.slice(0, 3) || []
  const articlesData = articles || []
  
  // Transform events for the homepage format
  const upcomingEvents = (events || [])
    .filter((event) => new Date(event.date) >= new Date())
    .slice(0, 3)
    .map((event) => ({
      date: {
        month: new Date(event.date).toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
        day: new Date(event.date).getDate().toString(),
      },
      artist: event.artists.map((a) => a.name).join(" & ") || "Various Artists",
      venue: `${event.venue} - ${event.location}`,
      ticketUrl: event.ticket_link || "#",
      image: event.image,
    }))

  return (
    <HomepageClient
      featuredArticles={featuredArticles}
      articlesData={articlesData}
      upcomingEvents={upcomingEvents}
      featuredProducts={[]} // Will be fetched in client component
    />
  )
}
